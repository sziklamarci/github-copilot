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
  const titleEl = document.querySelector("h1 span.markdown-title") ||
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
  const labels = uniq([...labelEls].map(e => text(e)));

  // Assignees (right sidebar)
  const assigneeEls = document.querySelectorAll('a[data-hovercard-type="user"][href^="/"]');
  // This selector is broad; we keep it conservative by limiting to sidebar if possible.
  const sidebar = document.querySelector("aside") || document.body;
  const assignees = uniq(
    [...sidebar.querySelectorAll('a[data-hovercard-type="user"]')]
      .map(a => a.getAttribute("href"))
      .filter(Boolean)
      .map(h => h.replace("/", ""))
  ).slice(0, 5);

  // A few most recent comments (lightweight)
  const commentBodies = [...document.querySelectorAll(".js-comment-body")]
    .slice(-5)
    .map(el => text(el))
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
      assignees
    },
    comments: commentBodies.map((t, i) => ({ idx: i + 1, text: t }))
  };
}

// Listen for popup requests
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
