"use client";

import React, { useState } from "react";
import { Shield, Plus, Copy, Check } from "lucide-react";
import { ExecutivoTabs } from "@/components/executivo/ExecutivoTabs";

type Role = "vendas" | "trafego" | "dev" | "owner";

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
};

export function UserManagementClient({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers || []);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("vendas");
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ email: string, password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);

    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao criar usuário.");
      }

      setResult({
        email: data.user.email,
        password: data.generatedPassword,
      });

      setUsers(prev => [{
        id: data.user.id,
        name: data.user.name || name,
        email: data.user.email,
        role: data.user.role || role,
        created_at: new Date().toISOString()
      }, ...prev]);
      
      setName("");
      setEmail("");
      setRole("vendas");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    const text = `Acesso ao CRM Akaai Core:\nLogin: ${result.email}\nSenha: ${result.password}\n\nRecomendamos alterar a senha no primeiro acesso.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 min-h-screen max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Shield className="text-emerald-500" />
          Gestão de Acessos
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Crie credenciais para sua equipe (Vendas, Tráfego, Devs). A senha será gerada automaticamente.
        </p>
      </div>

      {/* Navegação Executiva */}
      <ExecutivoTabs activeTab="usuarios" />

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-400">Nome Completo</label>
              <input 
                type="text" 
                required
                className="w-full bg-black border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                placeholder="Ex: João Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-400">E-mail Corporativo</label>
              <input 
                type="email" 
                required
                className="w-full bg-black border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                placeholder="joao@akaaicore.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-zinc-400">Cargo / Permissão (Role)</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(['vendas', 'trafego', 'dev', 'owner'] as Role[]).map((r) => (
                  <label 
                    key={r}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      role === r 
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' 
                        : 'border-zinc-800 bg-black text-zinc-500 hover:border-zinc-700'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="role" 
                      value={r} 
                      checked={role === r}
                      onChange={() => setRole(r)}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium uppercase tracking-wider">{r}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="pt-4 flex justify-end border-t border-zinc-800">
            <button 
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
            >
              {loading ? (
                "Gerando Acesso..."
              ) : (
                <>
                  <Plus size={18} />
                  Criar Usuário
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {result && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-emerald-400 font-bold text-lg">Usuário criado com sucesso!</h3>
              <p className="text-sm text-emerald-500/70">Copie as credenciais abaixo e envie para o colaborador.</p>
            </div>
            <button 
              onClick={copyToClipboard}
              className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copiado!" : "Copiar Acesso"}
            </button>
          </div>

          <div className="bg-black/50 border border-emerald-900/30 rounded-lg p-4 font-mono text-sm text-zinc-300">
            <div className="mb-2"><span className="text-zinc-500">Login:</span> {result.email}</div>
            <div><span className="text-zinc-500">Senha:</span> <span className="text-white">{result.password}</span></div>
          </div>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 overflow-hidden">
        <h2 className="text-lg font-bold text-white mb-4">Usuários Cadastrados</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-800/50 text-zinc-300">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Cargo</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-zinc-800/50">
                  <td className="px-4 py-3 font-medium text-zinc-200">{u.name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      u.role === 'owner' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                      u.role === 'dev' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      u.role === 'vendas' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      u.role === 'trafego' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                      'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
