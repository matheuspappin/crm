'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Filter, Users } from 'lucide-react'

interface Seller {
  id: string
  name: string
}

interface SellerFilterSelectProps {
  sellers: Seller[]
  currentSeller: string
  activeTab?: string
}

export function SellerFilterSelect({
  sellers,
  currentSeller,
  activeTab = 'kanban',
}: SellerFilterSelectProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    if (val && val !== 'todos') {
      params.set('vendedor', val)
    } else {
      params.delete('vendedor')
    }
    if (activeTab && activeTab !== 'kanban') {
      params.set('tab', activeTab)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5 shadow-sm text-xs">
      <Users className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-muted-foreground hidden sm:inline font-medium">Filtrar Pipeline:</span>
      <select
        value={currentSeller}
        onChange={handleChange}
        className="bg-transparent font-medium text-foreground focus:outline-none cursor-pointer pr-1"
      >
        <option value="todos" className="bg-card text-foreground">
          👥 Todos os Vendedores (Geral)
        </option>
        {sellers.map((s) => (
          <option key={s.id} value={s.id} className="bg-card text-foreground">
            👤 {s.name}
          </option>
        ))}
      </select>
    </div>
  )
}
