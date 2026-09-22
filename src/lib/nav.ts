import type { UserRole } from '@/types/database'

export interface NavItemConfig {
  href: string
  label: string
  description: string
  iconName: string
  roles: UserRole[]
}

// Fonte única de verdade para o nav — usada pelo server e pelo client
export const NAV_ITEMS: NavItemConfig[] = [
  {
    href: '/vendas',
    label: 'Comercial',
    description: 'Funil Kanban',
    iconName: 'Kanban',
    roles: ['vendas', 'owner'],
  },
  {
    href: '/vendas/gamificacao',
    label: 'Gamificação',
    description: 'Missões e Nível',
    iconName: 'Trophy',
    roles: ['vendas', 'owner'],
  },
  {
    href: '/trafego',
    label: 'Tráfego',
    description: 'CPL & ROI',
    iconName: 'BarChart3',
    roles: ['trafego', 'owner'],
  },
  {
    href: '/dev',
    label: 'Engenharia',
    description: 'Entregas & Pixels',
    iconName: 'Code2',
    roles: ['dev', 'owner'],
  },
  {
    href: '/executivo',
    label: 'Super Admin',
    description: 'Visão Executiva',
    iconName: 'Crown',
    roles: ['owner'],
  },
  {
    href: '/manual',
    label: 'Manual Comercial',
    description: 'Playbook de Vendas',
    iconName: 'BookOpen',
    roles: ['vendas', 'owner'],
  },
  {
    href: '/executivo/projetos',
    label: 'Gestão de Projetos',
    description: 'Encerrar & Auditar',
    iconName: 'Briefcase',
    roles: ['owner'],
  },
  {
    href: '/executivo/pricing',
    label: 'Catálogo e Preços',
    description: 'Gestão de Produtos',
    iconName: 'Package',
    roles: ['owner'],
  },
  {
    href: '/executivo/gamificacao',
    label: 'Gestão Gamificação',
    description: 'Metas e Equipe',
    iconName: 'Target',
    roles: ['owner'],
  },
  {
    href: '/executivo/usuarios',
    label: 'Acessos e Equipe',
    description: 'Criar novos logins',
    iconName: 'Users',
    roles: ['owner'],
  },
]

/**
 * Computa os hrefs permitidos para um role.
 * Chamada no Server Component → resultado serializado como prop → sem hydration mismatch.
 */
export function getAllowedHrefs(role: UserRole): string[] {
  return NAV_ITEMS
    .filter((item) => item.roles.includes(role))
    .map((item) => item.href)
}
