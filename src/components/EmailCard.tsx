import { Archive, Star, Reply, Paperclip, Trash2, Check, X, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { aiClient } from '../services/aiClient'
import * as Diff from 'diff'

interface EmailCardProps {
    id: string;
    sender: string;
    subject: string;
    summary: string;
    date: string;
    category: 'urgent' | 'important' | 'normal' | 'low';
    onArchive: (id: string) => void;
    onDelete: (id: string) => void;
    onReply?: (id: string, text: string) => void;
    hasAttachments?: boolean;
    threadCount?: number;
    isStarred?: boolean;
    isUnread?: boolean;
}

export function EmailCard({
    id,
    sender,
    subject,
    summary,
    date,
    category,
    onArchive,
    onDelete,
    onReply,
    hasAttachments = false,
    threadCount = 0,
    isStarred = false,
    isUnread = true
}: EmailCardProps) {
    const [isReplying, setIsReplying] = useState(false)
    const [replyText, setReplyText] = useState('')
    const [isPolishing, setIsPolishing] = useState(false)
    const [diffResult, setDiffResult] = useState<Diff.Change[] | null>(null)

    const handleSendReply = () => {
        if (!replyText.trim()) return
        console.log(`Sending reply to ${sender}: ${replyText}`)
        if (onReply) {
            onReply(id, replyText);
        }
        setReplyText('')
        setIsReplying(false)
        setDiffResult(null)
    }

    const handlePolish = async () => {
        if (!replyText.trim()) return;
        setIsPolishing(true)
        setDiffResult(null)
        try {
            const polished = await aiClient.polish(replyText, 'formal');
            const diff = Diff.diffWords(replyText, polished);
            setDiffResult(diff);
        } catch (e) {
            console.error(e)
        } finally {
            setIsPolishing(false)
        }
    }

    const applyPolish = () => {
        if (!diffResult) return;
        const newText = diffResult.map(part => part.added || !part.removed ? part.value : '').join('');
        setReplyText(newText);
        setDiffResult(null);
    }

    return (
        <div className={`group relative p-4 rounded-xl transition-all duration-200 border ${isUnread
            ? 'bg-zinc-900/50 border-zinc-800'
            : 'bg-transparent border-transparent hover:bg-zinc-900/30'
            }`}>
            {/* Hover Actions - Absolute Positioned */}
            <div className="absolute right-4 top-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                    onClick={() => onArchive(id)}
                    className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                    title="Archive"
                >
                    <Archive size={14} />
                </button>
                <button
                    onClick={() => onDelete(id)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-md transition-colors"
                    title="Delete"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            <div className="flex gap-3">
                {/* Priority Indicator */}
                <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${category === 'urgent' ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]' :
                    category === 'important' ? 'bg-zinc-400' :
                        'bg-zinc-800'
                    }`} />

                <div className="flex-1 min-w-0 space-y-1">
                    {/* Header Row */}
                    <div className="flex justify-between items-baseline gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <h4 className={`text-sm truncate ${isUnread ? 'font-bold text-white' : 'font-medium text-zinc-300'}`}>
                                {sender}
                            </h4>
                            {isStarred && <Star size={10} className="text-zinc-400 fill-zinc-400" />}
                        </div>
                        <span className="text-[10px] text-zinc-500 tabular-nums shrink-0 pr-16 group-hover:pr-20 transition-all">
                            {date}
                        </span>
                    </div>

                    {/* Subject Line */}
                    <div className="flex items-center gap-2">
                        <p className={`text-xs truncate ${isUnread ? 'text-zinc-200 font-medium' : 'text-zinc-400'}`}>
                            {subject}
                        </p>
                        {threadCount > 1 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium">
                                {threadCount}
                            </span>
                        )}
                    </div>

                    {/* Summary */}
                    {!isReplying && (
                        <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2">
                            {summary}
                        </p>
                    )}

                    {/* Footer / Meta */}
                    <div className="flex items-center gap-3 pt-1">
                        {hasAttachments && (
                            <div className="flex items-center gap-1 text-[10px] text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded-full bg-zinc-950/50">
                                <Paperclip size={10} />
                                <span>Attachment</span>
                            </div>
                        )}

                        {/* Interactive Reply Area */}
                        {isReplying ? (
                            <div className="w-full mt-2 animate-in">
                                <div className="space-y-3">
                                    {diffResult ? (
                                        <div className="bg-zinc-950 rounded-lg p-3 text-sm border border-zinc-800 max-h-40 overflow-y-auto font-mono">
                                            {diffResult.map((part, index) => (
                                                <span key={index} className={part.added ? 'bg-zinc-800 text-white' : part.removed ? 'bg-zinc-900 text-zinc-600 line-through' : 'text-zinc-400'}>
                                                    {part.value}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <textarea
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors resize-none"
                                            rows={3}
                                            placeholder={`Reply to ${sender}...`}
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            autoFocus
                                        />
                                    )}

                                    <div className="flex justify-between items-center">
                                        <div className="flex gap-2">
                                            {diffResult ? (
                                                <>
                                                    <button onClick={applyPolish} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" title="Accept"><Check size={14} /></button>
                                                    <button onClick={() => setDiffResult(null)} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" title="Reject"><X size={14} /></button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={handlePolish}
                                                    disabled={isPolishing || !replyText.trim()}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-[10px] font-medium text-zinc-400 hover:text-white hover:border-zinc-700 transition-all disabled:opacity-50"
                                                >
                                                    <Sparkles size={12} />
                                                    {isPolishing ? 'Polishing...' : 'Polish'}
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setIsReplying(false)}
                                                className="px-3 py-1.5 text-[10px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSendReply}
                                                disabled={!replyText.trim()}
                                                className="px-3 py-1.5 bg-white text-black rounded-md text-[10px] font-bold hover:bg-zinc-200 transition-colors disabled:opacity-50"
                                            >
                                                Send
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsReplying(true)}
                                className="hidden group-hover:flex items-center gap-1.5 text-[10px] font-medium text-zinc-400 hover:text-white transition-colors"
                            >
                                <Reply size={10} />
                                <span>Quick Reply</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
