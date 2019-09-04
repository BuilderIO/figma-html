chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  let isResponseAsync = false;

  console.log(request, sender);

  if (request.inject) {
    chrome.tabs.query({ currentWindow: true, active: true }, tabs => {
      const activeTab = sender.tab || tabs[0];
      console.log("tabs", tabs);
      if (activeTab && activeTab.id) {
        chrome.tabs.executeScript(activeTab.id, {
          file: "inject.js"
        });
      }
    });
  }

  return isResponseAsync;
});
