chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  let isResponseAsync = false;

  if (request.inject) {
    chrome.tabs.query({ currentWindow: true, active: true }, tabs => {
      const activeTab = sender.tab || tabs[0];
      if (activeTab && activeTab.id) {
        chrome.tabs.executeScript(activeTab.id, {
          file: "js/inject.js"
        });
      }
    });
  }

  return isResponseAsync;
});
