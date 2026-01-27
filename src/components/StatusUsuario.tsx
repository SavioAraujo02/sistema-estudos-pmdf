'use client'

import { User } from '@supabase/supabase-js'
import { Clock, UserCheck, UserX, AlertCircle, RefreshCw } from 'lucide-react'

interface StatusUsuarioProps {
  user: User
  status: 'pendente' | 'ativo' | 'expirado' | 'bloqueado'
  dataExpiracao?: string
  onVerificarStatus?: () => void
}

export function StatusUsuario({ user, status, dataExpiracao, onVerificarStatus }: StatusUsuarioProps) {
  const getStatusInfo = () => {
    switch (status) {
      case 'pendente':
        return {
          icon: <Clock className="h-16 w-16 text-yellow-500 mx-auto" />,
          titulo: 'Aguardando Aprovação',
          mensagem: 'Sua conta foi criada com sucesso! Aguarde a aprovação do administrador para acessar o sistema de estudos da PMDF.',
          cor: 'yellow',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800'
        }
      case 'expirado':
        return {
          icon: <AlertCircle className="h-16 w-16 text-orange-500 mx-auto" />,
          titulo: 'Acesso Expirado',
          mensagem: 'Seu tempo de acesso ao sistema expirou. Entre em contato com o administrador para renovar seu acesso.',
          cor: 'orange',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          borderColor: 'border-orange-200 dark:border-orange-800'
        }
      case 'bloqueado':
        return {
          icon: <UserX className="h-16 w-16 text-red-500 mx-auto" />,
          titulo: 'Conta Bloqueada',
          mensagem: 'Sua conta foi bloqueada pelo administrador. Entre em contato para mais informações.',
          cor: 'red',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800'
        }
      default:
        return {
          icon: <UserCheck className="h-16 w-16 text-green-500 mx-auto" />,
          titulo: 'Conta Ativa',
          mensagem: 'Sua conta está ativa e funcionando normalmente.',
          cor: 'green',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800'
        }
    }
  }

  const info = getStatusInfo()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎖️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Sistema de Estudos PMDF
          </h1>
        </div>

        <div className={`p-8 rounded-lg shadow-lg border-2 ${info.bgColor} ${info.borderColor}`}>
          <div className="text-center">
            <div className="mb-6">
              {info.icon}
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {info.titulo}
            </h2>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              {info.mensagem}
            </p>
            
            <div className="space-y-4">
              <div className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 p-3 rounded-lg">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Status:</strong> {status.charAt(0).toUpperCase() + status.slice(1)}</p>
                {dataExpiracao && status === 'ativo' && (
                  <p><strong>Válido até:</strong> {new Date(dataExpiracao).toLocaleDateString('pt-BR')}</p>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => window.location.href = '/login'}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Voltar ao Login
                </button>
                
                {status === 'pendente' && onVerificarStatus && (
                  <button
                    onClick={onVerificarStatus}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Verificar Status
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}