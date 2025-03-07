// Service worker for HTML to Figma extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('HTML to Figma extension installed');
});

// Listen for messages from the popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle any messages here
  return true;
}); 