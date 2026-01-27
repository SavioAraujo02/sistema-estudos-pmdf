'use client'

import { User } from '@supabase/supabase-js'
import { Clock, UserCheck, UserX, AlertCircle } from 'lucide-react'

interface StatusUsuarioProps {
  user: User
  status: 'pendente' | 'ativo' | 'expirado' | 'bloqueado'
  dataExpiracao?: string
}

export function StatusUsuario({ user, status, dataExpiracao }: StatusUsuarioProps) {
  const getStatusInfo = () => {
    switch (status) {
      case 'pendente':
        return {
          icon: <Clock className="h-16 w-16 text-yellow-500" />,
          titulo: 'Aguardando Aprovação',
          mensagem: 'Sua conta foi criada com sucesso! Aguarde a aprovação do administrador para acessar o sistema.',
          cor: 'yellow'
        }
      case 'expirado':
        return {
          icon: <AlertCircle className="h-16 w-16 text-orange-500" />,
          titulo: 'Acesso Expirado',
          mensagem: 'Seu tempo de acesso ao sistema expirou. Entre em contato com o administrador para renovar.',
          cor: 'orange'
        }
      case 'bloqueado':
        return {
          icon: <UserX className="h-16 w-16 text-red-500" />,
          titulo: 'Conta Bloqueada',
          mensagem: 'Sua conta foi bloqueada. Entre em contato com o administrador.',
          cor: 'red'
        }
      default:
        return {
          icon: <UserCheck className="h-16 w-16 text-green-500" />,
          titulo: 'Conta Ativa',
          mensagem: 'Sua conta está ativa e funcionando normalmente.',
          cor: 'green'
        }
    }
  }

  const info = getStatusInfo()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="mb-6">
            {info.icon}
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {info.titulo}
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {info.mensagem}
          </p>
          
          <div className="space-y-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p><strong>Email:</strong> {user.email}</p>
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
              
              {status === 'pendente' && (
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Verificar Status
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}