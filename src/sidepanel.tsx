import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css' // Global styles with Tailwind

import { DailyBriefing } from './components/DailyBriefing'
import { EmailCard } from './components/EmailCard'
import { CommandPalette } from './components/CommandPalette'
import { nanoService } from './services/nano'
// import { SmartDrafter } from './components/SmartDrafter'

import { Filter, Search, Inbox, Menu } from 'lucide-react'

// Mock Data for UI Dev
const MOCK_EMAILS = [
    { id: '1', sender: 'Saran', subject: 'Urgent: Project Deadline', summary: 'We need to submit the final report by 5 PM today. Please review attached.', date: '10m ago', priorityScore: 98, category: 'urgent' },
    { id: '2', sender: 'Stripe', subject: 'Payment Failed', summary: 'Your subscription payment for $29.00 failed. Please update...', date: '1h ago', priorityScore: 92, category: 'urgent' },
    { id: '3', sender: 'Jason Fried', subject: 'Re: Design Philosophy', summary: 'I agree with your points on simplicity. Let\'s chat next week.', date: '2h ago', priorityScore: 75, category: 'important' },
]

function SidePanel() {
    const [emails, setEmails] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    // const [filter, setFilter] = useState('all')

    // Fetch real emails from Gmail
    useEffect(() => {
        const fetchGmailEmails = async () => {
            try {
                // Query the active tab (should be Gmail)
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

                if (tab.id && tab.url?.includes('mail.google.com')) {
                    // Send message to content script to extract emails
                    chrome.tabs.sendMessage(tab.id, { action: 'getEmails' }, async (response) => {
                        if (response?.emails && response.emails.length > 0) {
                            // Apply AI categorization to each email
                            console.log('Categorizing emails with AI...');
                            const categorizedEmails = await Promise.all(
                                response.emails.map(async (email: any) => {
                                    const priorityScore = await nanoService.classifyEmail(
                                        email.subject || '',
                                        email.snippet || ''
                                    );
                                    return {
                                        ...email,
                                        priorityScore,
                                        category: getCategoryFromScore(priorityScore)
                                    };
                                })
                            );
                            console.log('AI categorization complete!', categorizedEmails);
                            setEmails(categorizedEmails);
                        } else {
                            // Fallback to mock data if no emails found
                            setEmails(MOCK_EMAILS);
                        }
                        setLoading(false);
                    });
                } else {
                    // Not on Gmail, use mock data
                    setEmails(MOCK_EMAILS);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error fetching emails:', error);
                setEmails(MOCK_EMAILS);
                setLoading(false);
            }
        };

        fetchGmailEmails();
    }, []);

    const getCategoryFromScore = (score: number): string => {
        if (score >= 80) return 'urgent';
        if (score >= 60) return 'important';
        if (score >= 40) return 'normal';
        return 'low';
    };


    const handleArchive = async (id: string) => {
        try {
            console.log('Archiving email with ID:', id);

            // Query the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (tab.id && tab.url?.includes('mail.google.com')) {
                // Send archive command to content script
                chrome.tabs.sendMessage(tab.id, {
                    action: 'archiveEmail',
                    emailId: id
                }, (response) => {
                    console.log('Archive response:', response);
                    if (response?.success) {
                        // Optimistic UI Update - remove from list
                        setEmails(prev => prev.filter(e => e.id !== id));
                    } else {
                        console.error('Failed to archive email');
                        alert('Failed to archive email. Check console for details.');
                    }
                });
            } else {
                console.log('Not on Gmail, just updating UI');
                // Not on Gmail, just update UI
                setEmails(prev => prev.filter(e => e.id !== id));
            }
        } catch (error) {
            console.error('Error archiving:', error);
            alert(`Error archiving email: ${error}`);
        }
    }

    return (
        <div className="h-screen bg-background text-white flex flex-col font-sans overflow-hidden">
            {/* Global Utilities */}
            <CommandPalette />
            {/* <SmartDrafter onClose={() => {}} /> */}

            {/* Header */}
            <header className="p-4 border-b border-white/10 flex justify-between items-center bg-surface/50 backdrop-blur-md sticky top-0 z-10">
                <div className="font-bold text-lg flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                    SmartMail
                </div>
                <button className="p-2 hover:bg-white/5 rounded-full text-gray-400">
                    <Menu size={20} />
                </button>
            </header>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
                {loading && (
                    <div className="text-center text-gray-400 py-8">
                        <div className="animate-pulse">Loading emails from Gmail...</div>
                    </div>
                )}

                <DailyBriefing emails={emails} />

                <div>
                    <div className="flex justify-between items-center mb-4 px-1">
                        <h3 className="font-semibold text-gray-200 flex items-center gap-2">
                            <Inbox size={16} /> Priority Inbox
                        </h3>
                        <div className="flex gap-2">
                            <button className="p-1.5 hover:bg-white/5 rounded text-gray-400" title="Filter"><Filter size={16} /></button>
                            <button className="p-1.5 hover:bg-white/5 rounded text-gray-400" title="Search"><Search size={16} /></button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {emails.map((email) => (
                            <EmailCard
                                key={email.id}
                                {...email}
                                onArchive={handleArchive}
                                category={email.category as any}
                            />
                        ))}
                        {emails.length === 0 && (
                            <div className="text-center py-10 text-gray-500">
                                <div className="text-4xl mb-2">🎉</div>
                                <div>Inbox Zero</div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <SidePanel />
    </React.StrictMode>,
)
