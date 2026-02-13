
import { BaseProvider } from './BaseProvider';
import { startSuggestionMonitoring } from '../suggestions';

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
        console.log('SmartMail AI: Initializing Outlook Provider');
        this.injectDebugBanner();
        this.injectSidePanelButton();

        const checkLoaded = setInterval(() => {
            const mainApp = document.getElementById('app') ||
                document.querySelector('[role="main"]') ||
                document.querySelector('.ms-Fabric') ||
                document.body;

            if (mainApp) {
                clearInterval(checkLoaded);
                console.log('SmartMail AI: Outlook loaded, ready for extraction');
                this.injectSidePanelButton();
                this.observeCompose();
            }
        }, 1000);
    }

    injectDebugBanner() {
        const banner = document.createElement('div');
        banner.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; background: orange; color: black;
            text-align: center; z-index: 99999; padding: 2px; font-size: 10px; pointer-events: none; font-weight: bold;
        `;
        banner.textContent = 'SmartMail AI: Outlook Provider Active';
        document.body.appendChild(banner);
        setTimeout(() => banner.remove(), 5000);
    }

    getInboxEmails(): any[] {
        const emails: any[] = [];
        const emailRows = document.querySelectorAll('div[role="option"], div[role="row"], div[data-list-index], div.ms-List-cell');

        console.log(`SmartMail AI: Found ${emailRows.length} email rows (potential)`);

        emailRows.forEach((row, index) => {
            try {
                let sender = 'Unknown';
                let subject = 'No Subject';
                let snippet = '';
                let status = 'read';

                // METHOD 1: Aria Label
                const ariaLabel = row.getAttribute('aria-label');
                if (ariaLabel) {
                    if (ariaLabel.toLowerCase().includes('unread')) {
                        status = 'unread';
                    }
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

                if ((sender !== 'Unknown' && sender.length > 0) || (subject !== 'No Subject' && subject.length > 0)) {
                    emails.push({
                        id: emailId,
                        from: sender,
                        sender: sender,
                        subject: subject,
                        snippet: snippet || subject,
                        date: 'Recent',
                        status: status
                    });
                }
            } catch (e) {
                console.error('Error extracting email:', e);
            }
        });

        return emails;
    }

    async handleArchive(id: string): Promise<boolean> {
        console.log('SmartMail AI: Outlook Archive not fully implemented yet for ID:', id);
        return false;
    }

    async handleDelete(id: string): Promise<boolean> {
        console.log('SmartMail AI: Outlook Delete not fully implemented yet for ID:', id);
        return false;
    }

    observeCompose() {
        console.log('SmartMail AI: Starting Outlook compose observer');
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length) {
                    const editors = document.querySelectorAll('div[contenteditable="true"][role="textbox"], div[aria-label="Message body"]');
                    editors.forEach(editor => {
                        const container = editor.closest('[role="dialog"]') || editor.closest('.ms-Modal') || editor.parentElement;
                        if (container) {
                            this.injectComposeToolbar(container as HTMLElement);
                        }
                    });
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // Initial check
        setTimeout(() => {
            const editors = document.querySelectorAll('div[contenteditable="true"][role="textbox"], div[aria-label="Message body"]');
            editors.forEach(editor => {
                const container = editor.closest('[role="dialog"]') || editor.closest('.ms-Modal') || editor.parentElement;
                if (container) {
                    this.injectComposeToolbar(container as HTMLElement);
                }
            });
        }, 2000);
    }

    injectComposeToolbar(composeWindow: HTMLElement) {
        if (composeWindow.querySelector('.smartmail-polish-toolbar')) return;

        console.log('SmartMail AI: Injecting Outlook Toolbar');

        // Target specific Outlook DOM structure
        // <div class="OTADH"> -> contains Send and Discard
        const sendSplitBtn = composeWindow.querySelector('[data-testid="ComposeSendButton"]');
        const discardBtn = composeWindow.querySelector('#discardCompose');

        let targetArea: HTMLElement | null = null;

        if (sendSplitBtn && sendSplitBtn.parentElement) {
            targetArea = sendSplitBtn.parentElement; // div.OTADH
        } else if (discardBtn && discardBtn.parentElement) {
            targetArea = discardBtn.parentElement;
        } else {
            // Fallback to older selectors
            const sendBtn = composeWindow.querySelector('button[title="Send"], button[aria-label="Send"]');
            if (sendBtn) targetArea = sendBtn.parentElement;
        }

        if (targetArea) {
            const myToolbar = document.createElement('div');
            myToolbar.className = 'smartmail-polish-toolbar';
            myToolbar.style.cssText = 'display: inline-flex; align-items: center; margin-left: 8px; vertical-align: middle;';

            this.createPolishButton(composeWindow, myToolbar);

            // Inject after the existing buttons (usually Send and Discard)
            // If Discard exists, maybe insert before it? Or after?
            // User provided structure shows Send then Discard. Let's append to the end of the container.
            targetArea.appendChild(myToolbar);

            // Also start inline suggestions since we found the compose window
            startSuggestionMonitoring(composeWindow);
        } else {
            console.warn('SmartMail AI: Could not find target area to inject toolbar');
        }
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
            const context = this.getThreadContext();
            const recipientEmail = this.getRecipientEmail(composeWindow);

            console.log('SmartMail AI: Polishing with tone:', tone);

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

    getThreadContext(): string {
        // Outlook groups messages in div[role="list"] usually
        const messageBodies = document.querySelectorAll('div[tabindex="-1"] div.allowTextSelection'); // Very specific OWA class often used

        if (messageBodies.length > 0) {
            // Get the last one that isn't the current draft
            // This is tricky. Let's just grab the visible text from the reading pane
            const readingPane = document.querySelector('[role="main"]');
            return readingPane?.textContent?.substring(0, 1000) || '';
        }
        return '';
    }

    getRecipientEmail(composeWindow: HTMLElement): string {
        // Outlook To field is often in a div with role="textbox" aria-label="To"
        const toField = composeWindow.querySelector('[aria-label="To"]');
        if (toField) {
            // It might be complex structure. Try to get text content or aria-label of children
            const entities = toField.querySelectorAll('.ms-Persona-primaryText');
            if (entities.length > 0) return entities[0].textContent || '';

            return toField.textContent || '';
        }
        return '';
    }
}
