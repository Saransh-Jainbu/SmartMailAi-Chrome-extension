import { aiService } from '../services/ai';

const DEBUG = import.meta.env.DEV;
if (DEBUG) console.log('SmartMail AI Background Service Worker Started');

chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        chrome.tabs.create({ url: 'welcome.html' });
    }
    if (DEBUG) console.log('Extension installed');
});

type MessageHandler = (
    request: Record<string, unknown>,
    sendResponse: (r: Record<string, unknown>) => void
) => void;

function ok(data: unknown): Record<string, unknown> {
    return { success: true, data };
}

function err(e: unknown): Record<string, unknown> {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
}

const handlers: Record<string, MessageHandler> = {
    'ai:classify': (req, res) => {
        aiService
            .classifyEmail(req.subject as string, req.snippet as string)
            .then((score) => res(ok(score)))
            .catch((e) => res(err(e)));
    },
    'ai:summarize': (req, res) => {
        aiService
            .summarize(req.text as string)
            .then((s) => res(ok(s)))
            .catch((e) => res(err(e)));
    },
    'ai:generate': (req, res) => {
        aiService
            .generate(req.prompt as string)
            .then((s) => res(ok(s)))
            .catch((e) => res(err(e)));
    },
    'ai:polish': (req, res) => {
        aiService
            .polishEmail(
                req.text as string,
                (req.tone as 'formal' | 'casual' | 'concise') || 'formal',
                req.context as string | undefined,
                req.recipientEmail as string | undefined
            )
            .then((s) => res(ok(s)))
            .catch((e) => res(err(e)));
    },
    'ai:draft': (req, res) => {
        aiService
            .draftReply(
                req.original as { subject: string; from: string; snippet: string },
                req.intent as string
            )
            .then((s) => res(ok(s)))
            .catch((e) => res(err(e)));
    },
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const action = request.action as string;
    if (DEBUG) console.log('SmartMail AI Background: Received message:', action);

    if (action === 'openSidePanel' && sender.tab?.id) {
        chrome.sidePanel.open({ tabId: sender.tab.id });
        sendResponse({ success: true });
        return true;
    }

    // Legacy handler kept for backward compat with content scripts.
    if (action === 'polishText') {
        aiService
            .polishEmail(request.text, request.tone || 'formal', request.context, request.recipientEmail)
            .then((text) => sendResponse({ success: true, text }))
            .catch((e) => sendResponse({ success: false, error: e instanceof Error ? e.message : String(e) }));
        return true;
    }

    if (handlers[action]) {
        handlers[action](request, sendResponse);
        return true;
    }

    return true;
});
