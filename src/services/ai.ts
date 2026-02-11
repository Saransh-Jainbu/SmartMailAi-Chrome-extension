import { nanoService } from './nano';

export const aiService = {
    async generateSmartDraft(context: string, tone: string = 'professional'): Promise<string> {
        // 1. Get Voice Profile
        const profile = localStorage.getItem('voice_profile') || 'Professional, concise.';

        // 2. Construct Prompt
        const prompt = `Write a reply. Context: "${context}". 
    My writing style: ${profile}.
    Desired Tone: ${tone}.
    Keep it short.`;

        try {
            return await nanoService.generate(prompt);
        } catch (e) {
            console.error('Smart Draft failed', e);
            return 'Currently unable to generate draft. Please try again.';
        }
    },

    async extractActionItems(emailBody: string): Promise<string[]> {
        const prompt = `Extract action items from this email as a bulleted list. Return JSON array of strings. Email: "${emailBody.substring(0, 2000)}"`;

        try {
            // Nano might not return perfect JSON, so we use heuristics or hope for the best with proper prompt engineering in real world
            // For now, we assume text output and parse bullets
            const result = await nanoService.generate(prompt);
            const lines = result.split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'));
            return lines.map(line => line.replace(/^[-*]\s+/, '').trim());
        } catch (e) {
            return [];
        }
    }
};
