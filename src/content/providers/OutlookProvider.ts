
import { BaseProvider } from './BaseProvider';
import { startSuggestionMonitoring } from '../suggestions';

const DEBUG = import.meta.env.DEV;

export class OutlookProvider extends BaseProvider {
    name = 'Outlook';

    private static STATUS_KEYWORDS = new Set([
        'unread', 'read',
        'high importance', 'low importance',
        'flagged', 'unflagged',
        'collapsed', 'expanded',
        'selected', 'unselected',
        'checked', 'unchecked',
        'has attachments',
        'focused', 'other',
        'recurring',
        'meeting',
        'invite'
    ]);

    init(): void {
        if (DEBUG) console.log('SmartMail AI: Initializing Outlook Provider');
        this.injectSidePanelButton();

        const checkLoaded = setInterval(() => {
            const mainApp = document.getElementById('app') ||
                document.querySelector('[role="main"]') ||
                document.querySelector('.ms-Fabric') ||
                document.body;

            if (mainApp) {
                clearInterval(checkLoaded);
                if (DEBUG) console.log('SmartMail AI: Outlook loaded, ready for extraction');
                this.injectSidePanelButton();
                this.observeCompose();
                this.observeReadingPane();
            }
        }, 1000);
    }

    getInboxEmails(): any[] {
        const emails: any[] = [];
        const emailRows = document.querySelectorAll('div[role="option"], div[role="row"], div[data-list-index], div.ms-List-cell');

        if (DEBUG) console.log(`SmartMail AI: Found ${emailRows.length} email rows (potential)`);

        emailRows.forEach((row, index) => {
            try {
                let sender = 'Unknown';
                let subject = 'No Subject';
                let snippet = '';
                let status = 'read';
                let hasAttachments = false;
                let isStarred = false;

                // METHOD 1: Aria Label
                const ariaLabel = row.getAttribute('aria-label');
                if (ariaLabel) {
                    const lowerAria = ariaLabel.toLowerCase();
                    if (lowerAria.includes('unread')) {
                        status = 'unread';
                    }
                    // Outlook surfaces these states in the row's aria-label.
                    if (lowerAria.includes('has attachment')) hasAttachments = true;
                    if (lowerAria.includes('flagged')) isStarred = true;
                    const parts = ariaLabel.split(',');
                    const contentParts = parts
                        .map(p => p.trim())
                        .filter(p => p.length > 0)
                        .filter(p => !OutlookProvider.STATUS_KEYWORDS.has(p.toLowerCase()))
                        .filter(p => !/^\d{1,2}:\d{2}\s?(?:AM|PM)?$/i.test(p))
                        .filter(p => !/^[A-Za-z]{3}\s\d{1,2}$/i.test(p))
                        .filter(p => !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(p));

                    if (contentParts.length >= 1) sender = contentParts[0];
                    if (contentParts.length >= 2) subject = contentParts[1];
                    if (contentParts.length >= 3) snippet = contentParts[2];
                }

                // METHOD 2: Title Attributes
                if (sender === 'Unknown' || subject === 'No Subject') {
                    const titleElements = row.querySelectorAll('[title]');
                    if (titleElements.length >= 1) {
                        sender = titleElements[0].textContent || sender;
                    }
                    const boldText = row.querySelector('span[style*="font-weight: 600"], span[style*="font-weight: 700"], b, strong');
                    if (boldText) {
                        status = 'unread';
                        if (subject === 'No Subject') subject = boldText.textContent || 'No Subject';
                    }
                }

                const emailId = `outlook-${Date.now()}-${index}`;

                // DOM fallback for attachments if the aria-label didn't state it.
                if (!hasAttachments && row.querySelector('[aria-label*="attachment" i], i[data-icon-name="Attach"]')) {
                    hasAttachments = true;
                }

                if ((sender !== 'Unknown' && sender.length > 0) || (subject !== 'No Subject' && subject.length > 0)) {
                    emails.push({
                        id: emailId,
                        from: sender,
                        sender: sender,
                        subject: subject,
                        snippet: snippet || subject,
                        date: 'Recent',
                        status: status,
                        isUnread: status === 'unread',
                        hasAttachments,
                        threadCount: 1,
                        isStarred
                    });
                }
            } catch (e) {
                console.error('Error extracting email:', e);
            }
        });

        return emails;
    }

    async handleArchive(id: string): Promise<boolean> {
        if (DEBUG) console.log('SmartMail AI: Outlook Archive not implemented, id:', id);
        return false;
    }

    async handleDelete(id: string): Promise<boolean> {
        if (DEBUG) console.log('SmartMail AI: Outlook Delete not implemented, id:', id);
        return false;
    }

    observeCompose() {
        if (DEBUG) console.log('SmartMail AI: Starting Outlook compose observer');

        const SEND_BUTTON_SELECTORS = [
            '[data-testid="ComposeSendButton"]',
            '[aria-label="Send"]',
            'button[title="Send"]',
            '[data-automation-id="sendButton"]',
            '#discardCompose',
            '[aria-label="Discard"]',
        ];

        const findComposeContainer = (editor: Element): HTMLElement | null => {
            // Skip non-body fields (To, CC, BCC, Subject, Search)
            const ariaLabel = editor.getAttribute('aria-label') || '';
            if (/^(To|CC|BCC|Subject|Search)/i.test(ariaLabel)) return null;

            // Prefer a named compose container higher up
            const named =
                editor.closest('[role="dialog"]') as HTMLElement ||
                editor.closest('.ms-Modal') as HTMLElement ||
                editor.closest('[class*="compose" i]') as HTMLElement;
            if (named) return named;

            // Walk up to find a container that also holds the Send button
            let el = editor.parentElement;
            for (let depth = 0; depth < 15 && el && el !== document.body; depth++) {
                for (const sel of SEND_BUTTON_SELECTORS) {
                    if (el.querySelector(sel)) return el;
                }
                el = el.parentElement;
            }

            // Last resort: 3 levels up
            return (editor.parentElement?.parentElement?.parentElement ||
                editor.parentElement?.parentElement ||
                editor.parentElement) as HTMLElement | null;
        };

        const tryInjectAll = () => {
            // Target the compose body editor. New Outlook (Fluent UI) doesn't always
            // expose role="textbox" on the editor, but the body is reliably labelled
            // "Message body", so match on either signal.
            document.querySelectorAll<HTMLElement>(
                'div[contenteditable="true"][role="textbox"], div[contenteditable="true"][aria-label^="Message body" i]'
            ).forEach(editor => {
                // Skip the read-only reading-pane body, which is contenteditable but is
                // marked aria-readonly or role="document" in new Outlook.
                if (editor.getAttribute('aria-readonly') === 'true') return;
                if (editor.getAttribute('role') === 'document') return;
                const container = findComposeContainer(editor);
                if (container) this.injectComposeToolbar(container);
            });
        };

        const observer = new MutationObserver(tryInjectAll);
        observer.observe(document.body, { childList: true, subtree: true });

        // Retry on a schedule — compose can appear 1–5 s after clicking New Message
        setTimeout(tryInjectAll, 1000);
        setTimeout(tryInjectAll, 2500);
        setTimeout(tryInjectAll, 5000);
    }

    observeReadingPane() {
        if (DEBUG) console.log('SmartMail AI: Starting Outlook reading pane observer');

        const tryInject = () => {
            // The reading toolbar is div[role="toolbar"] that contains a Reply menuitem.
            // Matches the Fluent UI toolbar seen in new Outlook Web.
            document.querySelectorAll<HTMLElement>('div[role="toolbar"]').forEach(toolbar => {
                if (toolbar.querySelector('.smartmail-reading-polish-btn')) return;
                if (!toolbar.querySelector('[aria-label="Reply"]')) return;
                this.injectReadingPolishButton(toolbar);
            });
        };

        const observer = new MutationObserver(tryInject);
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(tryInject, 500);
        setTimeout(tryInject, 2000);
        setTimeout(tryInject, 4000);
    }

    injectReadingPolishButton(toolbar: HTMLElement) {
        const btn = document.createElement('div');
        btn.className = 'smartmail-reading-polish-btn';
        btn.setAttribute('role', 'menuitem');
        btn.setAttribute('tabindex', '0');
        btn.setAttribute('aria-label', 'Polish with SmartMail AI');
        btn.style.cssText = [
            'display:inline-flex', 'align-items:center', 'gap:5px',
            'padding:4px 10px', 'cursor:pointer', 'border-radius:4px',
            'color:#0078D4', 'font-family:Segoe UI,sans-serif', 'font-size:14px',
            'font-weight:500', 'user-select:none', 'transition:background 0.15s',
        ].join(';');
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span>Polish</span>
        `;
        btn.onmouseenter = () => { btn.style.backgroundColor = 'rgba(0,120,212,0.08)'; };
        btn.onmouseleave = () => { btn.style.backgroundColor = ''; };

        btn.onclick = async (e) => {
            e.stopPropagation();

            // Try to click Reply first so the compose area opens
            const replyBtn = toolbar.querySelector<HTMLElement>('[aria-label="Reply"]');
            if (replyBtn) replyBtn.click();

            // Open the side panel for SmartDrafter
            await this.safeSendMessage({ action: 'openSidePanel' });
        };

        // Insert before "More items" overflow button, if present
        const moreBtn = toolbar.querySelector<HTMLElement>('[aria-label="More items"]');
        if (moreBtn) {
            toolbar.insertBefore(btn, moreBtn);
        } else {
            toolbar.appendChild(btn);
        }

        if (DEBUG) console.log('SmartMail AI: Injected reading toolbar Polish button');
    }

    injectComposeToolbar(composeWindow: HTMLElement) {
        if (composeWindow.querySelector('.smartmail-polish-toolbar')) return;
        if (DEBUG) console.log('SmartMail AI: Injecting Outlook Toolbar');

        // Try to anchor next to the Send/Discard buttons (preferred)
        const buttonSelectors = [
            '[data-testid="ComposeSendButton"]',
            '[aria-label="Send"]',
            'button[title="Send"]',
            '#discardCompose',
            '[aria-label="Discard"]',
            '[data-automation-id="sendButton"]',
        ];

        let targetArea: HTMLElement | null = null;
        for (const sel of buttonSelectors) {
            const el = composeWindow.querySelector(sel);
            if (el?.parentElement) { targetArea = el.parentElement as HTMLElement; break; }
        }

        if (targetArea) {
            const myToolbar = document.createElement('div');
            myToolbar.className = 'smartmail-polish-toolbar';
            myToolbar.style.cssText = 'display: inline-flex; align-items: center; margin-left: 8px; vertical-align: middle; position: relative;';
            this.createPolishButton(composeWindow, myToolbar);
            targetArea.appendChild(myToolbar);
            startSuggestionMonitoring(composeWindow);
            return;
        }

        // Fallback: inject a toolbar row above the compose body.
        // Works when Outlook's button row uses internal class names we can't target.
        const bodyEl = composeWindow.querySelector(
            'div[contenteditable="true"][role="textbox"], div[aria-label="Message body"], [contenteditable="true"]'
        ) as HTMLElement | null;

        if (bodyEl?.parentElement) {
            const floatingToolbar = document.createElement('div');
            floatingToolbar.className = 'smartmail-polish-toolbar';
            floatingToolbar.style.cssText = [
                'display:flex', 'align-items:center', 'gap:6px',
                'padding:4px 8px', 'border-bottom:1px solid rgba(0,0,0,0.1)',
                'background:#fff', 'position:relative', 'z-index:1',
            ].join(';');
            this.createPolishButton(composeWindow, floatingToolbar);
            bodyEl.parentElement.insertBefore(floatingToolbar, bodyEl);
            startSuggestionMonitoring(composeWindow);
            return;
        }

        if (DEBUG) console.warn('SmartMail AI: Could not find compose area to inject toolbar');
    }

    createPolishButton(composeWindow: HTMLElement, myToolbar: HTMLElement) {
        const polishBtn = document.createElement('button'); // Use button for better a11y
        polishBtn.setAttribute('data-tooltip', 'Smart Polish Options');
        polishBtn.className = 'smartmail-outlook-btn';
        polishBtn.innerHTML = `
             <div style="display: flex; align-items: center; gap: 4px; font-weight: 600;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                </svg>
                <span>Polish</span>
            </div>
        `;
        // Outlook style button
        polishBtn.style.cssText = `
            background: transparent;
            border: 1px solid #d1d5db; /* Light gray border */
            border-radius: 4px;
            padding: 4px 8px;
            color: #0078D4; /* Outlook Blue */
            font-size: 14px;
            cursor: pointer;
            display: flex;
            align-items: center;
            transition: all 0.2s;
        `;

        polishBtn.onmouseenter = () => { polishBtn.style.backgroundColor = '#f3f4f6'; };
        polishBtn.onmouseleave = () => { polishBtn.style.backgroundColor = 'transparent'; };

        let isMenuOpen = false;

        const menu = document.createElement('div');
        menu.className = 'smartmail-polish-menu';
        menu.style.cssText = `
            position: absolute;
            bottom: 40px; /* Adjusted for Outlook toolbar usually at bottom */
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
            font-family: 'Segoe UI', sans-serif;
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
                e.preventDefault();
                e.stopPropagation();
                closeMenu();
                await this.runPolish(item.tone as any, composeWindow, polishBtn);
            };

            menu.appendChild(option);
        });

        const sep = document.createElement('div');
        sep.style.cssText = 'height: 1px; background: #e5e7eb; margin: 4px 0;';
        menu.appendChild(sep);

        const info = document.createElement('div');
        info.innerHTML = '<span style="font-size:11px; color:#6b7280;">Reads previous email for context</span>';
        info.style.cssText = 'padding: 4px 16px; cursor: default; user-select: none;';
        menu.appendChild(info);

        myToolbar.style.position = 'relative'; // Anchor for relative positioning
        myToolbar.appendChild(menu);

        const toggleMenu = () => {
            isMenuOpen = !isMenuOpen;
            menu.style.display = isMenuOpen ? 'flex' : 'none';
            if (isMenuOpen) {
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
            e.preventDefault(); // Prevent accidental form submit
            e.stopPropagation();
            toggleMenu();
        };

        myToolbar.appendChild(polishBtn);
    }

    async runPolish(tone: 'formal' | 'casual' | 'concise', composeWindow: HTMLElement, btn: HTMLElement) {
        const bodyContainer = composeWindow.querySelector('div[contenteditable="true"][role="textbox"], div[aria-label="Message body"]');

        if (!bodyContainer) {
            alert('Could not find email body.');
            return;
        }

        const originalText = (bodyContainer as HTMLElement).innerText;
        if (!originalText.trim()) {
            alert('Please write some text first.');
            return;
        }

        // Loading State
        const originalContent = btn.innerHTML;
        btn.innerHTML = `<svg style="animation: spin 1s linear infinite;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg> Polishing...`;
        btn.setAttribute('disabled', 'true');

        if (!document.getElementById('smartmail-spin-style')) {
            const style = document.createElement('style');
            style.id = 'smartmail-spin-style';
            style.textContent = `@keyframes spin { 100% { transform: rotate(360deg); } }`;
            document.head.appendChild(style);
        }

        try {
            const context = this.getThreadContext(composeWindow);
            const recipientEmail = this.getRecipientEmail(composeWindow);

            if (DEBUG) console.log('SmartMail AI: Polishing with tone:', tone);

            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000);
            });

            const messagePromise = this.safeSendMessage({
                action: 'polishText',
                text: originalText,
                tone: tone,
                context: context,
                recipientEmail: recipientEmail
            });

            const response = await Promise.race([messagePromise, timeoutPromise]) as any;

            if (response && response.success) {
                const polishedText = response.text;
                (bodyContainer as HTMLElement).innerText = polishedText; // Outlook handles innerText updates usually

                btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Done!`;

                this.showUndoButton(btn, bodyContainer as HTMLElement, originalText);

                setTimeout(() => {
                    btn.innerHTML = originalContent;
                    btn.removeAttribute('disabled');
                }, 1500);
            } else {
                const errorMsg = response?.error || 'Unknown error';
                console.error('SmartMail AI: Polish failed:', errorMsg);
                alert('Failed to polish email: ' + errorMsg);
                btn.innerHTML = originalContent;
                btn.removeAttribute('disabled');
            }
        } catch (e: any) {
            console.error('SmartMail AI: Polish error:', e);
            alert('Error: ' + (e.message || 'Could not connect to AI service. Check your API key in settings.'));
            btn.innerHTML = originalContent;
            btn.removeAttribute('disabled');
        }
    }

    showUndoButton(polishBtn: HTMLElement, bodyContainer: HTMLElement, originalText: string) {
        const existingUndo = document.querySelector('.smartmail-undo-btn');
        if (existingUndo) existingUndo.remove();

        const undoBtn = document.createElement('div');
        undoBtn.className = 'smartmail-undo-btn';
        undoBtn.style.cssText = `
            display: flex; align-items: center; gap: 6px; background: #FEF3C7; color: #92400E;
            border: 1px solid #FCD34D; border-radius: 6px; padding: 4px 8px;
            font-family: 'Segoe UI', sans-serif; font-size: 12px; font-weight: 500;
            cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.2s; margin-left: 8px;
        `;
        undoBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
            </svg>
            <span>Undo</span>
        `;

        undoBtn.onclick = (e) => {
            e.stopPropagation();
            bodyContainer.innerText = originalText;
            undoBtn.remove();
        };

        polishBtn.parentElement?.appendChild(undoBtn);

        setTimeout(() => {
            if (undoBtn.parentElement) {
                undoBtn.style.opacity = '0';
                undoBtn.style.transition = 'opacity 0.3s';
                setTimeout(() => undoBtn.remove(), 300);
            }
        }, 10000);
    }

    injectSidePanelButton() {
        // Outlook-specific button styling
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
                <span>SmartMail</span>
            </div>
        `;
        button.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 999999;
            padding: 12px 20px;
            background: #0078D4;
            color: white;
            border: none;
            border-radius: 16px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            font-family: 'Segoe UI', sans-serif;
            font-weight: 600;
        `;

        button.onclick = () => {
            this.safeSendMessage({ action: 'openSidePanel' });
        };

        document.body.appendChild(button);
    }

    getThreadContext(composeWindow?: HTMLElement): string {
        // Only a reply/forward carries the quoted original inside the compose body.
        // For a new message there is no quote, so don't borrow context from the
        // reading pane of whatever message is open behind the compose window.
        const quoted = composeWindow?.querySelector(
            '#divRplyFwdMsg, [id*="OriginalMessage" i], blockquote'
        );
        if (quoted) {
            return (quoted as HTMLElement).innerText?.substring(0, 1000) || '';
        }
        return '';
    }

    getRecipientEmail(composeWindow: HTMLElement): string {
        // Outlook's To well is labelled "To"; match it within THIS compose window only.
        const toField = composeWindow.querySelector('[aria-label^="To" i]');
        if (!toField) return '';

        // Resolved recipients render as personas / pills exposing the name or address.
        const persona = toField.querySelector('.ms-Persona-primaryText');
        if (persona?.textContent?.trim()) return persona.textContent.trim();

        const pill = toField.querySelector('[role="button"][title], button[title]');
        const title = pill?.getAttribute('title')?.trim();
        if (title) return title;

        // Fall back to typed-but-unresolved text, ignoring the "To" placeholder label.
        const text = (toField as HTMLElement).innerText?.trim();
        if (text && !/^to\b/i.test(text)) return text;

        return '';
    }
}
