const statusEl = document.getElementById("status");
const debugEl = document.getElementById("debug");
const answerEl = document.getElementById("answer");
const questionEl = document.getElementById("question");

let cachedContext = null;

// CHANGE THIS after you create the n8n webhook
const N8N_WEBHOOK_URL = "https://YOUR_N8N_DOMAIN/webhook/github-copilot-query";

function setStatus(s) { statusEl.textContent = s; }

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function loadContext() {
  setStatus("Loading context...");
  answerEl.textContent = "";

  const tab = await getActiveTab();
  const res = await chrome.tabs.sendMessage(tab.id, { type: "GET_CONTEXT" });

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

  const r = await fetch(N8N_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

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
