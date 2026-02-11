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
                snippet = snippetEl?.textContent?.substring(0, 2048) || '';

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

// Function to delete an email in Gmail
function deleteEmail(emailId: string) {
    console.log('SmartMail AI: Attempting to delete email with ID:', emailId);

    // Try multiple selectors to find the email row
    let row = document.querySelector(`tr[data-legacy-message-id="${emailId}"]`) ||
        document.querySelector(`tr[data-message-id="${emailId}"]`) ||
        document.querySelector(`tr[id="${emailId}"]`) ||
        document.querySelector(`div[data-message-id="${emailId}"]`);

    if (!row) {
        console.error('SmartMail AI: Email row not found for ID:', emailId);
        return false;
    }

    console.log('SmartMail AI: Found email row, attempting to delete...');

    // Try to find and click the delete button (usually only visible on hover)
    const deleteBtn = row.querySelector('[data-tooltip="Delete"]') as HTMLElement ||
        row.querySelector('[aria-label*="Delete"]') as HTMLElement ||
        row.querySelector('[aria-label*="delete"]') as HTMLElement;

    if (deleteBtn) {
        console.log('SmartMail AI: Clicking delete button');
        deleteBtn.click();
        return true;
    }

    // Alternative: use keyboard shortcut
    const checkbox = row.querySelector('input[type="checkbox"]') as HTMLInputElement;
    if (checkbox) {
        console.log('SmartMail AI: Using keyboard shortcut method (Shift + 3 / #)');

        // Ensure row is selected
        if (!checkbox.checked) {
            checkbox.click();
        }

        setTimeout(() => {
            // Press '#' (Shift + 3) for delete
            const event = new KeyboardEvent('keydown', {
                key: '#',
                code: 'Digit3',
                shiftKey: true,
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(event);
        }, 100);
        return true;
    }

    console.error('SmartMail AI: Could not find delete button or checkbox');
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
    } else if (request.action === 'deleteEmail') {
        const success = deleteEmail(request.emailId);
        sendResponse({ success });
    }
    return true; // Keep channel open for async response
});

// Inject a premium floating button to open the side panel
function injectSidePanelButton() {
    // Remove existing button if any
    const existing = document.getElementById('smartmail-ai-button');
    if (existing) existing.remove();

    const button = document.createElement('button');
    button.id = 'smartmail-ai-button';
    button.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
            </svg>
            <span style="font-weight: 600;">SmartMail AI</span>
        </div>
    `;
    button.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 10000;
        padding: 14px 24px;
        background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
        color: white;
        border: none;
        border-radius: 16px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 15px;
        cursor: pointer;
        box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4), 0 0 0 0 rgba(99, 102, 241, 0.5);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        animation: slideInUp 0.5s ease-out, pulse 2s ease-in-out 1s infinite;
        backdrop-filter: blur(10px);
    `;

    // Add keyframe animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        @keyframes pulse {
            0%, 100% {
                box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4), 0 0 0 0 rgba(99, 102, 241, 0.5);
            }
            50% {
                box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4), 0 0 0 8px rgba(99, 102, 241, 0);
            }
        }
    `;
    document.head.appendChild(style);

    button.onmouseover = () => {
        button.style.transform = 'translateY(-4px) scale(1.05)';
        button.style.boxShadow = '0 12px 32px rgba(99, 102, 241, 0.5), 0 0 0 0 rgba(99, 102, 241, 0.5)';
    };

    button.onmouseout = () => {
        button.style.transform = 'translateY(0) scale(1)';
        button.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.4), 0 0 0 0 rgba(99, 102, 241, 0.5)';
    };

    button.onclick = () => {
        // Add click animation
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 150);

        // Open the side panel
        chrome.runtime.sendMessage({ action: 'openSidePanel' });
    };

    document.body.appendChild(button);
}

// Wait for Gmail to load, then inject button
setTimeout(() => {
    if (document.querySelector('tr.zA')) {
        injectSidePanelButton();
        console.log('SmartMail AI: Premium button injected, ready to extract emails!');
    }

    // Start watching for compose windows
    observeComposeWindow();

}, 2000);

// --- Compose Window Injection ---

function observeComposeWindow() {
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
                // Check for compose window (usually .M9, with role="dialog" or "region")
                const composeWindows = document.querySelectorAll('div[role="dialog"]');
                composeWindows.forEach(window => {
                    if (window.querySelector('div[command="Send"]') || window.textContent?.includes('Compose')) {
                        injectComposeToolbar(window as HTMLElement);
                    }
                });
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function injectComposeToolbar(composeWindow: HTMLElement) {
    // Avoid double injection
    if (composeWindow.querySelector('.smartmail-polish-toolbar')) return;

    // Find the toolbar row (usually near Send button)
    // .btC is the bottom toolbar container in Gmail compose
    const toolbarRow = composeWindow.querySelector('.btC');
    if (!toolbarRow) return;

    const myToolbar = document.createElement('div');
    myToolbar.className = 'smartmail-polish-toolbar';
    myToolbar.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        margin-left: 16px;
        padding: 0 8px;
    `;

    const polishBtn = document.createElement('div');
    polishBtn.innerHTML = `
        <div role="button" class="T-I J-J5-Ji aoO T-I-atl L3" style="background-color: #6366F1; color: white; border: none; border-radius: 18px; padding: 0 16px; height: 36px; line-height: 36px; display: flex; align-items: center; gap: 6px; font-family: 'Google Sans',Roboto,RobotoDraft,Helvetica,Arial,sans-serif;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
            Polish Email
        </div>
    `;
    polishBtn.style.cursor = 'pointer';

    // Logic for polishing
    polishBtn.onclick = async () => {
        const bodyContainer = composeWindow.querySelector('div[aria-label="Message Body"], div[role="textbox"]');
        if (!bodyContainer) {
            alert('Could not find email body.');
            return;
        }

        const originalText = (bodyContainer as HTMLElement).innerText;
        if (!originalText.trim()) return;

        // Show loading state
        const btnContent = polishBtn.firstElementChild as HTMLElement;
        const originalHtml = btnContent.innerHTML;
        btnContent.innerHTML = '✨ Polishing...';
        btnContent.style.opacity = '0.7';

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'polishText',
                text: originalText,
                tone: 'formal'
            });

            if (response && response.success) {
                // Update the email body
                (bodyContainer as HTMLElement).innerText = response.text;
            } else {
                alert('Failed to polish email: ' + (response?.error || 'Unknown error'));
            }
        } catch (e) {
            console.error(e);
            alert('Error connecting to SmartMail AI.');
        } finally {
            btnContent.innerHTML = originalHtml;
            btnContent.style.opacity = '1';
        }
    };

    myToolbar.appendChild(polishBtn);
    toolbarRow.prepend(myToolbar);
}

