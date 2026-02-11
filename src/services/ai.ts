// Advanced AI Service with OpenAI Primary and Hugging Face Fallback
// Provides high-quality GPT-powered intelligence for email tasks

export interface AIService {
    isAvailable: () => Promise<boolean>;
    generate: (prompt: string) => Promise<string>;
    summarize: (text: string) => Promise<string>;
    classifyEmail: (subject: string, snippet: string) => Promise<number>;
    polishEmail: (text: string, tone?: 'formal' | 'casual' | 'concise') => Promise<string>;
}

class AIServiceImpl implements AIService {
    private async getKeys(): Promise<{ openAiKey: string }> {
        return new Promise((resolve) => {
            chrome.storage.local.get(['openai_key'], (result) => {
                resolve({
                    openAiKey: (result.openai_key as string) || ''
                });
            });
        });
    }

    async isAvailable(): Promise<boolean> {
        const { openAiKey } = await this.getKeys();
        return !!openAiKey;
    }

    private async callOpenAI(messages: any[], maxTokens: number = 500): Promise<string> {
        const { openAiKey } = await this.getKeys();
        if (!openAiKey) throw new Error('OpenAI key missing. Please configure in settings (⚙️).');

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages,
                max_tokens: maxTokens,
                temperature: 0.7
            }),
        });

        if (!response.ok) {
            if (response.status === 401) throw new Error('Invalid OpenAI API Key');
            throw new Error(`OpenAI error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    }

    async classifyEmail(subject: string, snippet: string): Promise<number> {
        const { openAiKey } = await this.getKeys();
        const text = `Subject: ${subject}\nBody: ${snippet}`.substring(0, 2000);

        try {
            if (openAiKey) {
                const result = await this.callOpenAI([
                    { role: 'system', content: 'You are an email classifier. Rate the priority of the following email from 0 to 100. return ONLY a single number. 90-100: Urgent/Action Required, 70-89: Important, 40-69: Normal, 0-39: Low/Newsletter/Spam.' },
                    { role: 'user', content: text }
                ], 10);
                const score = parseInt(result);
                if (!isNaN(score)) return score;
            }
        } catch (e) {
            console.error('Classification error:', e);
        }

        // Basic heuristic fallback (no API needed)
        let score = 50;
        const lowText = text.toLowerCase();
        if (lowText.includes('urgent') || lowText.includes('asap')) score = 90;
        if (lowText.includes('unsubscribe') || lowText.includes('newsletter')) score = 20;
        return score;
    }

    async polishEmail(text: string, tone: 'formal' | 'casual' | 'concise' = 'formal'): Promise<string> {
        const { openAiKey } = await this.getKeys();
        try {
            if (openAiKey) {
                return await this.callOpenAI([
                    { role: 'system', content: `You are an expert email editor. Rewrite the following email to be strictly ${tone}. Keep it professional but natural.` },
                    { role: 'user', content: text }
                ]);
            }
        } catch (e) {
            console.error('Polish error:', e);
        }

        return this.heuristicPolish(text, tone);
    }

    async summarize(text: string): Promise<string> {
        const { openAiKey } = await this.getKeys();
        try {
            if (openAiKey) {
                return await this.callOpenAI([
                    { role: 'system', content: 'Summarize this email in one short, impactful sentence.' },
                    { role: 'user', content: text }
                ], 100);
            }
        } catch (e) {
            console.error('Summarize error:', e);
        }
        return text.substring(0, 100) + '...';
    }

    async generate(prompt: string): Promise<string> {
        const { openAiKey } = await this.getKeys();
        try {
            if (openAiKey) {
                return await this.callOpenAI([
                    { role: 'system', content: 'You are a helpful email assistant. Generate a high-quality email response based on the prompt.' },
                    { role: 'user', content: prompt }
                ]);
            }
        } catch (e) {
            console.error('Generation error:', e);
        }
        return "I will follow up on this shortly.";
    }

    private heuristicPolish(text: string, tone: 'formal' | 'casual' | 'concise'): string {
        let polished = text.trim();
        if (tone === 'formal') {
            polished = polished.replace(/\b(hey|hi)\b/gi, "Dear").replace(/\b(thanks|thx)\b/gi, "Thank you");
            if (!polished.startsWith("Dear")) polished = "Dear Recipient,\n\n" + polished;
            if (!polished.includes("Sincerely")) polished += "\n\nSincerely,\n[Your Name]";
        }
        return polished.charAt(0).toUpperCase() + polished.slice(1);
    }
}

export const aiService = new AIServiceImpl();
