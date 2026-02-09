// ===== Existing helpers & extractor (kept) =====
function text(el) {
  return el ? el.textContent.trim() : "";
}

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function getIssueNumberFromUrl() {
  const m = window.location.pathname.match(/\/issues\/(\d+)/);
  return m ? m[1] : null;
}

function extractIssueContext() {
  const url = window.location.href;

  // repo: org/repo
  const parts = window.location.pathname.split("/").filter(Boolean);
  const repo = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : "";

  // Title
  const titleEl =
    document.querySelector("h1 span.markdown-title") ||
    document.querySelector("h1 bdi") ||
    document.querySelector("h1");
  const title = text(titleEl);

  // Body (first comment)
  const bodyEl =
    document.querySelector('[data-testid="issue-body"]') ||
    document.querySelector(".js-comment-container .comment-body") ||
    document.querySelector("td.comment-body");
  const bodyText = text(bodyEl);

  // Labels (right sidebar)
  const labelEls = document.querySelectorAll('a[href*="/labels/"] span');
  const labels = uniq([...labelEls].map((e) => text(e)));

  // Assignees (right sidebar)
  const sidebar = document.querySelector("aside") || document.body;
  const assignees = uniq(
    [...sidebar.querySelectorAll('a[data-hovercard-type="user"]')]
      .map((a) => a.getAttribute("href"))
      .filter(Boolean)
      .map((h) => h.replace("/", ""))
  ).slice(0, 5);

  // A few most recent comments (lightweight)
  const commentBodies = [...document.querySelectorAll(".js-comment-body")]
    .slice(-5)
    .map((el) => text(el))
    .filter(Boolean)
    .slice(0, 5);

  const issueNumber = getIssueNumberFromUrl();

  return {
    app: "github",
    pageType: "issue",
    url,
    repo,
    issueNumber,
    title,
    bodyText,
    uiState: {
      labels,
      assignees,
    },
    comments: commentBodies.map((t, i) => ({ idx: i + 1, text: t })),
  };
}

// ===== Keep popup support (optional) =====
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "GET_CONTEXT") {
    try {
      const ctx = extractIssueContext();
      sendResponse({ ok: true, context: ctx });
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }
  }
  return true;
});

// ===== Sidebar Copilot (new) =====
const N8N_WEBHOOK_URL = "https://n8n-demo.politesea-333c286c.westeurope.azurecontainerapps.io/webhook/github-copilot-query";

const SIDEBAR_ID = "gh-copilot-sidebar";
const STYLE_ID = "gh-copilot-style";

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${SIDEBAR_ID}{
      position:fixed; top:0; right:0; height:100vh; width:380px; z-index:999998;
      background:white; border-left:1px solid #d0d7de; box-shadow:-2px 0 12px rgba(0,0,0,0.12);
      display:none; font-family:system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    }
    #${SIDEBAR_ID} .hdr{
      display:flex; align-items:center; justify-content:space-between;
      padding:10px; border-bottom:1px solid #eee;
    }
    #${SIDEBAR_ID} .hdr .title{ font-weight:600; font-size:13px; }
    #${SIDEBAR_ID} .hdr .meta{ font-size:11px; opacity:0.7; }
    #${SIDEBAR_ID} .btn{
      border:1px solid #d0d7de; background:white; border-radius:8px;
      padding:6px 10px; cursor:pointer; font-size:12px;
    }
    #${SIDEBAR_ID} .msgs{
      padding:10px; overflow:auto; height:calc(100vh - 140px);
      display:flex; flex-direction:column; gap:8px;
    }
    #${SIDEBAR_ID} .msg{
      border:1px solid #eee; border-radius:12px; padding:10px;
      white-space:pre-wrap; word-wrap:break-word;
      font-size:12.5px; line-height:1.35;
    }
    #${SIDEBAR_ID} .msg.user{ background:#f6f8fa; align-self:flex-end; max-width:95%; }
    #${SIDEBAR_ID} .msg.assistant{ background:white; align-self:flex-start; max-width:95%; }
    #${SIDEBAR_ID} .composer{
      padding:0px 10px 0px 10px; border-top:1px solid #eee; display:flex; gap:8px; align-items:center;
    }
    #${SIDEBAR_ID} input{
      flex:1; padding:10px; border-radius:10px; border:1px solid #d0d7de;
      font-size:12.5px;
    }
    #${SIDEBAR_ID} .small{
      font-size:11px; opacity:0.75;
    }
    #${SIDEBAR_ID} .row{
      display:flex; gap:8px; align-items:center; padding:0 10px 10px 10px;
    }
    #${SIDEBAR_ID} .chip{
      font-size:11px; border:1px solid #eee; border-radius:999px; padding:4px 8px; background:#fff;
    }
  `;
  document.head.appendChild(style);
}

function ensureSidebar() {
  if (document.getElementById(SIDEBAR_ID)) return;

  ensureStyles();

  // Sidebar
  const sidebar = document.createElement("div");
  sidebar.id = SIDEBAR_ID;
  sidebar.innerHTML = `
    <div class="hdr">
      <div>
        <div class="title">GitHub Copilot Demo</div>
        <div class="meta" id="gh-copilot-meta">Issue context</div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn" id="gh-copilot-clear">Clear</button>
        <button class="btn" id="gh-copilot-close">Close</button>
      </div>
    </div>

    <div class="row" id="gh-copilot-chips"></div>

    <div class="msgs" id="gh-copilot-messages">
      <div class="msg assistant">Ask about this issue. Examples:
- Summarize and propose next steps
- Draft a polite comment asking for repro steps
- What labels would you add?</div>
    </div>

    <div class="composer">
      <input id="gh-copilot-input" placeholder="Ask… (Enter to send)" />
      <button class="btn" id="gh-copilot-send">Send</button>
    </div>
    <div style="padding:0 10px 10px 10px;" class="small" id="gh-copilot-status"></div>
  `;
  document.body.appendChild(sidebar);

  // Helpers
  const messagesEl = sidebar.querySelector("#gh-copilot-messages");
  const inputEl = sidebar.querySelector("#gh-copilot-input");
  const statusEl = sidebar.querySelector("#gh-copilot-status");
  const metaEl = sidebar.querySelector("#gh-copilot-meta");
  const chipsEl = sidebar.querySelector("#gh-copilot-chips");

  function setStatus(s) {
    statusEl.textContent = s || "";
  }

  function open() { sidebar.style.display = "block"; }
  function close() { sidebar.style.display = "none"; }

  function addChip(text) {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.textContent = text;
    chipsEl.appendChild(chip);
  }

  function refreshMeta() {
    try {
      const ctx = extractIssueContext();
      metaEl.textContent = `${ctx.repo} • #${ctx.issueNumber || "?"}`;
      chipsEl.innerHTML = "";
      if (ctx.uiState?.labels?.length) addChip(`Labels: ${ctx.uiState.labels.slice(0, 3).join(", ")}${ctx.uiState.labels.length > 3 ? "…" : ""}`);
      if (ctx.uiState?.assignees?.length) addChip(`Assignees: ${ctx.uiState.assignees.join(", ")}`);
    } catch (_) {
      metaEl.textContent = "Issue context";
    }
  }

  function appendMessage(role, text) {
    const el = document.createElement("div");
    el.className = `msg ${role}`;
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  async function callCopilot(question) {
    const ctx = extractIssueContext();
    // Keep payload small-ish
    const payload = {
      ...ctx,
      userIntent: { question }
    };

    const r = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      throw new Error(`HTTP ${r.status}`);
    }
    return await r.json();
  }

  async function onSend() {
    const q = (inputEl.value || "").trim();
    if (!q) return;

    appendMessage("user", q);
    inputEl.value = "";

    const placeholder = appendMessage("assistant", "Thinking…");
    setStatus("Calling backend…");

    try {
      refreshMeta();
      const data = await callCopilot(q);
      placeholder.textContent = data?.answerMarkdown || JSON.stringify(data, null, 2);
      setStatus(`Done • confidence ${(data?.confidence ?? 0).toFixed(2)}`);
    } catch (e) {
      placeholder.textContent = `Error: ${String(e)}`;
      setStatus("Failed");
    }
  }

  sidebar.querySelector("#gh-copilot-close").addEventListener("click", close);

  sidebar.querySelector("#gh-copilot-clear").addEventListener("click", () => {
    messagesEl.innerHTML = "";
    appendMessage("assistant", "Cleared. Ask about this issue.");
    setStatus("");
  });

  sidebar.querySelector("#gh-copilot-send").addEventListener("click", onSend);

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") onSend();
  });

  // Auto-refresh chips when opening
  refreshMeta();
}

// ---- one-time init guard ----
if (!window.__GH_COPILOT_LOADED__) {
  window.__GH_COPILOT_LOADED__ = true;

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type !== "TOGGLE_SIDEBAR") return;

    // Create UI only when needed
    ensureSidebar();

    const sidebar = document.getElementById(SIDEBAR_ID);
    if (!sidebar) return;

    const input = sidebar.querySelector("#gh-copilot-input");

    const isOpen = window.getComputedStyle(sidebar).display !== "none";
    sidebar.style.display = isOpen ? "none" : "block";

    if (!isOpen) {
      // focus next tick
      setTimeout(() => input?.focus(), 0);
    }
  });
}
