import { redirect } from 'next/navigation'

export default function SettingsRedirectPage() {
  // O controle da Máquina de Vendas e Bot fica centralizado em Comercial > Máquina de Vendas
  redirect('/vendas/campanhas')
}
