'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import type { User } from '@/types/database'
import { Menu, Zap } from 'lucide-react'

interface AppLayoutProps {
  user: User
  allowedHrefs: string[]
  children: React.ReactNode
}

export default function AppLayout({ user, allowedHrefs, children }: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background relative overflow-hidden">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar 
          user={user} 
          allowedHrefs={allowedHrefs} 
          onNavigate={() => setIsSidebarOpen(false)} 
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-[#0d0d14] z-30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-foreground/20 border border-foreground/30 flex items-center justify-center">
              <Zap className="w-4 h-4 text-foreground" />
            </div>
            <span className="font-bold text-gradient text-sm">AKAAI</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -mr-2 text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
        
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto custom-scrollbar relative">
          {children}
        </div>
      </main>
    </div>
  )
}
