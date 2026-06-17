// Thin client for React components / content scripts.
// Routes all AI calls through the background worker so API keys stay
// in a single context and the PQueue / caching layer is centralised.

function send<T>(message: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            if (!response || !response.success) {
                reject(new Error(response?.error ?? 'AI request failed'));
                return;
            }
            resolve(response.data as T);
        });
    });
}

export const aiClient = {
    classify(subject: string, snippet: string): Promise<number> {
        return send({ action: 'ai:classify', subject, snippet });
    },

    summarize(text: string): Promise<string> {
        return send({ action: 'ai:summarize', text });
    },

    generate(prompt: string): Promise<string> {
        return send({ action: 'ai:generate', prompt });
    },

    polish(
        text: string,
        tone: 'formal' | 'casual' | 'concise' = 'formal',
        context?: string,
        recipientEmail?: string
    ): Promise<string> {
        return send({ action: 'ai:polish', text, tone, context, recipientEmail });
    },

    draft(
        original: { subject: string; from: string; snippet: string },
        intent: string
    ): Promise<string> {
        return send({ action: 'ai:draft', original, intent });
    },
};
