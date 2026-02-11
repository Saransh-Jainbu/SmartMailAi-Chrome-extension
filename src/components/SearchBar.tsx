import { Search, X, Filter as FilterIcon } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface SearchBarProps {
    onSearch: (query: string) => void;
    onFilterClick?: () => void;
    placeholder?: string;
}

export function SearchBar({ onSearch, onFilterClick, placeholder = "Search emails..." }: SearchBarProps) {
    const [query, setQuery] = useState('')
    const [isFocused, setIsFocused] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        // Keyboard shortcut: Ctrl/Cmd + K to focus search
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault()
                inputRef.current?.focus()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [])

    useEffect(() => {
        // Debounce search
        const timer = setTimeout(() => {
            onSearch(query)
        }, 300)

        return () => clearTimeout(timer)
    }, [query, onSearch])

    const handleClear = () => {
        setQuery('')
        onSearch('')
        inputRef.current?.focus()
    }

    return (
        <div className={`relative flex items-center gap-2 transition-all duration-200 ${isFocused ? 'scale-[1.02]' : ''}`}>
            {/* Search Input */}
            <div className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${isFocused
                    ? 'bg-surface-elevated border-primary/50 shadow-lg shadow-primary/20'
                    : 'bg-surface border-white/10 hover:border-white/20'
                }`}>
                <Search className={`w-4 h-4 transition-colors ${isFocused ? 'text-primary' : 'text-gray-400'}`} />

                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 outline-none"
                />

                {query && (
                    <button
                        onClick={handleClear}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                        title="Clear search"
                    >
                        <X className="w-4 h-4 text-gray-400" />
                    </button>
                )}

                {/* Keyboard Shortcut Hint */}
                {!isFocused && !query && (
                    <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-white/5 rounded text-xs text-gray-500">
                        <kbd className="font-mono">⌘K</kbd>
                    </div>
                )}
            </div>

            {/* Filter Button */}
            {onFilterClick && (
                <button
                    onClick={onFilterClick}
                    className="p-3 bg-surface border border-white/10 rounded-xl hover:bg-surface-elevated hover:border-primary/50 transition-all"
                    title="Filters"
                >
                    <FilterIcon className="w-4 h-4 text-gray-400" />
                </button>
            )}
        </div>
    )
}
