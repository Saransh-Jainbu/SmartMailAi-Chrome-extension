console.log('SmartMail AI Background Service Worker Started');

chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        chrome.tabs.create({ url: 'welcome.html' });
    }
    console.log('Extension installed');
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, _sendResponse) => {
    if (request.action === 'openSidePanel' && sender.tab?.id) {
        chrome.sidePanel.open({ tabId: sender.tab.id });
    }
    return true;
});
