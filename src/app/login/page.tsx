'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [modo, setModo] = useState<'login' | 'cadastro'>('login')

  // REMOVIDO O useEffect QUE CAUSAVA LOOP

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      })

      if (error) {
        alert('Erro ao fazer login: ' + error.message)
      } else if (data.user) {
        // REDIRECIONAMENTO SIMPLES
        window.location.href = '/dashboard'
      }
    } catch (error) {
      alert('Erro inesperado: ' + error)
    } finally {
      setLoading(false)
    }
  }

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
      })

      if (error) {
        alert('Erro ao criar conta: ' + error.message)
      } else {
        alert('Conta criada! Verifique seu email para confirmar.')
        setModo('login')
      }
    } catch (error) {
      alert('Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🎖️</div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Sistema de Estudos
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            CFP - Polícia Militar do DF
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex mb-6">
            <button
              onClick={() => setModo('login')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-l-lg transition-colors ${
                modo === 'login'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setModo('cadastro')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-r-lg transition-colors ${
                modo === 'cadastro'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Criar Conta
            </button>
          </div>

          <form onSubmit={modo === 'login' ? handleLogin : handleCadastro} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="seu.email@exemplo.com"
                required
              />
            </div>

            <div>
              <label htmlFor="senha" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Senha
              </label>
              <input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {modo === 'login' ? 'Entrar' : 'Criar Conta'}
            </button>
          </form>
        </div>

        {/* BOTÃO PARA TESTAR REDIRECIONAMENTO */}
        <div className="text-center space-y-2">
          <button
            onClick={() => window.location.href = '/teste'}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            🧪 TESTAR REDIRECIONAMENTO
          </button>
          
          <button
            onClick={() => {
              console.log('Tentando ir para dashboard...')
              window.location.href = '/dashboard'
            }}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            🚀 FORÇAR DASHBOARD
          </button>
        </div>
      </div>
    </div>
  )
}