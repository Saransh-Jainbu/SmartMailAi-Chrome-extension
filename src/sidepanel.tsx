import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css' // Global styles with Tailwind

import { DailyBriefing } from './components/DailyBriefing'
import { EmailCard } from './components/EmailCard'
import { SearchBar } from './components/SearchBar'
import { FilterPanel } from './components/FilterPanel'
import { SettingsPanel } from './components/SettingsPanel'
import type { FilterOptions } from './components/FilterPanel'
import { aiService } from './services/ai'

import { Inbox, Sparkles, Settings, Filter } from 'lucide-react'

// Mock Data for UI Dev
const MOCK_EMAILS = [
    { id: '1', sender: 'Saran Kumar', subject: 'Urgent: Project Deadline Tomorrow', summary: 'We need to submit the final report by 5 PM tomorrow. Please review the attached documents and provide your feedback.', date: '10m ago', priorityScore: 98, category: 'urgent' as const, hasAttachments: true, threadCount: 3, isUnread: true },
    { id: '2', sender: 'Stripe Payments', subject: 'Payment Failed - Action Required', summary: 'Your subscription payment for $29.00 failed. Please update your payment method to continue service.', date: '1h ago', priorityScore: 92, category: 'urgent' as const, hasAttachments: false, threadCount: 1, isUnread: true },
    { id: '3', sender: 'Jason Fried', subject: 'Re: Design Philosophy Discussion', summary: 'I completely agree with your points on simplicity and user-first design. Let\'s schedule a call next week to discuss further.', date: '2h ago', priorityScore: 75, category: 'important' as const, hasAttachments: false, threadCount: 5, isUnread: true },
    { id: '4', sender: 'GitHub', subject: 'New pull request on your repository', summary: 'John Doe opened a new pull request #42 on your repository "awesome-project". Review requested.', date: '3h ago', priorityScore: 68, category: 'important' as const, hasAttachments: false, threadCount: 1, isUnread: false },
    { id: '5', sender: 'LinkedIn', subject: 'You appeared in 12 searches this week', summary: 'Your profile is getting noticed! See who viewed your profile and expand your network.', date: '5h ago', priorityScore: 35, category: 'low' as const, hasAttachments: false, threadCount: 1, isUnread: false },
]

import { motion, AnimatePresence } from 'framer-motion'

function SidePanel() {
    const [emails, setEmails] = useState<any[]>([])
    const [filteredEmails, setFilteredEmails] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [showFilterPanel, setShowFilterPanel] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [activeFilters, setActiveFilters] = useState<FilterOptions>({})

    // Load cached cache on mount, then fetch fresh
    useEffect(() => {
        const loadEmails = async () => {
            // 1. Load from cache first for instant UI
            const cached = await chrome.storage.local.get(['emails_cache', 'last_fetch_timestamp']);
            if (cached.emails_cache) {
                setEmails(cached.emails_cache as any[]);
                setLoading(false);
            }

            // 2. Fetch fresh from Gmail
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab?.id && tab.url?.includes('mail.google.com')) {
                    chrome.tabs.sendMessage(tab.id, { action: 'getEmails' }, async (response) => {
                        if (response?.emails && response.emails.length > 0) {
                            const categorizedEmails = await Promise.all(
                                response.emails.map(async (email: any) => {
                                    const priorityScore = await aiService.classifyEmail(
                                        email.subject || '',
                                        email.snippet || ''
                                    );
                                    return {
                                        ...email,
                                        priorityScore,
                                        category: getCategoryFromScore(priorityScore),
                                        hasAttachments: Math.random() > 0.7, // In reality, we'd parse this
                                        threadCount: Math.floor(Math.random() * 5) + 1,
                                        isUnread: true // In reality, we'd parse this
                                    };
                                })
                            );

                            // Save to cache
                            setEmails(categorizedEmails);
                            chrome.storage.local.set({
                                emails_cache: categorizedEmails,
                                last_fetch_timestamp: Date.now()
                            });
                        } else if (!cached.emails_cache) {
                            setEmails(MOCK_EMAILS);
                        }
                        setLoading(false);
                    });
                } else if (!cached.emails_cache) {
                    setEmails(MOCK_EMAILS);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error fetching emails:', error);
                if (!cached.emails_cache) setEmails(MOCK_EMAILS);
                setLoading(false);
            }
        };

        loadEmails();
    }, []);

    // Apply search and filters
    useEffect(() => {
        let result = [...emails];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(email =>
                email.sender.toLowerCase().includes(query) ||
                email.subject.toLowerCase().includes(query) ||
                email.snippet?.toLowerCase().includes(query)
            );
        }

        if (activeFilters.category && activeFilters.category.length > 0) {
            result = result.filter(email => activeFilters.category?.includes(email.category));
        }

        if (activeFilters.hasAttachments) {
            result = result.filter(email => email.hasAttachments);
        }

        if (activeFilters.isUnread) {
            result = result.filter(email => email.isUnread);
        }

        result.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
        setFilteredEmails(result);
    }, [emails, searchQuery, activeFilters]);

    const getCategoryFromScore = (score: number): string => {
        if (score >= 80) return 'urgent';
        if (score >= 60) return 'important';
        if (score >= 40) return 'normal';
        return 'low';
    };

    const handleArchive = async (id: string) => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab.id && tab.url?.includes('mail.google.com')) {
                chrome.tabs.sendMessage(tab.id, { action: 'archiveEmail', emailId: id }, () => {
                    setEmails(prev => prev.filter(e => e.id !== id));
                });
            } else {
                setEmails(prev => prev.filter(e => e.id !== id));
            }
        } catch (error) {
            console.error('Error archiving:', error);
        }
    }

    const handleDelete = async (id: string) => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab.id && tab.url?.includes('mail.google.com')) {
                chrome.tabs.sendMessage(tab.id, { action: 'deleteEmail', emailId: id }, () => {
                    setEmails(prev => prev.filter(e => e.id !== id));
                });
            } else {
                setEmails(prev => prev.filter(e => e.id !== id));
            }
        } catch (error) {
            setEmails(prev => prev.filter(e => e.id !== id));
        }
    }

    const handleReply = (id: string, text: string) => {
        console.log('Replying to email:', id, 'with text:', text);
    }

    const handleApplyFilters = (filters: FilterOptions) => {
        setActiveFilters(filters);
    }

    return (
        <div className="h-screen bg-background text-foreground flex flex-col font-sans overflow-hidden selection:bg-white/20">
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/10 bg-background/80 backdrop-blur-xl z-20 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center border border-white/5 shadow-sm">
                        <Inbox size={16} className="text-white" />
                    </div>
                    <span className="font-semibold tracking-tight text-sm text-zinc-100">Inbox AI</span>
                </div>
                <div className="flex items-center gap-2">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
                        title="AI Actions"
                    >
                        <Sparkles size={18} />
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowSettings(true)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
                        title="Settings"
                    >
                        <Settings size={18} />
                    </motion.button>
                </div>
            </div>

            {/* Daily Briefing Section */}
            <div className="shrink-0 border-b border-white/5 bg-zinc-950/30">
                <DailyBriefing emails={emails} />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col relative w-full">
                {/* Search & Filter Bar */}
                <div className="px-6 py-4 flex gap-3 items-center w-full max-w-full overflow-hidden shrink-0">
                    <div className="flex-1 min-w-0">
                        <SearchBar
                            onSearch={setSearchQuery}
                            onFilterClick={() => setShowFilterPanel(true)}
                            placeholder="Search smart inbox..."
                        />
                    </div>
                    <button
                        onClick={() => setShowFilterPanel(true)}
                        className={`p-2.5 rounded-lg border transition-all shrink-0 ${Object.keys(activeFilters).length > 0
                            ? 'bg-white text-black border-white'
                            : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
                            }`}
                    >
                        <Filter size={18} />
                    </button>
                </div>

                {/* Email List */}
                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 scrollbar-hide">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-4 text-zinc-500">
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            <p className="text-[10px] font-medium tracking-widest uppercase">Syncing</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {filteredEmails.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center justify-center h-64 text-zinc-500 text-center px-6"
                                >
                                    <Inbox size={32} className="mb-4 opacity-20" />
                                    <p className="text-sm">No emails found</p>
                                </motion.div>
                            ) : (
                                filteredEmails.map((email) => (
                                    <EmailCard
                                        key={email.id}
                                        {...email}
                                        onArchive={handleArchive}
                                        onDelete={handleDelete}
                                        onReply={handleReply}
                                    />
                                ))
                            )}
                        </AnimatePresence>
                    )}
                </div>
            </div>

            {/* Overlays */}
            <AnimatePresence>
                {showFilterPanel && (
                    <FilterPanel
                        onClose={() => setShowFilterPanel(false)}
                        onApplyFilters={handleApplyFilters}
                    />
                )}
                {showSettings && (
                    <SettingsPanel
                        onClose={() => setShowSettings(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <SidePanel />
    </React.StrictMode>,
)
