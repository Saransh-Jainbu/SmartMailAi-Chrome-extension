// Advanced AI using Hugging Face Inference API
// Production-grade semantic email classification with real LLM models
// Completely free with generous rate limits (30,000 requests/month)

export interface NanoService {
    isAvailable: () => Promise<boolean>;
    generate: (prompt: string) => Promise<string>;
    summarize: (text: string) => Promise<string>;
    classifyEmail: (subject: string, snippet: string) => Promise<number>;
}

class HuggingFaceAIService implements NanoService {
    // Get your free API key from: https://huggingface.co/settings/tokens
    private apiKey: string = import.meta.env.VITE_HUGGINGFACE_API_KEY || 'YOUR_HUGGING_FACE_API_KEY';
    private classificationModel = 'dima806/email-spam-detection-roberta'; // Trained specifically for email
    private summarizationModel = 'facebook/bart-large-cnn';

    async isAvailable(): Promise<boolean> {
        if (this.apiKey === 'YOUR_HUGGING_FACE_API_KEY') {
            console.warn('⚠️ Hugging Face API key not set. Using fallback classification.');
            return false;
        }
        return true;
    }

    async classifyEmail(subject: string, snippet: string): Promise<number> {
        const available = await this.isAvailable();

        if (!available) {
            console.log('Using fallback heuristic classification');
            return this.fallbackClassify(subject, snippet);
        }

        try {
            const text = `Subject: ${subject}\n${snippet}`.substring(0, 512);

            // Use Hugging Face's email classification model
            const response = await fetch(
                `https://api-inference.huggingface.co/models/${this.classificationModel}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ inputs: text }),
                }
            );

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const result = await response.json();

            // Result format: [[{label: 'SPAM' or 'HAM', score: 0-1}]]
            const classification = Array.isArray(result[0]) ? result[0][0] : result[0];

            let priorityScore = 50;

            if (classification.label === 'HAM' || classification.label === 'NOT_SPAM') {
                // Legitimate email - higher priority
                priorityScore = 50 + (classification.score * 50); // 50-100
            } else {
                // Spam - lower priority
                priorityScore = 50 - (classification.score * 50); // 0-50
            }

            // Apply semantic heuristics for better categorization
            const lowerText = text.toLowerCase();

            // Boost for urgent/important indicators
            if (lowerText.includes('urgent') || lowerText.includes('asap') || lowerText.includes('deadline')) {
                priorityScore = Math.min(100, priorityScore + 20);
            }

            // Boost for financial/business
            if (lowerText.includes('invoice') || lowerText.includes('payment') || lowerText.includes('contract')) {
                priorityScore = Math.min(100, priorityScore + 15);
            }

            // Reduce for promotional indicators
            if (lowerText.includes('unsubscribe') || lowerText.includes('click here')) {
                priorityScore = Math.max(0, priorityScore - 30);
            }

            const finalScore = Math.round(priorityScore);
            console.log(`🤖 HuggingFace classified "${subject.substring(0, 30)}..." as ${finalScore} (${classification.label})`);

            return finalScore;

        } catch (error) {
            console.error('Hugging Face API error:', error);
            return this.fallbackClassify(subject, snippet);
        }
    }

    private fallbackClassify(subject: string, snippet: string): number {
        let score = 50;
        const text = `${subject} ${snippet}`.toLowerCase();

        // Urgent indicators
        if (text.includes('urgent') || text.includes('asap') || text.includes('important')) score += 30;
        if (text.includes('deadline') || text.includes('due')) score += 25;

        // Financial/Business
        if (text.includes('invoice') || text.includes('payment') || text.includes('bill')) score += 25;
        if (text.includes('contract') || text.includes('agreement')) score += 20;

        // Spam indicators
        if (text.includes('unsubscribe') || text.includes('newsletter')) score -= 40;
        if (text.includes('promo') || text.includes('sale') || text.includes('offer')) score -= 35;
        if (text.includes('click here') || text.includes('limited time')) score -= 30;
        if (text.includes('congratulations') || text.includes('winner')) score -= 50;

        console.log(`📊 Fallback classified "${subject.substring(0, 30)}..." as ${Math.max(0, Math.min(100, score))}`);
        return Math.max(0, Math.min(100, score));
    }

    async generate(prompt: string): Promise<string> {
        const available = await this.isAvailable();

        if (!available) {
            return this.fallbackGenerate(prompt);
        }

        try {
            const response = await fetch(
                'https://api-inference.huggingface.co/models/gpt2',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        inputs: prompt,
                        parameters: { max_new_tokens: 100, temperature: 0.7 }
                    }),
                }
            );

            const result = await response.json();
            return result[0].generated_text || this.fallbackGenerate(prompt);

        } catch (error) {
            console.error('Generation error:', error);
            return this.fallbackGenerate(prompt);
        }
    }

    async summarize(text: string): Promise<string> {
        const available = await this.isAvailable();

        if (!available) {
            return this.fallbackSummarize(text);
        }

        try {
            const truncated = text.substring(0, 1000);

            const response = await fetch(
                `https://api-inference.huggingface.co/models/${this.summarizationModel}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        inputs: truncated,
                        parameters: { max_length: 100, min_length: 30 }
                    }),
                }
            );

            const result = await response.json();
            return result[0].summary_text || this.fallbackSummarize(text);

        } catch (error) {
            console.error('Summarization error:', error);
            return this.fallbackSummarize(text);
        }
    }

    private fallbackGenerate(_prompt: string): string {
        const templates = [
            "Thank you for reaching out. I've reviewed your message and will get back to you shortly.",
            "Thanks for your email. I'll look into this and respond soon.",
            "I've received your message and will follow up with you shortly.",
        ];
        return templates[Math.floor(Math.random() * templates.length)];
    }

    private fallbackSummarize(text: string): string {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        if (sentences.length === 0) return "No content to summarize.";
        if (sentences.length <= 2) return text.trim();

        const firstSentence = sentences[0].trim();
        const hasDeadline = /deadline|due|urgent|asap/i.test(text);
        const hasAction = /please|need|require|must/i.test(text);

        let summary = firstSentence;
        if (hasDeadline) summary += " [Time-sensitive]";
        if (hasAction) summary += " [Action required]";

        return summary;
    }
}

export const nanoService = new HuggingFaceAIService();
