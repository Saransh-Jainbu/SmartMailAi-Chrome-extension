import { useState } from 'react'
import { Zap, ExternalLink, Settings } from 'lucide-react'
import './index.css'

function App() {
  const [stats] = useState({ urgent: 12, important: 5, drafts: 2 })

  const openSidePanel = () => {
    // Chrome sidePanel API might not be directly callable from popup to open global sidepanel easily without user gesture on specific UI
    // But we can try or guide user
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        // chrome.sidePanel.open({ tabId: tabs[0].id }); // Requires user gesture usually
        window.close();
      }
    });
  }

  return (
    <div className="w-[360px] h-[450px] bg-background text-white font-sans flex flex-col">
      <header className="flex justify-between items-center p-4 border-b border-white/10 bg-surface/50 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">SmartMail</h1>
        </div>
        <button className="p-2 hover:bg-white/5 rounded-full text-gray-400">
          <Settings size={18} />
        </button>
      </header>

      <main className="flex-1 p-4 space-y-4">
        {/* Hero Card */}
        <div className="bg-gradient-to-br from-primary/20 to-surface p-6 rounded-2xl border border-primary/20 text-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap size={100} />
          </div>

          <div className="relative z-10">
            <div className="text-gray-400 text-sm font-medium mb-1">URGENT ATTENTION</div>
            <div className="text-5xl font-bold text-white mb-2">{stats.urgent}</div>
            <div className="text-sm text-gray-300">Emails require action</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={openSidePanel} className="p-4 bg-surface border border-white/10 rounded-xl hover:bg-white/5 transition-all text-left group">
            <ExternalLink className="w-5 h-5 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
            <div className="font-semibold text-gray-200">Open Panel</div>
            <div className="text-xs text-gray-500">View full dashboard</div>
          </button>

          <div className="p-4 bg-surface border border-white/10 rounded-xl text-left">
            <div className="text-2xl font-bold text-orange-400 mb-1">{stats.important}</div>
            <div className="text-xs text-gray-400">Important Updates</div>
          </div>
        </div>

        {/* Focus Mode Toggle (Mock) */}
        <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
            <span className="font-medium text-sm">Focus Mode</span>
          </div>
          <button className="w-10 h-6 bg-white/10 rounded-full relative transition-colors hover:bg-white/20">
            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
          </button>
        </div>
      </main>
    </div>
  )
}

export default App
