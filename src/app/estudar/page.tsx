'use client'

import { useState, useEffect, useCallback } from 'react'
import { Play, Settings, Trophy, Clock, Target, BarChart3, BookOpen, Layers, X, Check, Shuffle, ListOrdered, Search, ArrowRight, RefreshCw, Hash, Flame, Eye, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthProvider'
import { ModoEstudo } from '@/components/ModoEstudo'
import { SeletorAssuntos } from '@/components/SeletorAssuntos'
import { EnunciadoFormatado } from '@/components/EnunciadoFormatado'
import { getQuestoesParaEstudo, getEstatisticasEstudo, getEstatisticasFiltros, QuestaoEstudo, StatusQuestoes } from '@/lib/estudo'
import { getMateriasComEstatisticas } from '@/lib/materias'
import { supabase } from '@/lib/supabase'
import { 
  salvarProgressoSessao, 
  buscarProgressoSessao, 
  atualizarQuestaoAtual, 
  finalizarSessao as finalizarProgressoSessao, 
  abandonarSessao, 
  temSessaoEmAndamento, 
  getResumoSessao,
  finalizarSessoesOrfas
} from '@/lib/progresso'
import { gerarPdfQuestoes } from '@/lib/gerarPdfQuestoes'
import { FileDown } from 'lucide-react'
import { Zap } from 'lucide-react'

interface ResultadoSessao {
  totalQuestoes: number
  acertos: number
  erros: number
  percentual: number
  tempo: number
  respostas: any[]
}

interface ConfiguracaoSessao {
  materiasSelecionadas: string[]
  assuntoIds: string[]
  numeroQuestoes: number | 'todas'
  modoEstudo: 'normal' | 'simulado'
  tempoLimiteMinutos?: number
  salvarHistorico: boolean
  statusQuestoes: StatusQuestoes
  embaralhar: boolean
  nomeSessao: string
  corSessao: string
}

export default function EstudarPage() {
  const { isAdmin } = useAuth()
  const [modo, setModo] = useState<'configuracao' | 'estudando' | 'resultado'>('configuracao')
  const [materias, setMaterias] = useState<any[]>([])
  const [questoes, setQuestoes] = useState<QuestaoEstudo[]>([])
  const [resultado, setResultado] = useState<ResultadoSessao | null>(null)
  const [estatisticas, setEstatisticas] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [configuracao, setConfiguracao] = useState<ConfiguracaoSessao>({
    materiasSelecionadas: [],
    assuntoIds: [],
    numeroQuestoes: 10,
    modoEstudo: 'normal',
    salvarHistorico: true,
    statusQuestoes: 'todas',
    embaralhar: false,
    nomeSessao: '',
    corSessao: '#3B82F6'
  })
  const [temProgressoSalvo, setTemProgressoSalvo] = useState(false)
  const [resumoProgresso, setResumoProgresso] = useState<any>(null)
  const [carregandoProgresso, setCarregandoProgresso] = useState(false)
  const [carregandoDados, setCarregandoDados] = useState(true)
  const [buscaMateria, setBuscaMateria] = useState('')
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const [secaoAvancadaAberta, setSecaoAvancadaAberta] = useState(false)
  const [animarResultado, setAnimarResultado] = useState(false)
  const [questoesExpandidas, setQuestoesExpandidas] = useState<Set<number>>(new Set())
  const [filtroRevisao, setFiltroRevisao] = useState<'todas' | 'acertos' | 'erros' | 'puladas'>('todas')
  const [modoSelecaoMultipla, setModoSelecaoMultipla] = useState(false)

  // Contador dinâmico de questões disponíveis
  const [contadorQuestoes, setContadorQuestoes] = useState<{
    totalQuestoes: number
    naoRespondidas: number
    comErros: number
    acertadas: number
  }>({ totalQuestoes: 0, naoRespondidas: 0, comErros: 0, acertadas: 0 })
  const [carregandoContador, setCarregandoContador] = useState(false)

  // =============================================
  // EFFECTS
  // =============================================

  useEffect(() => {
    const inicializar = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const modoQuestao = urlParams.get('modo')
      
      if (modoQuestao === 'questao-especifica') {
        const dadosQuestao = localStorage.getItem('estudo_questao_especifica')
        if (dadosQuestao) {
          try {
            const dados = JSON.parse(dadosQuestao)
            setQuestoes(dados.questoes)
            setConfiguracao(prev => ({ ...prev, ...dados.configuracao }))
            setModo('estudando')
            localStorage.removeItem('estudo_questao_especifica')
            return
          } catch (error) {
            console.error('Erro ao carregar questão específica:', error)
          }
        }
      }
  
      await carregarDados()
      await verificarProgressoSalvo()
    }
    inicializar()
  }, [])

  // Atualizar contadores quando mudam filtros
  useEffect(() => {
    atualizarContadores()
  }, [configuracao.materiasSelecionadas, configuracao.assuntoIds])

  // Limpar assuntos quando mudar de matéria
  useEffect(() => {
    const qtd = configuracao.materiasSelecionadas.length
    if (qtd !== 1 && configuracao.assuntoIds.length > 0) {
      setConfiguracao(prev => ({ ...prev, assuntoIds: [] }))
    }
  }, [configuracao.materiasSelecionadas])

  // Config de tempo para simulado
  useEffect(() => {
    if (configuracao.modoEstudo === 'simulado' && !configuracao.tempoLimiteMinutos) {
      setConfiguracao(prev => ({ ...prev, tempoLimiteMinutos: 60 }))
    }
  }, [configuracao.modoEstudo])

  useEffect(() => {
    if (modo === 'resultado') {
      setTimeout(() => setAnimarResultado(true), 100)
    } else {
      setAnimarResultado(false)
    }
  }, [modo])

  // =============================================
  // FUNÇÕES
  // =============================================

  const atualizarContadores = useCallback(async () => {
    setCarregandoContador(true)
    
    // Forçar atualização invalidando cache primeiro
    const { cacheInvalidarPrefixo } = await import('@/lib/cache')
    cacheInvalidarPrefixo('estatisticas')
    cacheInvalidarPrefixo('filtros')
    
    const materiasParam = configuracao.materiasSelecionadas.length > 0
      ? configuracao.materiasSelecionadas
      : undefined
    const stats = await getEstatisticasFiltros(materiasParam, configuracao.assuntoIds.length > 0 ? configuracao.assuntoIds : undefined)
    setContadorQuestoes(stats)
    setCarregandoContador(false)
  }, [configuracao.materiasSelecionadas, configuracao.assuntoIds])

    // Atualizar contadores quando volta para configuração
    useEffect(() => {
      if (modo === 'configuracao') {
        atualizarContadores()
      }
    }, [modo, atualizarContadores])

  const getQuestoesParaIniciar = (): number => {
    const questoesDoStatus = (() => {
      switch (configuracao.statusQuestoes) {
        case 'nao_respondidas': return contadorQuestoes.naoRespondidas
        case 'erradas': return contadorQuestoes.comErros
        case 'acertadas': return contadorQuestoes.acertadas
        default: return contadorQuestoes.totalQuestoes
      }
    })()
    
    // Se selecionou quantidade específica, usar o menor valor
    if (configuracao.numeroQuestoes === 'todas') {
      return questoesDoStatus
    } else {
      return Math.min(configuracao.numeroQuestoes as number, questoesDoStatus)
    }
  }

  const verificarProgressoSalvo = async () => {
    try {
      const temProgresso = await temSessaoEmAndamento()
      setTemProgressoSalvo(temProgresso)
      if (temProgresso) {
        const resumo = await getResumoSessao()
        setResumoProgresso(resumo)
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
  
      setConfiguracao(prev => ({ ...prev, ...progresso.configuracao }))
      
      const { data: questoesData, error } = await supabase
        .from('questoes')
        .select(`id, enunciado, tipo, explicacao, resposta_certo_errado, imagem_url, materias!inner(nome), alternativas(id, texto, correta)`)
        .in('id', progresso.questoes_ids)
  
      if (error || !questoesData) {
        alert('Erro ao carregar questões salvas.')
        setCarregandoProgresso(false)
        return
      }
  
      const questoesOrdenadas = progresso.questoes_ids.map((id: string) => 
        questoesData.find(q => q.id === id)
      ).filter(Boolean)
  
      const questoesFormatadas = questoesOrdenadas.map((item: any) => ({
        id: item.id, enunciado: item.enunciado, tipo: item.tipo, explicacao: item.explicacao,
        resposta_certo_errado: item.resposta_certo_errado, imagem_url: item.imagem_url,
        materia: { nome: item.materias?.nome || 'Sem matéria' },
        alternativas: item.alternativas || []
      }))
  
      const dadosRestauracao = {
        questoes: questoesFormatadas,
        questaoAtual: progresso.questao_atual,
        respostasAnteriores: Array.isArray(progresso.respostas) ? progresso.respostas : [],
        tempoInicio: new Date(progresso.tempo_inicio).getTime()
      }
  
      setQuestoes(questoesFormatadas)
      localStorage.setItem('sessao_restauracao', JSON.stringify(dadosRestauracao))
      setModo('estudando')
    } catch (error) {
      alert('Erro inesperado ao continuar sessão.')
    } finally {
      setCarregandoProgresso(false)
    }
  }
  
  const iniciarNovaSessao = async () => {
    try {
      await abandonarSessao()
      setTemProgressoSalvo(false)
      setResumoProgresso(null)
      await iniciarSessao()
    } catch (error) {
      console.error('Erro ao iniciar nova sessão:', error)
    }
  }

  const carregarDados = async () => {
    setCarregandoDados(true)
    try {
      const [materiasData, statsData] = await Promise.all([
        getMateriasComEstatisticas(),
        getEstatisticasEstudo()
      ])
      setMaterias(materiasData)
      setEstatisticas(statsData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setCarregandoDados(false)
    }
  }

  const gerarPdf = async () => {
    setGerandoPdf(true)
    try {
      const materiasParaBusca = configuracao.materiasSelecionadas.length > 0
        ? configuracao.materiasSelecionadas : undefined

      const limite = configuracao.numeroQuestoes === 'todas' ? undefined : configuracao.numeroQuestoes as number

      const questoesData = await getQuestoesParaEstudo(materiasParaBusca, limite, undefined, {
        assuntoIds: configuracao.assuntoIds,
        statusQuestoes: configuracao.statusQuestoes,
        embaralhar: configuracao.embaralhar
      })

      if (questoesData.length === 0) {
        alert('Nenhuma questão encontrada para os filtros selecionados.')
        return
      }

      const nomesM = configuracao.materiasSelecionadas
        .map(id => materias.find(m => m.id === id)?.nome)
        .filter(Boolean) as string[]

      const { data: { user: authUser } } = await supabase.auth.getUser()
      let dadosUsuario: any

      if (authUser) {
        const { data: perfil } = await supabase
          .from('usuarios')
          .select('nome_completo, nome, cpf, pelotao, matricula')
          .eq('id', authUser.id)
          .single()

        if (perfil) {
          dadosUsuario = {
            nome: perfil.nome_completo || perfil.nome || '',
            cpf: perfil.cpf || undefined,
            pelotao: perfil.pelotao || undefined,
            matricula: perfil.matricula || undefined
          }
        }
      }

      gerarPdfQuestoes(questoesData, {
        titulo: configuracao.nomeSessao?.trim() || 'Simulado - CFP PMDF',
        materias: nomesM.length > 0 ? nomesM : ['Todas as matérias'],
        incluirGabarito: true,
        incluirExplicacoes: true,
        incluirEspacoResposta: true,
        usuario: dadosUsuario,
      })
    } catch (error) {
      alert('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setGerandoPdf(false)
    }
  }

  const iniciarSessao = async () => {
    setLoading(true)
    
    await finalizarSessoesOrfas()
    
    const materiasParaBusca = configuracao.materiasSelecionadas.length > 0
      ? configuracao.materiasSelecionadas : undefined

    const questoesDisponiveis = getQuestoesParaIniciar()
    
    if (questoesDisponiveis === 0) {
      alert('Nenhuma questão disponível para os filtros selecionados.')
      setLoading(false)
      return
    }

    let limite: number
    if (configuracao.numeroQuestoes === 'todas') {
      limite = questoesDisponiveis
    } else {
      limite = Math.min(configuracao.numeroQuestoes as number, questoesDisponiveis)
    }
    
    const questoesData = await getQuestoesParaEstudo(materiasParaBusca, limite, undefined, {
      assuntoIds: configuracao.assuntoIds,
      statusQuestoes: configuracao.statusQuestoes,
      embaralhar: configuracao.embaralhar
    })
    
    if (questoesData.length === 0) {
      alert('Nenhuma questão encontrada para os critérios selecionados.')
      setLoading(false)
      return
    }
      
    setQuestoes(questoesData)

    await salvarProgressoSessao(
      configuracao,
      questoesData.map(q => q.id),
      0,
      []
    )

    setModo('estudando')
    setLoading(false)
  }

  const finalizarSessaoEstudo = (resultados: ResultadoSessao) => {
    finalizarProgressoSessao()
    setResultado(resultados)
    setModo('resultado')
    carregarDados()
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

  // Helpers
  const totalQuestoesDisp = materias.reduce((total: number, m: any) => total + (m.questoes_count || 0), 0)
  
  const materiasSelecionadasNomes = configuracao.materiasSelecionadas
    .map(id => materias.find(m => m.id === id)?.nome)
    .filter(Boolean)

  const selecionarMateria = (materiaId: string) => {
    if (modoSelecaoMultipla) {
      // Modo múltipla: toggle
      const selecionadas = configuracao.materiasSelecionadas
      if (selecionadas.includes(materiaId)) {
        setConfiguracao({ ...configuracao, materiasSelecionadas: selecionadas.filter(id => id !== materiaId) })
      } else {
        setConfiguracao({ ...configuracao, materiasSelecionadas: [...selecionadas, materiaId] })
      }
    } else {
      // Modo única: seleciona só esta
      if (configuracao.materiasSelecionadas.length === 1 && configuracao.materiasSelecionadas[0] === materiaId) {
        setConfiguracao({ ...configuracao, materiasSelecionadas: [] }) // deselecionar
      } else {
        setConfiguracao({ ...configuracao, materiasSelecionadas: [materiaId] })
      }
    }
  }

  const questoesDisponiveisLabel = (): string => {
    const qtd = getQuestoesParaIniciar()
    if (carregandoContador) return '...'
    return `${qtd}`
  }

  const statusOptions: { key: StatusQuestoes; label: string; emoji: string; count: number; cor: string }[] = [
    { key: 'todas', label: 'Todas', emoji: '📚', count: contadorQuestoes.totalQuestoes, cor: 'blue' },
    { key: 'nao_respondidas', label: 'Não respondidas', emoji: '🆕', count: contadorQuestoes.naoRespondidas, cor: 'violet' },
    { key: 'erradas', label: 'Que eu errei', emoji: '❌', count: contadorQuestoes.comErros, cor: 'red' },
    { key: 'acertadas', label: 'Que eu acertei', emoji: '✅', count: contadorQuestoes.acertadas, cor: 'emerald' },
  ]

  // =============================================
  // MODO ESTUDANDO
  // =============================================
  if (modo === 'estudando') {
    return (
      <ProtectedRoute>
        <DashboardLayout title={`${isAdmin ? '🧪 Teste' : '🎓 Estudo'} - ${configuracao.modoEstudo === 'simulado' ? 'Simulado' : 'Normal'}`}>
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

  // =============================================
  // TELA DE RESULTADO
  // =============================================
  if (modo === 'resultado' && resultado) {
    const emoji = resultado.percentual >= 90 ? '🏆' : resultado.percentual >= 80 ? '🎉' : resultado.percentual >= 60 ? '👍' : resultado.percentual >= 40 ? '💪' : '📚'
    const mensagem = resultado.percentual >= 90 ? 'Excelente!' : resultado.percentual >= 80 ? 'Muito bom!' : resultado.percentual >= 60 ? 'Bom trabalho!' : resultado.percentual >= 40 ? 'Continue praticando!' : 'Não desista!'
    const corPrincipal = resultado.percentual >= 70 ? 'emerald' : resultado.percentual >= 50 ? 'amber' : 'red'

    return (
      <ProtectedRoute>
        <DashboardLayout title="Resultado da Sessão">
          <div className="max-w-2xl lg:max-w-4xl mx-auto space-y-5 px-1">
            
            {/* Card principal */}
            <div className={`relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg transition-all duration-700 ${animarResultado ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className={`h-1.5 ${corPrincipal === 'emerald' ? 'bg-emerald-500' : corPrincipal === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`} />
              <div className="p-6 sm:p-8 text-center">
                <div className={`text-6xl sm:text-7xl mb-3 transition-all duration-700 delay-200 ${animarResultado ? 'scale-100' : 'scale-50'}`}>{emoji}</div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">{isAdmin ? 'Teste Finalizado!' : mensagem}</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{resultado.acertos} de {resultado.totalQuestoes} questões corretas</p>
                <div className={`mt-6 mb-2 transition-all duration-700 delay-300 ${animarResultado ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
                  <div className={`inline-flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 ${
                    corPrincipal === 'emerald' ? 'border-emerald-200 dark:border-emerald-800' : corPrincipal === 'amber' ? 'border-amber-200 dark:border-amber-800' : 'border-red-200 dark:border-red-800'
                  }`}>
                    <div>
                      <div className={`text-3xl sm:text-4xl font-bold ${corPrincipal === 'emerald' ? 'text-emerald-600' : corPrincipal === 'amber' ? 'text-amber-600' : 'text-red-600'}`}>{resultado.percentual}%</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 -mt-0.5">acertos</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Métricas */}
            <div className={`grid grid-cols-3 gap-3 transition-all duration-500 delay-400 ${animarResultado ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
                <Trophy className="h-5 w-5 text-emerald-500 mx-auto mb-1.5" />
                <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{resultado.acertos}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Acertos</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
                <Clock className="h-5 w-5 text-blue-500 mx-auto mb-1.5" />
                <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{formatarTempo(resultado.tempo)}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Tempo</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
                <Zap className="h-5 w-5 text-amber-500 mx-auto mb-1.5" />
                <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{Math.round(resultado.tempo / resultado.totalQuestoes / 1000)}s</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Média/Q</div>
              </div>
            </div>

            {/* Revisão das Respostas */}
            {resultado.respostas && resultado.respostas.length > 0 && (
              <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-500 delay-500 ${animarResultado ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                    <Eye className="h-4 w-4 text-blue-500" />
                    Revisão das Respostas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { key: 'todas', label: 'Todas', count: resultado.respostas.length },
                      { key: 'acertos', label: '✅ Acertos', count: resultado.respostas.filter((r: any) => r.correta).length },
                      { key: 'erros', label: '❌ Erros', count: resultado.respostas.filter((r: any) => r.resposta !== null && !r.correta).length },
                      { key: 'puladas', label: '⏭️ Puladas', count: resultado.respostas.filter((r: any) => r.resposta === null).length },
                    ] as const).map(f => (
                      f.count > 0 && (
                        <button key={f.key} onClick={() => setFiltroRevisao(f.key)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${filtroRevisao === f.key ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
                        >
                          {f.label} ({f.count})
                        </button>
                      )
                    ))}
                  </div>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[60vh] overflow-y-auto">
                  {resultado.respostas
                    .map((r: any, index: number) => ({ ...r, index }))
                    .filter((r: any) => {
                      if (filtroRevisao === 'acertos') return r.correta
                      if (filtroRevisao === 'erros') return r.resposta !== null && !r.correta
                      if (filtroRevisao === 'puladas') return r.resposta === null
                      return true
                    })
                    .map((r: any) => {
                      const expandida = questoesExpandidas.has(r.index)
                      const isPulada = r.resposta === null

                      return (
                        <div key={r.index}>
                          <button
                            onClick={() => {
                              setQuestoesExpandidas(prev => {
                                const novo = new Set(prev)
                                if (novo.has(r.index)) novo.delete(r.index)
                                else novo.add(r.index)
                                return novo
                              })
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                          >
                            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              isPulada ? 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                                : r.correta ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-600'
                            }`}>{r.index + 1}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{r.questao.enunciado.substring(0, 80)}{r.questao.enunciado.length > 80 ? '...' : ''}</p>
                              <span className="text-[10px] text-gray-500">{r.questao.materia?.nome}</span>
                            </div>
                            <span className="text-sm shrink-0">{isPulada ? '⏭️' : r.correta ? '✅' : '❌'}</span>
                            {expandida ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
                          </button>

                          {expandida && (
                            <div className="px-4 pb-4 space-y-3 bg-gray-50 dark:bg-gray-800/50">
                              <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                <EnunciadoFormatado texto={r.questao.enunciado} className="text-sm" />
                              </div>
                              
                              {r.questao.tipo === 'multipla_escolha' && r.questao.alternativas && (
                                <div className="space-y-1.5">
                                  {r.questao.alternativas.map((alt: any, altIdx: number) => {
                                    const foiEscolhida = alt.id === r.resposta
                                    const ehCorreta = alt.correta
                                    let estiloAlt = 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                                    if (ehCorreta) estiloAlt = 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                                    else if (foiEscolhida) estiloAlt = 'border-red-400 bg-red-50 dark:bg-red-900/20'
                                    return (
                                      <div key={alt.id} className={`px-3 py-2 rounded-xl border text-sm flex items-start gap-2 ${estiloAlt}`}>
                                        <span className="font-bold text-gray-400 shrink-0">{String.fromCharCode(97 + altIdx)})</span>
                                        <span className="flex-1 text-gray-800 dark:text-gray-200 text-justify">{alt.texto}</span>
                                        {ehCorreta && <span className="shrink-0">✅</span>}
                                        {foiEscolhida && !ehCorreta && <span className="shrink-0">❌</span>}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}

                              {r.questao.tipo === 'certo_errado' && (
                                <div className="flex gap-2">
                                  {['CERTO', 'ERRADO'].map(opcao => {
                                    const valor = opcao === 'CERTO'
                                    const ehCorreta = r.questao.resposta_certo_errado === valor
                                    const foiEscolhida = r.resposta === valor
                                    let estiloAlt = 'border-gray-200 dark:border-gray-700 text-gray-500'
                                    if (ehCorreta) estiloAlt = 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700'
                                    else if (foiEscolhida && !r.correta) estiloAlt = 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700'
                                    return (
                                      <div key={opcao} className={`flex-1 text-center py-2 rounded-xl border text-sm font-semibold ${estiloAlt}`}>
                                        {opcao} {ehCorreta && '✅'} {foiEscolhida && !r.correta && '❌'}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}

                              {r.questao.explicacao && (
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                  <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">💡 Explicação</p>
                                  <p className="text-sm text-blue-700 dark:text-blue-400 text-justify">{r.questao.explicacao}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>

                <div className="p-3 border-t border-gray-100 dark:border-gray-700 flex justify-center">
                  <button onClick={() => {
                    if (questoesExpandidas.size > 0) setQuestoesExpandidas(new Set())
                    else setQuestoesExpandidas(new Set(resultado.respostas.map((_: any, i: number) => i)))
                  }} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                    {questoesExpandidas.size > 0 ? 'Recolher todas' : 'Expandir todas'}
                  </button>
                </div>
              </div>
            )}

            {/* Botões */}
            <div className={`flex flex-col sm:flex-row gap-3 transition-all duration-500 delay-600 ${animarResultado ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <button onClick={novaSessionao} className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all font-medium">
                <RefreshCw className="h-4 w-4" /> Nova Sessão
              </button>
              <button onClick={() => setModo('configuracao')} className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-[0.98] transition-all font-medium">
                <Settings className="h-4 w-4" /> Reconfigurar
              </button>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  // =============================================
  // TELA DE CONFIGURAÇÃO (PRINCIPAL)
  // =============================================
  return (
    <ProtectedRoute>
      <DashboardLayout title={isAdmin ? "🧪 Modo Teste" : "🎓 Configurar Estudo"}>
        <div className="max-w-2xl lg:max-w-4xl mx-auto pb-28 sm:pb-6">
          <div className="space-y-4 px-1">
            
            {/* Header */}
            <div className={`rounded-2xl p-5 sm:p-6 text-white relative overflow-hidden ${
              isAdmin ? 'bg-gradient-to-br from-violet-600 to-indigo-700' : 'bg-gradient-to-br from-blue-600 to-cyan-600'
            }`}>
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold mb-1">{isAdmin ? 'Modo Teste' : 'Nova Sessão de Estudo'}</h2>
                    <p className="text-sm opacity-80">{isAdmin ? 'Teste questões sem afetar estatísticas' : 'Configure e inicie sua sessão personalizada'}</p>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span className="font-medium">{totalQuestoesDisp}</span>
                    <span className="opacity-80">questões</span>
                  </div>
                </div>
              </div>
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full" />
            </div>

            {/* Sessão em andamento */}
            {temProgressoSalvo && resumoProgresso && (
              <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
                    <Flame className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-amber-900 dark:text-amber-200 text-sm">Sessão em andamento</h3>
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                      Questão {resumoProgresso.questaoAtual} de {resumoProgresso.questoesTotais} · {resumoProgresso.respostasFeitas} respostas · {resumoProgresso.tempoDecorrido}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={continuarSessaoSalva} disabled={carregandoProgresso}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 active:scale-[0.98] transition-all text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]">
                        {carregandoProgresso ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Play className="h-4 w-4" />}
                        Continuar
                      </button>
                      <button onClick={iniciarNovaSessao} disabled={carregandoProgresso}
                        className="px-4 py-2.5 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/30 active:scale-[0.98] transition-all text-sm font-medium disabled:opacity-50 min-h-[44px]">
                        Nova
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Progresso compacto */}
            {!isAdmin && estatisticas && estatisticas.totalRespostas > 0 && (
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
                  <div className="text-lg font-bold text-blue-600">{estatisticas.totalRespostas}</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Respondidas</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
                  <div className="text-lg font-bold text-emerald-600">{estatisticas.acertos}</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Acertos</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
                  <div className="text-lg font-bold text-violet-600">{estatisticas.percentualAcertos}%</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Taxa</div>
                </div>
              </div>
            )}

            {/* ==================== */}
            {/* 1. MATÉRIAS */}
            {/* ==================== */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    Matéria
                  </h3>
                  <div className="flex items-center gap-2">
                    {configuracao.materiasSelecionadas.length > 0 && (
                      <button onClick={() => setConfiguracao({ ...configuracao, materiasSelecionadas: [] })}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                        Limpar
                      </button>
                    )}
                    <button onClick={() => setModoSelecaoMultipla(!modoSelecaoMultipla)}
                      className={`text-xs px-2 py-1 rounded-lg transition-colors ${modoSelecaoMultipla ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                      {modoSelecaoMultipla ? 'Múltiplas ✓' : 'Selecionar várias'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                {/* Chip "Todas" */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <button onClick={() => { setConfiguracao({ ...configuracao, materiasSelecionadas: [] }); setModoSelecaoMultipla(false) }}
                    className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all active:scale-[0.97] min-h-[40px] flex items-center gap-1.5 ${
                      configuracao.materiasSelecionadas.length === 0
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}>
                    📚 Todas <span className="opacity-70">({totalQuestoesDisp})</span>
                  </button>
                </div>

                {materias.length > 5 && (
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Buscar matéria..." value={buscaMateria} onChange={(e) => setBuscaMateria(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 min-h-[44px]" />
                    {buscaMateria && (
                      <button onClick={() => setBuscaMateria('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 max-h-48 lg:max-h-64 overflow-y-auto">
                  {materias.filter(m => !buscaMateria || m.nome.toLowerCase().includes(buscaMateria.toLowerCase())).map((materia) => {
                    const selecionada = configuracao.materiasSelecionadas.includes(materia.id)
                    return (
                      <button key={materia.id} onClick={() => selecionarMateria(materia.id)}
                        className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all active:scale-[0.97] min-h-[40px] flex items-center gap-1.5 ${
                          selecionada
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                            : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:border-gray-300'
                        }`}>
                        {selecionada && <Check className="h-3 w-3" />}
                        <span className="truncate max-w-[140px] sm:max-w-[200px]">{materia.nome}</span>
                        <span className="opacity-50 text-[10px]">{materia.questoes_count}</span>
                      </button>
                    )
                  })}
                </div>

                {materiasSelecionadasNomes.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {modoSelecaoMultipla ? `Selecionadas: ${materiasSelecionadasNomes.join(', ')}` : materiasSelecionadasNomes[0]}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 2. ASSUNTOS (se 1 matéria) */}
            {configuracao.materiasSelecionadas.length === 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-violet-500" />
                  Assuntos de {materias.find(m => m.id === configuracao.materiasSelecionadas[0])?.nome}
                </h3>
                <SeletorAssuntos
                  materiaId={configuracao.materiasSelecionadas[0]}
                  assuntosSelecionados={configuracao.assuntoIds}
                  onChange={(assuntos) => setConfiguracao({ ...configuracao, assuntoIds: assuntos })}
                />
              </div>
            )}

            {/* ==================== */}
            {/* 3. STATUS DAS QUESTÕES */}
            {/* ==================== */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Target className="h-4 w-4 text-violet-500" />
                  Status das Questões
                </h3>
              </div>
              <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                <div className="space-y-2">
                  {statusOptions.map(opt => (
                    <button key={opt.key}
                      onClick={() => setConfiguracao({ ...configuracao, statusQuestoes: opt.key })}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all active:scale-[0.99] min-h-[48px] ${
                        configuracao.statusQuestoes === opt.key
                          ? opt.cor === 'blue' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : opt.cor === 'violet' ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                            : opt.cor === 'red' ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}>
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{opt.emoji}</span>
                        <span className={`text-sm font-medium ${
                          configuracao.statusQuestoes === opt.key ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                        }`}>{opt.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${
                          configuracao.statusQuestoes === opt.key
                            ? opt.cor === 'blue' ? 'text-blue-600' : opt.cor === 'violet' ? 'text-violet-600' : opt.cor === 'red' ? 'text-red-600' : 'text-emerald-600'
                            : 'text-gray-500'
                        }`}>
                          {carregandoContador ? '...' : opt.count}
                        </span>
                        {configuracao.statusQuestoes === opt.key && (
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            opt.cor === 'blue' ? 'bg-blue-500' : opt.cor === 'violet' ? 'bg-violet-500' : opt.cor === 'red' ? 'bg-red-500' : 'bg-emerald-500'
                          }`}>
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ==================== */}
            {/* 4. MODO */}
            {/* ==================== */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Modo
                </h3>
              </div>
              <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button onClick={() => setConfiguracao({ ...configuracao, modoEstudo: 'normal', tempoLimiteMinutos: undefined })}
                    className={`relative p-4 rounded-xl border-2 transition-all active:scale-[0.97] text-center min-h-[88px] flex flex-col items-center justify-center gap-1.5 ${
                      configuracao.modoEstudo === 'normal'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500/30'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 bg-gray-50 dark:bg-gray-700/50'
                    }`}>
                    <span className="text-2xl">📚</span>
                    <span className={`text-sm font-semibold ${configuracao.modoEstudo === 'normal' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>Normal</span>
                    <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Feedback por questão</span>
                    {configuracao.modoEstudo === 'normal' && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </button>

                  <button onClick={() => setConfiguracao({ ...configuracao, modoEstudo: 'simulado', tempoLimiteMinutos: 60 })}
                    className={`relative p-4 rounded-xl border-2 transition-all active:scale-[0.97] text-center min-h-[88px] flex flex-col items-center justify-center gap-1.5 ${
                      configuracao.modoEstudo === 'simulado'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 ring-1 ring-red-500/30'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 bg-gray-50 dark:bg-gray-700/50'
                    }`}>
                    <span className="text-2xl">🎯</span>
                    <span className={`text-sm font-semibold ${configuracao.modoEstudo === 'simulado' ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'}`}>Simulado</span>
                    <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Prova com tempo</span>
                    {configuracao.modoEstudo === 'simulado' && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </button>
                </div>

                {configuracao.modoEstudo === 'simulado' && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                    <label className="block text-xs font-semibold text-red-800 dark:text-red-300 mb-2">⏱️ Tempo limite</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[30, 60, 90, 120].map((min) => (
                        <button key={min} onClick={() => setConfiguracao({ ...configuracao, tempoLimiteMinutos: min })}
                          className={`py-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.97] min-h-[40px] ${
                            configuracao.tempoLimiteMinutos === min
                              ? 'bg-red-600 text-white'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                          }`}>{min >= 60 ? `${min / 60}h` : `${min}min`}</button>
                      ))}
                    </div>
                    <p className="text-[10px] text-red-600 dark:text-red-400 mt-2">Respostas só reveladas no final.</p>
                  </div>
                )}
              </div>
            </div>

            {/* ==================== */}
            {/* 5. QUANTIDADE + ORDEM (compactos) */}
            {/* ==================== */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Hash className="h-4 w-4 text-emerald-500" />
                  Quantidade e Ordem
                </h3>
              </div>
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3">
                {/* Quantidade */}
                <div className="flex flex-wrap gap-2">
                  {[5, 10, 20, 50].map((num) => (
                    <button key={num} onClick={() => setConfiguracao({ ...configuracao, numeroQuestoes: num })}
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] min-h-[44px] ${
                        configuracao.numeroQuestoes === num
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                      }`}>{num}</button>
                  ))}
                  <button onClick={() => setConfiguracao({ ...configuracao, numeroQuestoes: 'todas' })}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] min-h-[44px] ${
                      configuracao.numeroQuestoes === 'todas'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                    }`}>Todas</button>
                </div>

                {/* Ordem */}
                <div className="flex gap-2">
                  <button onClick={() => setConfiguracao({ ...configuracao, embaralhar: false })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all active:scale-[0.97] text-sm font-medium min-h-[44px] ${
                      !configuracao.embaralhar ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                    }`}>
                    <ListOrdered className="h-4 w-4" /> Sequencial
                  </button>
                  <button onClick={() => setConfiguracao({ ...configuracao, embaralhar: true })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all active:scale-[0.97] text-sm font-medium min-h-[44px] ${
                      configuracao.embaralhar ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                    }`}>
                    <Shuffle className="h-4 w-4" /> Aleatório
                  </button>
                </div>
              </div>
            </div>

            {/* ==================== */}
            {/* 6. AVANÇADO (colapsável) */}
            {/* ==================== */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button onClick={() => setSecaoAvancadaAberta(!secaoAvancadaAberta)}
                className="w-full px-4 sm:px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors min-h-[52px]">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Avançado</span>
                </div>
                {secaoAvancadaAberta ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </button>
              
              {secaoAvancadaAberta && (
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Nome da Sessão</label>
                    <input type="text" value={configuracao.nomeSessao} onChange={(e) => setConfiguracao({ ...configuracao, nomeSessao: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 min-h-[44px]"
                      placeholder="Ex: Revisão Direito Penal" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Cor</label>
                    <div className="flex gap-2">
                      {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'].map((cor) => (
                        <button key={cor} onClick={() => setConfiguracao({ ...configuracao, corSessao: cor })}
                          className={`w-8 h-8 rounded-full transition-all min-w-[32px] ${configuracao.corSessao === cor ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800 scale-110' : 'hover:scale-110'}`}
                          style={{ backgroundColor: cor }} />
                      ))}
                    </div>
                  </div>

                  {/* Não salvar histórico */}
                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl cursor-pointer min-h-[48px]">
                    <input type="checkbox" checked={!configuracao.salvarHistorico}
                      onChange={(e) => setConfiguracao({ ...configuracao, salvarHistorico: !e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Não salvar no histórico</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block">Modo prática sem afetar estatísticas</span>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* ==================== */}
            {/* BOTÕES INICIAR + PDF (Desktop) */}
            {/* ==================== */}
            <div className="hidden sm:flex gap-3">
              <button onClick={iniciarSessao} disabled={loading || getQuestoesParaIniciar() === 0}
                className="flex-1 flex items-center justify-center gap-2.5 px-6 py-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base font-semibold shadow-lg shadow-emerald-600/20">
                {loading ? (
                  <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> Carregando...</>
                ) : (
                  <><Play className="h-5 w-5" /> {isAdmin ? 'Iniciar Teste' : 'Iniciar'} ({questoesDisponiveisLabel()} questões)</>
                )}
              </button>
              <button onClick={gerarPdf} disabled={gerandoPdf || loading}
                className="flex items-center justify-center gap-2 px-5 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 active:scale-[0.99] transition-all disabled:opacity-50 text-sm font-semibold">
                {gerandoPdf ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <FileDown className="h-5 w-5" />}
                PDF
              </button>
            </div>

            {/* Dica */}
            <div className="rounded-xl p-4 text-xs sm:text-sm bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400">
              <p className="font-medium mb-1">💡 Dica de Estudo</p>
              <p>Use o filtro "Não respondidas" para completar todas as questões de uma matéria. Depois use "Que eu errei" para revisar seus pontos fracos.</p>
            </div>

          </div>
        </div>

        {/* BOTÕES STICKY (Mobile) */}
        <div className="sm:hidden fixed bottom-0 inset-x-0 p-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 z-40">
          <div className="flex gap-2">
            <button onClick={iniciarSessao} disabled={loading || getQuestoesParaIniciar() === 0}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 text-sm font-semibold shadow-lg shadow-emerald-600/20">
              {loading ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Carregando...</>
              ) : (
                <><Play className="h-4 w-4" /> Iniciar ({questoesDisponiveisLabel()})</>
              )}
            </button>
            <button onClick={gerarPdf} disabled={gerandoPdf || loading}
              className="flex items-center justify-center gap-1.5 px-4 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 text-sm font-semibold">
              {gerandoPdf ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <FileDown className="h-4 w-4" />}
              PDF
            </button>
          </div>
        </div>

      </DashboardLayout>
    </ProtectedRoute>
  )
}