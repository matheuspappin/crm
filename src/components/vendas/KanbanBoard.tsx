'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import type { Lead, LeadStatus } from '@/types/database'
import { formatCurrency } from '@/lib/utils'
import { Clock, Tag, Building2, User, MessageSquare, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { LeadTimelineModal } from './LeadTimelineModal'
import { LeadFreshnessTimer } from './LeadFreshnessTimer'
import { ContactLeadModal } from './ContactLeadModal'
import { DiscardLeadModal } from './DiscardLeadModal'

const COLUMNS: { key: LeadStatus; label: string; color: string }[] = [
  { key: 'novo',       label: 'Novo Lead',   color: '#6366f1' },
  { key: 'reuniao',    label: 'Reunião',      color: '#8b5cf6' },
  { key: 'proposta',   label: 'Proposta',     color: '#f59e0b' },
  { key: 'negociacao', label: 'Negociação',   color: '#f97316' },
  { key: 'fechado',    label: 'Fechado ✓',    color: '#10b981' },
]

interface KanbanBoardProps {
  initialLeads: Lead[]
  sellerFilter?: string | null
}

// -------------------------------------------------------------
// Sortable Lead Card Component
// -------------------------------------------------------------
function SortableLeadCard({
  lead,
  onClick,
  onContact,
  onDiscard,
}: {
  lead: Lead
  onClick: () => void
  onContact: (lead: Lead) => void
  onDiscard: (lead: Lead) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id, data: lead })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  // Identificação visual do responsável (se existir)
  const assigneeInitials = (lead as any).assigned_user?.name
    ? (lead as any).assigned_user.name.substring(0, 2).toUpperCase()
    : '?'

  const timeInStage = formatDistanceToNow(new Date(lead.last_moved_at || lead.created_at), { locale: ptBR })

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`relative glass-card p-4 rounded-xl border hover:border-border cursor-grab active:cursor-grabbing transition-colors ${
        lead.sla_alerted ? 'border-red-500/50 bg-red-500/5' : 'border-border bg-card'
      }`}
    >
      {lead.sla_alerted && (
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-red-500 rounded-full animate-pulse border border-[#111118]" />
      )}
      
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="text-foreground font-semibold text-sm leading-tight pr-2">{lead.name}</h4>
          {lead.company_name && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Building2 className="w-3 h-3" />
              {lead.company_name}
            </p>
          )}
        </div>
        <div className="w-6 h-6 rounded-full bg-secondary text-muted-foreground flex items-center justify-center text-[10px] font-bold border border-border shrink-0" title={`Responsável: ${(lead as any).assigned_user?.name || 'Nenhum'}`}>
          {assigneeInitials}
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-gradient">
            {formatCurrency(lead.value || 0)}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Botão de descarte rápido para lixeira/perdidos */}
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onDiscard(lead)
              }}
              className="p-1 rounded-md text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Descartar lead (não sucedido) para lixeira/perdidos"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Botão de contato direto pelo card do Kanban */}
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onContact(lead)
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 text-[11px] font-semibold transition-all hover:scale-105 active:scale-95 shadow-sm"
              title="Contactar cliente via WhatsApp"
            >
              <MessageSquare className="w-3 h-3" />
              <span>Contactar</span>
            </button>
          </div>
        </div>
        
        {/* Info Tags */}
        <div className="flex flex-wrap items-center gap-1.5">
          {lead.utm_source && (
            <span className="flex items-center gap-1 text-[10px] bg-violet-500/10 text-violet-400 px-1.5 py-0.5 rounded border border-violet-500/20">
              <Tag className="w-3 h-3" />
              {lead.utm_source}
            </span>
          )}
          {/* Timing de Geração do Lead (com semáforo de urgência) */}
          <LeadFreshnessTimer
            createdAt={lead.generation_created_at || lead.created_at}
            prefix="Gerado"
            variant="badge"
          />
          <span className="flex items-center gap-1 text-[10px] bg-secondary text-[#8b8b9e] px-1.5 py-0.5 rounded border border-border" title="Tempo nesta etapa do funil">
            <Clock className="w-3 h-3" />
            {timeInStage}
          </span>
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// Droppable Column Component
// -------------------------------------------------------------
function DroppableColumn({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const { setNodeRef } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  )
}

// -------------------------------------------------------------
// Main Board Component
// -------------------------------------------------------------
export function KanbanBoard({ initialLeads, sellerFilter }: KanbanBoardProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [contactingLead, setContactingLead] = useState<Lead | null>(null)
  const [discardingLead, setDiscardingLead] = useState<Lead | null>(null)
  const supabase = createClient()

  // Sincroniza estado quando initialLeads mudar (ex: filtros de vendedor)
  useEffect(() => {
    setLeads(initialLeads)
  }, [initialLeads])

  // Realtime Subscription
  useEffect(() => {
    setIsMounted(true)
    const channel = supabase
      .channel('custom-all-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newLead = payload.new as Lead
            if (sellerFilter && newLead.assigned_to !== sellerFilter) return
            setLeads((prev) => [newLead, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            const updatedLead = payload.new as Lead
            if (sellerFilter && updatedLead.assigned_to !== sellerFilter) {
              setLeads((prev) => prev.filter((l) => l.id !== updatedLead.id))
              return
            }
            setLeads((prev) =>
              prev.map((l) => (l.id === updatedLead.id ? { ...l, ...updatedLead } : l))
            )
          } else if (payload.eventType === 'DELETE') {
            setLeads((prev) => prev.filter((l) => l.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, sellerFilter])

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event

    if (!over) return

    const leadId = active.id as string
    
    // Determine the target status based on what was dropped over.
    const isColumn = COLUMNS.some(c => c.key === over.id)
    const targetStatus = isColumn 
      ? (over.id as LeadStatus) 
      : leads.find(l => l.id === over.id)?.status

    const leadToMove = leads.find((l) => l.id === leadId)
    if (!leadToMove || !targetStatus) return

    const isSameColumn = leadToMove.status === targetStatus
    
    if (active.id === over.id) return // Dropped in exactly the same spot

    // Get the sorted leads for the target column
    let targetColumnLeads = leads
      .filter((l) => l.status === targetStatus)
      .sort((a, b) => (a.board_order || 0) - (b.board_order || 0))

    let newOrder = 0

    if (isSameColumn) {
      const activeIndex = targetColumnLeads.findIndex(l => l.id === active.id)
      let overIndex = targetColumnLeads.findIndex(l => l.id === over.id)
      
      if (isColumn) {
        // Dropped on the column area itself. Move to the end.
        overIndex = targetColumnLeads.length - 1
      }
      
      if (activeIndex === overIndex || activeIndex === -1 || overIndex === -1) return
      
      targetColumnLeads = arrayMove(targetColumnLeads, activeIndex, overIndex)
      const newIndex = targetColumnLeads.findIndex(l => l.id === leadId)
      
      if (targetColumnLeads.length === 1) {
        newOrder = 1024
      } else if (newIndex === 0) {
        newOrder = (targetColumnLeads[1].board_order || 0) - 1024
      } else if (newIndex === targetColumnLeads.length - 1) {
        newOrder = (targetColumnLeads[targetColumnLeads.length - 2].board_order || 0) + 1024
      } else {
        const prevOrder = targetColumnLeads[newIndex - 1].board_order || 0
        const nextOrder = targetColumnLeads[newIndex + 1].board_order || 0
        newOrder = (prevOrder + nextOrder) / 2
      }
    } else {
      let overIndex = targetColumnLeads.findIndex(l => l.id === over.id)
      
      if (isColumn || overIndex === -1) {
        // Put at the bottom of the new column
        if (targetColumnLeads.length === 0) {
          newOrder = 1024
        } else {
          newOrder = (targetColumnLeads[targetColumnLeads.length - 1].board_order || 0) + 1024
        }
      } else {
        // Insert at the specific position
        const activeLeadInTarget = { ...leadToMove, status: targetStatus, board_order: 0 }
        targetColumnLeads.splice(overIndex, 0, activeLeadInTarget)
        
        const newIndex = overIndex
        if (targetColumnLeads.length === 1) {
          newOrder = 1024
        } else if (newIndex === 0) {
          newOrder = (targetColumnLeads[1].board_order || 0) - 1024
        } else if (newIndex === targetColumnLeads.length - 1) {
          newOrder = (targetColumnLeads[targetColumnLeads.length - 2].board_order || 0) + 1024
        } else {
          const prevOrder = targetColumnLeads[newIndex - 1].board_order || 0
          const nextOrder = targetColumnLeads[newIndex + 1].board_order || 0
          newOrder = (prevOrder + nextOrder) / 2
        }
      }
    }

    // Apply the order locally
    const nextLeads = leads.map((l) => 
      l.id === leadId 
        ? { 
            ...l, 
            status: targetStatus, 
            board_order: newOrder,
            last_moved_at: !isSameColumn ? new Date().toISOString() : l.last_moved_at 
          } 
        : l
    )

    // Optimistic UI update
    setLeads(nextLeads)

    const updatePayload: any = { board_order: newOrder }
    if (!isSameColumn) {
      updatePayload.status = targetStatus
    }

    const { error } = await (supabase as any)
      .from('leads')
      .update(updatePayload)
      .eq('id', leadId)

    if (error) {
      console.error(
        'Failed to update lead status/order:',
        error.message || 'No message',
        error.code || 'No code',
        error.details || 'No details',
        error
      )
      alert("Erro ao salvar no banco: " + (error.message || "Verifique se a coluna board_order existe no banco."));
      // Revert on error
      setLeads(leads)
    }
  }

  if (!isMounted) {
    return (
      <div className="flex gap-6 overflow-x-auto pb-4 h-[calc(100vh-140px)] items-start">
        {COLUMNS.map((col) => {
          const columnLeads = leads
            .filter((l) => l.status === col.key)
            .sort((a, b) => (a.board_order || 0) - (b.board_order || 0))
          const columnTotal = columnLeads.reduce((sum, l) => sum + (l.value || 0), 0)

          return (
            <div
              key={col.key}
              className="flex-shrink-0 w-80 bg-background rounded-2xl border border-border flex flex-col max-h-full"
            >
              {/* Column Header */}
              <div className="p-4 border-b border-border bg-card rounded-t-2xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                    <h3 className="font-semibold text-sm text-foreground">{col.label}</h3>
                    <span className="bg-secondary text-[#8b8b9e] text-xs px-2 py-0.5 rounded-full">
                      {columnLeads.length}
                    </span>
                  </div>
                </div>
                <div className="text-xs font-medium text-muted-foreground">
                  {formatCurrency(columnTotal)}
                </div>
              </div>

              {/* Column Droppable Area (Empty state for SSR) */}
              <div className="flex-1 p-3 overflow-y-auto min-h-[150px] space-y-3 custom-scrollbar" />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <DndContext
        id="kanban-board-dnd-context"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-4 h-[calc(100vh-140px)] items-start">
          {COLUMNS.map((col) => {
            const columnLeads = leads
              .filter((l) => l.status === col.key)
              .sort((a, b) => (a.board_order || 0) - (b.board_order || 0))
            const columnTotal = columnLeads.reduce((sum, l) => sum + (l.value || 0), 0)

            return (
              <div
                key={col.key}
                className="flex-shrink-0 w-80 bg-background rounded-2xl border border-border flex flex-col max-h-full"
              >
                {/* Column Header */}
                <div className="p-4 border-b border-border bg-card rounded-t-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                      <h3 className="font-semibold text-sm text-foreground">{col.label}</h3>
                      <span className="bg-secondary text-[#8b8b9e] text-xs px-2 py-0.5 rounded-full">
                        {columnLeads.length}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">
                    {formatCurrency(columnTotal)}
                  </div>
                </div>

                {/* Column Droppable Area */}
                <DroppableColumn id={col.key} className="flex-1 p-3 overflow-y-auto min-h-[150px] space-y-3 custom-scrollbar">
                  <SortableContext
                    id={col.key}
                    items={columnLeads.map((l) => l.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {columnLeads.map((lead) => (
                      <SortableLeadCard 
                        key={lead.id} 
                        lead={lead} 
                        onClick={() => setSelectedLead(lead)}
                        onContact={(l) => setContactingLead(l)}
                        onDiscard={(l) => setDiscardingLead(l)}
                      />
                    ))}
                  </SortableContext>
                </DroppableColumn>
              </div>
            )
          })}
        </div>

        {/* Overlay while dragging */}
        <DragOverlay>
          {activeLead ? (
            <div className="opacity-90 transform rotate-2">
              <SortableLeadCard lead={activeLead} onClick={() => {}} onContact={() => {}} onDiscard={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal de Detalhes e Linha do Tempo */}
      {selectedLead && (
        <LeadTimelineModal
          lead={selectedLead}
          isOpen={true}
          onClose={() => setSelectedLead(null)}
          onLeadUpdated={(updated) => {
            if (updated.status === 'perdido') {
              setLeads((prev) => prev.filter((l) => l.id !== updated.id))
              setSelectedLead(null)
            } else {
              setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)))
              setSelectedLead((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev))
            }
          }}
          onLeadDeleted={(leadId) => {
            setLeads((prev) => prev.filter((l) => l.id !== leadId))
            setSelectedLead(null)
          }}
        />
      )}

      {/* Modal de Contato Rápido pelo Kanban */}
      {contactingLead && (
        <ContactLeadModal
          lead={contactingLead}
          isOpen={Boolean(contactingLead)}
          onClose={() => setContactingLead(null)}
          onLeadUpdated={(updated) => {
            setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)))
            if (selectedLead && selectedLead.id === updated.id) {
              setSelectedLead((prev) => (prev ? { ...prev, ...updated } : null))
            }
          }}
        />
      )}

      {/* Modal de Descarte Rápido pelo Kanban */}
      {discardingLead && (
        <DiscardLeadModal
          lead={discardingLead}
          isOpen={Boolean(discardingLead)}
          onClose={() => setDiscardingLead(null)}
          onSuccess={(updatedLead) => {
            setLeads((prev) => prev.filter((l) => l.id !== updatedLead.id))
            if (selectedLead?.id === updatedLead.id) {
              setSelectedLead(null)
            }
            setDiscardingLead(null)
          }}
          onLeadDeleted={(leadId) => {
            setLeads((prev) => prev.filter((l) => l.id !== leadId))
            if (selectedLead?.id === leadId) {
              setSelectedLead(null)
            }
            setDiscardingLead(null)
          }}
        />
      )}
    </>
  )
}
