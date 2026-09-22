'use client'

import { useState } from 'react'
import { BarChart3, Settings } from 'lucide-react'

interface TrafficTabsProps {
  metricsComponent: React.ReactNode
  boardComponent: React.ReactNode
}

export function TrafficTabs({ metricsComponent, boardComponent }: TrafficTabsProps) {
  const [activeTab, setActiveTab] = useState<'metrics' | 'ops'>('metrics')

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center gap-4 border-b border-border mb-6">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors relative ${
            activeTab === 'metrics' ? 'text-foreground' : 'text-muted-foreground hover:text-muted-foreground'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Métricas e ROI
          {activeTab === 'metrics' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('ops')}
          className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors relative ${
            activeTab === 'ops' ? 'text-foreground' : 'text-muted-foreground hover:text-muted-foreground'
          }`}
        >
          <Settings className="w-4 h-4" />
          Operações (Setup)
          {activeTab === 'ops' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full" />
          )}
        </button>
      </div>

      <div className="flex-1 animate-in fade-in duration-300">
        {activeTab === 'metrics' ? metricsComponent : boardComponent}
      </div>
    </div>
  )
}
