import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, Key, Save, X, CheckCircle2, Info, Loader2, User, Briefcase, FileSignature } from 'lucide-react'

interface SettingsPanelProps {
    onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
    const [openAiKey, setOpenAiKey] = useState('')
    const [userName, setUserName] = useState('')
    const [userTitle, setUserTitle] = useState('')
    const [userSignature, setUserSignature] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        // Load keys and user settings from storage
        chrome.storage.local.get(['openai_key', 'user_name', 'user_title', 'user_signature'], (result) => {
            if (result.openai_key) setOpenAiKey(result.openai_key as string)
            if (result.user_name) setUserName(result.user_name as string)
            if (result.user_title) setUserTitle(result.user_title as string)
            if (result.user_signature) setUserSignature(result.user_signature as string)
        })
    }, [])

    const handleSave = async () => {
        setSaving(true)
        chrome.storage.local.set({
            openai_key: openAiKey,
            user_name: userName,
            user_title: userTitle,
            user_signature: userSignature
        }, () => {
            setSaving(false)
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        })
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
                {/* Header */}
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                            <Shield className="text-white" size={16} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white">Settings</h2>
                            <p className="text-[10px] text-zinc-500 font-medium">Configure your profile & API</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Info Box */}
                    <div className="flex gap-3 p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                        <Info className="text-zinc-400 shrink-0 mt-0.5" size={14} />
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                            Your settings are stored <span className="text-zinc-200 font-bold">locally</span> in your browser. They are never sent to our servers.
                        </p>
                    </div>

                    {/* User Profile Section */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Your Profile</h3>

                        {/* Name Field */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                <User size={12} />
                                Your Name
                            </label>
                            <input
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                placeholder="John Doe"
                                className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-700 focus:border-white/40 focus:outline-none transition-colors"
                            />
                        </div>

                        {/* Title Field */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                <Briefcase size={12} />
                                Your Title (Optional)
                            </label>
                            <input
                                type="text"
                                value={userTitle}
                                onChange={(e) => setUserTitle(e.target.value)}
                                placeholder="Software Engineer"
                                className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-700 focus:border-white/40 focus:outline-none transition-colors"
                            />
                        </div>

                        {/* Signature Field */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                <FileSignature size={12} />
                                Email Signature (Optional)
                            </label>
                            <textarea
                                value={userSignature}
                                onChange={(e) => setUserSignature(e.target.value)}
                                placeholder="Best regards,&#10;John Doe&#10;Software Engineer&#10;Company Name"
                                rows={4}
                                className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-700 focus:border-white/40 focus:outline-none transition-colors resize-none"
                            />
                        </div>
                    </div>

                    {/* API Section */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">API Configuration</h3>

                        {/* OpenAI Field */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                <Key size={12} />
                                OpenAI API Key
                            </label>
                            <input
                                type="password"
                                value={openAiKey}
                                onChange={(e) => setOpenAiKey(e.target.value)}
                                placeholder="sk-..."
                                className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-700 focus:border-white/40 focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`w-full py-3 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${saved
                            ? 'bg-white text-black'
                            : 'bg-zinc-100 text-black hover:bg-white'
                            }`}
                    >
                        {saving ? (
                            <Loader2 className="animate-spin" size={14} />
                        ) : saved ? (
                            <>
                                <CheckCircle2 size={14} />
                                Saved
                            </>
                        ) : (
                            <>
                                <Save size={14} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    )
}
