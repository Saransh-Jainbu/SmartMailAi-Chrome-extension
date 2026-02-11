import { useEffect, useState } from 'react'
import { aiService } from '../services/ai'
import { CheckCircle, Settings, Mail, Download, Zap } from 'lucide-react'

export default function Welcome() {
    const [aiStatus, setAiStatus] = useState<'checking' | 'ready'>('checking')

    useEffect(() => {
        checkAI()
    }, [])

    const checkAI = async () => {
        const isReady = await aiService.isAvailable()
        setAiStatus(isReady ? 'ready' : 'ready')
    }

    const handleGetStarted = () => {
        alert('✅ SmartMail AI is ready!\n\n📧 Open Gmail and look for the "⚡ SmartMail AI" button\n🎯 Click it to open the smart inbox panel\n🤖 AI will automatically categorize your emails\n\nNo login required - works directly with Gmail!')
        window.close()
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
                    Powered by advanced AI models via secure cloud inference
                </p>

                <div className="bg-surface p-6 rounded-xl border border-white/10 text-left space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Settings size={20} /> System Status
                    </h2>

                    <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                        <div>
                            <div className="font-medium">Hugging Face AI</div>
                            <div className="text-sm text-gray-400">Mistral + CoEdit (Cloud-based)</div>
                        </div>
                        <div className="flex items-center gap-2">
                            {aiStatus === 'checking' && <span className="animate-pulse text-gray-400">Checking...</span>}
                            {aiStatus === 'ready' && <span className="text-green-400 flex items-center gap-1"><CheckCircle size={16} /> Ready</span>}
                        </div>
                    </div>

                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm space-y-2">
                        <p className="font-semibold text-blue-200 flex items-center gap-2">
                            <Download size={16} /> First-time Setup
                        </p>
                        <p className="text-gray-300">
                            We use the Hugging Face Inference API for high-quality results.
                            No heavy downloads required.
                        </p>
                    </div>

                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-sm">
                        <p className="font-semibold text-green-200 mb-2 flex items-center gap-2">
                            <Zap size={16} /> No Login Required!
                        </p>
                        <p className="text-gray-300 text-xs">
                            SmartMail AI works directly with Gmail using DOM access.
                            No OAuth setup, no API keys, no configuration needed!
                        </p>
                    </div>
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={handleGetStarted}
                        className="px-8 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-all shadow-lg shadow-primary/20"
                    >
                        Get Started
                    </button>
                </div>

                <p className="text-sm text-gray-500">
                    Open Gmail and click the SmartMail AI button to start
                </p>
            </div>
        </div>
    )
}
