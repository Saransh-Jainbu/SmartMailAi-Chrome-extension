import { TrendingUp, TrendingDown, Minus, Target, Zap } from 'lucide-react'

interface QuickStatsProps {
    emails: any[]
}

export function QuickStats({ emails }: QuickStatsProps) {
    const stats = {
        urgent: emails.filter(e => e.category === 'urgent').length,
        important: emails.filter(e => e.category === 'important').length,
        withAttachments: emails.filter(e => e.hasAttachments).length,
        unread: emails.filter(e => e.isUnread).length,
        avgPriority: emails.length > 0
            ? Math.round(emails.reduce((sum, e) => sum + (e.priorityScore || 0), 0) / emails.length)
            : 0
    }

    const getTrend = () => {
        // Mock trend - in real app would compare to previous period
        const trend = Math.random() > 0.5 ? 'up' : 'down'
        const percentage = Math.floor(Math.random() * 20) + 5
        return { trend, percentage }
    }

    const { trend, percentage } = getTrend()

    return (
        <div className="grid grid-cols-5 gap-2">
            <div className="glass p-3 rounded-xl hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between mb-1">
                    <Zap className="w-3 h-3 text-urgent" />
                    <span className="text-xs font-bold text-urgent">{stats.urgent}</span>
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">Urgent</div>
            </div>

            <div className="glass p-3 rounded-xl hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between mb-1">
                    <Target className="w-3 h-3 text-important" />
                    <span className="text-xs font-bold text-important">{stats.important}</span>
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">Important</div>
            </div>

            <div className="glass p-3 rounded-xl hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between mb-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-xs font-bold text-blue-400">{stats.unread}</span>
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">Unread</div>
            </div>

            <div className="glass p-3 rounded-xl hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between mb-1">
                    <div className="w-3 h-3 text-purple-400">📎</div>
                    <span className="text-xs font-bold text-purple-400">{stats.withAttachments}</span>
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">Files</div>
            </div>

            <div className="glass p-3 rounded-xl hover:bg-white/10 transition-colors border border-primary/30">
                <div className="flex items-center justify-between mb-1">
                    {trend === 'up' ? (
                        <TrendingUp className="w-3 h-3 text-green-400" />
                    ) : trend === 'down' ? (
                        <TrendingDown className="w-3 h-3 text-red-400" />
                    ) : (
                        <Minus className="w-3 h-3 text-gray-400" />
                    )}
                    <span className={`text-xs font-bold ${trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
                        {percentage}%
                    </span>
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">Trend</div>
            </div>
        </div>
    )
}
