// Advanced AI Service with OpenAI Primary and Hugging Face Fallback
// Provides high-quality GPT-powered intelligence for email tasks

export interface AIService {
    isAvailable: () => Promise<boolean>;
    generate: (prompt: string) => Promise<string>;
    summarize: (text: string) => Promise<string>;
    classifyEmail: (subject: string, snippet: string) => Promise<number>;
    polishEmail: (text: string, tone?: 'formal' | 'casual' | 'concise') => Promise<string>;
}

class PQueue {
    private queue: (() => Promise<void>)[] = [];
    private activeCount = 0;
    private concurrency: number;

    constructor(concurrency: number) {
        this.concurrency = concurrency;
    }

    add<T>(task: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const run = async () => {
                this.activeCount++;
                try {
                    const result = await task();
                    resolve(result);
                } catch (e) {
                    reject(e);
                } finally {
                    this.activeCount--;
                    this.next();
                }
            };

            if (this.activeCount < this.concurrency) {
                run();
            } else {
                this.queue.push(run);
            }
        });
    }

    private next() {
        if (this.activeCount < this.concurrency && this.queue.length > 0) {
            const task = this.queue.shift();
            task?.();
        }
    }
}

class AIServiceImpl implements AIService {
    private queue = new PQueue(3); // Limit to 3 concurrent requests

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
        return this.queue.add(async () => {
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
        });
    }

    async classifyEmail(subject: string, snippet: string): Promise<number> {
        // 1. Check heuristics first (fastest)
        const text = `Subject: ${subject}\nBody: ${snippet}`.substring(0, 2000);
        const lowText = text.toLowerCase();

        // Immediate heuristic check
        // Immediate heuristic check
        if (lowText.includes('urgent') || lowText.includes('asap') || lowText.includes('deadline') ||
            lowText.includes('immediate') || lowText.includes('action required') ||
            lowText.includes('security alert') || lowText.includes('verify your account')) return 95;

        if (lowText.includes('important') || lowText.includes('payment') || lowText.includes('invoice') ||
            lowText.includes('schedule') || lowText.includes('canceled') || lowText.includes('cancelled')) return 85;

        if (lowText.includes('meeting') || lowText.includes('invite') || lowText.includes('feedback') ||
            lowText.includes('question') || lowText.includes('request')) return 75;

        if (lowText.includes('unsubscribe') || lowText.includes('newsletter') || lowText.includes('marketing') ||
            lowText.includes('sale') || lowText.includes('offer') || lowText.includes('discount') ||
            lowText.includes('digest') || lowText.includes('promoted') || lowText.includes('ad') ||
            lowText.includes('no-reply') || lowText.includes('noreply') || lowText.includes('notification')) return 20;

        // 2. Check cache
        const cacheKey = `email_score_${this.hashString(subject + snippet.substring(0, 50))}`;
        const cached = await chrome.storage.local.get(cacheKey);
        if (cached[cacheKey]) {
            return cached[cacheKey] as number;
        }

        const { openAiKey } = await this.getKeys();

        try {
            if (openAiKey) {
                const result = await this.callOpenAI([
                    { role: 'system', content: 'You are an email classifier. Rate the priority of the following email from 0 to 100. return ONLY a single number. 90-100: Urgent/Action Required, 70-89: Important, 40-69: Normal, 0-39: Low/Newsletter/Spam.' },
                    { role: 'user', content: text }
                ], 10);
                const score = parseInt(result);
                if (!isNaN(score)) {
                    // 3. Cache the result
                    await chrome.storage.local.set({ [cacheKey]: score });
                    return score;
                }
            }
        } catch (e) {
            console.error('Classification error:', e);
        }

        // Fallback
        return 50;
    }

    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    }

    async polishEmail(
        text: string,
        tone: 'formal' | 'casual' | 'concise' = 'formal',
        context?: string,
        recipientEmail?: string
    ): Promise<string> {
        const { openAiKey } = await this.getKeys();

        // Get user settings for signature
        const userSettings = await new Promise<any>((resolve) => {
            chrome.storage.local.get(['user_name', 'user_title', 'user_signature'], (result) => {
                resolve({
                    userName: result.user_name || '',
                    userTitle: result.user_title || '',
                    userSignature: result.user_signature || ''
                });
            });
        });

        try {
            if (openAiKey) {
                // Extract recipient name from email
                let recipientName = '';
                let recipientType = 'person'; // 'person' or 'organization'

                if (recipientEmail) {
                    // Try to extract name from email address
                    const emailParts = recipientEmail.split('@');
                    const localPart = emailParts[0];
                    const domain = emailParts[1];

                    // Check if it's likely an organization email
                    if (localPart.includes('info') || localPart.includes('support') ||
                        localPart.includes('team') || localPart.includes('contact') ||
                        localPart.includes('noreply') || localPart.includes('no-reply')) {
                        recipientType = 'organization';
                        // Extract company name from domain
                        recipientName = domain?.split('.')[0] || '';
                    } else {
                        // It's likely a person - extract name from local part
                        recipientName = localPart
                            .replace(/[._-]/g, ' ')
                            .split(' ')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ');
                    }
                }

                let systemPrompt = `You are an expert email editor. Rewrite the following email draft to be strictly ${tone}. Keep it professional but natural.`;

                // Add recipient context
                if (recipientName) {
                    if (recipientType === 'person') {
                        systemPrompt += `\n\nThe recipient's name is "${recipientName}". Start the email with an appropriate greeting like "Hi ${recipientName}," or "Dear ${recipientName}," based on the tone.`;
                    } else {
                        systemPrompt += `\n\nThis email is being sent to an organization (${recipientName}). Use an appropriate greeting like "Dear ${recipientName} Team," or "Hello,".`;
                    }
                }

                // Add signature context
                if (userSettings.userName) {
                    systemPrompt += `\n\nEnd the email with a closing and the sender's name: "${userSettings.userName}"`;
                    if (userSettings.userTitle) {
                        systemPrompt += ` (${userSettings.userTitle})`;
                    }
                    if (userSettings.userSignature) {
                        systemPrompt += `\n\nAdd this signature at the very end:\n${userSettings.userSignature}`;
                    }
                }

                if (context) {
                    systemPrompt += `\n\nCONTEXT (The user is replying to this email): \n"${context.substring(0, 500)}..."\n\nEnsure the polished email directly addresses the context if relevant.`;
                }

                return await this.callOpenAI([
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text }
                ]);
            }
        } catch (e) {
            console.error('Polish error:', e);
        }

        return this.heuristicPolish(text, tone, userSettings);
    }



    async summarize(text: string): Promise<string> {
        // Check cache
        const cacheKey = `summary_${this.hashString(text.substring(0, 100))}`;
        const cached = await chrome.storage.local.get(cacheKey);
        if (cached[cacheKey]) {
            return cached[cacheKey] as string;
        }

        const { openAiKey } = await this.getKeys();
        try {
            if (openAiKey) {
                const result = await this.callOpenAI([
                    { role: 'system', content: 'Summarize this email in one short, impactful sentence.' },
                    { role: 'user', content: text }
                ], 100);

                await chrome.storage.local.set({ [cacheKey]: result });
                return result;
            }
        } catch (e) {
            console.error('Summarize error:', e);
        }
        return text.substring(0, 100) + '...';
    }

    async generate(prompt: string): Promise<string> {
        // Check cache for generation (useful for Daily Briefing)
        const cacheKey = `gen_${this.hashString(prompt.substring(0, 200))}`;
        const cached = await chrome.storage.local.get(cacheKey);
        if (cached[cacheKey]) {
            return cached[cacheKey] as string;
        }

        const { openAiKey } = await this.getKeys();
        try {
            if (openAiKey) {
                const result = await this.callOpenAI([
                    { role: 'system', content: 'You are a helpful email assistant. Generate a high-quality email response based on the prompt.' },
                    { role: 'user', content: prompt }
                ]);

                await chrome.storage.local.set({ [cacheKey]: result });
                return result;
            }
        } catch (e) {
            console.error('Generation error:', e);
        }
        return "I will follow up on this shortly.";
    }

    private heuristicPolish(text: string, tone: 'formal' | 'casual' | 'concise', userSettings?: any): string {
        let polished = text.trim();
        if (tone === 'formal') {
            polished = polished.replace(/\b(hey|hi)\b/gi, "Dear").replace(/\b(thanks|thx)\b/gi, "Thank you");
            if (!polished.startsWith("Dear")) polished = "Dear Recipient,\n\n" + polished;

            // Add signature if available
            if (userSettings?.userName) {
                if (!polished.includes("Sincerely")) {
                    polished += "\n\nSincerely,\n" + userSettings.userName;
                    if (userSettings.userTitle) {
                        polished += "\n" + userSettings.userTitle;
                    }
                }
                if (userSettings.userSignature) {
                    polished += "\n\n" + userSettings.userSignature;
                }
            } else if (!polished.includes("Sincerely")) {
                polished += "\n\nSincerely,\n[Your Name]";
            }
        }
        return polished.charAt(0).toUpperCase() + polished.slice(1);
    }
}

export const aiService = new AIServiceImpl();

