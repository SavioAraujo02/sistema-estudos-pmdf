'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, Search, ArrowLeft, CheckCircle, XCircle, AlertCircle, Loader2, Upload, Edit, Trash2, Copy, MoreVertical, Filter, BarChart3, Target, BookOpen, TrendingUp, Eye, Play, X, Settings } from 'lucide-react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthProvider'
import { FormularioQuestao } from '@/components/FormularioQuestao'
import { ImportacaoLote } from '@/components/ImportacaoLote'
import { EditarQuestao } from '@/components/EditarQuestao'
import { ConfirmarExclusao } from '@/components/ConfirmarExclusao'
import { getQuestoesByMateria, deleteQuestao, duplicateQuestao } from '@/lib/questoes'
import { getMaterias, getMateriasComEstatisticas } from '@/lib/materias'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { EnunciadoFormatado } from '@/components/EnunciadoFormatado'
import { getAssuntos, createAssunto, getAssuntosPorMateria } from '@/lib/assuntos'

interface QuestaoComDados {
  id: string
  materia_id: string
  enunciado: string
  tipo: 'certo_errado' | 'multipla_escolha'
  explicacao?: string
  created_at: string
  assunto_id?: string
  alternativas?: any[]
  materia?: { nome: string }
  assunto?: { id: string; nome: string; cor: string }
  estatisticas?: {
    total_respostas: number
    acertos: number
    percentual_acertos: number
  }
}

interface EstatisticasGerais {
  totalQuestoes: number
  questoesCertoErrado: number
  questoesMultiplaEscolha: number
  taxaMediaAcertos: number
}

function QuestoesContent() {
  const { isAdmin } = useAuth()
  const searchParams = useSearchParams()
  const materiaId = searchParams.get('materia')
  
  const [questoes, setQuestoes] = useState<QuestaoComDados[]>([])
  const [materias, setMaterias] = useState<any[]>([])
  const [materiaSelecionada, setMateriaSelecionada] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todas' | 'certo_errado' | 'multipla_escolha'>('todas')
  const [showFormulario, setShowFormulario] = useState(false)
  const [showImportacao, setShowImportacao] = useState(false)
  const [showEdicao, setShowEdicao] = useState<string | null>(null)
  const [showExclusao, setShowExclusao] = useState<string | null>(null)
  const [menuAberto, setMenuAberto] = useState<string | null>(null)
  const [estatisticasGerais, setEstatisticasGerais] = useState<EstatisticasGerais | null>(null)
  const [assuntos, setAssuntos] = useState<any[]>([])
  const [filtroAssunto, setFiltroAssunto] = useState<'todos' | 'sem_assunto'>('todos')
  const [questoesSemAssunto, setQuestoesSemAssunto] = useState(0)
  const [showCriarAssunto, setShowCriarAssunto] = useState(false)
  const [novoAssunto, setNovoAssunto] = useState({
    nome: '',
    descricao: '',
    cor: '#3B82F6'
  })
  const [showGerenciarAssuntos, setShowGerenciarAssuntos] = useState(false)
  const [assuntoEditando, setAssuntoEditando] = useState<any>(null)
  const [showEditarAssunto, setShowEditarAssunto] = useState(false)
  const [showExcluirAssunto, setShowExcluirAssunto] = useState(false)
  const [assuntoExcluindo, setAssuntoExcluindo] = useState<any>(null)

  useEffect(() => {
    carregarDados()
  }, [materiaId])

  const carregarDados = async () => {
    setLoading(true)
    
    const [materiasData, assuntosData] = await Promise.all([
      getMateriasComEstatisticas(),
      getAssuntos()
    ])
    
    setAssuntos(assuntosData)
    setMaterias(materiasData)

    if (materiaId) {
      const questoesData = await getQuestoesByMateria(materiaId)
      const questoesComEstatisticas = await carregarEstatisticasQuestoes(questoesData)
      
      setQuestoes(questoesComEstatisticas)
      
      const materia = materiasData.find((m: any) => m.id === materiaId)
      setMateriaSelecionada(materia)
    } else {
      // Carregar todas as questões para dashboard admin
      if (isAdmin) {
        const todasQuestoes = await carregarTodasQuestoes()
        setQuestoes(todasQuestoes)
        await carregarEstatisticasGerais(todasQuestoes)
      }
    }
    
    setLoading(false)
  }

  const editarAssunto = async (assunto: any) => {
    try {
      const { error } = await supabase
        .from('assuntos')
        .update({
          nome: assunto.nome,
          descricao: assunto.descricao,
          cor: assunto.cor
        })
        .eq('id', assunto.id)
  
      if (error) {
        console.error('Erro ao editar assunto:', error)
        alert('Erro ao editar assunto.')
        return false
      }
  
      await carregarDados()
      return true
    } catch (error) {
      console.error('Erro inesperado ao editar assunto:', error)
      alert('Erro inesperado ao editar assunto.')
      return false
    }
  }
  
  const excluirAssunto = async (assuntoId: string) => {
    try {
      // Verificar se há questões vinculadas
      const { data: questoes, error: questoesError } = await supabase
        .from('questoes')
        .select('id')
        .eq('assunto_id', assuntoId)
        .limit(1)
  
      if (questoesError) {
        console.error('Erro ao verificar questões:', questoesError)
        alert('Erro ao verificar questões vinculadas.')
        return false
      }
  
      if (questoes && questoes.length > 0) {
        alert('Não é possível excluir um assunto que possui questões associadas.')
        return false
      }
  
      // Se não há questões, pode excluir
      const { error } = await supabase
        .from('assuntos')
        .delete()
        .eq('id', assuntoId)
  
      if (error) {
        console.error('Erro ao excluir assunto:', error)
        alert('Erro ao excluir assunto.')
        return false
      }
  
      await carregarDados()
      return true
    } catch (error) {
      console.error('Erro inesperado ao excluir assunto:', error)
      alert('Erro inesperado ao excluir assunto.')
      return false
    }
  }

  const carregarTodasQuestoes = async (): Promise<QuestaoComDados[]> => {
    const { data, error } = await supabase
      .from('questoes')
      .select(`
        *,
        materias(nome),
        alternativas(*)
      `)
      .order('created_at', { ascending: false })
  
    if (error) {
      console.error('Erro ao carregar questões:', error)
      return []
    }
  
    return await carregarEstatisticasQuestoes(data || [])
  }

  const carregarEstatisticasQuestoes = async (questoes: QuestaoComDados[]): Promise<QuestaoComDados[]> => {
    const questoesComEstatisticas = await Promise.all(
      questoes.map(async (questao) => {
        const { data: historico } = await supabase
          .from('historico_estudos')
          .select('acertou')
          .eq('questao_id', questao.id)

        const totalRespostas = historico?.length || 0
        const acertos = historico?.filter(h => h.acertou).length || 0
        const percentualAcertos = totalRespostas > 0 ? Math.round((acertos / totalRespostas) * 100) : 0

        return {
          ...questao,
          estatisticas: {
            total_respostas: totalRespostas,
            acertos,
            percentual_acertos: percentualAcertos
          }
        }
      })
    )

    return questoesComEstatisticas
  }

  const carregarEstatisticasGerais = async (questoes: QuestaoComDados[]) => {
    const totalQuestoes = questoes.length
    const questoesCertoErrado = questoes.filter(q => q.tipo === 'certo_errado').length
    const questoesMultiplaEscolha = questoes.filter(q => q.tipo === 'multipla_escolha').length
    
    const somaPercentuais = questoes.reduce((acc, q) => acc + (q.estatisticas?.percentual_acertos || 0), 0)
    const taxaMediaAcertos = totalQuestoes > 0 ? Math.round(somaPercentuais / totalQuestoes) : 0
  
    setEstatisticasGerais({
      totalQuestoes,
      questoesCertoErrado,
      questoesMultiplaEscolha,
      taxaMediaAcertos
    })
  }

  const handleExcluir = async (questaoId: string) => {
    const sucesso = await deleteQuestao(questaoId)
    if (sucesso) {
      setShowExclusao(null)
      carregarDados()
    } else {
      alert('Erro ao excluir questão. Tente novamente.')
    }
  }

  const handleDuplicar = async (questaoId: string) => {
    const novaquestao = await duplicateQuestao(questaoId)
    if (novaquestao) {
      setMenuAberto(null)
      carregarDados()
    } else {
      alert('Erro ao duplicar questão. Tente novamente.')
    }
  }

  const questoesFiltradas = questoes.filter(questao => {
    const matchBusca = questao.enunciado.toLowerCase().includes(busca.toLowerCase()) ||
                      questao.materia?.nome.toLowerCase().includes(busca.toLowerCase())
  
    const matchTipo = filtroTipo === 'todas' || questao.tipo === filtroTipo
  
    const matchAssunto = filtroAssunto === 'todos' || 
                        (filtroAssunto === 'sem_assunto' && !questao.assunto_id)
  
    return matchBusca && matchTipo && matchAssunto
  })

  const getIconeStatus = (questao: QuestaoComDados) => {
    if (questao.tipo === 'certo_errado') {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    } else {
      return <AlertCircle className="h-5 w-5 text-yellow-500" />
    }
  }

  const getCorPerformance = (percentual: number) => {
    if (percentual >= 80) return 'text-green-600'
    if (percentual >= 60) return 'text-yellow-600'
    if (percentual > 0) return 'text-red-600'
    return 'text-gray-500'
  }

  const iniciarEstudoQuestaoEspecifica = async (questaoId: string) => {
    try {
      // Buscar a questão com dados relacionados
      const { data: questaoData, error } = await supabase
        .from('questoes')
        .select(`
          id,
          enunciado,
          tipo,
          explicacao,
          resposta_certo_errado,
          imagem_url,
          imagem_nome,
          materia_id,
          assunto_id,
          materias!materia_id(nome),
          assuntos!assunto_id(id, nome, cor)
        `)
        .eq('id', questaoId)
        .single()
  
      if (error || !questaoData) {
        alert('Erro ao carregar questão.')
        return
      }
  
      // Buscar alternativas separadamente
      const { data: alternativas } = await supabase
        .from('alternativas')
        .select('id, texto, correta')
        .eq('questao_id', questaoId)
        .order('texto')
  
      // Formatar questão com estrutura correta
      const questaoFormatada = {
        id: questaoData.id,
        enunciado: questaoData.enunciado,
        tipo: questaoData.tipo,
        explicacao: questaoData.explicacao,
        resposta_certo_errado: questaoData.resposta_certo_errado,
        imagem_url: questaoData.imagem_url,
        imagem_nome: questaoData.imagem_nome,
        materia: { 
          nome: (questaoData.materias as any)?.nome || 'Sem matéria'
        },
        assunto: questaoData.assuntos ? {
          id: (questaoData.assuntos as any).id,
          nome: (questaoData.assuntos as any).nome,
          cor: (questaoData.assuntos as any).cor
        } : undefined,
        alternativas: alternativas || []
      }
  
      // Salvar no localStorage para o ModoEstudo
      const dadosEstudo = {
        questoes: [questaoFormatada],
        questaoEspecifica: true,
        configuracao: {
          modoEstudo: 'normal',
          salvarHistorico: true,
          materiaId: questaoData.materia_id,
          assuntoIds: questaoData.assunto_id ? [questaoData.assunto_id] : [],
          numeroQuestoes: 1
        }
      }
  
      localStorage.setItem('estudo_questao_especifica', JSON.stringify(dadosEstudo))
      
      // Redirecionar para estudar
      window.location.href = '/estudar?modo=questao-especifica'
      
    } catch (error) {
      console.error('Erro ao iniciar estudo da questão:', error)
      alert('Erro inesperado.')
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout title="Questões">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout title="Questões">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  // Dashboard Admin (sem matéria específica)
  if (!materiaId && isAdmin) {
    return (
      <ProtectedRoute>
        <DashboardLayout title="Painel de Questões">
          <div className="space-y-6">
            {/* Header Admin */}
            <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-6 rounded-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold mb-2">
                    🛠️ Painel de Gestão de Questões
                  </h2>
                  <p className="text-purple-100">
                    Gerencie todo o banco de questões do sistema
                  </p>
                </div>
                <div className="text-right">
                <div className="text-2xl font-bold">
                  {materias.reduce((total, m) => total + (m.questoes_count || 0), 0)}
                </div>
                <div className="text-sm text-purple-200">Questões Cadastradas</div>
              </div>
              </div>
            </div>

            {/* Estatísticas Gerais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">
                      {materias.reduce((total, m) => total + (m.questoes_count || 0), 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Certo/Errado</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">
                    {materias.reduce((total, m) => total + (m.questoes_certo_errado || 0), 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Múltipla Escolha</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {materias.reduce((total, m) => total + (m.questoes_multipla_escolha || 0), 0)}
                </p>
              </div>
            </div>
          </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Taxa Média</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">
                      {(() => {
                        if (questoes.length === 0) return '0'
                        const somaPercentuais = questoes.reduce((acc, q) => acc + (q.estatisticas?.percentual_acertos || 0), 0)
                        return Math.round(somaPercentuais / questoes.length)
                      })()}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                🚀 Ações Rápidas
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={() => setShowFormulario(true)}
                  className="flex flex-col items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <Plus className="h-6 w-6 text-blue-600 mb-2" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                    Nova Questão
                  </span>
                </button>
                
                <button
                  onClick={() => setShowImportacao(true)}
                  className="flex flex-col items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                >
                  <Upload className="h-6 w-6 text-green-600 mb-2" />
                  <span className="text-sm font-medium text-green-900 dark:text-green-300">
                    Importar Lote
                  </span>
                </button>
                
                <Link
                  href="/materias"
                  className="flex flex-col items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                >
                  <BookOpen className="h-6 w-6 text-purple-600 mb-2" />
                  <span className="text-sm font-medium text-purple-900 dark:text-purple-300">
                    Gerenciar Matérias
                  </span>
                </Link>
                
                <Link
                  href="/estudar"
                  className="flex flex-col items-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                >
                  <Play className="h-6 w-6 text-orange-600 mb-2" />
                  <span className="text-sm font-medium text-orange-900 dark:text-orange-300">
                    Testar Sistema
                  </span>
                </Link>
              </div>
            </div>

            {/* Matérias com Questões */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  📚 Questões por Matéria
                </h3>
                <div className="space-y-3">
                {materias.slice(0, 5).map((materia) => {
                  return (
                    <div key={materia.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{materia.nome}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {materia.questoes_count} questões
                        </p>
                      </div>
                        <Link
                          href={`/questoes?materia=${materia.id}`}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          Gerenciar
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  📊 Assuntos por Matéria
                </h3>
                <div className="space-y-3">
                  {materias.slice(0, 5).map((materia) => {
                    const assuntosMateria = assuntos.filter(a => a.materia_id === materia.id).length
                    return (
                      <div key={materia.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-purple-600" />
                          <span className="font-medium text-gray-900 dark:text-white">{materia.nome}</span>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {assuntosMateria} assuntos
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Insights */}
            {estatisticasGerais && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-3">💡 Insights do Sistema:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-400">
                  <div>
                    • Taxa média de {estatisticasGerais.taxaMediaAcertos}% de acertos
                  </div>
                  <div>
                    • {((estatisticasGerais.questoesCertoErrado / estatisticasGerais.totalQuestoes) * 100).toFixed(1)}% são certo/errado
                  </div>
                  <div>
                    • {materias.length} matérias cadastradas
                  </div>
                  <div>
                    • {assuntos.length} assuntos organizados
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modais para dashboard admin */}
          {showFormulario && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md mx-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Selecionar Matéria
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Escolha uma matéria para criar a questão:
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {materias.map(materia => (
                    <button
                      key={materia.id}
                      onClick={() => {
                        setShowFormulario(false)
                        window.location.href = `/questoes?materia=${materia.id}`
                      }}
                      className="w-full p-3 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">{materia.nome}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {materia.questoes_count} questões
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowFormulario(false)}
                  className="mt-4 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {showImportacao && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md mx-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Selecionar Matéria
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Escolha uma matéria para importar as questões:
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {materias.map(materia => (
                    <button
                      key={materia.id}
                      onClick={() => {
                        setShowImportacao(false)
                        window.location.href = `/questoes?materia=${materia.id}`
                      }}
                      className="w-full p-3 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">{materia.nome}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {materia.questoes_count} questões
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowImportacao(false)}
                  className="mt-4 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  // Seleção de matéria (quando não há matéria específica)
  if (!materiaId) {
    return (
      <ProtectedRoute>
        <DashboardLayout title="Questões">
          <div className="space-y-6">
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {isAdmin ? 'Selecione uma matéria para gerenciar' : 'Selecione uma matéria para explorar'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {materias.map((materia) => {
              return (
                <Link
                  key={materia.id}
                  href={`/questoes?materia=${materia.id}`}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {materia.nome}
                    </h3>
                  </div>
                  {materia.descricao && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {materia.descricao}
                    </p>
                  )}
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                  {materia.questoes_count} questões disponíveis
                  </p>
                </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  // Visualização específica da matéria
  return (
    <ProtectedRoute>
      <DashboardLayout title={`${isAdmin ? 'Gerenciar' : 'Explorar'} - ${materiaSelecionada?.nome || 'Carregando...'}`}>
        <div className="space-y-6">
          {/* Header com navegação */}
          <div className="flex items-center gap-4">
            <Link
              href="/questoes"
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {materiaSelecionada?.nome}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {questoesFiltradas.length} de {questoes.length} questões
              </p>
            </div>
          </div>

          {/* Controles e filtros */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Busca */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Buscar questões ou conteúdo..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filtro por tipo */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFiltroTipo('todas')}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    filtroTipo === 'todas'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFiltroTipo('certo_errado')}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    filtroTipo === 'certo_errado'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Certo/Errado
                </button>
                <button
                  onClick={() => setFiltroTipo('multipla_escolha')}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    filtroTipo === 'multipla_escolha'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Múltipla Escolha
                </button>
                <button
                  onClick={() => setFiltroAssunto(filtroAssunto === 'sem_assunto' ? 'todos' : 'sem_assunto')}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    filtroAssunto === 'sem_assunto'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Sem Assunto
                </button>
              </div>

              {/* Ações admin */}
              {isAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowFormulario(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Nova
                  </button>
                  <button
                    onClick={() => setShowImportacao(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    Importar
                  </button>
                  <button
                    onClick={() => setShowCriarAssunto(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <BookOpen className="h-4 w-4" />
                    Assunto
                  </button>
                  <button
                    onClick={() => setShowGerenciarAssuntos(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Gerenciar
                  </button>
                </div>
              )}

              {/* Ações usuário */}
              {!isAdmin && (
                <Link
                  href={`/estudar?materia=${materiaId}`}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Play className="h-4 w-4" />
                  Estudar Matéria
                </Link>
              )}
            </div>
          </div>

          {/* Lista de questões */}
          <div className="space-y-4">
            {questoesFiltradas.map((questao, index) => (
              <div
                key={questao.id}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getIconeStatus(questao)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="mb-2">
                          <span className="font-medium text-gray-900 dark:text-white">Q{index + 1}: </span>
                          <EnunciadoFormatado 
                            texto={questao.enunciado}
                            preview={true}
                            maxLength={200}
                            className="inline"
                          />
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            questao.tipo === 'certo_errado' 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                          }`}>
                            {questao.tipo === 'certo_errado' ? 'Certo/Errado' : 'Múltipla Escolha'}
                          </span>

                          {/* Assunto da questão */}
                          {isAdmin && (
                            <div className="flex items-center gap-2">
                              <select
                                value={questao.assunto_id || ''}
                                onChange={async (e) => {
                                  const assuntoId = e.target.value || null
                                  const { error } = await supabase
                                    .from('questoes')
                                    .update({ assunto_id: assuntoId })
                                    .eq('id', questao.id)
                                  
                                  if (!error) {
                                    await carregarDados()
                                  }
                                }}
                                className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              >
                                <option value="">Sem assunto</option>
                                {assuntos
                                  .filter(a => a.materia_id === questao.materia_id || a.materia_id === materiaSelecionada?.id)
                                  .map(assunto => (
                                    <option key={assunto.id} value={assunto.id}>
                                      {assunto.nome}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          )}

                          {/* Mostrar assunto atual se definido */}
                          {questao.assunto && (
                            <span
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: questao.assunto.cor }}
                            >
                              {questao.assunto.nome}
                            </span>
                          )}

                          {/* Estatísticas de performance */}
                          {questao.estatisticas && questao.estatisticas.total_respostas > 0 && (
                            <span className={`px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 ${getCorPerformance(questao.estatisticas.percentual_acertos)}`}>
                              {questao.estatisticas.percentual_acertos}% acertos ({questao.estatisticas.total_respostas} respostas)
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Menu de ações */}
                      {isAdmin && (
                        <div className="relative">
                          <button
                            onClick={() => setMenuAberto(menuAberto === questao.id ? null : questao.id)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          >
                            <MoreVertical className="h-4 w-4 text-gray-500" />
                          </button>
                          
                          {menuAberto === questao.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    setShowEdicao(questao.id)
                                    setMenuAberto(null)
                                  }}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                  <Edit className="h-4 w-4" />
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDuplicar(questao.id)}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                  <Copy className="h-4 w-4" />
                                  Duplicar
                                </button>
                                <button
                                  onClick={() => {
                                    setShowExclusao(questao.id)
                                    setMenuAberto(null)
                                  }}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Excluir
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Detalhes da questão */}
                    {questao.tipo === 'multipla_escolha' && questao.alternativas && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        📝 {questao.alternativas.length} alternativas
                      </div>
                    )}
                    
                    {questao.explicacao && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 text-justify">
                        💡 {questao.explicacao.substring(0, 200)}
                        {questao.explicacao.length > 200 && '...'}
                      </p>
                    )}
                    
                    {/* Footer com ações */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Criada em {new Date(questao.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      
                      <div className="flex gap-2">
                        {isAdmin ? (
                          <>
                            <button
                              onClick={() => setShowEdicao(questao.id)}
                              className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => setShowExclusao(questao.id)}
                              className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            >
                              Excluir
                            </button>
                          </>
                        ) : (
                          <button
                          onClick={() => iniciarEstudoQuestaoEspecifica(questao.id)}
                          className="px-3 py-1 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                        >
                          Estudar Esta
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Estado vazio */}
        {questoesFiltradas.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {questoes.length === 0 
                ? 'Nenhuma questão cadastrada' 
                : 'Nenhuma questão encontrada'
              }
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {questoes.length === 0 
                ? isAdmin 
                  ? 'Comece criando a primeira questão desta matéria.' 
                  : 'Aguarde o administrador cadastrar questões.'
                : 'Tente ajustar os filtros de busca.'
              }
            </p>
            
            {questoes.length === 0 && isAdmin && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setShowFormulario(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Criar Primeira Questão
                </button>
                <button
                  onClick={() => setShowImportacao(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Importar Questões
                </button>
              </div>
            )}
          </div>
        )}

        {/* Dicas contextuais */}
        {questoes.length > 0 && (
          <div className={`p-6 rounded-lg ${
            isAdmin 
              ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800'
              : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
          }`}>
            <h4 className={`font-medium mb-2 ${
              isAdmin ? 'text-purple-900 dark:text-purple-300' : 'text-blue-900 dark:text-blue-300'
            }`}>
              💡 {isAdmin ? 'Dicas de Gestão' : 'Dicas de Estudo'}
            </h4>
            <ul className={`text-sm space-y-1 ${
              isAdmin ? 'text-purple-800 dark:text-purple-400' : 'text-blue-800 dark:text-blue-400'
            }`}>
              {isAdmin ? (
                <>
                  <li>• Use assuntos para organizar questões por tópicos específicos</li>
                  <li>• Acompanhe a taxa de acertos para identificar questões problemáticas</li>
                  <li>• Questões sem assunto podem ser organizadas melhor</li>
                  <li>• Use a importação em lote para adicionar várias questões rapidamente</li>
                </>
              ) : (
                <>
                  <li>• Use os filtros por assunto para focar em tópicos específicos</li>
                  <li>• Questões com baixa taxa de acertos são mais desafiadoras</li>
                  <li>• Combine diferentes tipos de questão para variar o estudo</li>
                  <li>• Clique em "Estudar Esta" para praticar questões específicas</li>
                </>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Modais */}
      {showFormulario && materiaSelecionada && (
        <FormularioQuestao
          materiaId={materiaSelecionada.id}
          materiaNome={materiaSelecionada.nome}
          onClose={() => setShowFormulario(false)}
          onSuccess={carregarDados}
        />
      )}

      {showImportacao && materiaSelecionada && (
        <ImportacaoLote
          materiaId={materiaSelecionada.id}
          materiaNome={materiaSelecionada.nome}
          onClose={() => setShowImportacao(false)}
          onSuccess={carregarDados}
        />
      )}

      {showEdicao && (
        <EditarQuestao
          questaoId={showEdicao}
          onClose={() => setShowEdicao(null)}
          onSuccess={carregarDados}
        />
      )}

      {showExclusao && (
        <ConfirmarExclusao
          titulo="Excluir Questão"
          mensagem="Tem certeza que deseja excluir esta questão? Esta ação não pode ser desfeita e também removerá todo o histórico de respostas relacionado."
          onConfirmar={() => handleExcluir(showExclusao)}
          onCancelar={() => setShowExclusao(null)}
        />
      )}

      {/* Modal para criar assunto */}
      {showCriarAssunto && materiaSelecionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Criar Novo Assunto
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Matéria
                </label>
                <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
                  {materiaSelecionada.nome}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome do Assunto *
                </label>
                <input
                  type="text"
                  value={novoAssunto.nome}
                  onChange={(e) => setNovoAssunto({...novoAssunto, nome: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Direitos Fundamentais"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  value={novoAssunto.descricao}
                  onChange={(e) => setNovoAssunto({...novoAssunto, descricao: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Descrição do assunto..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cor
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={novoAssunto.cor}
                    onChange={(e) => setNovoAssunto({...novoAssunto, cor: e.target.value})}
                    className="w-12 h-8 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={novoAssunto.cor}
                    onChange={(e) => setNovoAssunto({...novoAssunto, cor: e.target.value})}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCriarAssunto(false)
                  setNovoAssunto({ nome: '', descricao: '', cor: '#3B82F6' })
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!novoAssunto.nome.trim()) return
                  const assunto = await createAssunto({
                    materia_id: materiaSelecionada.id,
                    nome: novoAssunto.nome,
                    descricao: novoAssunto.descricao,
                    cor: novoAssunto.cor
                  })
                  if (assunto) {
                    await carregarDados()
                    setShowCriarAssunto(false)
                    setNovoAssunto({ nome: '', descricao: '', cor: '#3B82F6' })
                  }
                }}
                disabled={!novoAssunto.nome.trim()}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Criar Assunto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para gerenciar assuntos */}
      {showGerenciarAssuntos && materiaSelecionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Gerenciar Assuntos - {materiaSelecionada.nome}
              </h2>
              <button
                onClick={() => setShowGerenciarAssuntos(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[60vh]">
              {assuntos.filter(a => a.materia_id === materiaSelecionada.id).length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Nenhum assunto cadastrado
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Crie o primeiro assunto para esta matéria.
                  </p>
                  <button
                    onClick={() => {
                      setShowGerenciarAssuntos(false)
                      setShowCriarAssunto(true)
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Criar Primeiro Assunto
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assuntos
                    .filter(a => a.materia_id === materiaSelecionada.id)
                    .map((assunto) => {
                      const questoesDoAssunto = questoes.filter(q => q.assunto_id === assunto.id).length
                      
                      return (
                        <div key={assunto.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3 flex-1">
                              <div 
                                className="w-4 h-4 rounded-full flex-shrink-0"
                                style={{ backgroundColor: assunto.cor }}
                              />
                              <div className="min-w-0 flex-1">
                                <h3 className="font-medium text-gray-900 dark:text-white truncate">
                                  {assunto.nome}
                                </h3>
                                {assunto.descricao && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                    {assunto.descricao}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full flex-shrink-0">
                              {questoesDoAssunto} questões
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setAssuntoEditando({...assunto})
                                setShowEditarAssunto(true)
                              }}
                              className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors flex items-center justify-center gap-1"
                            >
                              <Edit className="h-3 w-3" />
                              Editar
                            </button>
                            <button
                              onClick={() => {
                                setAssuntoExcluindo(assunto)
                                setShowExcluirAssunto(true)
                              }}
                              disabled={questoesDoAssunto > 0}
                              className="px-3 py-2 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={questoesDoAssunto > 0 ? 'Não é possível excluir assunto com questões' : 'Excluir assunto'}
                            >
                              <Trash2 className="h-3 w-3" />
                              Excluir
                            </button>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowGerenciarAssuntos(false)
                  setShowCriarAssunto(true)
                }}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Criar Novo Assunto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar assunto */}
      {showEditarAssunto && assuntoEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Editar Assunto
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome do Assunto *
                </label>
                <input
                  type="text"
                  value={assuntoEditando.nome}
                  onChange={(e) => setAssuntoEditando({...assuntoEditando, nome: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Direitos Fundamentais"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  value={assuntoEditando.descricao || ''}
                  onChange={(e) => setAssuntoEditando({...assuntoEditando, descricao: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Descrição do assunto..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cor
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={assuntoEditando.cor}
                    onChange={(e) => setAssuntoEditando({...assuntoEditando, cor: e.target.value})}
                    className="w-12 h-8 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={assuntoEditando.cor}
                    onChange={(e) => setAssuntoEditando({...assuntoEditando, cor: e.target.value})}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditarAssunto(false)
                  setAssuntoEditando(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!assuntoEditando.nome.trim()) return
                  const sucesso = await editarAssunto(assuntoEditando)
                  if (sucesso) {
                    setShowEditarAssunto(false)
                    setAssuntoEditando(null)
                  }
                }}
                disabled={!assuntoEditando.nome.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para excluir assunto */}
      {showExcluirAssunto && assuntoExcluindo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Excluir Assunto
              </h2>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Tem certeza que deseja excluir o assunto:
            </p>
            <p className="font-semibold text-gray-900 dark:text-white mb-4">
              "{assuntoExcluindo.nome}"
            </p>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg mb-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                ⚠️ Esta ação não pode ser desfeita.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowExcluirAssunto(false)
                  setAssuntoExcluindo(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const sucesso = await excluirAssunto(assuntoExcluindo.id)
                  if (sucesso) {
                    setShowExcluirAssunto(false)
                    setAssuntoExcluindo(null)
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay para fechar menu */}
      {menuAberto && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setMenuAberto(null)}
        />
      )}
    </DashboardLayout>
  </ProtectedRoute>
)
}

export default function QuestoesPage() {
return (
  <Suspense fallback={
    <ProtectedRoute>
      <DashboardLayout title="Questões">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  }>
    <QuestoesContent />
  </Suspense>
)
}