const statusEl = document.getElementById("status");
const debugEl = document.getElementById("debug");
const answerEl = document.getElementById("answer");
const questionEl = document.getElementById("question");

let cachedContext = null;

// CHANGE THIS after you create the n8n webhook
const N8N_WEBHOOK_URL = "http://localhost:5678/webhook-test/github-copilot-query";

const CONTEXT_TIMEOUT_MS = 8000;
const FETCH_TIMEOUT_MS = 60000;

function setStatus(s) { statusEl.textContent = s; }

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function isGithubIssueUrl(url) {
  return /^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+/.test(url || "");
}

async function requestContextFromTab(tabId) {
  return withTimeout(
    chrome.tabs.sendMessage(tabId, { type: "GET_CONTEXT" }),
    CONTEXT_TIMEOUT_MS,
    "Context request"
  );
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function loadContext() {
  setStatus("Loading context...");
  answerEl.textContent = "";

  const tab = await getActiveTab();
  if (!tab?.id) {
    setStatus("Failed to read page");
    debugEl.textContent = "No active tab found";
    return;
  }
  if (!isGithubIssueUrl(tab.url)) {
    setStatus("Failed to read page");
    debugEl.textContent = `Not a GitHub issue page: ${tab.url || "(no url)"}`;
    return;
  }
  let res;
  try {
    res = await requestContextFromTab(tab.id);
  } catch (err) {
    const message = err?.message || String(err);
    const noReceiver = /Receiving end does not exist|Could not establish connection/i.test(message);
    if (!noReceiver) {
      setStatus("Failed to read page");
      debugEl.textContent = message;
      return;
    }
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });
      res = await requestContextFromTab(tab.id);
    } catch (injectErr) {
      setStatus("Failed to read page");
      debugEl.textContent = injectErr?.message || String(injectErr);
      return;
    }
  }

  if (!res?.ok) {
    setStatus("Failed to read page");
    debugEl.textContent = res?.error || "Unknown error";
    return;
  }

  cachedContext = res.context;
  debugEl.textContent = JSON.stringify(cachedContext, null, 2);
  setStatus("Context loaded ✅");
}

async function ask() {
  if (!cachedContext) {
    await loadContext();
    if (!cachedContext) return;
  }

  const question = (questionEl.value || "").trim();
  if (!question) {
    setStatus("Write a question first");
    return;
  }

  setStatus("Calling AI...");
  answerEl.textContent = "";

  const payload = {
    ...cachedContext,
    userIntent: { question }
  };

  let r;
  const controller = new AbortController();
  const fetchTimer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    r = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (err) {
    const isAbort = err?.name === "AbortError";
    setStatus("Backend error");
    answerEl.textContent = isAbort
      ? `Request timed out after ${FETCH_TIMEOUT_MS}ms`
      : (err?.message || String(err));
    return;
  } finally {
    clearTimeout(fetchTimer);
  }

  if (!r.ok) {
    setStatus("Backend error");
    answerEl.textContent = `HTTP ${r.status}`;
    return;
  }

  const data = await r.json();
  // Expecting: { answerMarkdown, suggestedActions, confidence }
  setStatus("Done ✅");
  answerEl.textContent = data?.answerMarkdown || JSON.stringify(data, null, 2);
}

document.getElementById("btnContext").addEventListener("click", loadContext);
document.getElementById("btnAsk").addEventListener("click", ask);
