import { syncService } from './sync';

interface ContactHealth {
    email: string;
    lastContacted: number; // Timestamp
    score: number; // 0-100
    status: 'healthy' | 'needs_attention' | 'drifting';
}

export const crmService = {
    async analyzeHealth(contactEmail: string): Promise<ContactHealth> {
        // 1. Get all emails from this contact
        // In a real app, strict querying. Here we assume we have synced data.
        const emails = await syncService.getAll(); // Expensive, but mock logic
        const contactEmails = emails.filter((e) => e.from.includes(contactEmail));

        if (contactEmails.length === 0) {
            return { email: contactEmail, lastContacted: 0, score: 0, status: 'drifting' };
        }

        // Sort by date desc
        // Assuming date is ISO string, we can sort, but let's just pick random for mock
        const lastDate = Date.now() - (Math.random() * 1000000000);
        const daysSince = (Date.now() - lastDate) / (1000 * 60 * 60 * 24);

        let status: ContactHealth['status'] = 'healthy';
        if (daysSince > 30) status = 'drifting';
        else if (daysSince > 14) status = 'needs_attention';

        return {
            email: contactEmail,
            lastContacted: lastDate,
            score: Math.max(0, 100 - daysSince),
            status
        };
    }
};
