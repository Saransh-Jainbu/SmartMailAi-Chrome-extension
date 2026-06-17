import { useEffect, useState } from 'react'
import { BrainCircuit, ShieldCheck, RefreshCw } from 'lucide-react'
import { aiClient } from '../services/aiClient'
import { motion } from 'framer-motion'

interface Email {
    id: string;
    sender: string;
    subject: string;
    snippet: string;
    priorityScore?: number;
}

interface DailyBriefingProps {
    emails: Email[];
}

export function DailyBriefing({ emails }: DailyBriefingProps) {
    const [briefing, setBriefing] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        urgent: 0,
        important: 0,
        total: 0,
        health: 100
    })

    const generateSmartBriefing = async () => {
        try {
            setLoading(true)
            if (emails.length === 0) {
                setBriefing("Inbox Zero achieved. No pending actions.")
                setStats({ urgent: 0, important: 0, total: 0, health: 100 })
                setLoading(false)
                return
            }

            const urgent = emails.filter(e => (e.priorityScore || 0) >= 80)
            const important = emails.filter(e => (e.priorityScore || 0) >= 60 && (e.priorityScore || 0) < 80)

            const topEmailsContext = emails
                .slice(0, 10)
                .map(e => `From: ${e.sender} | Subject: ${e.subject}`)
                .join('\n');

            const prompt = `Act as an executive assistant. Here are the top emails in my inbox:\n${topEmailsContext}\n\nProvide a very concise, 2-sentence executive summary of the current state of my inbox. Then, list the #1 most critical action item I should take. Format: Summary: [2 sentences]. Action: [One clear action].`;

            const aiResponse = await aiClient.generate(prompt);

            setBriefing(aiResponse)
            setStats({
                urgent: urgent.length,
                important: important.length,
                total: emails.length,
                health: Math.max(0, 100 - (urgent.length * 20) - (emails.length * 0.5))
            })
        } catch (e) {
            console.error('Briefing error:', e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        generateSmartBriefing()
    }, []) // Run only once on mount

    const getGreeting = () => {
        const h = new Date().getHours()
        if (h < 12) return 'Good Morning'
        if (h < 17) return 'Good Afternoon'
        return 'Good Evening'
    }

    if (loading) {
        return (
            <div className="p-6 bg-zinc-950 border-b border-white/5 animate-pulse">
                <div className="h-4 w-32 bg-white/10 rounded mb-4" />
                <div className="h-3 w-full bg-white/5 rounded mb-2" />
                <div className="h-3 w-2/3 bg-white/5 rounded" />
            </div>
        )
    }

    const summaryText = briefing?.split('Action:')[0]?.replace('Summary:', '').trim();
    const actionText = briefing?.includes('Action:') ? briefing.split('Action:')[1].trim() : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-zinc-950 border-b border-white/5"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <BrainCircuit size={14} className="text-zinc-500" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Executive Briefing</span>
                </div>
                <button
                    onClick={generateSmartBriefing}
                    disabled={loading}
                    className="text-zinc-600 hover:text-white transition-colors disabled:opacity-50"
                    title="Refresh Analysis"
                >
                    <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            <div className="space-y-4">
                <div className="text-zinc-300 text-sm leading-relaxed">
                    <span className="text-white font-medium">{getGreeting()}. </span>
                    {summaryText}
                </div>

                {actionText && (
                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                        <ShieldCheck className="text-white shrink-0 mt-0.5" size={16} />
                        <div className="text-xs text-zinc-300">
                            <span className="text-white font-bold block mb-0.5 uppercase text-[10px] tracking-wide">Suggested Action</span>
                            {actionText}
                        </div>
                    </div>
                )}
            </div>

            {/* Micro Stats */}
            <div className="flex gap-6 mt-6 pt-4 border-t border-white/5">
                <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Urgent</span>
                    <span className="text-lg font-bold text-white leading-none">{stats.urgent}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Important</span>
                    <span className="text-lg font-bold text-zinc-400 leading-none">{stats.important}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Inbox Health</span>
                    <span className={`text-lg font-bold leading-none ${stats.health > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {Math.round(stats.health)}%
                    </span>
                </div>
            </div>
        </motion.div>
    )
}
