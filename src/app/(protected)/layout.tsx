import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/ui/Sidebar'
import { getAllowedHrefs } from '@/lib/nav'
import type { User, UserRole } from '@/types/database'

import AppLayout from '@/components/ui/AppLayout'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  const typedProfile = profile as unknown as User

  // Computa os hrefs permitidos no servidor — serializado e passado para o Sidebar
  // Isso garante que server e client usem exatamente a mesma lista → sem hydration mismatch
  const allowedHrefs = getAllowedHrefs(typedProfile.role as UserRole)

  return (
    <AppLayout user={typedProfile} allowedHrefs={allowedHrefs}>
      {children}
    </AppLayout>
  )
}
