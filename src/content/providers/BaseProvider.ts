
export interface IEmailProvider {
    name: string;

    // Initialize the provider (add observers, etc.)
    init(): void;

    // Get list of emails from the current view (inbox/thread list)
    getInboxEmails(): any[];

    // Actions on emails
    handleArchive(id: string): Promise<boolean>;
    handleDelete(id: string): Promise<boolean>;

    // Compose window handling
    observeCompose(): void;

    // Specific to polishing
    getThreadContext(composeWindow?: HTMLElement): string;
    getRecipientEmail(composeWindow: HTMLElement): string;
}

export abstract class BaseProvider implements IEmailProvider {
    abstract name: string;

    abstract init(): void;
    abstract getInboxEmails(): any[];
    abstract handleArchive(id: string): Promise<boolean>;
    abstract handleDelete(id: string): Promise<boolean>;
    abstract observeCompose(): void;
    abstract getThreadContext(composeWindow?: HTMLElement): string;
    abstract getRecipientEmail(composeWindow: HTMLElement): string;

    // Helper to safely send messages to background
    async safeSendMessage(message: any): Promise<any> {
        try {
            return await chrome.runtime.sendMessage(message);
        } catch (error: any) {
            if (error.message?.includes('Extension context invalidated')) {
                console.error('SmartMail AI: Context invalidated');
                this.showContextInvalidatedAlert();
                return { error: 'Extension context invalidated' };
            }
            throw error;
        }
    }

    showContextInvalidatedAlert() {
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
        setTimeout(() => alert.remove(), 5000);
    }
}
