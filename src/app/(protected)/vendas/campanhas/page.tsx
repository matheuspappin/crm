import { redirect } from 'next/navigation'

export default function CampanhasPage() {
  // O CRM gerencia lotes e funil de vendas. Os bots rodam de forma autônoma.
  redirect('/vendas/lotes')
}
