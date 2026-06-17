import { useEffect, useState } from 'react'
import { aiService } from '../services/ai'
import { CheckCircle, KeyRound, Mail, ShieldCheck, Sparkles } from 'lucide-react'

export default function Welcome() {
    const [aiStatus, setAiStatus] = useState<'checking' | 'ready' | 'needs-key'>('checking')

    useEffect(() => {
        checkAI()
    }, [])

    const checkAI = async () => {
        const isReady = await aiService.isAvailable()
        setAiStatus(isReady ? 'ready' : 'needs-key')
    }

    const handleCta = () => {
        if (aiStatus === 'ready') {
            chrome.tabs?.create?.({ url: 'https://mail.google.com' })
        } else {
            // The popup/side panel hosts settings; guide the user there.
            alert('Open the SmartMail AI icon in your toolbar and go to Settings to add your API key.')
        }
    }

    return (
        <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-8 font-sans">
            <div className="max-w-2xl w-full space-y-8 text-center">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
                        <Mail size={32} />
                    </div>
                </div>

                <h1 className="text-4xl font-bold tracking-tight">Welcome to SmartMail AI</h1>
                <p className="text-xl text-gray-400">
                    An AI assistant for Gmail &amp; Outlook — summaries, prioritization, and one-click replies.
                </p>

                <div className="bg-surface p-6 rounded-xl border border-white/10 text-left space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Sparkles size={20} /> Getting started
                    </h2>

                    {/* Honest AI status: reflects whether a key is actually configured. */}
                    <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                        <div>
                            <div className="font-medium">AI provider</div>
                            <div className="text-sm text-gray-400">Bring your own key — OpenAI or Anthropic Claude</div>
                        </div>
                        <div className="flex items-center gap-2">
                            {aiStatus === 'checking' && <span className="animate-pulse text-gray-400">Checking…</span>}
                            {aiStatus === 'ready' && (
                                <span className="text-green-400 flex items-center gap-1"><CheckCircle size={16} /> Key configured</span>
                            )}
                            {aiStatus === 'needs-key' && (
                                <span className="text-amber-400 flex items-center gap-1"><KeyRound size={16} /> Add a key</span>
                            )}
                        </div>
                    </div>

                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm space-y-2">
                        <p className="font-semibold text-blue-200 flex items-center gap-2">
                            <KeyRound size={16} /> One-time setup
                        </p>
                        <p className="text-gray-300">
                            Add your OpenAI or Anthropic API key in Settings. Your key is stored locally in your
                            browser and used to call the provider directly — we never see it.
                        </p>
                    </div>

                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-sm">
                        <p className="font-semibold text-green-200 mb-2 flex items-center gap-2">
                            <ShieldCheck size={16} /> No mailbox login required
                        </p>
                        <p className="text-gray-300 text-xs">
                            SmartMail AI reads the Gmail or Outlook tab you're viewing directly in the page —
                            no OAuth, and your email never leaves your browser except for the AI calls you trigger.
                        </p>
                    </div>
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={handleCta}
                        className="px-8 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-all shadow-lg shadow-primary/20"
                    >
                        {aiStatus === 'ready' ? 'Open Gmail to start' : 'Add your API key'}
                    </button>
                </div>

                <p className="text-sm text-gray-500">
                    Open Gmail or Outlook and click the SmartMail AI button to open the smart inbox panel.
                </p>
            </div>
        </div>
    )
}
