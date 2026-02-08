async function toggleSidebar(tabId) {
  // Try to message existing content script first
  try {
    await chrome.tabs.sendMessage(tabId, { type: "TOGGLE_SIDEBAR" });
    return;
  } catch (e) {
    // Content script likely not ready/injected yet
  }

  // Inject content.js, then retry
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
  } catch (e) {
    console.warn("Failed to inject content.js:", e);
    return;
  }

  // Retry message
  try {
    await chrome.tabs.sendMessage(tabId, { type: "TOGGLE_SIDEBAR" });
  } catch (e) {
    console.warn("Failed to toggle after inject:", e);
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;

  // Only act on github.com (optional guard)
  if (!tab.url || !tab.url.startsWith("https://github.com/")) return;

  await toggleSidebar(tab.id);
});
