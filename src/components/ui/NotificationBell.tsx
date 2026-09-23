'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, Check, X, ExternalLink, Info, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { Notification } from '@/types/database'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // 1. Fetch initial notifications
    const fetchNotifications = async () => {
      const { data } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (data) setNotifications(data)
    }

    fetchNotifications()

    // 2. Subscribe to realtime changes
    const channel = supabase.channel('notifications_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new as Notification : n))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase])

  const unreadCount = notifications.filter(n => !n.is_read).length

  async function markAsRead(id: string) {
    const { error } = await (supabase as any)
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
    
    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    }
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return

    const { error } = await (supabase as any)
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds)
    
    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    }
  }

  function getIconForType(type: Notification['type']) {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />
      case 'error': return <AlertTriangle className="w-4 h-4 text-pink-500" />
      default: return <Info className="w-4 h-4 text-blue-500" />
    }
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn("sidebar-link w-full mb-1", isOpen && "bg-secondary/50")}
      >
        <Bell className="w-4 h-4" />
        <span>Alertas</span>
        {unreadCount > 0 && (
          <span className="ml-auto inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-background animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed left-64 bottom-4 mt-2 w-80 bg-[#161622] border border-border rounded-xl shadow-2xl shadow-black/80 overflow-hidden z-[60]">
          <div className="p-3 border-b border-border flex items-center justify-between bg-black/20">
            <h3 className="font-semibold text-sm">Notificações</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Marcar lidas
              </button>
            )}
          </div>
          
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhuma notificação por enquanto.
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map(notification => (
                  <div 
                    key={notification.id}
                    className={cn(
                      "p-3 border-b border-border/50 hover:bg-secondary/50 transition-colors flex gap-3 relative group",
                      !notification.is_read ? "bg-secondary/20" : ""
                    )}
                  >
                    {!notification.is_read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-pink-500" />
                    )}
                    
                    <div className="mt-1">
                      {getIconForType(notification.type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-sm font-semibold text-foreground leading-tight">{notification.title}</h4>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        {notification.link ? (
                          <Link 
                            href={notification.link}
                            className="text-[10px] font-medium text-foreground hover:underline flex items-center gap-1"
                            onClick={() => {
                              if (!notification.is_read) markAsRead(notification.id)
                              setIsOpen(false)
                            }}
                          >
                            Ver detalhes <ExternalLink className="w-3 h-3" />
                          </Link>
                        ) : <div />}
                        
                        {!notification.is_read && (
                          <button 
                            onClick={() => markAsRead(notification.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground hover:text-foreground"
                          >
                            Marcar lida
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop for mobile closing */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
