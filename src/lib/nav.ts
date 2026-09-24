import type { UserRole } from '@/types/database'

export type NavCategory = 'comercial' | 'operacao' | 'diretoria'

export interface NavItemConfig {
  href: string
  label: string
  description: string
  iconName: string
  roles: UserRole[]
  category: NavCategory
}

export const CATEGORY_METADATA: Record<NavCategory, { label: string; badge?: string }> = {
  comercial: { label: 'Comercial & Vendas' },
  operacao: { label: 'Operação & Entregas' },
  diretoria: { label: 'Diretoria & Admin' },
}

// Fonte única de verdade para o nav — estruturado nos 3 Pilares do Negócio
export const NAV_ITEMS: NavItemConfig[] = [
  // --- PILAR 1: COMERCIAL & VENDAS (Aquisição) ---
  {
    href: '/vendas/lotes',
    label: 'Gestor de Lotes',
    description: 'Distribuição de Leads',
    iconName: 'Layers',
    roles: ['vendas', 'owner'],
    category: 'comercial',
  },
  {
    href: '/vendas/campanhas',
    label: 'Máquina de Vendas',
    description: 'Campanhas por Nicho',
    iconName: 'Send',
    roles: ['vendas', 'owner'],
    category: 'comercial',
  },
  {
    href: '/vendas',
    label: 'Funil Comercial',
    description: 'Kanban & Pipeline',
    iconName: 'Kanban',
    roles: ['vendas', 'owner'],
    category: 'comercial',
  },
  {
    href: '/manual',
    label: 'Playbook de Vendas',
    description: 'Scripts & Objeções',
    iconName: 'BookOpen',
    roles: ['vendas', 'owner'],
    category: 'comercial',
  },
  {
    href: '/vendas/gamificacao',
    label: 'Minhas Metas & XP',
    description: 'Missões & Conquistas',
    iconName: 'Trophy',
    roles: ['vendas'],
    category: 'comercial',
  },

  // --- PILAR 2: OPERAÇÃO & ENTREGAS (Pós-Venda) ---
  {
    href: '/dev',
    label: 'Sites & Landing Pages',
    description: 'Fila de Desenvolvimento',
    iconName: 'Code2',
    roles: ['dev', 'owner'],
    category: 'operacao',
  },
  {
    href: '/trafego',
    label: 'Gestão de Tráfego',
    description: 'Campanhas & Anúncios',
    iconName: 'BarChart3',
    roles: ['trafego', 'owner'],
    category: 'operacao',
  },
  {
    href: '/executivo/carteira',
    label: 'Carteira de Clientes',
    description: 'MRR, LTV & Pós-Venda',
    iconName: 'Wallet',
    roles: ['owner', 'vendas'],
    category: 'operacao',
  },
  {
    href: '/executivo/projetos',
    label: 'Auditoria de Projetos',
    description: 'Encerrar & Auditar',
    iconName: 'Briefcase',
    roles: ['owner'],
    category: 'operacao',
  },

  // --- PILAR 3: DIRETORIA & ADMIN (Gestão Estratégica) ---
  {
    href: '/executivo',
    label: 'Painel Executivo',
    description: 'Métricas & Resultados',
    iconName: 'Crown',
    roles: ['owner'],
    category: 'diretoria',
  },
  {
    href: '/executivo/configuracoes',
    label: 'Automação & Bot',
    description: 'Motor do Bot & Delay',
    iconName: 'Bot',
    roles: ['owner'],
    category: 'diretoria',
  },
  {
    href: '/executivo/pricing',
    label: 'Catálogo & Preços',
    description: 'Planos & Serviços',
    iconName: 'Package',
    roles: ['owner'],
    category: 'diretoria',
  },
  {
    href: '/executivo/usuarios',
    label: 'Equipe & Acessos',
    description: 'Usuários & Permissões',
    iconName: 'Users',
    roles: ['owner'],
    category: 'diretoria',
  },
  {
    href: '/executivo/gamificacao',
    label: 'Metas da Equipe',
    description: 'Regras & Recompensas',
    iconName: 'Target',
    roles: ['owner'],
    category: 'diretoria',
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
