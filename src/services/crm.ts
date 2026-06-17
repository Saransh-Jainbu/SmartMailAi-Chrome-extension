import { syncService } from './sync';

interface ContactHealth {
    email: string;
    lastContacted: number; // Timestamp (0 if unknown)
    score: number; // 0-100
    status: 'healthy' | 'needs_attention' | 'drifting' | 'unknown';
    messageCount: number;
}

/**
 * Contact health derived strictly from real, locally-stored email timestamps.
 * If we have no dated history for a contact, we report `unknown` rather than
 * fabricating a score. Wire this up once email sync persists dated records.
 */
export const crmService = {
    async analyzeHealth(contactEmail: string): Promise<ContactHealth> {
        const emails = await syncService.getAll();
        const contactEmails = emails.filter((e) => e.from?.includes(contactEmail));

        if (contactEmails.length === 0) {
            return { email: contactEmail, lastContacted: 0, score: 0, status: 'unknown', messageCount: 0 };
        }

        // Real most-recent timestamp from stored history (parse what we can).
        const timestamps = contactEmails
            .map((e) => Date.parse(e.date))
            .filter((t) => !isNaN(t));

        if (timestamps.length === 0) {
            // We have messages but no parseable dates — don't invent recency.
            return {
                email: contactEmail,
                lastContacted: 0,
                score: 0,
                status: 'unknown',
                messageCount: contactEmails.length,
            };
        }

        const lastContacted = Math.max(...timestamps);
        const daysSince = (Date.now() - lastContacted) / (1000 * 60 * 60 * 24);

        let status: ContactHealth['status'] = 'healthy';
        if (daysSince > 30) status = 'drifting';
        else if (daysSince > 14) status = 'needs_attention';

        return {
            email: contactEmail,
            lastContacted,
            score: Math.max(0, Math.round(100 - daysSince)),
            status,
            messageCount: contactEmails.length,
        };
    },
};
