'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { ConstellationCanvas } from '@/components/constellation-canvas'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(`Erro Supabase: ${error.message} (status: ${error.status})`)
      setLoading(false)
      return
    }

    // O middleware redirecionará para o painel correto baseado no role
    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        // Fallback to /vendas if profile fails, let middleware handle actual permissions
      }

      const routes: Record<string, string> = {
        vendas: '/vendas',
        trafego: '/trafego',
        dev: '/dev',
        owner: '/executivo',
      }
      const typedProfile = profile as { role: string } | null
      const targetRoute = routes[typedProfile?.role ?? 'vendas'] ?? '/vendas'
      
      // Use window.location.href for a hard navigation to clear the react state and ensure the new layout mounts fully without client router hanging
      window.location.href = targetRoute
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <ConstellationCanvas className="absolute inset-0 h-full w-full" logoPosition="hidden" showTesseract={false} />
      </div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Image
              src="/images/akaia-logo.png"
              alt="AKAAI Logo"
              width={64}
              height={64}
              className="rounded-2xl"
            />
          </div>
          <h1 className="text-2xl font-bold text-gradient">AKAAI CRM</h1>
          <p className="text-sm text-muted-foreground mt-1">Agência de Marketing — Painel Central</p>
        </div>

        {/* Card de login */}
        <div className="glass-card p-8">
          <h2 className="text-lg font-semibold text-foreground mb-6">Entrar na plataforma</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-muted-foreground mb-1.5">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-dark"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-muted-foreground mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-dark pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Autenticando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        {/* Rodapé */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Acesso restrito · AKAAI CRM v1.0
        </p>
      </div>
    </main>
  )
}
