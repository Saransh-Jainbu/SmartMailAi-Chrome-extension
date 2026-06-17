export interface AIService {
    isAvailable: () => Promise<boolean>;
    generate: (prompt: string) => Promise<string>;
    summarize: (text: string) => Promise<string>;
    classifyEmail: (subject: string, snippet: string) => Promise<number>;
    polishEmail: (text: string, tone?: 'formal' | 'casual' | 'concise', context?: string, recipientEmail?: string) => Promise<string>;
    draftReply: (original: { subject: string; from: string; snippet: string }, intent: string) => Promise<string>;
}

// ---------------------------------------------------------------------------
// Provider abstraction
// ---------------------------------------------------------------------------

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatOptions {
    model: string;
    maxTokens?: number;
}

interface LLMProvider {
    chat(systemPrompt: string, messages: ChatMessage[], opts: ChatOptions): Promise<string>;
}

class OpenAIProvider implements LLMProvider {
    private apiKey: string;
    constructor(apiKey: string) { this.apiKey = apiKey; }

    async chat(systemPrompt: string, messages: ChatMessage[], opts: ChatOptions): Promise<string> {
        const body = {
            model: opts.model,
            max_tokens: opts.maxTokens ?? 500,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages,
            ],
        };

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            if (response.status === 401) throw new Error('Invalid OpenAI API key. Check Settings.');
            if (response.status === 429) throw new Error('OpenAI rate limit reached. Try again shortly.');
            throw new Error(`OpenAI error ${response.status}. Try again or switch providers.`);
        }

        const data = await response.json();
        return (data.choices[0].message.content as string).trim();
    }
}

class AnthropicProvider implements LLMProvider {
    private apiKey: string;
    constructor(apiKey: string) { this.apiKey = apiKey; }

    async chat(systemPrompt: string, messages: ChatMessage[], opts: ChatOptions): Promise<string> {
        const body = {
            model: opts.model,
            max_tokens: opts.maxTokens ?? 500,
            system: systemPrompt,
            messages,
        };

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
                // Required to call the Anthropic API directly from a browser context.
                'anthropic-dangerous-direct-browser-access': 'true',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            if (response.status === 401) throw new Error('Invalid Anthropic API key. Check Settings.');
            if (response.status === 429) throw new Error('Anthropic rate limit reached. Try again shortly.');
            throw new Error(`Anthropic error ${response.status}. Try again or switch providers.`);
        }

        const data = await response.json();
        return (data.content[0].text as string).trim();
    }
}

// ---------------------------------------------------------------------------
// Model constants
// ---------------------------------------------------------------------------

const OPENAI_FAST = 'gpt-4o-mini';
const OPENAI_QUALITY = 'gpt-4o';
// Use the exact IDs as called by the Anthropic API.
const ANTHROPIC_FAST = 'claude-haiku-4-5-20251001';
const ANTHROPIC_QUALITY = 'claude-sonnet-4-6';

// ---------------------------------------------------------------------------
// Concurrency queue
// ---------------------------------------------------------------------------

class PQueue {
    private queue: (() => Promise<void>)[] = [];
    private activeCount = 0;
    private concurrency: number;

    constructor(concurrency: number) { this.concurrency = concurrency; }

    add<T>(task: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const run = async () => {
                this.activeCount++;
                try {
                    resolve(await task());
                } catch (e) {
                    reject(e);
                } finally {
                    this.activeCount--;
                    this.next();
                }
            };
            if (this.activeCount < this.concurrency) run();
            else this.queue.push(run);
        });
    }

    private next() {
        if (this.activeCount < this.concurrency && this.queue.length > 0) {
            this.queue.shift()?.();
        }
    }
}

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

interface AIConfig {
    provider: 'openai' | 'anthropic' | null;
    openaiKey: string;
    anthropicKey: string;
}

async function readConfig(): Promise<AIConfig> {
    return new Promise((resolve) => {
        chrome.storage.local.get(['ai_provider', 'openai_key', 'anthropic_key'], (result) => {
            const openaiKey = (result.openai_key as string) || '';
            const anthropicKey = (result.anthropic_key as string) || '';
            let provider = (result.ai_provider as 'openai' | 'anthropic' | undefined) ?? null;

            // Auto-detect if not explicitly set
            if (!provider) {
                if (anthropicKey) provider = 'anthropic';
                else if (openaiKey) provider = 'openai';
            }

            resolve({ provider, openaiKey, anthropicKey });
        });
    });
}

function buildProvider(config: AIConfig): LLMProvider {
    if (config.provider === 'anthropic' && config.anthropicKey) {
        return new AnthropicProvider(config.anthropicKey);
    }
    if (config.provider === 'openai' && config.openaiKey) {
        return new OpenAIProvider(config.openaiKey);
    }
    throw new Error('No AI API key configured. Add your key in Settings.');
}

function fastModel(config: AIConfig): string {
    return config.provider === 'anthropic' ? ANTHROPIC_FAST : OPENAI_FAST;
}

function qualityModel(config: AIConfig): string {
    return config.provider === 'anthropic' ? ANTHROPIC_QUALITY : OPENAI_QUALITY;
}

// ---------------------------------------------------------------------------
// Main service
// ---------------------------------------------------------------------------

class AIServiceImpl implements AIService {
    private queue = new PQueue(3);

    async isAvailable(): Promise<boolean> {
        const { openaiKey, anthropicKey } = await readConfig();
        return !!(openaiKey || anthropicKey);
    }

    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash + char) & 0xffffffff;
        }
        return Math.abs(hash).toString(16);
    }

    async classifyEmail(subject: string, snippet: string): Promise<number> {
        const text = `Subject: ${subject}\nBody: ${snippet}`.substring(0, 2000);
        const low = text.toLowerCase();

        // Fast keyword heuristics — no API call needed
        if (low.includes('urgent') || low.includes('asap') || low.includes('deadline') ||
            low.includes('immediate') || low.includes('action required') ||
            low.includes('security alert') || low.includes('verify your account')) return 95;

        if (low.includes('important') || low.includes('payment') || low.includes('invoice') ||
            low.includes('schedule') || low.includes('canceled') || low.includes('cancelled')) return 85;

        if (low.includes('meeting') || low.includes('invite') || low.includes('feedback') ||
            low.includes('question') || low.includes('request')) return 75;

        if (low.includes('unsubscribe') || low.includes('newsletter') || low.includes('marketing') ||
            low.includes('sale') || low.includes('offer') || low.includes('discount') ||
            low.includes('digest') || low.includes('promoted') ||
            low.includes('no-reply') || low.includes('noreply') || low.includes('notification')) return 20;

        // Cache check
        const cacheKey = `email_score_${this.hashString(subject + snippet.substring(0, 50))}`;
        const cached = await chrome.storage.local.get(cacheKey);
        if (cached[cacheKey]) return cached[cacheKey] as number;

        const config = await readConfig();
        if (!config.provider) return 40; // No AI configured — honest neutral-low default

        try {
            const provider = buildProvider(config);
            const result = await this.queue.add(() =>
                provider.chat(
                    'You are an email priority classifier. Rate the email from 0 to 100. ' +
                    'Return ONLY a single integer. ' +
                    '90-100: Urgent/Action required. 70-89: Important. 40-69: Normal. 0-39: Low/newsletter.',
                    [{ role: 'user', content: text }],
                    { model: fastModel(config), maxTokens: 10 }
                )
            );
            const score = parseInt(result, 10);
            if (!isNaN(score)) {
                await chrome.storage.local.set({ [cacheKey]: score });
                return score;
            }
        } catch (e) {
            console.error('[AI] classifyEmail:', e);
        }

        // Heuristic fell through and AI failed — honest "normal" score
        return 40;
    }

    async summarize(text: string): Promise<string> {
        const cacheKey = `summary_${this.hashString(text.substring(0, 100))}`;
        const cached = await chrome.storage.local.get(cacheKey);
        if (cached[cacheKey]) return cached[cacheKey] as string;

        const config = await readConfig();
        if (!config.provider) return text.substring(0, 100) + '…';

        try {
            const provider = buildProvider(config);
            const result = await this.queue.add(() =>
                provider.chat(
                    'Summarize this email in one short, impactful sentence. No preamble.',
                    [{ role: 'user', content: text }],
                    { model: fastModel(config), maxTokens: 80 }
                )
            );
            await chrome.storage.local.set({ [cacheKey]: result });
            return result;
        } catch (e) {
            console.error('[AI] summarize:', e);
            return text.substring(0, 100) + '…';
        }
    }

    async generate(prompt: string): Promise<string> {
        const cacheKey = `gen_${this.hashString(prompt.substring(0, 200))}`;
        const cached = await chrome.storage.local.get(cacheKey);
        if (cached[cacheKey]) return cached[cacheKey] as string;

        const config = await readConfig();
        const provider = buildProvider(config); // throws if no key

        const result = await this.queue.add(() =>
            provider.chat(
                'You are a helpful email assistant. Generate a high-quality email based on the prompt.',
                [{ role: 'user', content: prompt }],
                { model: qualityModel(config), maxTokens: 600 }
            )
        );

        await chrome.storage.local.set({ [cacheKey]: result });
        return result;
    }

    async polishEmail(
        text: string,
        tone: 'formal' | 'casual' | 'concise' = 'formal',
        context?: string,
        recipientEmail?: string
    ): Promise<string> {
        const userSettings = await new Promise<{ userName: string; userTitle: string; userSignature: string }>((resolve) => {
            chrome.storage.local.get(['user_name', 'user_title', 'user_signature'], (r) => {
                resolve({
                    userName: (r.user_name as string) || '',
                    userTitle: (r.user_title as string) || '',
                    userSignature: (r.user_signature as string) || '',
                });
            });
        });

        const config = await readConfig();
        const provider = buildProvider(config); // throws if no key

        let recipientName = '';
        let recipientType: 'person' | 'organization' = 'person';

        if (recipientEmail) {
            const [local, domain] = recipientEmail.split('@');
            if (/info|support|team|contact|noreply|no-reply/.test(local)) {
                recipientType = 'organization';
                recipientName = domain?.split('.')[0] ?? '';
            } else {
                recipientName = local
                    .replace(/[._-]/g, ' ')
                    .replace(/\b\w/g, (c) => c.toUpperCase());
            }
        }

        let system =
            `You are an expert email editor. Rewrite the following email draft to be strictly ${tone}. ` +
            'Keep it professional but natural. Do not add preamble — return only the email.';

        if (recipientName) {
            if (recipientType === 'person') {
                system += ` Greet the recipient as "${recipientName}".`;
            } else {
                system += ` This is addressed to an organization (${recipientName}); use an appropriate greeting.`;
            }
        }

        if (userSettings.userName) {
            system += ` Sign off with "${userSettings.userName}"`;
            if (userSettings.userTitle) system += ` (${userSettings.userTitle})`;
            if (userSettings.userSignature) system += `, followed by:\n${userSettings.userSignature}`;
            system += '.';
        }

        if (context) {
            system += `\n\nContext — the user is replying to:\n"${context.substring(0, 500)}"`;
        }

        return this.queue.add(() =>
            provider.chat(system, [{ role: 'user', content: text }], {
                model: qualityModel(config),
                maxTokens: 800,
            })
        );
    }

    async draftReply(
        original: { subject: string; from: string; snippet: string },
        intent: string
    ): Promise<string> {
        const config = await readConfig();
        const provider = buildProvider(config); // throws if no key

        const system =
            'You are an expert email assistant. Draft a professional reply to the email below. ' +
            'Follow the user\'s stated intent exactly. Return only the email body — no subject line, no preamble.';

        const userMsg =
            `Original email from ${original.from}:\n` +
            `Subject: ${original.subject}\n` +
            `${original.snippet}\n\n` +
            `Draft intent: ${intent}`;

        return this.queue.add(() =>
            provider.chat(system, [{ role: 'user', content: userMsg }], {
                model: qualityModel(config),
                maxTokens: 600,
            })
        );
    }
}

export const aiService = new AIServiceImpl();
