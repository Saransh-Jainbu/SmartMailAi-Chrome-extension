import { Zap, Clock, Archive } from 'lucide-react'

interface EmailCardProps {
    id: string;
    sender: string;
    subject: string;
    summary: string;
    date: string;
    priorityScore: number;
    category: 'urgent' | 'important' | 'newsletter';
    onArchive: (id: string) => void;
}

export function EmailCard({ id, sender, subject, summary, date, priorityScore, category, onArchive }: EmailCardProps) {
    const getBorderColor = () => {
        if (category === 'urgent') return 'border-urgent/50';
        if (category === 'important') return 'border-important/50';
        return 'border-white/10';
    }

    return (
        <div className={`p-4 bg-surface rounded-xl border ${getBorderColor()} hover:bg-white/5 transition-all group relative animate-in slide-in-from-right-5`}>
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-xs font-bold text-gray-300">
                        {sender.charAt(0)}
                    </div>
                    <div>
                        <div className="text-white font-medium text-sm leading-tight">{sender}</div>
                        <div className="text-xs text-gray-500">{date}</div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {category === 'urgent' && <Zap className="w-3 h-3 text-urgent animate-pulse" />}
                    <span className={`text-xs font-bold ${category === 'urgent' ? 'text-urgent' : 'text-gray-500'}`}>
                        {priorityScore}
                    </span>
                </div>
            </div>

            <div className="mb-1 text-sm font-semibold text-gray-200 truncate">{subject}</div>
            <div className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                {summary}
            </div>

            {/* Swipe Actions (Hover) */}
            <div className="absolute right-4 bottom-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onArchive(id)} className="p-1.5 bg-background border border-white/10 rounded-lg hover:text-green-400 hover:border-green-400/50 transition-colors">
                    <Archive size={14} />
                </button>
                <button className="p-1.5 bg-background border border-white/10 rounded-lg hover:text-blue-400 hover:border-blue-400/50 transition-colors">
                    <Clock size={14} />
                </button>
            </div>
        </div>
    )
}
