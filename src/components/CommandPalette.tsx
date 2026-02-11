import { Command } from 'cmdk'
import { useState, useEffect } from 'react'
import { Search, Mail, Zap, ArrowRight } from 'lucide-react'

export function CommandPalette() {
    const [open, setOpen] = useState(false)

    // Toggle with Cmd+K
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }
        document.addEventListener('keydown', down)
        return () => document.removeEventListener('keydown', down)
    }, [])

    return (
        <Command.Dialog
            open={open}
            onOpenChange={setOpen}
            label="Global Command Menu"
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        >
            <div className="w-full max-w-lg bg-surface border border-white/10 rounded-xl shadow-2xl overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center border-b border-white/10 px-3">
                    <Search className="w-5 h-5 text-gray-400 mr-2" />
                    <Command.Input
                        placeholder="Type a command or search..."
                        className="flex-1 bg-transparent py-4 text-white outline-none placeholder:text-gray-500"
                    />
                </div>

                <Command.List className="max-h-[300px] overflow-y-auto p-2 scroll-py-2">
                    <Command.Empty className="py-6 text-center text-sm text-gray-500">
                        No results found.
                    </Command.Empty>

                    <Command.Group heading="Actions" className="text-xs font-medium text-gray-500 px-2 py-1.5 mb-1">
                        <Command.Item className="flex items-center px-2 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 hover:text-white cursor-pointer transition-colors aria-selected:bg-white/10 aria-selected:text-white">
                            <div className="w-8 h-8 bg-primary/20 text-primary rounded-md flex items-center justify-center mr-3">
                                <Mail size={16} />
                            </div>
                            <div className="flex-1">Compose New Email</div>
                            <span className="text-xs text-gray-500">C</span>
                        </Command.Item>
                        <Command.Item className="flex items-center px-2 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 hover:text-white cursor-pointer transition-colors aria-selected:bg-white/10 aria-selected:text-white">
                            <div className="w-8 h-8 bg-urgent/20 text-urgent rounded-md flex items-center justify-center mr-3">
                                <Zap size={16} />
                            </div>
                            <div className="flex-1">Zap Clutter</div>
                            <span className="text-xs text-gray-500">⌘ Z</span>
                        </Command.Item>
                    </Command.Group>

                    <Command.Group heading="Drafts to Review" className="text-xs font-medium text-gray-500 px-2 py-1.5 mt-2 mb-1">
                        <Command.Item className="flex items-center px-2 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 hover:text-white cursor-pointer transition-colors aria-selected:bg-white/10 aria-selected:text-white">
                            <div className="w-8 h-8 bg-blue-500/20 text-blue-500 rounded-md flex items-center justify-center mr-3">
                                <ArrowRight size={16} />
                            </div>
                            <div className="flex-1">
                                <span className="font-medium text-white">Reply to Sarah</span>
                                <span className="ml-2 text-gray-500 truncate">– Regarding Q4 Report...</span>
                            </div>
                        </Command.Item>
                    </Command.Group>
                </Command.List>
            </div>
        </Command.Dialog>
    )
}
