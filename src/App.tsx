import { useState, useEffect } from 'react'
import { Sparkles, TrendingUp, Zap, Mail, Star, Settings, ChevronRight, Brain, Shield } from 'lucide-react'
import './index.css'

function App() {
  const [stats, setStats] = useState({ urgent: 0, important: 0, total: 0, unread: 0 })
  const [loading, setLoading] = useState(true)
  const [greeting, setGreeting] = useState('')
  const [hasData, setHasData] = useState(false)
  const [provider, setProvider] = useState<string>('')

  useEffect(() => {
    // Set greeting based on time
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good Morning')
    else if (hour < 18) setGreeting('Good Afternoon')
    else setGreeting('Good Evening')

    const computeStats = (emails: any[]) => ({
      // Categories come from the real AI classification cached by the side panel.
      urgent: emails.filter((e: any) => e.category === 'urgent').length,
      important: emails.filter((e: any) => e.category === 'important').length,
      total: emails.length,
      unread: emails.filter((e: any) => e.isUnread ?? (e.status !== 'read')).length,
    })

    const load = async () => {
      // Reflect which AI provider is actually configured.
      const cfg = await chrome.storage.local.get(['ai_provider', 'openai_key', 'anthropic_key', 'emails_cache'])
      if (cfg.anthropic_key && (cfg.ai_provider === 'anthropic' || !cfg.openai_key)) setProvider('Anthropic Claude')
      else if (cfg.openai_key) setProvider('OpenAI')
      else setProvider('')

      // Prefer the classified cache the side panel maintains (real categories + unread).
      const cached = (cfg.emails_cache as any[]) || []
      if (cached.length > 0) {
        setStats(computeStats(cached))
        setHasData(true)
        setLoading(false)
        return
      }

      // No cache yet: only show real numbers from the live mail tab. Otherwise stay empty.
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      const isMailTab = !!tab?.id && (tab.url?.includes('mail.google.com') || tab.url?.includes('outlook') || tab.url?.includes('office'))
      if (isMailTab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'getEmails' }, (response) => {
          const emails = response?.emails || []
          if (emails.length > 0) {
            // Without classification here we only show what we can measure honestly.
            setStats({
              urgent: 0,
              important: 0,
              total: emails.length,
              unread: emails.filter((e: any) => e.isUnread ?? (e.status !== 'read')).length,
            })
            setHasData(true)
          }
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
    }

    load()
  }, [])

  const openSidePanel = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        chrome.sidePanel.open({ windowId: tabs[0].windowId })
        window.close()
      }
    })
  }

  const openGmail = () => {
    chrome.tabs.create({ url: 'https://mail.google.com' })
    window.close()
  }

  // Show a number only when we actually measured one; otherwise an honest em-dash.
  const show = (n: number) => (loading ? '...' : hasData ? n : '–')

  return (
    <div className="w-[400px] min-h-[550px] bg-gradient-to-br from-background via-surface to-background text-white font-sans flex flex-col">
      {/* Header with Gradient */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-pink-500 opacity-20"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>

        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/50 animate-pulse-slow">
                <Sparkles size={24} className="text-white" />
              </div>
              <div>
                <h1 className="font-bold text-xl text-gradient">SmartMail AI</h1>
                <p className="text-xs text-gray-400">Intelligent Email Assistant</p>
              </div>
            </div>
            <button className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <Settings size={20} className="text-gray-400" />
            </button>
          </div>

          <div className="text-sm text-gray-300 mb-1">{greeting}! 👋</div>
          <div className="text-2xl font-bold mb-4">Your Inbox Overview</div>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-4 overflow-y-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Urgent */}
          <div className="glass-strong p-4 rounded-2xl hover:scale-105 transition-transform cursor-pointer group">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                <Zap size={16} className="text-red-400" />
              </div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Urgent</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {show(stats.urgent)}
            </div>
            <div className="text-xs text-gray-500">Needs attention</div>
          </div>

          {/* Important */}
          <div className="glass-strong p-4 rounded-2xl hover:scale-105 transition-transform cursor-pointer group">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Star size={16} className="text-orange-400" />
              </div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Important</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {show(stats.important)}
            </div>
            <div className="text-xs text-gray-500">To review</div>
          </div>

          {/* Unread */}
          <div className="glass-strong p-4 rounded-2xl hover:scale-105 transition-transform cursor-pointer group">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Mail size={16} className="text-blue-400" />
              </div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Unread</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {show(stats.unread)}
            </div>
            <div className="text-xs text-gray-500">New messages</div>
          </div>

          {/* Total */}
          <div className="glass-strong p-4 rounded-2xl hover:scale-105 transition-transform cursor-pointer group">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp size={16} className="text-green-400" />
              </div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Total</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {show(stats.total)}
            </div>
            <div className="text-xs text-gray-500">In inbox</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <h3 className="text-xs text-gray-500 uppercase tracking-wide font-semibold px-1">Quick Actions</h3>

          <button
            onClick={openSidePanel}
            className="w-full glass-strong p-4 rounded-xl hover:bg-white/10 transition-all group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-500 rounded-xl flex items-center justify-center">
                <Brain size={20} className="text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-white">Open AI Dashboard</div>
                <div className="text-xs text-gray-400">Smart inbox with AI insights</div>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={openGmail}
            className="w-full glass-strong p-4 rounded-xl hover:bg-white/10 transition-all group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Mail size={20} className="text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-white">Open Gmail</div>
                <div className="text-xs text-gray-400">Go to your inbox</div>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* AI Status — reflects the actually configured provider */}
        <div className="glass-strong p-4 rounded-xl border border-primary/30">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${provider ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' : 'bg-gray-500'}`}></div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">
                {provider ? 'AI Classification Active' : 'AI Not Configured'}
              </div>
              <div className="text-xs text-gray-400">
                {provider ? `Powered by ${provider}` : 'Add an API key in Settings to enable AI'}
              </div>
            </div>
            <Shield size={16} className={provider ? 'text-green-400' : 'text-gray-500'} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 border-t border-white/10 text-center">
        <p className="text-xs text-gray-500">
          Powered by AI • Privacy-First • No Data Collection
        </p>
      </footer>
    </div>
  )
}

export default App
