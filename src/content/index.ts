// Content script that runs on mail.google.com
// Extracts email data directly from the Gmail DOM - no OAuth needed!

console.log('SmartMail AI: Content script loaded on Gmail');

// Function to extract email data from Gmail's DOM
function extractEmailsFromGmail() {
    const emails: any[] = [];

    // Try multiple selectors for different Gmail views
    // Standard inbox rows
    let emailRows = document.querySelectorAll('tr.zA');

    // If no rows found, try conversation view
    if (emailRows.length === 0) {
        emailRows = document.querySelectorAll('div[data-message-id]');
    }

    console.log(`SmartMail AI: Found ${emailRows.length} emails`);

    emailRows.forEach((row, index) => {
        try {
            let sender = 'Unknown';
            let subject = 'No Subject';
            let snippet = '';
            let date = 'Recent';
            let emailId = `gmail-${Date.now()}-${index}`; // Fallback ID

            // Extract data based on row type
            if (row.tagName === 'TR') {
                // Table row (inbox view)
                const senderEl = row.querySelector('.yW span[email], .yW span');
                const subjectEl = row.querySelector('.y6 span, .bog span');
                const snippetEl = row.querySelector('.y2');
                const dateEl = row.querySelector('.xW span, .xW');

                sender = senderEl?.getAttribute('email') || senderEl?.textContent || 'Unknown';
                subject = subjectEl?.textContent || 'No Subject';
                snippet = snippetEl?.textContent || '';
                date = dateEl?.textContent || 'Recent';

                // Try to get actual Gmail message ID - this is critical for archive!
                const messageId = row.getAttribute('data-legacy-message-id') ||
                    row.getAttribute('data-message-id') ||
                    row.id;
                if (messageId) emailId = messageId;
            } else {
                // Div (conversation view)
                const senderEl = row.querySelector('[email]');
                const subjectEl = row.querySelector('h2, h3');
                const snippetEl = row.querySelector('.a3s');

                sender = senderEl?.getAttribute('email') || senderEl?.textContent || 'Unknown';
                subject = subjectEl?.textContent || 'No Subject';
                snippet = snippetEl?.textContent?.substring(0, 100) || '';

                emailId = row.getAttribute('data-message-id') || emailId;
            }

            console.log(`Extracted email ID: ${emailId} for subject: ${subject}`);

            emails.push({
                id: emailId,
                from: sender,
                sender: sender.split('@')[0] || sender,
                subject: subject,
                snippet: snippet,
                date: date,
                status: 'unread'
            });
        } catch (e) {
            console.error('Error extracting email:', e);
        }
    });

    return emails;
}

// Function to archive an email in Gmail
function archiveEmail(emailId: string) {
    console.log('SmartMail AI: Attempting to archive email with ID:', emailId);

    // Try multiple selectors to find the email row
    let row = document.querySelector(`tr[data-legacy-message-id="${emailId}"]`) ||
        document.querySelector(`tr[data-message-id="${emailId}"]`) ||
        document.querySelector(`tr[id="${emailId}"]`) ||
        document.querySelector(`div[data-message-id="${emailId}"]`);

    if (!row) {
        console.error('SmartMail AI: Email row not found for ID:', emailId);
        console.log('Available rows:', document.querySelectorAll('tr.zA').length);
        return false;
    }

    console.log('SmartMail AI: Found email row, attempting to archive...');

    // Try to find and click the archive button
    const archiveBtn = row.querySelector('[data-tooltip="Archive"]') as HTMLElement ||
        row.querySelector('[aria-label*="Archive"]') as HTMLElement ||
        row.querySelector('[aria-label*="archive"]') as HTMLElement;

    if (archiveBtn) {
        console.log('SmartMail AI: Clicking archive button');
        archiveBtn.click();
        return true;
    }

    // Alternative: use keyboard shortcut
    const checkbox = row.querySelector('input[type="checkbox"]') as HTMLInputElement;
    if (checkbox) {
        console.log('SmartMail AI: Using keyboard shortcut method');
        checkbox.click(); // Select the email
        setTimeout(() => {
            // Press 'e' for archive
            const event = new KeyboardEvent('keydown', {
                key: 'e',
                code: 'KeyE',
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(event);
        }, 100);
        return true;
    }

    console.error('SmartMail AI: Could not find archive button or checkbox');
    return false;
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'getEmails') {
        const emails = extractEmailsFromGmail();
        sendResponse({ emails });
    } else if (request.action === 'archiveEmail') {
        const success = archiveEmail(request.emailId);
        sendResponse({ success });
    }
    return true; // Keep channel open for async response
});

// Inject a floating button to open the side panel
function injectSidePanelButton() {
    const button = document.createElement('button');
    button.id = 'smartmail-ai-button';
    button.innerHTML = '⚡ SmartMail AI';
    button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        padding: 12px 20px;
        background: linear-gradient(135deg, #5B8CFF 0%, #4A7FE8 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(91, 140, 255, 0.3);
        transition: all 0.2s;
    `;

    button.onmouseover = () => {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 6px 16px rgba(91, 140, 255, 0.4)';
    };

    button.onmouseout = () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 4px 12px rgba(91, 140, 255, 0.3)';
    };

    button.onclick = () => {
        // Open the side panel
        chrome.runtime.sendMessage({ action: 'openSidePanel' });
    };

    document.body.appendChild(button);
}

// Wait for Gmail to load, then inject button
setTimeout(() => {
    if (document.querySelector('tr.zA')) {
        injectSidePanelButton();
        console.log('SmartMail AI: Button injected, ready to extract emails!');
    }
}, 2000);
