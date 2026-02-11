import { useState, useEffect } from 'react'
import { nanoService } from '../services/nano'
import { Sparkles, Send, X } from 'lucide-react'

interface SmartDrafterProps {
    onClose: () => void;
    recipient?: string;
    context?: string; // The email thread context
}

export function SmartDrafter({ onClose, recipient = 'Recipient', context = '' }: SmartDrafterProps) {
    const [draft, setDraft] = useState('')
    const [suggestion, setSuggestion] = useState('')
    const [loading, setLoading] = useState(false)

    // AI Autocomplete Logic
    useEffect(() => {
        const fetchSuggestion = async () => {
            if (!draft || draft.length < 5) return;
            if (draft.endsWith(' ')) {
                // Simple heuristic: trigger suggestion on space
                try {
                    // In real app, we debounce and query Nano
                    // const result = await nanoService.generate(`Continue this email: "${draft}"`);
                    // setSuggestion(result.replace(draft, ''));
                    setSuggestion('... (AI suggestion would appear here)');
                } catch (e) {
                    console.error(e)
                }
            }
        }
        const timer = setTimeout(fetchSuggestion, 500)
        return () => clearTimeout(timer)
    }, [draft])

    const handleGenerateFullDraft = async () => {
        setLoading(true)
        try {
            const prompt = `Write a professional reply to this email context: "${context}". Tone: Efficient.`
            const result = await nanoService.generate(prompt)
            setDraft(result)
            setSuggestion('')
        } catch (e) {
            alert('AI Generation failed (check console)')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-surface border border-white/10 rounded-xl shadow-2xl flex flex-col font-sans animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-primary w-5 h-5" />
                        <h2 className="font-semibold text-white">Smart Draft</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Editor */}
                <div className="p-6 flex-1 min-h-[300px] flex flex-col relative">
                    <div className="mb-4 text-sm text-gray-400">
                        To: <span className="text-white font-medium bg-white/5 px-2 py-0.5 rounded">{recipient}</span>
                    </div>

                    <div className="relative flex-1">
                        <textarea
                            className="w-full h-full bg-transparent resize-none outline-none text-white leading-relaxed z-10 relative placeholder:text-gray-600"
                            placeholder="Start typing or ask AI..."
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            autoFocus
                        />
                        {/* Ghost Text Overlay (simplified) */}
                        <div className="absolute top-0 left-0 w-full h-full pointer-events-none text-transparent whitespace-pre-wrap leading-relaxed">
                            {draft}<span className="text-gray-500">{suggestion}</span>
                        </div>
                    </div>
                </div>

                {/* Footer / AI Actions */}
                <div className="p-4 border-t border-white/10 flex justify-between items-center bg-background/50 rounded-b-xl">
                    <div className="flex gap-2">
                        <button
                            onClick={handleGenerateFullDraft}
                            disabled={loading}
                            className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
                        >
                            {loading ? <Sparkles className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                            Generate Draft
                        </button>
                        <button
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium rounded-lg transition-colors"
                        >
                            Make it Shorter
                        </button>
                    </div>

                    <button className="px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 flex items-center gap-2 transition-colors">
                        <Send size={16} /> Send
                    </button>
                </div>

            </div>
        </div>
    )
}
