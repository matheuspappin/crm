import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { UserRole } from '@/types/database'

// Mapa: role → rota padrão após login
const ROLE_DEFAULT_ROUTES: Record<UserRole, string> = {
  vendas: '/vendas',
  trafego: '/trafego',
  dev: '/dev',
  owner: '/executivo',
}

// Rotas acessíveis por role
const ROLE_ALLOWED_ROUTES: Record<UserRole, string[]> = {
  vendas: ['/vendas', '/manual'],
  trafego: ['/trafego'],
  dev: ['/dev'],
  owner: ['/vendas', '/trafego', '/dev', '/executivo', '/manual'],
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Rotas públicas — não proteger
  const publicRoutes = ['/login', '/auth/callback', '/api']
  const isPublic = publicRoutes.some((r) => pathname.startsWith(r))

  // Sem sessão → redireciona para /login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Com sessão → ler role do JWT metadata (sem query extra ao DB)
  if (user && !isPublic) {
    // Primeiro tenta pegar do JWT app_metadata para economizar uma query
    const role = (user.app_metadata?.role || user.user_metadata?.role) as UserRole | undefined

    if (role) {
      // Com sessão em /login → redireciona para o painel correto
      if (pathname === '/login') {
        const url = request.nextUrl.clone()
        url.pathname = ROLE_DEFAULT_ROUTES[role] ?? '/vendas'
        return NextResponse.redirect(url)
      }

      // RBAC: verifica se o role tem acesso à rota solicitada
      const allowed = ROLE_ALLOWED_ROUTES[role] ?? []
      const hasAccess = allowed.some((r) => pathname.startsWith(r))

      if (!hasAccess) {
        const url = request.nextUrl.clone()
        url.pathname = ROLE_DEFAULT_ROUTES[role]
        return NextResponse.redirect(url)
      }
    } else {
      // Fallback: consulta o DB apenas se o role não estiver no JWT
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      const dbRole = profile?.role as UserRole | undefined

      if (pathname === '/login') {
        const url = request.nextUrl.clone()
        url.pathname = dbRole ? ROLE_DEFAULT_ROUTES[dbRole] : '/vendas'
        return NextResponse.redirect(url)
      }

      if (dbRole) {
        const allowed = ROLE_ALLOWED_ROUTES[dbRole] ?? []
        const hasAccess = allowed.some((r) => pathname.startsWith(r))
        if (!hasAccess) {
          const url = request.nextUrl.clone()
          url.pathname = ROLE_DEFAULT_ROUTES[dbRole]
          return NextResponse.redirect(url)
        }
      }
    }
  }

  return supabaseResponse
}
