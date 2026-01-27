'use client'

import { useAuth } from './AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { StatusGuard } from './StatusGuard'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [timeoutReached, setTimeoutReached] = useState(false)

  // Timeout de segurança
  useEffect(() => {
    const timeout = setTimeout(() => {
      setTimeoutReached(true)
      console.warn('⚠️ Timeout na autenticação')
    }, 10000)

    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      console.log('🔄 Redirecionando para login...')
      router.push('/login')
    }
  }, [user, loading, router])

  // Se demorou muito
  if (timeoutReached && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Problema de Conexão
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            A autenticação está demorando muito.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Recarregar Página
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔐</div>
          <p className="text-gray-600 dark:text-gray-400">Redirecionando para login...</p>
        </div>
      </div>
    )
  }

  // Usuário logado - verificar status
  return (
    <StatusGuard>
      {children}
    </StatusGuard>
  )
}