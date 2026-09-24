import { redirect } from 'next/navigation'

export default function CampanhasPage() {
  // Campanhas manuais descontinuadas: a esteira é 100% automatizada pelo Lead Hunter e Bot de Vendas
  redirect('/vendas/lotes')
}
