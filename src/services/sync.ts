import { openDB, type DBSchema } from 'idb';

interface SmartMailDB extends DBSchema {
    emails: {
        key: string;
        value: {
            id: string;
            threadId: string;
            snippet: string;
            subject: string;
            from: string;
            date: string;
            isUrgent?: boolean;
            summary?: string;
            status: 'unread' | 'read' | 'archived';
        };
        indexes: { 'by-date': string; 'by-thread': string };
    };
}

const dbPromise = openDB<SmartMailDB>('smartmail-db', 1, {
    upgrade(db) {
        const store = db.createObjectStore('emails', { keyPath: 'id' });
        store.createIndex('by-date', 'date');
        store.createIndex('by-thread', 'threadId');
    },
});

export const syncService = {
    async get(id: string) {
        return (await dbPromise).get('emails', id);
    },
    async put(email: any) {
        return (await dbPromise).put('emails', email);
    },
    async getAll() {
        return (await dbPromise).getAll('emails');
    },
    async clear() {
        return (await dbPromise).clear('emails');
    },
};
