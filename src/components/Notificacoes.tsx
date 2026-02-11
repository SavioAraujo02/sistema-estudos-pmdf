'use client'

import { useState, useEffect } from 'react'
import { Bell, X, Check, Trash2, Eye, CheckCheck } from 'lucide-react'
import { getNotificacoes, marcarComoLida, excluirNotificacao, contarNaoLidas, marcarTodasComoLidas } from '@/lib/notificacoes'

interface Notificacao {
  id: string
  tipo: string
  titulo: string
  mensagem: string
  lida: boolean
  data_leitura: string | null
  questao_id: string | null
  comentario_id: string | null
  usuario_origem_id: string | null
  dados_extras: any
  created_at: string
  usuario_origem?: {
    nome: string
    email: string
  }
}

export function Notificacoes() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [mostrarPainel, setMostrarPainel] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [naoLidas, setNaoLidas] = useState(0)

  const carregarNotificacoes = async () => {
    setCarregando(true)
    try {
      const [dados, contador] = await Promise.all([
        getNotificacoes(),
        contarNaoLidas()
      ])
      setNotificacoes(dados)
      setNaoLidas(contador)
    } catch (error) {
      console.error('Erro ao carregar notificações:', error)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarNotificacoes()
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(carregarNotificacoes, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleMarcarComoLida = async (id: string) => {
    const sucesso = await marcarComoLida(id)
    if (sucesso) {
      setNotificacoes(prev => 
        prev.map(n => n.id === id ? { ...n, lida: true, data_leitura: new Date().toISOString() } : n)
      )
      setNaoLidas(prev => Math.max(0, prev - 1))
    }
  }

  const handleMarcarTodasComoLidas = async () => {
    const sucesso = await marcarTodasComoLidas()
    if (sucesso) {
      setNotificacoes(prev => 
        prev.map(n => ({ ...n, lida: true, data_leitura: new Date().toISOString() }))
      )
      setNaoLidas(0)
    }
  }

  const handleExcluir = async (id: string) => {
    const sucesso = await excluirNotificacao(id)
    if (sucesso) {
      setNotificacoes(prev => {
        const notificacao = prev.find(n => n.id === id)
        if (notificacao && !notificacao.lida) {
          setNaoLidas(prev => Math.max(0, prev - 1))
        }
        return prev.filter(n => n.id !== id)
      })
    }
  }

  const formatarData = (data: string) => {
    const agora = new Date()
    const dataNotificacao = new Date(data)
    const diffMs = agora.getTime() - dataNotificacao.getTime()
    const diffMinutos = Math.floor(diffMs / (1000 * 60))
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutos < 1) return 'Agora'
    if (diffMinutos < 60) return `${diffMinutos}m`
    if (diffHoras < 24) return `${diffHoras}h`
    if (diffDias < 7) return `${diffDias}d`
    return dataNotificacao.toLocaleDateString('pt-BR')
  }

  const getIconeNotificacao = (tipo: string) => {
    switch (tipo) {
      case 'nova_questao': return '❓'
      case 'nova_materia': return '📚'
      case 'novo_comentario': return '💬'
      case 'curtida_comentario': return '👍'
      case 'importacao_lote': return '📦'
      case 'sistema': return '🔔'
      default: return '📢'
    }
  }

  const getCorNotificacao = (tipo: string) => {
    switch (tipo) {
      case 'nova_questao': return 'text-blue-600'
      case 'nova_materia': return 'text-green-600'
      case 'novo_comentario': return 'text-purple-600'
      case 'curtida_comentario': return 'text-pink-600'
      case 'importacao_lote': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="relative">
      {/* Botão de notificações */}
      <button
        onClick={() => setMostrarPainel(!mostrarPainel)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <Bell className="h-6 w-6" />
        {naoLidas > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {/* Painel de notificações */}
      {mostrarPainel && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Notificações {naoLidas > 0 && <span className="text-red-500">({naoLidas})</span>}
            </h3>
            <div className="flex items-center gap-2">
              {naoLidas > 0 && (
                <button
                  onClick={handleMarcarTodasComoLidas}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-blue-600 dark:text-blue-400"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setMostrarPainel(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Lista de notificações */}
          <div className="max-h-80 overflow-y-auto">
            {carregando ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                Carregando...
              </div>
            ) : notificacoes.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              notificacoes.map((notificacao) => (
                <div
                  key={notificacao.id}
                  className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    !notificacao.lida ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`text-lg flex-shrink-0 ${getCorNotificacao(notificacao.tipo)}`}>
                      {getIconeNotificacao(notificacao.tipo)}
                    </span>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-medium truncate ${
                        !notificacao.lida ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {notificacao.titulo}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {notificacao.mensagem}
                      </p>
                      
                      {notificacao.usuario_origem && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Por: {notificacao.usuario_origem.nome}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {formatarData(notificacao.created_at)}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          {!notificacao.lida && (
                            <button
                              onClick={() => handleMarcarComoLida(notificacao.id)}
                              className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded"
                              title="Marcar como lida"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleExcluir(notificacao.id)}
                            className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                            title="Excluir"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notificacoes.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <button
                onClick={carregarNotificacoes}
                disabled={carregando}
                className="w-full text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
              >
                {carregando ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}