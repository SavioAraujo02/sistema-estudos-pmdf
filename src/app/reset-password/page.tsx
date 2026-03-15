'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Shield, Loader2, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { Toast } from '@/components/Toast'

export default function ResetPasswordPage() {
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [senhaForte, setSenhaForte] = useState({
    tamanho: false,
    maiuscula: false,
    minuscula: false,
    numero: false,
    especial: false
  })

  const { toast, showError, showSuccess, hideToast } = useToast()

  // Verificar força da senha
  useEffect(() => {
    setSenhaForte({
      tamanho: novaSenha.length >= 8,
      maiuscula: /[A-Z]/.test(novaSenha),
      minuscula: /[a-z]/.test(novaSenha),
      numero: /\d/.test(novaSenha),
      especial: /[!@#$%^&*(),.?":{}|<>]/.test(novaSenha)
    })
  }, [novaSenha])

  const validarSenhaForte = () => {
    return Object.values(senhaForte).every(Boolean)
  }

  const handleTrocarSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validarSenhaForte()) {
      showError('A nova senha não atende aos critérios de segurança.')
      return
    }

    if (novaSenha !== confirmarSenha) {
      showError('As senhas não coincidem.')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: novaSenha
      })

      if (error) {
        showError('Erro ao alterar senha: ' + error.message)
      } else {
        showSuccess('Senha alterada com sucesso! Redirecionando...')
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
      }
    } catch (error) {
      showError('Erro inesperado ao alterar senha')
    } finally {
      setLoading(false)
    }
  }

  // Componente de força da senha
  const IndicadorForcaSenha = () => (
    <div className="mt-2 space-y-1">
      <div className="text-xs text-gray-600 dark:text-gray-400">Critérios da senha:</div>
      <div className="grid grid-cols-2 gap-1 text-xs">
        <div className={`flex items-center gap-1 ${senhaForte.tamanho ? 'text-green-600' : 'text-gray-400'}`}>
          {senhaForte.tamanho ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          8+ caracteres
        </div>
        <div className={`flex items-center gap-1 ${senhaForte.maiuscula ? 'text-green-600' : 'text-gray-400'}`}>
          {senhaForte.maiuscula ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          Maiúscula
        </div>
        <div className={`flex items-center gap-1 ${senhaForte.minuscula ? 'text-green-600' : 'text-gray-400'}`}>
          {senhaForte.minuscula ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          Minúscula
        </div>
        <div className={`flex items-center gap-1 ${senhaForte.numero ? 'text-green-600' : 'text-gray-400'}`}>
          {senhaForte.numero ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          Número
        </div>
        <div className={`flex items-center gap-1 ${senhaForte.especial ? 'text-green-600' : 'text-gray-400'}`}>
          {senhaForte.especial ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          Especial (!@#$)
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Redefinir Senha
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Digite sua nova senha
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleTrocarSenha} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nova Senha
              </label>
              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {novaSenha && <IndicadorForcaSenha />}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
              {confirmarSenha && (
                <div className="mt-1 flex items-center gap-1 text-xs">
                  {novaSenha === confirmarSenha ? (
                    <>
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">Senhas coincidem</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3 text-red-600" />
                      <span className="text-red-600">Senhas não coincidem</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => window.location.href = '/login'}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 inline mr-1" /> Voltar
              </button>
              <button
                type="submit"
                disabled={loading || !validarSenhaForte() || novaSenha !== confirmarSenha}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                {loading ? 'Alterando...' : 'Alterar Senha'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={hideToast} />
    </div>
  )
}