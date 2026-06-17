
import { BaseProvider } from './BaseProvider';
import { startSuggestionMonitoring } from '../suggestions';

const DEBUG = import.meta.env.DEV;

export class GmailProvider extends BaseProvider {
    name = 'Gmail';

    init(): void {
if (DEBUG) console.log('SmartMail AI: Initializing Gmail Provider');
        setTimeout(() => {
            if (document.querySelector('tr.zA')) {
                this.injectSidePanelButton();
if (DEBUG) console.log('SmartMail AI: Side panel button injected');
            }
            this.observeCompose();
        }, 2000);
    }

    getInboxEmails(): any[] {
        const emails: any[] = [];
        let emailRows = document.querySelectorAll('tr.zA');
        if (emailRows.length === 0) {
            emailRows = document.querySelectorAll('div[data-message-id]');
        }

if (DEBUG) console.log(`SmartMail AI: Found ${emailRows.length} emails`);

        emailRows.forEach((row, index) => {
            try {
                let sender = 'Unknown';
                let subject = 'No Subject';
                let snippet = '';
                let date = 'Recent';
                let fullDate = '';
                let emailId = `gmail-${Date.now()}-${index}`;
                let isUnread = false;
                let hasAttachments = false;
                let threadCount = 1;
                let isStarred = false;

                if (row.tagName === 'TR') {
                    const senderEl = row.querySelector('.yW span[email], .yW span');
                    const subjectEl = row.querySelector('.y6 span, .bog span');
                    const snippetEl = row.querySelector('.y2');
                    const dateEl = row.querySelector('.xW span, .xW');

                    sender = senderEl?.getAttribute('email') || senderEl?.textContent || 'Unknown';
                    subject = subjectEl?.textContent || 'No Subject';
                    snippet = snippetEl?.textContent || '';
                    date = dateEl?.textContent || 'Recent';
                    // The date element carries the precise timestamp in its title attribute.
                    fullDate = row.querySelector('.xW span[title]')?.getAttribute('title') || '';

                    const messageId = row.getAttribute('data-legacy-message-id') ||
                        row.getAttribute('data-message-id') ||
                        row.id;
                    if (messageId) emailId = messageId;

                    // Real signals parsed from Gmail's row markup (with safe fallbacks).
                    isUnread = row.classList.contains('zE');
                    isStarred = this.detectStarred(row);
                    hasAttachments = this.detectAttachments(row);
                    threadCount = this.detectThreadCount(row);
                } else {
                    const senderEl = row.querySelector('[email]');
                    const subjectEl = row.querySelector('h2, h3');
                    const snippetEl = row.querySelector('.a3s');

                    sender = senderEl?.getAttribute('email') || senderEl?.textContent || 'Unknown';
                    subject = subjectEl?.textContent || 'No Subject';
                    snippet = snippetEl?.textContent?.substring(0, 2048) || '';

                    emailId = row.getAttribute('data-message-id') || emailId;
                    hasAttachments = this.detectAttachments(row);
                }

                emails.push({
                    id: emailId,
                    from: sender,
                    sender: sender.split('@')[0] || sender,
                    subject: subject,
                    snippet: snippet,
                    date: date,
                    fullDate: fullDate,
                    status: isUnread ? 'unread' : 'read',
                    isUnread,
                    hasAttachments,
                    threadCount,
                    isStarred
                });
            } catch (e) {
                console.error('Error extracting email:', e);
            }
        });

        return emails;
    }

    /**
     * Best-effort detection of real row signals. Each falls back to a non-fabricated
     * default (false / 1) if Gmail's markup doesn't match â€” we never invent a value.
     */
    private detectStarred(row: Element): boolean {
        // Gmail's star control exposes its state via aria-label ("Starred" vs "Not starred").
        const star = row.querySelector('[aria-label="Starred"], span.T-KT.T-KT-Jp, .apU [aria-pressed="true"]');
        return !!star;
    }

    private detectAttachments(row: Element): boolean {
        // Attachment chips / paperclip indicators in the list row.
        const att = row.querySelector(
            '.aZo, .aQy, .brc, [aria-label*="attachment" i], [data-tooltip*="attachment" i]'
        );
        return !!att;
    }

    private detectThreadCount(row: Element): number {
        // Gmail renders the conversation message count next to the sender, e.g. "(3)".
        const countEl = row.querySelector('.bx0, .bze');
        if (countEl) {
            const n = parseInt((countEl.textContent || '').replace(/[^\d]/g, ''), 10);
            if (!isNaN(n) && n > 0) return n;
        }
        return 1;
    }

    async handleArchive(emailId: string): Promise<boolean> {
if (DEBUG) console.log('SmartMail AI: Attempting to archive email with ID:', emailId);
        let row = document.querySelector(`tr[data-legacy-message-id="${emailId}"]`) ||
            document.querySelector(`tr[data-message-id="${emailId}"]`) ||
            document.querySelector(`tr[id="${emailId}"]`) ||
            document.querySelector(`div[data-message-id="${emailId}"]`);

        if (!row) {
            console.error('SmartMail AI: Email row not found for ID:', emailId);
            return false;
        }

        const archiveBtn = row.querySelector('[data-tooltip="Archive"]') as HTMLElement ||
            row.querySelector('[aria-label*="Archive"]') as HTMLElement ||
            row.querySelector('[aria-label*="archive"]') as HTMLElement;

        if (archiveBtn) {
            archiveBtn.click();
            return true;
        }

        const checkbox = row.querySelector('input[type="checkbox"]') as HTMLInputElement;
        if (checkbox) {
            checkbox.click();
            setTimeout(() => {
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
        return false;
    }

    async handleDelete(emailId: string): Promise<boolean> {
if (DEBUG) console.log('SmartMail AI: Attempting to delete email with ID:', emailId);
        let row = document.querySelector(`tr[data-legacy-message-id="${emailId}"]`) ||
            document.querySelector(`tr[data-message-id="${emailId}"]`) ||
            document.querySelector(`tr[id="${emailId}"]`) ||
            document.querySelector(`div[data-message-id="${emailId}"]`);

        if (!row) return false;

        const deleteBtn = row.querySelector('[data-tooltip="Delete"]') as HTMLElement ||
            row.querySelector('[aria-label*="Delete"]') as HTMLElement ||
            row.querySelector('[aria-label*="delete"]') as HTMLElement;

        if (deleteBtn) {
            deleteBtn.click();
            return true;
        }

        const checkbox = row.querySelector('input[type="checkbox"]') as HTMLInputElement;
        if (checkbox) {
            if (!checkbox.checked) checkbox.click();
            setTimeout(() => {
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
        return false;
    }

    injectSidePanelButton() {
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

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes pulse {
                0%, 100% { box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4), 0 0 0 0 rgba(99, 102, 241, 0.5); }
                50% { box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4), 0 0 0 8px rgba(99, 102, 241, 0); }
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
            button.style.transform = 'scale(0.95)';
            setTimeout(() => { button.style.transform = 'scale(1)'; }, 150);
            this.safeSendMessage({ action: 'openSidePanel' });
        };

        document.body.appendChild(button);
    }

    observeCompose() {
        const processedWindows = new WeakSet<Element>();
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length) {
                    const composeSelectors = [
                        'div[role="dialog"]',
                        'div[role="region"]',
                        'td.Bu',
                        'div.M9',
                        'div.aoI',
                    ];

                    composeSelectors.forEach(selector => {
                        const windows = document.querySelectorAll(selector);
                        windows.forEach(window => {
                            if (processedWindows.has(window)) return;

                            const hasSendButton = window.querySelector('div[role="button"][data-tooltip*="Send"]') ||
                                window.querySelector('div[command="Send"]') ||
                                window.querySelector('[aria-label*="Send"]');

                            const hasComposeBody = window.querySelector('div[aria-label*="Message Body"]') ||
                                window.querySelector('div[role="textbox"][g_editable="true"]') ||
                                window.querySelector('.Am.Al.editable');

                            if (hasSendButton || hasComposeBody) {
                                processedWindows.add(window);
                                this.injectComposeToolbar(window as HTMLElement);
                            }
                        });
                    });
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => {
            const existingComposeWindows = document.querySelectorAll('div[role="dialog"], div.M9, td.Bu');
            existingComposeWindows.forEach(window => {
                if (processedWindows.has(window)) return;
                const hasSendButton = window.querySelector('div[role="button"][data-tooltip*="Send"]') ||
                    window.querySelector('[aria-label*="Send"]');
                if (hasSendButton) {
                    processedWindows.add(window);
                    this.injectComposeToolbar(window as HTMLElement);
                }
            });
        }, 1000);
    }

    injectComposeToolbar(composeWindow: HTMLElement) {
        if (composeWindow.querySelector('.smartmail-polish-toolbar')) return;

        let toolbarRow = composeWindow.querySelector('.btC') ||
            composeWindow.querySelector('tr.n1tfz') ||
            composeWindow.querySelector('.gU.Up');

        if (!toolbarRow) {
            const sendBtn = composeWindow.querySelector('div[role="button"][data-tooltip*="Send"]');
            if (sendBtn) {
                toolbarRow = (sendBtn.closest('tr') as HTMLElement) || (sendBtn.parentElement?.parentElement as HTMLElement);
            }
        }

        if (!toolbarRow) return;

        const myToolbar = document.createElement('div');
        myToolbar.className = 'smartmail-polish-toolbar';
        myToolbar.style.cssText = `
            display: flex;
            align-items: center;
            gap: 0;
            margin-left: 4px;
            padding-right: 4px;
        `;

        this.createPolishButton(composeWindow, myToolbar);

        const formattingContainer = toolbarRow.querySelector('div[data-tooltip="Formatting options"]') ||
            toolbarRow.querySelector('div[aria-label="Formatting options"]');

        if (formattingContainer) {
            const parentTd = formattingContainer.closest('td');
            if (parentTd && parentTd.parentElement === toolbarRow) {
                const myTd = document.createElement('td');
                myTd.className = 'gU smartmail-td';
                myTd.appendChild(myToolbar);
                parentTd.insertAdjacentElement('afterend', myTd);
                startSuggestionMonitoring(composeWindow);
                return;
            }
        }

        const formattingBtn = toolbarRow.querySelector('div[command="+a"]') ||
            toolbarRow.querySelector('.dv') ||
            toolbarRow.querySelector('.a8x');

        if (formattingBtn) {
            formattingBtn.insertAdjacentElement('afterend', myToolbar);
        } else {
            toolbarRow.appendChild(myToolbar);
        }

        startSuggestionMonitoring(composeWindow);
    }

    createPolishButton(composeWindow: HTMLElement, myToolbar: HTMLElement) {
        const polishBtn = document.createElement('div');
        polishBtn.setAttribute('data-tooltip', 'Smart Polish Options');
        polishBtn.innerHTML = `
            <div role="button" class="T-I J-J5-Ji aoO T-I-atl L3" style="background: transparent; color: #5f6368; border: 1px solid transparent; border-radius: 4px; padding: 0 4px; height: 24px; line-height: 24px; display: flex; align-items: center; justify-content: center; width: 24px; min-width: 24px; box-shadow: none;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #6366F1;">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                </svg>
            </div>
        `;
        polishBtn.style.cursor = 'pointer';

        const innerBtn = polishBtn.firstElementChild as HTMLElement;
        polishBtn.onmouseenter = () => { innerBtn.style.backgroundColor = '#f1f3f4'; };
        polishBtn.onmouseleave = () => { innerBtn.style.backgroundColor = 'transparent'; };

        let isMenuOpen = false;

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
            { label: 'âœ¨ Formal / Professional', tone: 'formal' },
            { label: 'ðŸ‘‹ Casual / Friendly', tone: 'casual' },
            { label: 'ðŸŽ¯ Concise / Short', tone: 'concise' }
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

        myToolbar.style.position = 'relative';
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
            e.stopPropagation();
            toggleMenu();
        };

        myToolbar.appendChild(polishBtn);
    }

    async runPolish(tone: 'formal' | 'casual' | 'concise', composeWindow: HTMLElement, btn: HTMLElement) {
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

        const iconContainer = btn.firstElementChild as HTMLElement;
        const originalIcon = iconContainer.innerHTML;
        iconContainer.innerHTML = `<svg style="animation: spin 1s linear infinite;" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>`;

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
                (bodyContainer as HTMLElement).innerText = polishedText;

                iconContainer.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

                this.showUndoButton(btn, bodyContainer as HTMLElement, originalText);

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

    showUndoButton(polishBtn: HTMLElement, bodyContainer: HTMLElement, originalText: string) {
        const existingUndo = document.querySelector('.smartmail-undo-btn');
        if (existingUndo) existingUndo.remove();

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

        const innerBtn = undoBtn.firstElementChild as HTMLElement;
        undoBtn.onmouseenter = () => {
            innerBtn.style.background = '#FDE68A';
            innerBtn.style.transform = 'scale(1.02)';
        };
        undoBtn.onmouseleave = () => {
            innerBtn.style.background = '#FEF3C7';
            innerBtn.style.transform = 'scale(1)';
        };

        undoBtn.onclick = (e) => {
            e.stopPropagation();
            bodyContainer.innerText = originalText;
            undoBtn.remove();
if (DEBUG) console.log('SmartMail AI: Reverted to original text');
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

    getThreadContext(composeWindow?: HTMLElement): string {
        // Only a reply/forward carries the quoted original inside the compose itself.
        // A brand-new message has no quote, so we must NOT borrow context from whatever
        // thread happens to be open behind the compose dialog.
        const quote = composeWindow?.querySelector('.gmail_quote, blockquote.gmail_quote');
        if (quote) {
            return (quote as HTMLElement).innerText?.substring(0, 1000) || '';
        }
        return '';
    }

    getRecipientEmail(composeWindow: HTMLElement): string {
        // The hidden "to" input holds the actual recipient(s) once one is added.
        const toInput = composeWindow.querySelector('input[name="to"]') as HTMLInputElement | null;
        if (toInput?.value) return toInput.value.split(',')[0].trim();

        // Otherwise read a recipient chip, but ONLY from the To area — not from the
        // quoted original below (a reply's quote also carries the sender's [email]).
        const toArea = composeWindow.querySelector('[aria-label="To recipients"], .aoD, [name="to"]');
        const chip = toArea?.querySelector('[email]') as HTMLElement | null;
        const chipEmail = chip?.getAttribute('email');
        if (chipEmail) return chipEmail;

        // New message with no recipient filled in yet — don't guess from the inbox.
        return '';
    }
}
