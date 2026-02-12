// Content script that runs on mail.google.com
// Extracts email data directly from the Gmail DOM - no OAuth needed!
import { startSuggestionMonitoring } from './suggestions';

// Helper to safely send messages and handle context invalidation
async function safeSendMessage(message: any): Promise<any> {
    try {
        return await chrome.runtime.sendMessage(message);
    } catch (error: any) {
        if (error.message?.includes('Extension context invalidated')) {
            console.error('SmartMail AI: Context invalidated');

            // Show user alert
            const alert = document.createElement('div');
            alert.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background-color: #EF4444;
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                z-index: 99999;
                font-family: system-ui, -apple-system, sans-serif;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                font-weight: 500;
                pointer-events: none;
            `;
            alert.textContent = 'Please refresh the page to continue using SmartMail AI';
            document.body.appendChild(alert);

            // Remove after 5s
            setTimeout(() => alert.remove(), 5000);

            return { error: 'Extension context invalidated' };
        }
        throw error;
    }
}


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

        // Open the side panel, safely
        safeSendMessage({ action: 'openSidePanel' });
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
    console.log('SmartMail AI: Starting compose window observer...');

    // Track which compose windows we've already processed
    const processedWindows = new WeakSet<Element>();

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
                // Check for compose window with multiple selectors
                // New compose: div[role="dialog"] with class containing "M9"
                // Inline reply: td.Bu or div with contenteditable
                const composeSelectors = [
                    'div[role="dialog"]',           // New compose window
                    'div[role="region"]',           // Alternative compose
                    'td.Bu',                        // Inline reply container
                    'div.M9',                       // Gmail compose class
                    'div.aoI',                      // Another compose container
                ];

                composeSelectors.forEach(selector => {
                    const windows = document.querySelectorAll(selector);
                    windows.forEach(window => {
                        // Skip if already processed
                        if (processedWindows.has(window)) return;

                        // Verify it's actually a compose window by checking for Send button or compose indicators
                        const hasSendButton = window.querySelector('div[role="button"][data-tooltip*="Send"]') ||
                            window.querySelector('div[command="Send"]') ||
                            window.querySelector('[aria-label*="Send"]');

                        const hasComposeBody = window.querySelector('div[aria-label*="Message Body"]') ||
                            window.querySelector('div[role="textbox"][g_editable="true"]') ||
                            window.querySelector('.Am.Al.editable');

                        if (hasSendButton || hasComposeBody) {
                            console.log('SmartMail AI: Detected compose window, injecting Polish button...');
                            processedWindows.add(window);
                            injectComposeToolbar(window as HTMLElement);
                        }
                    });
                });
            }
        }
    });

    // Only observe direct children, not deep subtree changes
    observer.observe(document.body, { childList: true, subtree: true });

    // Also check for existing compose windows on load
    setTimeout(() => {
        console.log('SmartMail AI: Checking for existing compose windows...');
        const existingComposeWindows = document.querySelectorAll('div[role="dialog"], div.M9, td.Bu');
        existingComposeWindows.forEach(window => {
            if (processedWindows.has(window)) return;

            const hasSendButton = window.querySelector('div[role="button"][data-tooltip*="Send"]') ||
                window.querySelector('[aria-label*="Send"]');
            if (hasSendButton) {
                console.log('SmartMail AI: Found existing compose window, injecting Polish button...');
                processedWindows.add(window);
                injectComposeToolbar(window as HTMLElement);
            }
        });
    }, 1000);
}

function injectComposeToolbar(composeWindow: HTMLElement) {
    // Avoid double injection
    if (composeWindow.querySelector('.smartmail-polish-toolbar')) {
        console.log('SmartMail AI: Polish button already injected in this compose window');
        return;
    }

    console.log('SmartMail AI: Attempting to inject Polish button...');

    // Find the toolbar row (usually near Send button)
    // .btC is the bottom toolbar container
    let toolbarRow = composeWindow.querySelector('.btC') ||
        composeWindow.querySelector('tr.n1tfz') ||
        composeWindow.querySelector('.gU.Up');

    if (!toolbarRow) {
        const sendBtn = composeWindow.querySelector('div[role="button"][data-tooltip*="Send"]');
        if (sendBtn) {
            toolbarRow = (sendBtn.closest('tr') as HTMLElement) || (sendBtn.parentElement?.parentElement as HTMLElement);
        }
    }

    if (!toolbarRow) {
        console.warn('SmartMail AI: Could not find toolbar row to inject Polish button');
        return;
    }

    console.log('SmartMail AI: Found toolbar row:', toolbarRow.className);

    const myToolbar = document.createElement('div');
    myToolbar.className = 'smartmail-polish-toolbar';
    myToolbar.style.cssText = `
        display: flex;
        align-items: center;
        gap: 0;
        margin-left: 4px;
        padding-right: 4px;
    `;

    // Inject logic: Target the Formatting options button "A"
    // Based on user HTML: <td class="oc gU"><div data-tooltip="Formatting options" ...>
    const formattingContainer = toolbarRow.querySelector('div[data-tooltip="Formatting options"]') || // exact match
        toolbarRow.querySelector('div[aria-label="Formatting options"]');    // accessibility label

    createPolishButton(composeWindow, myToolbar);

    if (formattingContainer) {
        // We found the formatting button instructions.
        // It lives in a TD. We should insert our own TD after it to respect the table layout.
        const parentTd = formattingContainer.closest('td');
        if (parentTd && parentTd.parentElement === toolbarRow) {
            const myTd = document.createElement('td');
            myTd.className = 'gU smartmail-td'; // Mimic Gmail class
            myTd.appendChild(myToolbar);

            // Insert after the formatting TD
            parentTd.insertAdjacentElement('afterend', myTd);
            console.log('SmartMail AI: ✅ Polish button injected next to formatting button!');
            return;
        }
    }

    // Fallback: If we can't find the table structure, try the old method of appending
    // formatting internal div
    const formattingBtn = toolbarRow.querySelector('div[command="+a"]') ||
        toolbarRow.querySelector('.dv') ||
        toolbarRow.querySelector('.a8x');

    if (formattingBtn) {
        formattingBtn.insertAdjacentElement('afterend', myToolbar);
        console.log('SmartMail AI: ✅ Polish button injected after formatting div (fallback method 1)');
    } else {
        // Last resort: Append to the row
        toolbarRow.appendChild(myToolbar);
        console.log('SmartMail AI: ✅ Polish button appended to toolbar (fallback method 2)');
    }

    // Start real-time suggestions
    console.log('SmartMail AI: 🚀 Calling startSuggestionMonitoring...');
    startSuggestionMonitoring(composeWindow);
    console.log('SmartMail AI: ✅ startSuggestionMonitoring returned');
}

// Extract the text of the last email in the thread
function getThreadContext(): string {
    // Gmail conversation view usually puts previous emails in .a3s (message body)
    // We want the last one that isn't the current draft.
    const messages = document.querySelectorAll('.h7 .a3s'); // .h7 is often the message container
    if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1] as HTMLElement;
        return lastMessage.innerText || '';
    }

    // Fallback: try to find any visible message body
    const anyBody = document.querySelectorAll('.a3s');
    if (anyBody.length > 0) {
        return (anyBody[anyBody.length - 1] as HTMLElement).innerText || '';
    }
    return '';
}

// Extract recipient email from compose window
function getRecipientEmail(composeWindow: HTMLElement): string {
    // Try to find the "To" field
    const toField = composeWindow.querySelector('input[name="to"]') ||
        composeWindow.querySelector('[aria-label*="To"]') ||
        composeWindow.querySelector('.vR'); // Gmail's To field class

    if (toField) {
        const emailAttr = toField.getAttribute('email') ||
            toField.getAttribute('data-hovercard-id') ||
            (toField as HTMLInputElement).value;
        if (emailAttr) return emailAttr;
    }

    // Try to extract from email chips/bubbles
    const emailChips = composeWindow.querySelectorAll('[email]');
    if (emailChips.length > 0) {
        const firstChip = emailChips[0];
        const email = firstChip.getAttribute('email');
        if (email) return email;
    }

    // If replying, try to get sender from thread
    const senderElements = document.querySelectorAll('[email]');
    for (const el of senderElements) {
        const email = el.getAttribute('email');
        if (email && !email.includes('me')) { // Exclude own email
            return email;
        }
    }

    return '';
}

function createPolishButton(composeWindow: HTMLElement, myToolbar: HTMLElement) {
    const polishBtn = document.createElement('div');
    polishBtn.setAttribute('data-tooltip', 'Smart Polish Options');
    polishBtn.innerHTML = `
        <div role="button" class="T-I J-J5-Ji aoO T-I-atl L3" style="background: transparent; color: #5f6368; border: 1px solid transparent; border-radius: 4px; padding: 0 4px; height: 24px; line-height: 24px; display: flex; align-items: center; justify-content: center; width: 24px; min-width: 24px; box-shadow: none;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #6366F1;">
                <!-- Sparkle / Magic Wand Icon -->
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
        </div>
    `;
    polishBtn.style.cursor = 'pointer';

    // Hover effect
    const innerBtn = polishBtn.firstElementChild as HTMLElement;
    polishBtn.onmouseenter = () => { innerBtn.style.backgroundColor = '#f1f3f4'; };
    polishBtn.onmouseleave = () => { innerBtn.style.backgroundColor = 'transparent'; };

    // Create Popover logic
    let isMenuOpen = false;

    // Create Menu Element (hidden by default)
    const menu = document.createElement('div');
    menu.className = 'smartmail-polish-menu';
    menu.style.cssText = `
        position: absolute;
        bottom: 30px;
        left: 0;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border: 1px solid #e5e7eb;
        padding: 8px 0;
        min-width: 200px;
        z-index: 10001;
        display: none;
        flex-direction: column;
        font-family: 'Google Sans',Roboto,RobotoDraft,Helvetica,Arial,sans-serif;
        font-size: 14px;
        text-align: left;
    `;

    const menuItems = [
        { label: '✨ Formal / Professional', tone: 'formal' },
        { label: '👋 Casual / Friendly', tone: 'casual' },
        { label: '🎯 Concise / Short', tone: 'concise' }
    ];

    menuItems.forEach(item => {
        const option = document.createElement('div');
        option.textContent = item.label;
        option.style.cssText = `
            padding: 8px 16px;
            cursor: pointer;
            color: #374151;
            transition: background 0.15s;
        `;
        option.onmouseenter = () => { option.style.backgroundColor = '#f3f4f6'; };
        option.onmouseleave = () => { option.style.backgroundColor = 'transparent'; };

        option.onclick = async (e) => {
            e.stopPropagation();
            closeMenu();
            await runPolish(item.tone as any, composeWindow, polishBtn);
        };

        menu.appendChild(option);
    });

    // Separator
    const sep = document.createElement('div');
    sep.style.cssText = 'height: 1px; background: #e5e7eb; margin: 4px 0;';
    menu.appendChild(sep);

    // Help/Context info
    const info = document.createElement('div');
    info.innerHTML = '<span style="font-size:11px; color:#6b7280;">Reads previous email for context</span>';
    info.style.cssText = 'padding: 4px 16px; cursor: default; user-select: none;';
    menu.appendChild(info);

    myToolbar.style.position = 'relative'; // Anchor for menu
    myToolbar.appendChild(menu);

    const toggleMenu = () => {
        isMenuOpen = !isMenuOpen;
        menu.style.display = isMenuOpen ? 'flex' : 'none';
        if (isMenuOpen) {
            // Close if clicking outside
            const closeHandler = (e: MouseEvent) => {
                if (!menu.contains(e.target as Node) && !polishBtn.contains(e.target as Node)) {
                    closeMenu();
                    document.removeEventListener('click', closeHandler);
                }
            };
            setTimeout(() => document.addEventListener('click', closeHandler), 0);
        }
    };

    const closeMenu = () => {
        isMenuOpen = false;
        menu.style.display = 'none';
    };

    polishBtn.onclick = (e) => {
        e.stopPropagation();
        toggleMenu();
    };

    myToolbar.appendChild(polishBtn);
}

async function runPolish(tone: 'formal' | 'casual' | 'concise', composeWindow: HTMLElement, btn: HTMLElement) {
    const bodyContainer = composeWindow.querySelector('div[aria-label="Message Body"]') ||
        composeWindow.querySelector('div[role="textbox"][g_editable="true"]') ||
        composeWindow.querySelector('.Am.Al.editable');

    if (!bodyContainer) {
        alert('Could not find email body.');
        return;
    }

    const originalText = (bodyContainer as HTMLElement).innerText;
    if (!originalText.trim()) {
        alert('Please write some text first.');
        return;
    }

    // Show loading indicator on the icon
    const iconContainer = btn.firstElementChild as HTMLElement;
    const originalIcon = iconContainer.innerHTML;
    // Spinner
    iconContainer.innerHTML = `<svg style="animation: spin 1s linear infinite;" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>`;

    // Add spin style if not exists
    if (!document.getElementById('smartmail-spin-style')) {
        const style = document.createElement('style');
        style.id = 'smartmail-spin-style';
        style.textContent = `@keyframes spin { 100% { transform: rotate(360deg); } }`;
        document.head.appendChild(style);
    }

    try {
        const context = getThreadContext();
        const recipientEmail = getRecipientEmail(composeWindow);

        console.log('SmartMail AI: Polishing with tone:', tone);
        console.log('SmartMail AI: Context found:', context ? context.substring(0, 50) + '...' : 'None');
        console.log('SmartMail AI: Recipient email:', recipientEmail || 'Not found');

        // Add timeout to prevent endless loading
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000);
        });

        const messagePromise = safeSendMessage({
            action: 'polishText',
            text: originalText,
            tone: tone,
            context: context,
            recipientEmail: recipientEmail
        });

        const response = await Promise.race([messagePromise, timeoutPromise]) as any;

        console.log('SmartMail AI: Received response:', response);

        if (response && response.success) {
            // Store original text for undo
            const polishedText = response.text;
            (bodyContainer as HTMLElement).innerText = polishedText;

            // Success flash (Checkmark)
            iconContainer.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

            // Show undo button
            showUndoButton(btn, bodyContainer as HTMLElement, originalText);

            setTimeout(() => { iconContainer.innerHTML = originalIcon; }, 1500);
        } else {
            const errorMsg = response?.error || 'Unknown error';
            console.error('SmartMail AI: Polish failed:', errorMsg);
            alert('Failed to polish email: ' + errorMsg);
            iconContainer.innerHTML = originalIcon;
        }
    } catch (e: any) {
        console.error('SmartMail AI: Polish error:', e);
        alert('Error: ' + (e.message || 'Could not connect to AI service. Check your API key in settings.'));
        iconContainer.innerHTML = originalIcon;
    }
}

function showUndoButton(polishBtn: HTMLElement, bodyContainer: HTMLElement, originalText: string) {
    // Remove existing undo button if any
    const existingUndo = document.querySelector('.smartmail-undo-btn');
    if (existingUndo) existingUndo.remove();

    // Create undo button
    const undoBtn = document.createElement('div');
    undoBtn.className = 'smartmail-undo-btn';
    undoBtn.innerHTML = `
        <div role="button" style="
            display: flex;
            align-items: center;
            gap: 6px;
            background: #FEF3C7;
            color: #92400E;
            border: 1px solid #FCD34D;
            border-radius: 6px;
            padding: 6px 12px;
            font-family: 'Google Sans', Roboto, sans-serif;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: all 0.2s;
            margin-left: 8px;
        ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 7v6h6"></path>
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
            </svg>
            <span>Undo Polish</span>
        </div>
    `;

    // Add hover effect
    const innerBtn = undoBtn.firstElementChild as HTMLElement;
    undoBtn.onmouseenter = () => {
        innerBtn.style.background = '#FDE68A';
        innerBtn.style.transform = 'scale(1.02)';
    };
    undoBtn.onmouseleave = () => {
        innerBtn.style.background = '#FEF3C7';
        innerBtn.style.transform = 'scale(1)';
    };

    // Undo functionality
    undoBtn.onclick = (e) => {
        e.stopPropagation();
        bodyContainer.innerText = originalText;
        undoBtn.remove();
        console.log('SmartMail AI: Reverted to original text');
    };

    // Insert next to polish button
    polishBtn.parentElement?.appendChild(undoBtn);

    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (undoBtn.parentElement) {
            undoBtn.style.opacity = '0';
            undoBtn.style.transition = 'opacity 0.3s';
            setTimeout(() => undoBtn.remove(), 300);
        }
    }, 10000);
}
