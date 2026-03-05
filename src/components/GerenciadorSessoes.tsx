'use client'

import { useState, useEffect } from 'react'
import { Play, Pause, Settings, Trash2, Copy, Clock, Target, BookOpen, Plus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface SessaoAtiva {
  id: string
  nome_sessao: string
  cor_sessao: string
  configuracao: any
  questoes_ids: string[]
  questao_atual: number
  total_questoes: number
  total_acertos: number
  tempo_inicio: string
  ultima_atividade: string
  pausada: boolean
  materias_ids: string[]
}

interface GerenciadorSessoesProps {
  isOpen: boolean
  onClose: () => void
  onContinuarSessao: (sessao: SessaoAtiva) => void
  onNovaSessao: () => void
}

export function GerenciadorSessoes({ isOpen, onClose, onContinuarSessao, onNovaSessao }: GerenciadorSessoesProps) {
  const [sessoes, setSessoes] = useState<SessaoAtiva[]>([])
  const [loading, setLoading] = useState(false)
  const [materias, setMaterias] = useState<any[]>([])

  useEffect(() => {
    if (isOpen) {
      carregarSessoes()
      carregarMaterias()
    }
  }, [isOpen])

  const carregarSessoes = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('progresso_sessao')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('finalizada', false)
        .order('ultima_atividade', { ascending: false })

      if (error) {
        console.error('Erro ao carregar sessões:', error)
        return
      }

      setSessoes(data || [])
    } catch (error) {
      console.error('Erro inesperado:', error)
    } finally {
      setLoading(false)
    }
  }

  const carregarMaterias = async () => {
    try {
      const { data, error } = await supabase
        .from('materias')
        .select('id, nome')
        .order('nome')

      if (!error && data) {
        setMaterias(data)
      }
    } catch (error) {
      console.error('Erro ao carregar matérias:', error)
    }
  }

  const excluirSessao = async (sessaoId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta sessão? O progresso será perdido.')) return

    try {
      const { error } = await supabase
        .from('progresso_sessao')
        .delete()
        .eq('id', sessaoId)

      if (error) {
        console.error('Erro ao excluir sessão:', error)
        return
      }

      await carregarSessoes()
    } catch (error) {
      console.error('Erro inesperado:', error)
    }
  }

  const duplicarSessao = async (sessao: SessaoAtiva) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const novaSessao = {
        usuario_id: user.id,
        configuracao: sessao.configuracao,
        questoes_ids: sessao.questoes_ids,
        questao_atual: 0,
        respostas: [],
        nome_sessao: `${sessao.nome_sessao || 'Sessão'} (Cópia)`,
        materias_ids: sessao.materias_ids || [],
        cor_sessao: sessao.cor_sessao || '#3B82F6',
        total_questoes: sessao.questoes_ids?.length || 0,
        finalizada: false,
        pausada: false
      }

      console.log('🔍 Dados para inserir:', novaSessao)

      const { data, error } = await supabase
        .from('progresso_sessao')
        .insert(novaSessao)
        .select()

      if (error) {
        console.error('Erro detalhado ao duplicar sessão:', error)
        alert(`Erro ao duplicar sessão: ${error.message}`)
        return
      }

      console.log('✅ Sessão duplicada com sucesso:', data)
      await carregarSessoes()
    } catch (error) {
      console.error('Erro inesperado:', error)
      alert('Erro inesperado.')
    }
  }

  const formatarTempo = (inicio: string) => {
    const agora = new Date()
    const inicioDate = new Date(inicio)
    const diffMs = agora.getTime() - inicioDate.getTime()
    
    const horas = Math.floor(diffMs / (1000 * 60 * 60))
    const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (horas > 0) return `${horas}h ${minutos}min`
    return `${minutos}min`
  }

  const getMateriasNomes = (materiasIds: string[]) => {
    if (!materiasIds || materiasIds.length === 0) return 'Todas as matérias'
    
    const nomes = materiasIds.map(id => {
      const materia = materias.find(m => m.id === id)
      return materia?.nome || 'Matéria'
    })
    
    if (nomes.length > 2) {
      return `${nomes.slice(0, 2).join(', ')} +${nomes.length - 2}`
    }
    
    return nomes.join(', ')
  }

  const getProgressoPercentual = (sessao: SessaoAtiva) => {
    if (sessao.total_questoes === 0) return 0
    return Math.round((sessao.questao_atual / sessao.total_questoes) * 100)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">🎯 Gerenciador de Sessões</h2>
              <p className="text-blue-100">Gerencie suas sessões de estudo ativas</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Carregando sessões...</span>
            </div>
          ) : sessoes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Nenhuma sessão ativa
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Crie sua primeira sessão de estudo para começar!
              </p>
              <button
                onClick={() => {
                  onClose()
                  onNovaSessao()
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
              >
                <Plus className="h-5 w-5" />
                Nova Sessão
              </button>
            </div>
          ) : (
            <>
              {/* Botão Nova Sessão */}
              <div className="mb-6">
                <button
                  onClick={() => {
                    onClose()
                    onNovaSessao()
                  }}
                  className="w-full p-4 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400"
                >
                  <Plus className="h-5 w-5" />
                  <span className="font-medium">Criar Nova Sessão</span>
                </button>
              </div>

              {/* Grid de Sessões */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sessoes.map((sessao) => (
                  <div
                    key={sessao.id}
                    className="bg-white dark:bg-gray-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-600"
                  >
                    {/* Header do Card */}
                    <div 
                      className="p-4 text-white"
                      style={{ backgroundColor: sessao.cor_sessao || '#3B82F6' }}
                    >
                      <h3 className="font-semibold text-lg truncate">
                        {sessao.nome_sessao || 'Sessão de Estudo'}
                      </h3>
                      <p className="text-sm opacity-90 truncate">
                        {getMateriasNomes(sessao.materias_ids)}
                      </p>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">Progresso</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {getProgressoPercentual(sessao)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${getProgressoPercentual(sessao)}%`,
                            backgroundColor: sessao.cor_sessao || '#3B82F6'
                          }}
                        />
                      </div>
                    </div>

                    {/* Estatísticas */}
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-blue-600" />
                          <span className="text-gray-600 dark:text-gray-400">
                            {sessao.questao_atual}/{sessao.total_questoes}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-green-600" />
                          <span className="text-gray-600 dark:text-gray-400">
                            {formatarTempo(sessao.tempo_inicio)}
                          </span>
                        </div>
                      </div>

                      {sessao.total_acertos > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-gray-600 dark:text-gray-400">
                            {Math.round((sessao.total_acertos / Math.max(sessao.questao_atual, 1)) * 100)}% acertos
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="p-4 pt-0 flex gap-2">
                      <button
                        onClick={() => {
                          onClose()
                          onContinuarSessao(sessao)
                        }}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        <Play className="h-4 w-4" />
                        Continuar
                      </button>
                      
                      <button
                        onClick={() => duplicarSessao(sessao)}
                        className="px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                        title="Duplicar sessão"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => excluirSessao(sessao.id)}
                        className="px-3 py-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                        title="Excluir sessão"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}