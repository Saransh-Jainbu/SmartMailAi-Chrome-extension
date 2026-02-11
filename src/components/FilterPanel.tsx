import { X, Calendar, User, Tag, Paperclip, Check } from 'lucide-react'
import { useState } from 'react'

interface FilterPanelProps {
    onClose: () => void;
    onApplyFilters: (filters: FilterOptions) => void;
}

export interface FilterOptions {
    category?: string[];
    hasAttachments?: boolean;
    isUnread?: boolean;
    dateRange?: 'today' | 'week' | 'month' | 'all';
    sender?: string;
}

export function FilterPanel({ onClose, onApplyFilters }: FilterPanelProps) {
    const [filters, setFilters] = useState<FilterOptions>({
        category: [],
        hasAttachments: false,
        isUnread: false,
        dateRange: 'all',
        sender: ''
    })

    const categories = ['urgent', 'important', 'normal', 'low']
    const dateRanges = [
        { value: 'today', label: 'Today' },
        { value: 'week', label: 'This Week' },
        { value: 'month', label: 'This Month' },
        { value: 'all', label: 'All Time' }
    ]

    const toggleCategory = (cat: string) => {
        setFilters(prev => ({
            ...prev,
            category: prev.category?.includes(cat)
                ? prev.category.filter(c => c !== cat)
                : [...(prev.category || []), cat]
        }))
    }

    const handleApply = () => {
        onApplyFilters(filters)
        onClose()
    }

    const handleReset = () => {
        const resetFilters = {
            category: [],
            hasAttachments: false,
            isUnread: false,
            dateRange: 'all' as const,
            sender: ''
        }
        setFilters(resetFilters)
        onApplyFilters(resetFilters)
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-sm overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest">Filter Inbox</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Filter Options */}
                <div className="p-5 space-y-6">
                    {/* Category Filter */}
                    <div>
                        <div className="flex items-center gap-2 mb-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                            <Tag size={12} />
                            Category
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {categories.map(cat => {
                                const isActive = filters.category?.includes(cat);
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => toggleCategory(cat)}
                                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border ${isActive
                                            ? 'bg-white text-black border-white'
                                            : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Date Range */}
                    <div>
                        <div className="flex items-center gap-2 mb-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                            <Calendar size={12} />
                            Date Range
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {dateRanges.map(range => (
                                <button
                                    key={range.value}
                                    onClick={() => setFilters(prev => ({ ...prev, dateRange: range.value as any }))}
                                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${filters.dateRange === range.value
                                        ? 'bg-zinc-800 text-white'
                                        : 'text-zinc-500 hover:bg-zinc-900'
                                        }`}
                                >
                                    {range.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Toggle Filters */}
                    <div className="space-y-1">
                        <label className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-zinc-900 transition-colors group">
                            <div className="flex items-center gap-3">
                                <Paperclip size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                                <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-300">Has Attachments</span>
                            </div>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${filters.hasAttachments ? 'bg-white border-white' : 'border-zinc-700 bg-transparent'}`}>
                                {filters.hasAttachments && <Check size={10} className="text-black" />}
                            </div>
                            <input
                                type="checkbox"
                                checked={filters.hasAttachments}
                                onChange={(e) => setFilters(prev => ({ ...prev, hasAttachments: e.target.checked }))}
                                className="hidden"
                            />
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-zinc-900 transition-colors group">
                            <div className="flex items-center gap-3">
                                <User size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                                <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-300">Unread Only</span>
                            </div>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${filters.isUnread ? 'bg-white border-white' : 'border-zinc-700 bg-transparent'}`}>
                                {filters.isUnread && <Check size={10} className="text-black" />}
                            </div>
                            <input
                                type="checkbox"
                                checked={filters.isUnread}
                                onChange={(e) => setFilters(prev => ({ ...prev, isUnread: e.target.checked }))}
                                className="hidden"
                            />
                        </label>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-5 border-t border-zinc-800 flex gap-3 bg-zinc-900/30">
                    <button
                        onClick={handleReset}
                        className="flex-1 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                        Reset
                    </button>
                    <button
                        onClick={handleApply}
                        className="flex-1 px-4 py-2.5 bg-white text-black rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5"
                    >
                        Apply Filters
                    </button>
                </div>
            </div>
        </div>
    )
}
