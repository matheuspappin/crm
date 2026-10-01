export type UserRole = 'vendas' | 'trafego' | 'dev' | 'owner'
export type LeadStatus = 'novo' | 'reuniao' | 'proposta' | 'negociacao' | 'fechado' | 'perdido'
export type InteractionType = 'whatsapp' | 'call' | 'email' | 'note' | 'meeting'
export type PixelStatus = 'ok' | 'warning' | 'error' | 'unknown'
export type ServiceType = 'dev' | 'trafego' | 'ambos'
export type DeleteReason = 'cliente_cancelou' | 'projeto_parado' | 'inadimplencia' | 'escopo_nao_aprovado' | 'outro'
export type ProjectType = 'dev' | 'trafego'
export type DeleteType = 'soft' | 'hard'
export type ProjectStatus = 'em_desenvolvimento' | 'aguardando_aprovacao' | 'revisao_solicitada' | 'entregue'
export type ProductCategory = 'tripwire' | 'saas' | 'service' | 'hardware'
export type SubscriptionStatus = 'active' | 'canceled' | 'trial' | 'paused'
export type GoalPeriod = 'daily' | 'weekly' | 'monthly'
export type GoalMetric = 'calls_made' | 'meetings_booked' | 'deals_closed' | 'revenue_generated' | 'leads_contacted'
export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export type LogEvent =
  | 'webhook_received'
  | 'webhook_error'
  | 'lead_created'
  | 'lead_updated'
  | 'project_created'
  | 'pixel_check'
  | 'cron_sla_check'
  | 'cron_mv_refresh'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  name: string
  contact: string | null
  company_name: string | null
  project_description: string | null
  service_type: ServiceType
  status: LeadStatus
  value: number
  niche: string
  scraped_lead_id?: string | null
  campaign_id?: string | null
  loss_reason?: string | null
  dispatched_at?: string | null
  replied_at?: string | null
  reply_sentiment?: 'positive' | 'neutral' | 'objection' | 'opt_out' | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  assigned_to: string | null
  sla_alerted: boolean
  last_moved_at: string
  board_order: number
  notes: string | null
  generation_created_at?: string | null
  created_at: string
  updated_at: string
  // Joins opcionais
  assigned_user?: User
}

export interface Interaction {
  id: string
  lead_id: string
  type: InteractionType
  notes: string | null
  next_action_date: string | null
  created_by: string | null
  created_at: string
  created_by_user?: User
}

export interface Project {
  id: string
  lead_id: string
  figma_url: string | null
  prod_url: string | null
  pixel_status: PixelStatus
  pixel_last_check: string | null
  status: ProjectStatus
  revision_notes: string | null
  assigned_dev: string | null
  notes: string | null
  // Soft-delete
  deleted_at: string | null
  deleted_reason: DeleteReason | null
  deleted_notes: string | null
  deleted_by: string | null
  created_at: string
  updated_at: string
  lead?: Lead
  assigned_dev_user?: User
  deleted_by_user?: User
}

export interface TrafficOnboarding {
  id: string
  lead_id: string
  meta_ads_url: string | null
  google_ads_url: string | null
  daily_budget: number | null
  is_active: boolean
  assigned_traffic_manager: string | null
  notes: string | null
  // Soft-delete
  deleted_at: string | null
  deleted_reason: DeleteReason | null
  deleted_notes: string | null
  deleted_by: string | null
  created_at: string
  updated_at: string
  lead?: Lead
  assigned_traffic_user?: User
  deleted_by_user?: User
}

export interface ProjectDeletion {
  id: string
  project_id: string | null           // NULL se hard-delete
  project_type: ProjectType
  lead_id: string | null
  lead_name: string
  lead_value: number | null
  delete_type: DeleteType
  reason: DeleteReason
  notes: string
  deleted_by: string
  deleted_at: string
  // Joins opcionais
  deleted_by_user?: User
}

export interface SystemLog {
  id: string
  event: LogEvent
  payload: Record<string, unknown> | null
  status_code: number | null
  error_msg: string | null
  source: string | null
  created_at: string
}

export interface AdSpend {
  id: string
  campaign: string
  utm_source: string
  spend_date: string
  spend_usd: number
  spend_brl: number
  created_at: string
}

// Materialized views
export interface MvMrr {
  month: string
  total_deals: number
  total_revenue: number
  avg_deal_value: number
}

export interface MvCac {
  campaign: string
  source: string
  total_leads: number
  closed_leads: number
  total_revenue: number
  total_spend: number
  cpl: number
  cac: number
  roi_percent: number
}

export interface MvPipelineVelocity {
  month: string
  avg_days_to_close: number
  median_days_to_close: number
  min_days: number
  max_days: number
  deals_closed: number
}

export interface MvWinRate {
  month: string
  total_leads: number
  total_won: number
  total_lost: number
  in_novo: number
  in_reuniao: number
  in_proposta: number
  in_negociacao: number
  win_rate_percent: number
  revenue_won: number
  revenue_lost: number
}

export interface ExecutiveDashboard {
  current_mrr: number | null
  active_leads: number
  current_win_rate: number | null
  current_avg_days: number | null
  avg_cac: number | null
  projects_in_progress: number
  pixel_issues: number
  dashboard_at: string
}

export interface Product {
  id: string
  name: string
  description: string
  category: ProductCategory
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PricingPlan {
  id: string
  product_id: string
  name: string
  setup_fee: number
  monthly_fee: number
  internal_cost: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LeadSubscription {
  id: string
  lead_id: string
  pricing_plan_id: string
  status: SubscriptionStatus
  custom_setup_fee: number | null
  custom_monthly: number | null
  start_date: string
  end_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface GamificationProfile {
  user_id: string
  xp: number
  level: number
  coins: number
  created_at: string
  updated_at: string
}

export interface GamificationGoal {
  id: string
  title: string
  description: string | null
  period: GoalPeriod
  metric: GoalMetric
  target_value: number
  xp_reward: number
  is_active: boolean
  created_at: string
}

export interface UserGoalProgress {
  id: string
  user_id: string
  goal_id: string
  current_value: number
  is_completed: boolean
  period_start: string
  period_end: string
  completed_at: string | null
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  is_read: boolean
  link: string | null
  related_entity_type: string | null
  related_entity_id: string | null
  created_at: string
}

export interface OutboundCampaign {
  id: string
  name: string
  niche: string
  city: string | null
  channel: string
  target_script: string | null
  followup_script?: string | null
  timeout_hours?: number
  status: 'draft' | 'active' | 'paused' | 'completed'
  total_dispatches: number
  total_replies: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface OutboundDispatch {
  id: string
  campaign_id: string
  scraped_lead_id: string | null
  lead_id: string | null
  company_name: string | null
  phone: string
  status: 'queued' | 'sent' | 'delivered' | 'failed'
  sent_at: string
  replied: boolean
  replied_at: string | null
  reply_sentiment: 'positive' | 'neutral' | 'objection' | 'opt_out' | null
  followup_sent?: boolean
  followup_sent_at?: string | null
  is_expired?: boolean
  expired_at?: string | null
  notes: string | null
  created_at: string
}

export interface NicheFunnelAnalytics {
  niche: string
  total_dispatched: number
  total_replied: number
  reply_rate_pct: number
  total_leads_entered: number
  total_meetings: number
  total_won: number
  total_lost: number
  close_rate_pct: number
  total_won_revenue: number
  avg_ticket_won: number
}

export interface ScrapedSearch {
  id: string
  user_id: string
  query: string
  city: string
  source: string | null
  total_leads: number
  created_at: string
}

export interface ScrapedLead {
  id: string
  search_id: string | null
  user_id: string
  place_id: string | null
  name: string
  address: string | null
  phone: string | null
  website: string | null
  rating: number | null
  user_ratings: number | null
  maps_url: string | null
  has_website: boolean | null
  has_phone: boolean | null
  score: number | null
  score_reasons: any | null
  assigned_to?: string | null
  distributed_at?: string | null
  distribution_status?: 'disponivel' | 'distribuido' | 'em_campanha' | 'descartado' | 'respondeu_maquina'
  created_at: string
  assigned_user?: User
}

export type Database = {
  public: {
    Tables: {
      users: { Row: User; Insert: Omit<User, 'created_at' | 'updated_at'>; Update: Partial<User>; Relationships: any[] }
      leads: { Row: Lead; Insert: Partial<Lead> & { name: string }; Update: Partial<Lead>; Relationships: any[] }
      interactions: { Row: Interaction; Insert: Partial<Interaction> & { lead_id: string }; Update: Partial<Interaction>; Relationships: any[] }
      projects: { Row: Project; Insert: Partial<Project> & { lead_id: string }; Update: Partial<Project>; Relationships: any[] }
      traffic_onboarding: { Row: TrafficOnboarding; Insert: Omit<TrafficOnboarding, 'id' | 'created_at' | 'updated_at' | 'is_active' | 'deleted_at' | 'deleted_reason' | 'deleted_notes' | 'deleted_by'>; Update: Partial<TrafficOnboarding>; Relationships: any[] }
      system_logs: { Row: SystemLog; Insert: Omit<SystemLog, 'id' | 'created_at'>; Update: never; Relationships: any[] }
      ad_spend: { Row: AdSpend; Insert: Omit<AdSpend, 'id' | 'created_at'>; Update: Partial<AdSpend>; Relationships: any[] }
      project_deletions: { Row: ProjectDeletion; Insert: Omit<ProjectDeletion, 'id' | 'deleted_at'>; Update: never; Relationships: any[] }
      products: { Row: Product; Insert: Partial<Product> & { name: string }; Update: Partial<Product>; Relationships: any[] }
      pricing_plans: { Row: PricingPlan; Insert: Partial<PricingPlan> & { product_id: string; name: string }; Update: Partial<PricingPlan>; Relationships: any[] }
      lead_subscriptions: { Row: LeadSubscription; Insert: Partial<LeadSubscription> & { lead_id: string; pricing_plan_id: string }; Update: Partial<LeadSubscription>; Relationships: any[] }
      gamification_profiles: { Row: GamificationProfile; Insert: Omit<GamificationProfile, 'created_at' | 'updated_at'>; Update: Partial<GamificationProfile>; Relationships: any[] }
      gamification_goals: { Row: GamificationGoal; Insert: Omit<GamificationGoal, 'id' | 'created_at'>; Update: Partial<GamificationGoal>; Relationships: any[] }
      user_goal_progress: { Row: UserGoalProgress; Insert: Omit<UserGoalProgress, 'id' | 'completed_at'>; Update: Partial<UserGoalProgress>; Relationships: any[] }
      notifications: { Row: Notification; Insert: Partial<Notification> & { user_id: string; title: string; message: string }; Update: Partial<Notification>; Relationships: any[] }
      outbound_campaigns: { Row: OutboundCampaign; Insert: Partial<OutboundCampaign> & { name: string; niche: string }; Update: Partial<OutboundCampaign>; Relationships: any[] }
      outbound_dispatches: { Row: OutboundDispatch; Insert: Partial<OutboundDispatch> & { campaign_id: string; phone: string }; Update: Partial<OutboundDispatch>; Relationships: any[] }
      scraped_searches: { Row: ScrapedSearch; Insert: Partial<ScrapedSearch> & { query: string; city: string }; Update: Partial<ScrapedSearch>; Relationships: any[] }
      scraped_leads: { Row: ScrapedLead; Insert: Partial<ScrapedLead> & { name: string }; Update: Partial<ScrapedLead>; Relationships: any[] }
    }
    Views: {
      vw_executive_dashboard: { Row: ExecutiveDashboard }
      vw_niche_funnel_analytics: { Row: NicheFunnelAnalytics }
    }
  }
}

