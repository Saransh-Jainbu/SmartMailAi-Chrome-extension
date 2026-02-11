import { useState, useEffect } from 'react'
import { aiService } from '../services/ai'
import { Sparkles, Send, X, Check } from 'lucide-react'
import * as Diff from 'diff'

interface SmartDrafterProps {
    onClose: () => void;
    recipient?: string;
    context?: string; // The email thread context
}

export function SmartDrafter({ onClose, recipient = 'Recipient', context = '' }: SmartDrafterProps) {
    const [draft, setDraft] = useState('')
    const [suggestion, setSuggestion] = useState('')
    const [loading, setLoading] = useState(false)
    const [isPolishing, setIsPolishing] = useState(false)
    const [diffResult, setDiffResult] = useState<Diff.Change[] | null>(null)

    // AI Autocomplete Logic
    useEffect(() => {
        const fetchSuggestion = async () => {
            if (!draft || draft.length < 5 || isPolishing) return;
            if (draft.endsWith(' ')) {
                // Simple heuristic
                // In real app, debounce and query AI
            }
        }
        const timer = setTimeout(fetchSuggestion, 500)
        return () => clearTimeout(timer)
    }, [draft, isPolishing])

    const handleGenerateFullDraft = async () => {
        setLoading(true)
        setDiffResult(null)
        try {
            const prompt = `Write a professional reply to this email context: "${context}". Tone: Efficient.`
            const result = await aiService.generate(prompt)
            setDraft(result)
            setSuggestion('')
        } catch (e) {
            console.error(e)
            alert('AI Generation failed')
        } finally {
            setLoading(false)
        }
    }

    const handlePolish = async () => {
        if (!draft.trim()) return;
        setIsPolishing(true)
        setDiffResult(null)
        try {
            const polished = await aiService.polishEmail(draft, 'formal');
            const diff = Diff.diffWords(draft, polished);
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
        setDraft(newText);
        setDiffResult(null);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-surface border border-white/10 rounded-xl shadow-2xl flex flex-col font-sans animate-in zoom-in-95 duration-200 h-[80vh]">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-primary w-5 h-5" />
                        <h2 className="font-semibold text-white">Smart Draft</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Editor Area */}
                <div className="p-6 flex-1 flex flex-col relative overflow-hidden">
                    <div className="mb-4 text-sm text-gray-400 shrink-0">
                        To: <span className="text-white font-medium bg-white/5 px-2 py-0.5 rounded">{recipient}</span>
                    </div>

                    <div className="relative flex-1 flex flex-col">
                        {diffResult ? (
                            <div className="flex-1 bg-black/20 rounded-lg p-4 overflow-y-auto border border-white/10 leading-relaxed font-mono text-sm">
                                {diffResult.map((part, index) => {
                                    const color = part.added ? 'bg-green-500/20 text-green-300' : part.removed ? 'bg-red-500/20 text-red-300 line-through decoration-red-500/50' : 'text-gray-300';
                                    return (
                                        <span key={index} className={`${color} px-0.5 rounded transition-colors duration-300`}>
                                            {part.value}
                                        </span>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="relative flex-1">
                                <textarea
                                    className="w-full h-full bg-transparent resize-none outline-none text-white leading-relaxed z-10 relative placeholder:text-gray-600 font-mono text-sm"
                                    placeholder="Start typing or ask AI..."
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    autoFocus
                                />
                                {/* Ghost Text for suggestions */}
                                <div className="absolute top-0 left-0 w-full h-full pointer-events-none text-transparent whitespace-pre-wrap leading-relaxed font-mono text-sm">
                                    {draft}<span className="text-gray-500">{suggestion}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer / AI Actions */}
                <div className="p-4 border-t border-white/10 flex justify-between items-center bg-background/50 rounded-b-xl shrink-0">
                    <div className="flex gap-2">
                        {diffResult ? (
                            <>
                                <button
                                    onClick={applyPolish}
                                    className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors border border-green-500/20"
                                >
                                    <Check size={16} />
                                    Accept Changes
                                </button>
                                <button
                                    onClick={() => setDiffResult(null)}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={handleGenerateFullDraft}
                                    disabled={loading || isPolishing}
                                    className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    {loading ? <Sparkles className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                    Generate Draft
                                </button>
                                <button
                                    onClick={handlePolish}
                                    disabled={loading || isPolishing || !draft.trim()}
                                    className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    {isPolishing ? <Sparkles className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                    Polish & Fix Grammar
                                </button>
                            </>
                        )}
                    </div>

                    <button className="px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 flex items-center gap-2 transition-colors">
                        <Send size={16} /> Send
                    </button>
                </div>

            </div>
        </div>
    )
}
