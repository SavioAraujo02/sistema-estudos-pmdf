'use client'

import { useState, useEffect } from 'react'
import { Play, Settings, Trophy, Clock, Target, BarChart3, Infinity, Filter, Tag as TagIcon, Users, Zap, RefreshCw, BookOpen } from 'lucide-react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthProvider'
import { ModoEstudo } from '@/components/ModoEstudo'
import { SeletorAssuntos } from '@/components/SeletorAssuntos'
import { getQuestoesParaEstudo, getEstatisticasEstudo, QuestaoEstudo } from '@/lib/estudo'
import { getMaterias, getMateriasComEstatisticas } from '@/lib/materias'
import { getTags, getQuestoesPorTags } from '@/lib/tags'
import { supabase } from '@/lib/supabase'
import { 
  salvarProgressoSessao, 
  buscarProgressoSessao, 
  atualizarQuestaoAtual, 
  finalizarSessao as finalizarProgressoSessao, 
  abandonarSessao, 
  temSessaoEmAndamento, 
  getResumoSessao 
} from '@/lib/progresso'
import { FiltrosInteligentes } from '@/components/FiltrosInteligentes'
import { getEstatisticasFiltros } from '@/lib/estudo'

interface ResultadoSessao {
  totalQuestoes: number
  acertos: number
  erros: number
  percentual: number
  tempo: number
  respostas: any[]
}

interface ConfiguracaoSessao {
  materiaId?: string
  tagIds: string[]
  assuntoIds: string[]
  numeroQuestoes: number | 'todas'
  modoEstudo: 'normal' | 'revisao' | 'rapido' | 'aleatorio'
  salvarHistorico: boolean
  dificuldade?: 'facil' | 'medio' | 'dificil'
  anoProva?: number
  banca?: string
  // NOVOS FILTROS INTELIGENTES
  apenasNaoRespondidas?: boolean
  apenasErradas?: boolean
  revisaoQuestoesDificeis?: boolean
}


export default function EstudarPage() {
  const { isAdmin } = useAuth()
  const [modo, setModo] = useState<'configuracao' | 'estudando' | 'resultado'>('configuracao')
  const [materias, setMaterias] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [questoes, setQuestoes] = useState<QuestaoEstudo[]>([])
  const [resultado, setResultado] = useState<ResultadoSessao | null>(null)
  const [estatisticas, setEstatisticas] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [configuracao, setConfiguracao] = useState<ConfiguracaoSessao>({
    tagIds: [],
    assuntoIds: [], // NOVO
    numeroQuestoes: 10,
    modoEstudo: 'normal',
    salvarHistorico: true
  })
  const [temProgressoSalvo, setTemProgressoSalvo] = useState(false)
  const [resumoProgresso, setResumoProgresso] = useState<any>(null)
  const [carregandoProgresso, setCarregandoProgresso] = useState(false)
  const [carregandoDados, setCarregandoDados] = useState(true)
  // NOVOS ESTADOS PARA FILTROS INTELIGENTES
  const [estatisticasFiltros, setEstatisticasFiltros] = useState({
    totalQuestoes: 0,
    naoRespondidas: 0,
    comErros: 0,
    dificeis: 0
  })
  
  // Atualizar salvarHistorico quando modo mudar
  useEffect(() => {
    setConfiguracao(prev => ({
      ...prev,
      salvarHistorico: prev.modoEstudo !== 'rapido'
    }))
  }, [configuracao.modoEstudo])

  useEffect(() => {
    const inicializar = async () => {
      await carregarDados()
      await verificarProgressoSalvo()
    }
    inicializar()
  }, [])

  // NOVO: Atualizar estatísticas dos filtros quando matéria mudar
  useEffect(() => {
    const atualizarEstatisticasFiltros = async () => {
      if (configuracao.materiaId) {
        const stats = await getEstatisticasFiltros(configuracao.materiaId)
        setEstatisticasFiltros(stats)
      } else {
        const stats = await getEstatisticasFiltros()
        setEstatisticasFiltros(stats)
      }
    }
    
    atualizarEstatisticasFiltros()
  }, [configuracao.materiaId])

  const filtrarQuestoesRevisao = async (questoes: QuestaoEstudo[]): Promise<QuestaoEstudo[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('Usuário não logado, usando questões normais')
        return questoes
      }
  
      // Buscar questões que o usuário errou
      const { data: historico, error } = await supabase
        .from('historico_estudos')
        .select('questao_id, acertou')
        .eq('usuario_id', user.id)
        .eq('acertou', false)
  
      if (error) {
        console.error('Erro ao buscar histórico:', error)
        return questoes
      }
  
      if (!historico || historico.length === 0) {
        console.log('Nenhuma questão errada encontrada. Mostrando questões aleatórias.')
        // Embaralhar questões se não tem erros
        for (let i = questoes.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [questoes[i], questoes[j]] = [questoes[j], questoes[i]]
        }
        return questoes
      }
  
      // Pegar IDs únicos das questões erradas
      const questoesErradasIds = [...new Set(historico.map(h => h.questao_id))]
      
      // Filtrar questões que o usuário errou
      const questoesFiltradas = questoes.filter(q => questoesErradasIds.includes(q.id))
  
      if (questoesFiltradas.length === 0) {
        console.log('Questões de revisão não disponíveis no conjunto atual. Usando questões normais.')
        return questoes
      }
  
      console.log(`Modo revisão: ${questoesFiltradas.length} questões para revisar de ${questoesErradasIds.length} erros totais`)
      return questoesFiltradas
      
    } catch (error) {
      console.error('Erro no modo revisão:', error)
      return questoes
    }
  }

  const verificarProgressoSalvo = async () => {
    try {
      const temProgresso = await temSessaoEmAndamento()
      setTemProgressoSalvo(temProgresso)
      
      if (temProgresso) {
        const resumo = await getResumoSessao()
        setResumoProgresso(resumo)
        console.log('📖 Sessão em andamento encontrada:', resumo)
      }
    } catch (error) {
      console.error('Erro ao verificar progresso:', error)
    }
  }
  
  const continuarSessaoSalva = async () => {
    setCarregandoProgresso(true)
    try {
      const progresso = await buscarProgressoSessao()
      if (!progresso) {
        alert('Erro: Sessão não encontrada.')
        setCarregandoProgresso(false)
        return
      }
  
      console.log('📖 Restaurando sessão:', progresso)
  
      // Restaurar configuração
      setConfiguracao(progresso.configuracao)
      
      // Buscar questões baseado nos IDs salvos
      const { data: questoesData, error } = await supabase
        .from('questoes')
        .select(`
          id,
          enunciado,
          tipo,
          explicacao,
          materias!inner(nome),
          alternativas(id, texto, correta)
        `)
        .in('id', progresso.questoes_ids)
  
      if (error || !questoesData) {
        console.error('Erro ao buscar questões salvas:', error)
        alert('Erro ao carregar questões salvas.')
        setCarregandoProgresso(false)
        return
      }
  
      // Reordenar questões na ordem original
      const questoesOrdenadas = progresso.questoes_ids.map(id => 
        questoesData.find(q => q.id === id)
      ).filter(Boolean)
  
      const questoesFormatadas = questoesOrdenadas.map((item: any) => ({
        id: item.id,
        enunciado: item.enunciado,
        tipo: item.tipo,
        explicacao: item.explicacao,
        materia: { nome: item.materias?.nome || 'Sem matéria' },
        alternativas: item.alternativas || []
      }))
  
      // Preparar dados para o ModoEstudo
      const dadosRestauracao = {
        questoes: questoesFormatadas,
        questaoAtual: progresso.questao_atual,
        respostasAnteriores: Array.isArray(progresso.respostas) ? progresso.respostas : [],
        tempoInicio: new Date(progresso.tempo_inicio).getTime()
      }
  
      console.log('🔄 Dados para restauração:', dadosRestauracao)
  
      setQuestoes(questoesFormatadas)
      
      // Salvar dados de restauração no localStorage temporariamente
      localStorage.setItem('sessao_restauracao', JSON.stringify(dadosRestauracao))
      
      setModo('estudando')
      
      console.log('✅ Sessão restaurada:', {
        questoes: questoesFormatadas.length,
        questaoAtual: progresso.questao_atual,
        respostas: progresso.respostas?.length || 0
      })
    } catch (error) {
      console.error('Erro ao continuar sessão:', error)
      alert('Erro inesperado ao continuar sessão.')
    } finally {
      setCarregandoProgresso(false)
    }
  }
  
  const iniciarNovaSessao = async () => {
    try {
      // Abandonar sessão anterior se existir
      await abandonarSessao()
      setTemProgressoSalvo(false)
      setResumoProgresso(null)
      
      // Continuar com nova sessão
      await iniciarSessao()
    } catch (error) {
      console.error('Erro ao iniciar nova sessão:', error)
    }
  }

  const carregarDados = async () => {
  console.log('Carregando dados do estudar...')
  setCarregandoDados(true)
  
  try {
    const [materiasData, tagsData, statsData] = await Promise.all([
      getMateriasComEstatisticas(),
      getTags(),
      getEstatisticasEstudo()
    ])
    
    setMaterias(materiasData)
    setTags(tagsData)
    setEstatisticas(statsData)
    
    // NOVO: Carregar estatísticas dos filtros
    if (configuracao.materiaId) {
      const statsFiltros = await getEstatisticasFiltros(configuracao.materiaId)
      setEstatisticasFiltros(statsFiltros)
    }
    
    console.log('✅ Dados carregados:', { materias: materiasData.length, tags: tagsData.length })
  } catch (error) {
    console.error('❌ Erro ao carregar dados:', error)
  } finally {
    setCarregandoDados(false)
  }
}

  const getQuestoesDisponiveis = async (): Promise<number> => {
    try {
      let query = supabase.from('questoes').select('id', { count: 'exact' })

      // Filtrar por matéria se selecionada
      if (configuracao.materiaId) {
        query = query.eq('materia_id', configuracao.materiaId)
      }

      // Filtrar por tags se selecionadas
      if (configuracao.tagIds.length > 0) {
        const questoesPorTags = await getQuestoesPorTags(configuracao.tagIds)
        if (questoesPorTags.length > 0) {
          query = query.in('id', questoesPorTags)
        } else {
          return 0
        }
      }

      // ADICIONAR AQUI OS NOVOS FILTROS
    
      // Filtrar por dificuldade se selecionada
      if (configuracao.dificuldade) {
        query = query.eq('dificuldade', configuracao.dificuldade)
      }

      const { count } = await query
      return count || 0
    } catch (error) {
      console.error('Erro ao contar questões:', error)
      return 0
    }
  }

  const iniciarSessao = async () => {
  setLoading(true)
  
  // Salvar progresso da nova sessão
  console.log('💾 Iniciando nova sessão com progresso...')
  
  const questoesDisponiveis = await getQuestoesDisponiveis()
  console.log('Questões disponíveis:', questoesDisponiveis)
  
  if (questoesDisponiveis === 0) {
    alert('Nenhuma questão encontrada para os critérios selecionados.')
    setLoading(false)
    return
  }

  let limite: number
  if (configuracao.numeroQuestoes === 'todas') {
    limite = questoesDisponiveis
  } else {
    limite = Math.min(configuracao.numeroQuestoes as number, questoesDisponiveis)
  }
  
  console.log('Iniciando sessão com:', { configuracao, questoesDisponiveis, limite })
  
  // Buscar questões baseado na configuração
  let questoesData: QuestaoEstudo[] = []

  if (configuracao.tagIds.length > 0) {
    // Buscar por tags
    const questoesPorTags = await getQuestoesPorTags(configuracao.tagIds)
    if (questoesPorTags.length > 0) {
      questoesData = await getQuestoesParaEstudo(configuracao.materiaId, limite, questoesPorTags, {
        assuntoIds: configuracao.assuntoIds,
        dificuldade: configuracao.dificuldade,
        anoProva: configuracao.anoProva,
        banca: configuracao.banca,
        // NOVOS FILTROS INTELIGENTES
        apenasNaoRespondidas: configuracao.apenasNaoRespondidas,
        apenasErradas: configuracao.apenasErradas,
        revisaoQuestoesDificeis: configuracao.revisaoQuestoesDificeis
      })
    }
  } else {
    // Buscar normalmente
    questoesData = await getQuestoesParaEstudo(configuracao.materiaId, limite, undefined, {
      assuntoIds: configuracao.assuntoIds,
      dificuldade: configuracao.dificuldade,
      anoProva: configuracao.anoProva,
      banca: configuracao.banca,
      // NOVOS FILTROS INTELIGENTES
      apenasNaoRespondidas: configuracao.apenasNaoRespondidas,
      apenasErradas: configuracao.apenasErradas,
      revisaoQuestoesDificeis: configuracao.revisaoQuestoesDificeis
    })
  }
  
  console.log('Questões encontradas:', questoesData)
  
  if (questoesData.length === 0) {
    alert('Nenhuma questão encontrada para os critérios selecionados.')
    setLoading(false)
    return
  }
  
  // Aplicar modo de estudo
  switch (configuracao.modoEstudo) {
    case 'aleatorio':
      // Algoritmo Fisher-Yates para embaralhamento real
      for (let i = questoesData.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questoesData[i], questoesData[j]] = [questoesData[j], questoesData[i]]
      }
      console.log('Questões embaralhadas aleatoriamente')
      break
      
    case 'revisao':
      questoesData = await filtrarQuestoesRevisao(questoesData)
      break
      
    case 'rapido':
      console.log('Modo rápido: não salvará histórico')
      break
      
    case 'normal':
    default:
      console.log('Modo normal: questões em ordem padrão')
      break
  }
  
  setQuestoes(questoesData)

  // Salvar progresso inicial da sessão
  await salvarProgressoSessao(
    configuracao,
    questoesData.map(q => q.id),
    0, // questão atual = 0 (primeira)
    [] // sem respostas ainda
  )

  setModo('estudando')
  setLoading(false)
}

  const finalizarSessaoEstudo = (resultados: ResultadoSessao) => {
    // Finalizar progresso salvo
    finalizarProgressoSessao()
    
    setResultado(resultados)
    setModo('resultado')
    carregarDados()
    
    // Limpar estado de progresso
    setTemProgressoSalvo(false)
    setResumoProgresso(null)
  }

  const novaSessionao = () => {
    setModo('configuracao')
    setResultado(null)
    setQuestoes([])
  }

  const formatarTempo = (ms: number) => {
    const segundos = Math.floor(ms / 1000)
    const minutos = Math.floor(segundos / 60)
    const seg = segundos % 60
    return `${minutos}:${seg.toString().padStart(2, '0')}`
  }

  const getModoEstudoInfo = (modo: string) => {
    switch (modo) {
      case 'normal':
        return { nome: 'Normal', desc: 'Estudo completo com histórico', icon: '📚', cor: 'blue' }
      case 'revisao':
        return { nome: 'Revisão', desc: 'Questões que você errou', icon: '🔄', cor: 'orange' }
      case 'rapido':
        return { nome: 'Rápido', desc: 'Sem salvar histórico', icon: '⚡', cor: 'yellow' }
      case 'aleatorio':
        return { nome: 'Aleatório', desc: 'Questões em ordem aleatória', icon: '🎲', cor: 'purple' }
      default:
        return { nome: 'Normal', desc: 'Estudo completo', icon: '📚', cor: 'blue' }
    }
  }

  if (modo === 'estudando') {
    return (
      <ProtectedRoute>
        <DashboardLayout title={`${isAdmin ? '🧪 Teste' : '🎓 Estudo'} - ${getModoEstudoInfo(configuracao.modoEstudo).nome}`}>
        <ModoEstudo 
        questoes={questoes} 
        onFinalizar={finalizarSessaoEstudo}
        configuracao={configuracao}
        isAdmin={isAdmin}
      />
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (modo === 'resultado' && resultado) {
    return (
      <ProtectedRoute>
        <DashboardLayout title="Resultado da Sessão">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header do resultado */}
            <div className={`p-6 rounded-lg text-white ${
              isAdmin 
                ? 'bg-gradient-to-r from-purple-500 to-blue-600'
                : 'bg-gradient-to-r from-green-500 to-blue-600'
            }`}>
              <div className="text-center">
                <div className="text-6xl mb-4">
                  {resultado.percentual >= 80 ? '🎉' : resultado.percentual >= 60 ? '👍' : '📚'}
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  {isAdmin ? 'Teste Finalizado!' : 'Sessão Finalizada!'}
                </h2>
                <p className="text-lg opacity-90">
                  Você acertou {resultado.acertos} de {resultado.totalQuestoes} questões
                </p>
              </div>
            </div>

            {/* Estatísticas detalhadas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                <Trophy className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">{resultado.acertos}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Acertos</div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">{resultado.percentual}%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Percentual</div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-600">{formatarTempo(resultado.tempo)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Tempo Total</div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                <BarChart3 className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round(resultado.tempo / resultado.totalQuestoes / 1000)}s
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Tempo/Questão</div>
              </div>
            </div>

            {/* Configuração da sessão */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                📊 Detalhes da Sessão
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Modo:</span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">
                    {getModoEstudoInfo(configuracao.modoEstudo).nome}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Matéria:</span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">
                    {configuracao.materiaId 
                      ? materias.find(m => m.id === configuracao.materiaId)?.nome 
                      : 'Todas as matérias'
                    }
                  </span>
                </div>
                {configuracao.tagIds.length > 0 && (
                  <div className="md:col-span-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Tags:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {configuracao.tagIds.map(tagId => {
                        const tag = tags.find(t => t.id === tagId)
                        return tag ? (
                          <span
                            key={tag.id}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: tag.cor }}
                          >
                            {tag.nome}
                          </span>
                        ) : null
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={novaSessionao}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Nova Sessão
              </button>
              <button
                onClick={() => setModo('configuracao')}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Configurar
              </button>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  // Tela de configuração
  return (
    <ProtectedRoute>
      <DashboardLayout title={isAdmin ? "🧪 Modo Teste" : "🎓 Configurar Estudo"}>
        <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div className={`p-6 rounded-lg text-white ${
            isAdmin 
              ? 'bg-gradient-to-r from-purple-500 to-blue-600'
              : 'bg-gradient-to-r from-blue-500 to-green-600'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  {isAdmin ? '🧪 Modo Teste do Sistema' : '🎓 Configurar Sessão de Estudo'}
                </h2>
                <p className={isAdmin ? 'text-purple-100' : 'text-blue-100'}>
                  {isAdmin 
                    ? 'Teste questões e funcionalidades do sistema'
                    : 'Personalize sua experiência de estudo'
                  }
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {materias.reduce((total, m) => total + m.questoes_count, 0)}
                </div>
                <div className={`text-sm ${isAdmin ? 'text-purple-200' : 'text-blue-200'}`}>
                  Questões Disponíveis
                </div>
              </div>
            </div>
          </div>

          {/* Sessão em andamento */}
          {temProgressoSalvo && resumoProgresso && (
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 rounded-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    📖 Você tem uma sessão em andamento!
                  </h3>
                  <div className="text-orange-100 space-y-1">
                    <p>• Questão {resumoProgresso.questaoAtual} de {resumoProgresso.questoesTotais}</p>
                    <p>• {resumoProgresso.respostasFeitas} respostas já feitas</p>
                    <p>• Tempo decorrido: {resumoProgresso.tempoDecorrido}</p>
                    <p>• Modo: {getModoEstudoInfo(resumoProgresso.configuracao?.modoEstudo || 'normal').nome}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={continuarSessaoSalva}
                    disabled={carregandoProgresso}
                    className="px-6 py-3 bg-white text-orange-600 rounded-lg hover:bg-gray-100 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {carregandoProgresso ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                        Carregando...
                      </>
                    ) : (
                      <>
                        ▶️ Continuar Sessão
                      </>
                    )}
                  </button>
                  <button
                    onClick={iniciarNovaSessao}
                    disabled={carregandoProgresso}
                    className="px-6 py-3 border border-white text-white rounded-lg hover:bg-white hover:text-orange-600 transition-colors font-medium disabled:opacity-50"
                  >
                    🆕 Nova Sessão
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Estatísticas do usuário */}
          {!isAdmin && estatisticas && estatisticas.totalRespostas > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Seu Progresso
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{estatisticas.totalRespostas}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Questões Respondidas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{estatisticas.acertos}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Acertos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{estatisticas.percentualAcertos}%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Taxa de Acerto</div>
                </div>
              </div>
            </div>
          )}

          {/* Configuração da Sessão */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações da Sessão
            </h3>

            <div className="space-y-6">
              {/* Modo de Estudo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Modo de Estudo
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {['normal', 'revisao', 'rapido', 'aleatorio'].map((modo) => {
                    const info = getModoEstudoInfo(modo)
                    return (
                      <button
                        key={modo}
                        onClick={() => setConfiguracao({...configuracao, modoEstudo: modo as any})}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          configuracao.modoEstudo === modo
                            ? `border-${info.cor}-500 bg-${info.cor}-50 dark:bg-${info.cor}-900/20`
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <div className="text-2xl mb-2">{info.icon}</div>
                        <div className="font-medium text-gray-900 dark:text-white">{info.nome}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{info.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Seleção de Matéria */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Matéria (opcional)
                </label>
                <select
                  value={configuracao.materiaId || ''}
                  onChange={(e) => setConfiguracao({...configuracao, materiaId: e.target.value || undefined})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">
  {carregandoDados ? 'Carregando matérias...' : `Todas as matérias (${materias.reduce((total, m) => total + m.questoes_count, 0)} questões)`}
</option>
                  {materias.map((materia) => (
                    <option key={materia.id} value={materia.id}>
                      {materia.nome} ({materia.questoes_count} questões)
                    </option>
                  ))}
                </select>
              </div>

              {/* Seleção de Assuntos */}
              {configuracao.materiaId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assuntos Específicos (opcional)
                  </label>
                  <SeletorAssuntos
                    materiaId={configuracao.materiaId}
                    assuntosSelecionados={configuracao.assuntoIds}
                    onChange={(assuntos) => setConfiguracao({...configuracao, assuntoIds: assuntos})}
                  />
                </div>
              )}

              {/* Seleção de Tags */}
              {tags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filtrar por Tags (opcional)
                  </label>
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700">
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <button
                          key={tag.id}
                          onClick={() => {
                            const newTagIds = configuracao.tagIds.includes(tag.id)
                              ? configuracao.tagIds.filter(id => id !== tag.id)
                              : [...configuracao.tagIds, tag.id]
                            setConfiguracao({...configuracao, tagIds: newTagIds})
                          }}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-all ${
                            configuracao.tagIds.includes(tag.id)
                              ? 'text-white scale-105'
                              : 'border-2 bg-transparent hover:scale-105'
                          }`}
                          style={{
                            backgroundColor: configuracao.tagIds.includes(tag.id) ? tag.cor : 'transparent',
                            borderColor: tag.cor,
                            color: configuracao.tagIds.includes(tag.id) ? 'white' : tag.cor
                          }}
                        >
                          <TagIcon className="h-3 w-3" />
                          {tag.nome}
                        </button>
                      ))}
                    </div>
                    {configuracao.tagIds.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                        Clique nas tags para filtrar questões por assunto
                      </p>
                    )}
                  </div>
                </div>
              )}
              {/* Seleção de Dificuldade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filtrar por Dificuldade (opcional)
                </label>
                <select
                  value={configuracao.dificuldade || ''}
                  onChange={(e) => setConfiguracao({...configuracao, dificuldade: e.target.value as any || undefined})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas as dificuldades</option>
                  <option value="facil">🟢 Fácil</option>
                  <option value="medio">🟡 Médio</option>
                  <option value="dificil">🔴 Difícil</option>
                </select>
              </div>

              {/* NOVO: Filtros Inteligentes */}
              <FiltrosInteligentes
                filtros={{
                  apenasNaoRespondidas: configuracao.apenasNaoRespondidas || false,
                  apenasErradas: configuracao.apenasErradas || false,
                  revisaoQuestoesDificeis: configuracao.revisaoQuestoesDificeis || false
                }}
                onChange={(novosFiltros) => setConfiguracao({...configuracao, ...novosFiltros})}
                estatisticas={estatisticasFiltros}
              />

              {/* Número de Questões */}  
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Número de Questões
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={typeof configuracao.numeroQuestoes === 'number' ? configuracao.numeroQuestoes : ''}
                    onChange={(e) => {
                      const value = parseInt(e.target.value)
                      if (value > 0) {
                        setConfiguracao({...configuracao, numeroQuestoes: value})
                      }
                    }}
                    className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 20"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">questões</span>
                  <button
                    onClick={() => setConfiguracao({...configuracao, numeroQuestoes: 'todas'})}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      configuracao.numeroQuestoes === 'todas'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Todas
                  </button>
                </div>
              </div>

              {/* Opções avançadas para admin */}
              {isAdmin && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    🧪 Opções de Teste
                  </h4>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={!configuracao.salvarHistorico}
                        onChange={(e) => setConfiguracao({...configuracao, salvarHistorico: !e.target.checked})}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Modo teste (não salvar no histórico)
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Resumo da configuração */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">📊 Resumo da Sessão</h4>
                <div className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                  <p>• Modo: {getModoEstudoInfo(configuracao.modoEstudo).nome}</p>
                  <p>• Matéria: {configuracao.materiaId 
                    ? materias.find(m => m.id === configuracao.materiaId)?.nome 
                    : 'Todas as matérias'
                  }</p>
                  {configuracao.assuntoIds.length > 0 && (
                    <p>• Assuntos: {configuracao.assuntoIds.length} selecionados</p>
                  )}
                  {configuracao.tagIds.length > 0 && (
                    <p>• Tags: {configuracao.tagIds.length} selecionadas</p>
                  )}
                  {configuracao.dificuldade && (
                    <p>• Dificuldade: {configuracao.dificuldade}</p>
                  )}
                  {configuracao.anoProva && (
                    <p>• Ano: {configuracao.anoProva}</p>
                  )}
                  {configuracao.banca && (
                    <p>• Banca: {configuracao.banca}</p>
                  )}
                  <p>• Questões: {configuracao.numeroQuestoes === 'todas' ? 'Todas disponíveis' : configuracao.numeroQuestoes}</p>
                  {isAdmin && !configuracao.salvarHistorico && (
                    <p>• ⚠️ Modo teste ativo (não salva histórico)</p>
                  )}
                </div>
              </div>

              {/* Botão Iniciar */}
              <button
                onClick={iniciarSessao}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Carregando...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    {isAdmin ? 'Iniciar Teste' : 'Iniciar Sessão de Estudo'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Dicas contextuais */}
          <div className={`p-6 rounded-lg ${
            isAdmin 
              ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800'
              : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
          }`}>
            <h4 className={`font-medium mb-2 ${
              isAdmin ? 'text-purple-900 dark:text-purple-300' : 'text-blue-900 dark:text-blue-300'
            }`}>
              💡 {isAdmin ? 'Dicas de Teste' : 'Dicas de Estudo'}
            </h4>
            <ul className={`text-sm space-y-1 ${
              isAdmin ? 'text-purple-800 dark:text-purple-400' : 'text-blue-800 dark:text-blue-400'
            }`}>
              {isAdmin ? (
                <>
                                    <li>• Use o modo teste para verificar questões sem afetar estatísticas</li>
                  <li>• Teste diferentes combinações de tags e matérias</li>
                  <li>• Verifique se as explicações estão claras e corretas</li>
                  <li>• Use o modo aleatório para testar a variedade de questões</li>
                </>
              ) : (
                <>
                  <li>• Comece com sessões menores (5-10 questões) para se familiarizar</li>
                  <li>• Use tags para focar em assuntos específicos que precisa melhorar</li>
                  <li>• O modo revisão mostra questões que você errou anteriormente</li>
                  <li>• Estude regularmente, mesmo que por pouco tempo</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}