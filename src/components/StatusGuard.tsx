'use client'

import { useAuth } from './AuthProvider'
import { StatusUsuario } from './StatusUsuario'

interface StatusGuardProps {
  children: React.ReactNode
}

export function StatusGuard({ children }: StatusGuardProps) {
  const { user, userStatus, loading, verificarStatus } = useAuth()

  // Ainda carregando
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  // Não logado - deixa passar (vai para login)
  if (!user) {
    return <>{children}</>
  }

  // Usuário logado mas sem status ainda
  if (!userStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verificando status da conta...</p>
        </div>
      </div>
    )
  }

  // Verificar status do usuário
  switch (userStatus.status) {
    case 'ativo':
      // Usuário ativo - deixa passar
      return <>{children}</>
      
    case 'pendente':
      // Usuário pendente - mostra tela de aguardo
      return (
        <StatusUsuario 
          user={user} 
          status="pendente" 
          onVerificarStatus={() => verificarStatus()}
        />
      )
      
    case 'expirado':
      // Usuário expirado - mostra tela de expiração
      return (
        <StatusUsuario 
          user={user} 
          status="expirado" 
          dataExpiracao={userStatus.data_expiracao}
        />
      )
      
    case 'bloqueado':
      // Usuário bloqueado - mostra tela de bloqueio
      return (
        <StatusUsuario 
          user={user} 
          status="bloqueado" 
        />
      )
      
    default:
      // Status desconhecido - deixa passar
      return <>{children}</>
  }
}