import { Target, Zap } from 'lucide-react'

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

    return (
        <div className="grid grid-cols-4 gap-2">
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
        </div>
    )
}
