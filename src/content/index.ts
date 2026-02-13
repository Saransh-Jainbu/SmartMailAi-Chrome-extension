// Content script that runs on mail.google.com and outlook
// Extracts email data directly from the DOM using provider pattern
import { GmailProvider } from './providers/GmailProvider';
import { OutlookProvider } from './providers/OutlookProvider';
import type { IEmailProvider } from './providers/BaseProvider';

console.log('SmartMail AI: Content script loaded');

let provider: IEmailProvider | null = null;

const hostname = window.location.hostname;
console.log('SmartMail AI: Hostname detected as:', hostname);

if (hostname.includes('google.com') && hostname.includes('mail')) {
    console.log('SmartMail AI: Detected Gmail');
    provider = new GmailProvider();
} else if (hostname.includes('outlook') || hostname.includes('office')) {
    console.log('SmartMail AI: Detected Outlook (office/outlook domain)');
    provider = new OutlookProvider();
} else {
    console.warn('SmartMail AI: Hostname did not match known providers');
}

if (provider) {
    provider.init();

    // Listen for messages from the extension
    chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
        if (!provider) return;

        console.log(`SmartMail AI: Received action ${request.action}`);

        if (request.action === 'getEmails') {
            const emails = provider.getInboxEmails();
            sendResponse({ emails });
        } else if (request.action === 'archiveEmail') {
            provider.handleArchive(request.emailId).then(success => {
                sendResponse({ success });
            });
            return true; // Keep channel open for async response
        } else if (request.action === 'deleteEmail') {
            provider.handleDelete(request.emailId).then(success => {
                sendResponse({ success });
            });
            return true; // Keep channel open for async response
        }

    });
} else {
    console.warn(`SmartMail AI: No provider found for hostname: ${hostname}`);
}
