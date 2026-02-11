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
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openSidePanel' && sender.tab?.id) {
        chrome.sidePanel.open({ tabId: sender.tab.id });
    } else if (request.action === 'polishText') {
        import('../services/ai').then(({ aiService }) => {
            aiService.polishEmail(request.text, request.tone || 'formal')
                .then(polishedText => sendResponse({ success: true, text: polishedText }))
                .catch(error => sendResponse({ success: false, error: error.message }));
        });
        return true; // Keep channel open for async response
    }
    return true;
});
