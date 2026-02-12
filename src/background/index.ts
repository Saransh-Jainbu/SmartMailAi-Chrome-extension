import { aiService } from '../services/ai';

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
    console.log('SmartMail AI Background: Received message:', request.action);

    if (request.action === 'openSidePanel' && sender.tab?.id) {
        chrome.sidePanel.open({ tabId: sender.tab.id });
        sendResponse({ success: true });
    } else if (request.action === 'polishText') {
        console.log('SmartMail AI Background: Processing polishText request...');
        console.log('SmartMail AI Background: Text length:', request.text?.length);
        console.log('SmartMail AI Background: Tone:', request.tone);
        console.log('SmartMail AI Background: Recipient:', request.recipientEmail || 'None');

        // Use the statically imported aiService
        aiService.polishEmail(
            request.text,
            request.tone || 'formal',
            request.context,
            request.recipientEmail
        )
            .then(polishedText => {
                console.log('SmartMail AI Background: Polish successful, text length:', polishedText?.length);
                sendResponse({ success: true, text: polishedText });
            })
            .catch(error => {
                console.error('SmartMail AI Background: Error details:', {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                });
                sendResponse({ success: false, error: error.message || String(error) });
            });

        return true; // Keep channel open for async response
    }

    return true;
});
