'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Settings, Trophy, Clock, Target, BarChart3, Infinity, Filter, Users, Zap, RefreshCw, BookOpen, Layers, ChevronDown, ChevronUp, X, Check, Shuffle, ListOrdered, Search, Sparkles, ArrowRight, RotateCcw, Hash, Flame, AlertTriangle, Eye, EyeOff, SlidersHorizontal } from 'lucide-react'
import { GerenciadorSessoes } from '@/components/GerenciadorSessoes'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthProvider'
import { ModoEstudo } from '@/components/ModoEstudo'
import { SeletorAssuntos } from '@/components/SeletorAssuntos'
import { getQuestoesParaEstudo, getEstatisticasEstudo, QuestaoEstudo } from '@/lib/estudo'
import { getMaterias, getMateriasComEstatisticas } from '@/lib/materias'
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
import { gerarPdfQuestoes } from '@/lib/gerarPdfQuestoes'
import { FileDown } from 'lucide-react'

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
  materiasSelecionadas?: string[]
  assuntoIds: string[]
  numeroQuestoes: number | 'todas'
  modoEstudo: 'normal' | 'revisao' | 'rapido' | 'simulado'
  tempoLimiteMinutos?: number
  salvarHistorico: boolean
  dificuldade?: 'facil' | 'medio' | 'dificil'
  anoProva?: number
  banca?: string
  apenasNaoRespondidas?: boolean
  apenasErradas?: boolean
  revisaoQuestoesDificeis?: boolean
  embaralhar?: boolean
  nomeSessao?: string
  corSessao?: string
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
    embaralhar: false,
    nomeSessao: '',
    corSessao: '#3B82F6'
  })
  const [temProgressoSalvo, setTemProgressoSalvo] = useState(false)
  const [resumoProgresso, setResumoProgresso] = useState<any>(null)
  const [carregandoProgresso, setCarregandoProgresso] = useState(false)
  const [carregandoDados, setCarregandoDados] = useState(true)

  const [buscaMateria, setBuscaMateria] = useState('')

  const [sessoes, setSessoes] = useState<any[]>([])
  const [carregandoSessoes, setCarregandoSessoes] = useState(false)
  const [showGerenciadorSessoes, setShowGerenciadorSessoes] = useState(false)
  const [showGerenciadorSessoesModal, setShowGerenciadorSessoesModal] = useState(false)
  
  // Novos estados para UX melhorada
  const [mostrarNovidade, setMostrarNovidade] = useState(false)
  const [secaoAvancadaAberta, setSecaoAvancadaAberta] = useState(false)
  const [showMateriasModal, setShowMateriasModal] = useState(false)
  const [animarResultado, setAnimarResultado] = useState(false)
  
  const [estatisticasFiltros, setEstatisticasFiltros] = useState({
    totalQuestoes: 0,
    naoRespondidas: 0,
    comErros: 0,
    dificeis: 0
  })
  
  const bottomRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    setConfiguracao(prev => ({
      ...prev,
      salvarHistorico: prev.modoEstudo !== 'rapido',
      tempoLimiteMinutos: prev.modoEstudo === 'simulado' ? (prev.tempoLimiteMinutos || 60) : undefined
    }))
  }, [configuracao.modoEstudo])

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
            setConfiguracao(dados.configuracao)
            setModo('estudando')
            localStorage.removeItem('estudo_questao_especifica')
            console.log('✅ Questão específica carregada:', dados.questoes[0].enunciado.substring(0, 50) + '...')
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

    // Verificar se já viu a novidade do PDF
    if (!localStorage.getItem('viu_novidade_pdf')) {
      setMostrarNovidade(true)
    }
  }, [])

  useEffect(() => {
    const atualizarEstatisticasFiltros = async () => {
      const materiasParaStats = configuracao.materiasSelecionadas && configuracao.materiasSelecionadas.length > 0 
        ? configuracao.materiasSelecionadas 
        : configuracao.materiaId

      const stats = await getEstatisticasFiltros(materiasParaStats)
      setEstatisticasFiltros(stats)
    }
    
    atualizarEstatisticasFiltros()
  }, [configuracao.materiasSelecionadas, configuracao.materiaId])

  // Limpar assuntos selecionados quando mudar de matéria ou selecionar múltiplas
  useEffect(() => {
    const qtd = configuracao.materiasSelecionadas?.length || 0
    if (qtd !== 1 && configuracao.assuntoIds.length > 0) {
      setConfiguracao(prev => ({...prev, assuntoIds: []}))
    }
  }, [configuracao.materiasSelecionadas])

  useEffect(() => {
    carregarSessoesAtivas()
  }, [])

  // Animar resultado quando entrar na tela
  useEffect(() => {
    if (modo === 'resultado') {
      setTimeout(() => setAnimarResultado(true), 100)
    } else {
      setAnimarResultado(false)
    }
  }, [modo])

  const filtrarQuestoesRevisao = async (questoes: QuestaoEstudo[]): Promise<QuestaoEstudo[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('Usuário não logado, usando questões normais')
        return questoes
      }
  
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
        for (let i = questoes.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [questoes[i], questoes[j]] = [questoes[j], questoes[i]]
        }
        return questoes
      }
  
      const questoesErradasIds = [...new Set(historico.map(h => h.questao_id))]
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
  
      setConfiguracao(progresso.configuracao)
      
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
  
      const dadosRestauracao = {
        questoes: questoesFormatadas,
        questaoAtual: progresso.questao_atual,
        respostasAnteriores: Array.isArray(progresso.respostas) ? progresso.respostas : [],
        tempoInicio: new Date(progresso.tempo_inicio).getTime()
      }
  
      console.log('🔄 Dados para restauração:', dadosRestauracao)
  
      setQuestoes(questoesFormatadas)
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
      await abandonarSessao()
      setTemProgressoSalvo(false)
      setResumoProgresso(null)
      await iniciarSessao()
    } catch (error) {
      console.error('Erro ao iniciar nova sessão:', error)
    }
  }

  const carregarDados = async () => {
    console.log('Carregando dados do estudar...')
    setCarregandoDados(true)
    
    try {
      const [materiasData, statsData] = await Promise.all([
        getMateriasComEstatisticas(),
        getEstatisticasEstudo()
      ])
      
      setMaterias(materiasData)
      setEstatisticas(statsData)
      
      if (configuracao.materiaId) {
        const statsFiltros = await getEstatisticasFiltros(configuracao.materiaId)
        setEstatisticasFiltros(statsFiltros)
      }
      
      console.log('✅ Dados carregados:', { materias: materiasData.length })
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error)
    } finally {
      setCarregandoDados(false)
    }
  }

  const getQuestoesDisponiveis = async (): Promise<number> => {
    try {
      let query = supabase.from('questoes').select('id', { count: 'exact' })

      if (configuracao.materiasSelecionadas && configuracao.materiasSelecionadas.length > 0) {
        query = query.in('materia_id', configuracao.materiasSelecionadas)
      } else if (configuracao.materiaId) {
        query = query.eq('materia_id', configuracao.materiaId)
      }
    
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

  const [gerandoPdf, setGerandoPdf] = useState(false)

  const fecharNovidade = () => {
    setMostrarNovidade(false)
    localStorage.setItem('viu_novidade_pdf', 'true')
  }

  const gerarPdf = async () => {
    setGerandoPdf(true)
    try {
      const materiasParaBusca = configuracao.materiasSelecionadas && configuracao.materiasSelecionadas.length > 0
        ? configuracao.materiasSelecionadas
        : configuracao.materiaId

      const limite = configuracao.numeroQuestoes === 'todas' 
        ? undefined 
        : configuracao.numeroQuestoes as number

      const questoesData = await getQuestoesParaEstudo(materiasParaBusca, limite, undefined, {
        assuntoIds: configuracao.assuntoIds,
        dificuldade: configuracao.dificuldade,
        anoProva: configuracao.anoProva,
        banca: configuracao.banca,
        apenasNaoRespondidas: configuracao.apenasNaoRespondidas,
        apenasErradas: configuracao.apenasErradas,
        revisaoQuestoesDificeis: configuracao.revisaoQuestoesDificeis,
        embaralhar: configuracao.embaralhar
      })

      if (questoesData.length === 0) {
        alert('Nenhuma questão encontrada para os filtros selecionados.')
        return
      }

      const nomesM = (configuracao.materiasSelecionadas || [])
        .map(id => materias.find(m => m.id === id)?.nome)
        .filter(Boolean) as string[]

      // Buscar dados do usuário logado
      const { data: { user: authUser } } = await supabase.auth.getUser()
      let dadosUsuario: { nome: string; cpf?: string; pelotao?: string } | undefined

      if (authUser) {
        const { data: perfil } = await supabase
          .from('usuarios')
          .select('nome_completo, nome, cpf, pelotao')
          .eq('id', authUser.id)
          .single()

        if (perfil) {
          dadosUsuario = {
            nome: perfil.nome_completo || perfil.nome || '',
            cpf: perfil.cpf || undefined,
            pelotao: perfil.pelotao || undefined
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
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setGerandoPdf(false)
    }
  }

  const iniciarSessao = async () => {
    setLoading(true)
    
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
    
    let questoesData: QuestaoEstudo[] = []

    const materiasParaBusca = configuracao.materiasSelecionadas && configuracao.materiasSelecionadas.length > 0 
      ? configuracao.materiasSelecionadas 
      : configuracao.materiaId

    questoesData = await getQuestoesParaEstudo(materiasParaBusca, limite, undefined, {
      assuntoIds: configuracao.assuntoIds,
      dificuldade: configuracao.dificuldade,
      anoProva: configuracao.anoProva,
      banca: configuracao.banca,
      apenasNaoRespondidas: configuracao.apenasNaoRespondidas,
      apenasErradas: configuracao.apenasErradas,
      revisaoQuestoesDificeis: configuracao.revisaoQuestoesDificeis,
      embaralhar: configuracao.embaralhar
    })
    
    console.log('Questões encontradas:', questoesData)
    
    if (questoesData.length === 0) {
      alert('Nenhuma questão encontrada para os critérios selecionados.')
      setLoading(false)
      return
    }
    
    switch (configuracao.modoEstudo) {
      case 'revisao':
        questoesData = await filtrarQuestoesRevisao(questoesData)
        break
        
      case 'rapido':
        console.log('Modo rápido: não salvará histórico')
        break
        
      case 'normal':
      default:
        console.log('Modo normal: questões processadas')
        break
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

  const carregarSessoesAtivas = async () => {
    try {
      setCarregandoSessoes(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
  
      const { data: sessoesData, error } = await supabase
        .from('progresso_sessao')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('finalizada', false)
        .order('ultima_atividade', { ascending: false })
        .limit(10)
  
      if (error) {
        console.error('Erro ao carregar sessões:', error)
        return
      }
  
      setSessoes(sessoesData || [])
    } catch (error) {
      console.error('Erro inesperado ao carregar sessões:', error)
    } finally {
      setCarregandoSessoes(false)
    }
  }
  
  const continuarSessao = async (sessao: any) => {
    try {
      const { data: questoesData, error } = await supabase
        .from('questoes')
        .select(`
          id,
          enunciado,
          tipo,
          explicacao,
          resposta_certo_errado,
          imagem_url,
          imagem_nome,
          materias!inner(nome),
          assuntos(id, nome, cor),
          alternativas(id, texto, correta)
        `)
        .in('id', sessao.questoes_ids)
  
      if (error || !questoesData) {
        alert('Erro ao carregar questões da sessão.')
        return
      }
  
      const questoesOrdenadas = sessao.questoes_ids.map((id: string) => 
        questoesData.find(q => q.id === id)
      ).filter(Boolean)
  
      const questoesFormatadas = questoesOrdenadas.map((item: any) => ({
        id: item.id,
        enunciado: item.enunciado,
        tipo: item.tipo,
        explicacao: item.explicacao,
        resposta_certo_errado: item.resposta_certo_errado,
        imagem_url: item.imagem_url,
        imagem_nome: item.imagem_nome,
        materia: { nome: item.materias?.nome || 'Sem matéria' },
        assunto: item.assuntos ? {
          id: item.assuntos.id,
          nome: item.assuntos.nome,
          cor: item.assuntos.cor
        } : undefined,
        alternativas: item.alternativas || []
      }))
  
      const dadosRestauracao = {
        questoes: questoesFormatadas,
        questaoAtual: sessao.questao_atual,
        respostasAnteriores: Array.isArray(sessao.respostas) ? sessao.respostas : [],
        tempoInicio: new Date(sessao.tempo_inicio).getTime(),
        sessaoId: sessao.id
      }
  
      setQuestoes(questoesFormatadas)
      setConfiguracao(sessao.configuracao)
      localStorage.setItem('sessao_restauracao', JSON.stringify(dadosRestauracao))
      setModo('estudando')
      setShowGerenciadorSessoes(false)
      
    } catch (error) {
      console.error('Erro ao continuar sessão:', error)
      alert('Erro inesperado ao continuar sessão.')
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
        alert('Erro ao excluir sessão.')
        return
      }

      await carregarSessoesAtivas()
    } catch (error) {
      console.error('Erro inesperado ao excluir sessão:', error)
      alert('Erro inesperado.')
    }
  }

  const formatarTempo = (ms: number) => {
    const segundos = Math.floor(ms / 1000)
    const minutos = Math.floor(segundos / 60)
    const seg = segundos % 60
    return `${minutos}:${seg.toString().padStart(2, '0')}`
  }

  const getModoEstudoInfo = (modo: string) => {
    const modos = {
      'normal': { nome: 'Normal', desc: 'Estudo com feedback', icon: '📚', cor: 'blue' },
      'revisao': { nome: 'Revisão', desc: 'Questões que errou', icon: '🔄', cor: 'orange' },
      'rapido': { nome: 'Rápido', desc: 'Sem salvar histórico', icon: '⚡', cor: 'yellow' },
      'simulado': { nome: 'Simulado', desc: 'Prova real com tempo', icon: '🎯', cor: 'red' }
    }
    
    return modos[modo as keyof typeof modos] || modos['normal']
  }

  // Helpers para UI
  const totalQuestoesDisp = materias.reduce((total, m) => total + (m.questoes_count || 0), 0)
  
  const materiasSelecionadasNomes = (configuracao.materiasSelecionadas || [])
    .map(id => materias.find(m => m.id === id)?.nome)
    .filter(Boolean)

  const toggleMateria = (materiaId: string) => {
    const selecionadas = configuracao.materiasSelecionadas || []
    if (selecionadas.includes(materiaId)) {
      setConfiguracao({
        ...configuracao,
        materiasSelecionadas: selecionadas.filter(id => id !== materiaId)
      })
    } else {
      setConfiguracao({
        ...configuracao,
        materiasSelecionadas: [...selecionadas, materiaId]
      })
    }
  }

  // =============================================
  // MODO ESTUDANDO
  // =============================================
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
            
            {/* Card principal do resultado */}
            <div className={`relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg transition-all duration-700 ${animarResultado ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              {/* Barra de cor superior */}
              <div className={`h-1.5 ${
                corPrincipal === 'emerald' ? 'bg-emerald-500' : corPrincipal === 'amber' ? 'bg-amber-500' : 'bg-red-500'
              }`} />
              
              <div className="p-6 sm:p-8 lg:p-10 text-center">
                <div className={`text-6xl sm:text-7xl mb-3 transition-all duration-700 delay-200 ${animarResultado ? 'scale-100' : 'scale-50'}`}>
                  {emoji}
                </div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {isAdmin ? 'Teste Finalizado!' : mensagem}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                  {resultado.acertos} de {resultado.totalQuestoes} questões corretas
                </p>
                
                {/* Percentual grande */}
                <div className={`mt-6 mb-2 transition-all duration-700 delay-300 ${animarResultado ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
                  <div className={`inline-flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-full border-4 ${
                    corPrincipal === 'emerald' ? 'border-emerald-200 dark:border-emerald-800' : 
                    corPrincipal === 'amber' ? 'border-amber-200 dark:border-amber-800' : 
                    'border-red-200 dark:border-red-800'
                  }`}>
                    <div>
                      <div className={`text-3xl sm:text-4xl lg:text-5xl font-bold ${
                        corPrincipal === 'emerald' ? 'text-emerald-600' : 
                        corPrincipal === 'amber' ? 'text-amber-600' : 
                        'text-red-600'
                      }`}>
                        {resultado.percentual}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 -mt-0.5">acertos</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid de métricas */}
            <div className={`grid grid-cols-3 lg:grid-cols-3 gap-3 lg:gap-4 transition-all duration-500 delay-400 ${animarResultado ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6 text-center">
                <Trophy className="h-5 w-5 lg:h-6 lg:w-6 text-emerald-500 mx-auto mb-1.5" />
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{resultado.acertos}</div>
                <div className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">Acertos</div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6 text-center">
                <Clock className="h-5 w-5 lg:h-6 lg:w-6 text-blue-500 mx-auto mb-1.5" />
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{formatarTempo(resultado.tempo)}</div>
                <div className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">Tempo</div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6 text-center">
                <Zap className="h-5 w-5 lg:h-6 lg:w-6 text-amber-500 mx-auto mb-1.5" />
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(resultado.tempo / resultado.totalQuestoes / 1000)}s
                </div>
                <div className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">Média/Q</div>
              </div>
            </div>

            {/* Detalhes */}
            <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 transition-all duration-500 delay-500 ${animarResultado ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gray-400" />
                Detalhes
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Modo</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getModoEstudoInfo(configuracao.modoEstudo).icon} {getModoEstudoInfo(configuracao.modoEstudo).nome}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Matéria</span>
                  <span className="font-medium text-gray-900 dark:text-white truncate ml-2">
                    {configuracao.materiasSelecionadas && configuracao.materiasSelecionadas.length > 0
                      ? `${configuracao.materiasSelecionadas.length} matéria(s)`
                      : configuracao.materiaId 
                        ? materias.find(m => m.id === configuracao.materiaId)?.nome 
                        : 'Todas'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Erros</span>
                  <span className="font-medium text-red-500">{resultado.erros}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Ordem</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {configuracao.embaralhar ? '🎲 Aleatória' : '📋 Sequencial'}
                  </span>
                </div>
              </div>
            </div>

            {/* Botões de ação */}
            <div className={`flex flex-col sm:flex-row gap-3 transition-all duration-500 delay-600 ${animarResultado ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <button
                onClick={novaSessionao}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 lg:py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all font-medium lg:text-lg"
              >
                <RefreshCw className="h-4 w-4 lg:h-5 lg:w-5" />
                Nova Sessão
              </button>
              <button
                onClick={() => setModo('configuracao')}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 lg:py-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-[0.98] transition-all font-medium lg:text-lg"
              >
                <Settings className="h-4 w-4" />
                Reconfigurar
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
        <div className="max-w-2xl lg:max-w-6xl mx-auto pb-28 sm:pb-6">
          <div className="space-y-4 sm:space-y-5 px-1">
            
            {/* Header compacto */}
            <div className={`rounded-2xl p-5 sm:p-6 lg:p-8 text-white relative overflow-hidden ${
              isAdmin 
                ? 'bg-gradient-to-br from-violet-600 to-indigo-700'
                : 'bg-gradient-to-br from-blue-600 to-cyan-600'
            }`}>
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1">
                      {isAdmin ? 'Modo Teste' : 'Nova Sessão de Estudo'}
                    </h2>
                    <p className="text-sm lg:text-base opacity-80">
                      {isAdmin 
                        ? 'Teste questões sem afetar estatísticas'
                        : 'Configure e inicie sua sessão personalizada'
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-lg px-3 py-1.5 lg:px-4 lg:py-2 text-sm">
                      <BookOpen className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                      <span className="font-medium">{totalQuestoesDisp}</span>
                      <span className="opacity-80">questões</span>
                    </div>
                    {!isAdmin && estatisticas && estatisticas.totalRespostas > 0 && (
                      <div className="hidden lg:inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-lg px-4 py-2 text-sm">
                        <Target className="h-4 w-4" />
                        <span className="font-medium">{estatisticas.percentualAcertos}%</span>
                        <span className="opacity-80">acertos</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Decoração sutil */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full" />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />
            </div>

            {/* Banner novidade PDF */}
            {mostrarNovidade && (
              <div className="rounded-2xl border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-4 sm:p-5 relative overflow-hidden">
                <button
                  onClick={fecharNovidade}
                  className="absolute top-3 right-3 p-1 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex items-start gap-3">
                  <span className="text-3xl">🖨️</span>
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-200 text-sm sm:text-base">
                      Novidade: Gerar PDF das questões!
                    </h3>
                    <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-400 mt-1">
                      Agora você pode imprimir suas questões! Selecione matérias, filtros e quantidade, depois clique no botão <strong>PDF</strong> ao lado do Iniciar. O documento vem com espaço para marcar respostas, gabarito e explicações no final.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Sessão em andamento */}
            {temProgressoSalvo && resumoProgresso && (
              <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
                    <Flame className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-amber-900 dark:text-amber-200 text-sm sm:text-base">
                      Sessão em andamento
                    </h3>
                    <div className="mt-1.5 text-xs sm:text-sm text-amber-700 dark:text-amber-400 space-y-0.5">
                      <p>Questão {resumoProgresso.questaoAtual} de {resumoProgresso.questoesTotais} · {resumoProgresso.respostasFeitas} respostas · {resumoProgresso.tempoDecorrido}</p>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={continuarSessaoSalva}
                        disabled={carregandoProgresso}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 active:scale-[0.98] transition-all text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
                      >
                        {carregandoProgresso ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        Continuar
                      </button>
                      <button
                        onClick={iniciarNovaSessao}
                        disabled={carregandoProgresso}
                        className="px-4 py-2.5 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/30 active:scale-[0.98] transition-all text-sm font-medium disabled:opacity-50 min-h-[44px]"
                      >
                        Nova
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Progresso do usuário (compacto) */}
            {!isAdmin && estatisticas && estatisticas.totalRespostas > 0 && (
              <div className="grid grid-cols-3 lg:grid-cols-3 gap-2.5 lg:gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 lg:p-5 text-center">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{estatisticas.totalRespostas}</div>
                  <div className="text-[10px] sm:text-xs lg:text-sm text-gray-500 dark:text-gray-400 mt-0.5">Respondidas</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 lg:p-5 text-center">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-600">{estatisticas.acertos}</div>
                  <div className="text-[10px] sm:text-xs lg:text-sm text-gray-500 dark:text-gray-400 mt-0.5">Acertos</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 lg:p-5 text-center">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-violet-600">{estatisticas.percentualAcertos}%</div>
                  <div className="text-[10px] sm:text-xs lg:text-sm text-gray-500 dark:text-gray-400 mt-0.5">Taxa</div>
                </div>
              </div>
            )}

            {/* ==================== */}
            {/* GRID RESPONSIVO: 2 colunas em telas grandes */}
            {/* ==================== */}
            <div className="lg:grid lg:grid-cols-2 lg:gap-5 space-y-4 sm:space-y-5 lg:space-y-0">
              
              {/* COLUNA ESQUERDA */}
              <div className="space-y-4 sm:space-y-5">

            {/* ==================== */}
            {/* SEÇÃO: Modo de Estudo */}
            {/* ==================== */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6 pb-3">
                <h3 className="text-sm lg:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Modo de Estudo
                </h3>
              </div>
              <div className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {(['normal', 'revisao', 'rapido', 'simulado'] as const).map((m) => {
                    const info = getModoEstudoInfo(m)
                    const selecionado = configuracao.modoEstudo === m
                    return (
                      <button
                        key={m}
                        onClick={() => setConfiguracao({...configuracao, modoEstudo: m})}
                        className={`relative p-3 sm:p-4 rounded-xl border-2 transition-all active:scale-[0.97] text-center min-h-[88px] sm:min-h-[100px] flex flex-col items-center justify-center gap-1.5 ${
                          selecionado
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500/30'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-700/50'
                        }`}
                      >
                        <span className="text-2xl">{info.icon}</span>
                        <span className={`text-xs sm:text-sm font-semibold ${selecionado ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                          {info.nome}
                        </span>
                        <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 leading-tight hidden sm:block lg:text-xs">
                          {info.desc}
                        </span>
                        {selecionado && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <Check className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
                {/* Configuração de tempo para Simulado */}
                {configuracao.modoEstudo === 'simulado' && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                    <label className="block text-xs font-semibold text-red-800 dark:text-red-300 mb-2">
                      ⏱️ Tempo limite do simulado
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[30, 60, 90, 120].map((min) => (
                        <button
                          key={min}
                          onClick={() => setConfiguracao({...configuracao, tempoLimiteMinutos: min})}
                          className={`py-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.97] min-h-[40px] ${
                            configuracao.tempoLimiteMinutos === min
                              ? 'bg-red-600 text-white'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          {min >= 60 ? `${min / 60}h` : `${min}min`}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-red-700 dark:text-red-400">Outro:</span>
                      <input
                        type="number"
                        min="5"
                        max="300"
                        value={configuracao.tempoLimiteMinutos && ![30, 60, 90, 120].includes(configuracao.tempoLimiteMinutos) ? configuracao.tempoLimiteMinutos : ''}
                        onChange={(e) => {
                          const v = parseInt(e.target.value)
                          if (v > 0) setConfiguracao({...configuracao, tempoLimiteMinutos: v})
                        }}
                        placeholder="min"
                        className="w-20 px-3 py-1.5 border border-red-200 dark:border-red-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      <span className="text-xs text-red-600 dark:text-red-400">minutos</span>
                    </div>
                    <p className="text-[10px] text-red-600 dark:text-red-400 mt-2">
                      Respostas só serão reveladas no final. Quando o tempo acabar, o simulado finaliza automaticamente.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ==================== */}
            {/* SEÇÃO: Matérias */}
            {/* ==================== */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6 pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm lg:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    Matérias
                  </h3>
                  {(configuracao.materiasSelecionadas || []).length > 0 && (
                    <button
                      onClick={() => setConfiguracao({...configuracao, materiasSelecionadas: []})}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Limpar ({(configuracao.materiasSelecionadas || []).length})
                    </button>
                  )}
                </div>
              </div>
              <div className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                {/* Chip "Todas" */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    onClick={() => setConfiguracao({...configuracao, materiasSelecionadas: []})}
                    className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all active:scale-[0.97] min-h-[40px] flex items-center gap-1.5 ${
                      (configuracao.materiasSelecionadas || []).length === 0
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    📚 Todas
                    <span className="opacity-70">({totalQuestoesDisp})</span>
                  </button>
                </div>

                {/* Busca de matérias */}
                {materias.length > 5 && (
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar matéria..."
                      value={buscaMateria}
                      onChange={(e) => setBuscaMateria(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 min-h-[44px]"
                    />
                    {buscaMateria && (
                      <button
                        onClick={() => setBuscaMateria('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* Lista de matérias como chips */}
                <div className="flex flex-wrap gap-2 max-h-48 lg:max-h-72 overflow-y-auto">
                  {materias
                    .filter(m => !buscaMateria || m.nome.toLowerCase().includes(buscaMateria.toLowerCase()))
                    .map((materia) => {
                      const selecionada = (configuracao.materiasSelecionadas || []).includes(materia.id)
                      return (
                        <button
                          key={materia.id}
                          onClick={() => toggleMateria(materia.id)}
                          className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all active:scale-[0.97] min-h-[40px] flex items-center gap-1.5 ${
                            selecionada
                              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                              : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          {selecionada && <Check className="h-3 w-3" />}
                          <span className="truncate max-w-[140px] sm:max-w-[200px] lg:max-w-[280px]">{materia.nome}</span>
                          <span className="opacity-50 text-[10px]">{materia.questoes_count}</span>
                        </button>
                      )
                    })
                  }
                </div>

                {/* Matérias selecionadas (resumo) */}
                {materiasSelecionadasNomes.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Selecionadas: {materiasSelecionadasNomes.join(', ')}
                    </p>
                    {materiasSelecionadasNomes.length === 1 && (
                      <p className="text-xs text-violet-500 dark:text-violet-400 mt-1">
                        💡 Com 1 matéria selecionada, você pode filtrar por assuntos abaixo
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Seleção de Assuntos — aparece quando UMA matéria está selecionada */}
            {configuracao.materiasSelecionadas && configuracao.materiasSelecionadas.length === 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 lg:p-6">
                <h3 className="text-sm lg:text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-violet-500" />
                  Assuntos de {materias.find(m => m.id === configuracao.materiasSelecionadas![0])?.nome || 'Matéria'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Filtre por assuntos específicos dentro da matéria selecionada
                </p>
                <SeletorAssuntos
                  materiaId={configuracao.materiasSelecionadas[0]}
                  assuntosSelecionados={configuracao.assuntoIds}
                  onChange={(assuntos) => setConfiguracao({...configuracao, assuntoIds: assuntos})}
                />
              </div>
            )}

              </div>{/* FIM COLUNA ESQUERDA */}
              
              {/* COLUNA DIREITA */}
              <div className="space-y-4 sm:space-y-5">

            {/* ==================== */}
            {/* SEÇÃO: Quantidade */}
            {/* ==================== */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6 pb-3">
                <h3 className="text-sm lg:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Hash className="h-4 w-4 text-emerald-500" />
                  Quantidade de Questões
                </h3>
              </div>
              <div className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                <div className="grid grid-cols-5 gap-2">
                  {[5, 10, 20, 50].map((num) => (
                    <button
                      key={num}
                      onClick={() => setConfiguracao({...configuracao, numeroQuestoes: num})}
                      className={`py-3 rounded-xl text-sm sm:text-base font-semibold transition-all active:scale-[0.97] min-h-[48px] ${
                        configuracao.numeroQuestoes === num
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={() => setConfiguracao({...configuracao, numeroQuestoes: 'todas'})}
                    className={`py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-[0.97] min-h-[48px] ${
                      configuracao.numeroQuestoes === 'todas'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Todas
                  </button>
                </div>
                {/* Input customizado */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Outro:</span>
                  <input
                    type="number"
                    min="1"
                    value={typeof configuracao.numeroQuestoes === 'number' && ![5,10,20,50].includes(configuracao.numeroQuestoes) ? configuracao.numeroQuestoes : ''}
                    onChange={(e) => {
                      const value = parseInt(e.target.value)
                      if (value > 0) {
                        setConfiguracao({...configuracao, numeroQuestoes: value})
                      }
                    }}
                    placeholder="Nº"
                    className="w-20 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 min-h-[40px]"
                  />
                </div>
              </div>
            </div>

            {/* ==================== */}
            {/* SEÇÃO: Ordem */}
            {/* ==================== */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6 pb-3">
                <h3 className="text-sm lg:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Shuffle className="h-4 w-4 text-violet-500" />
                  Ordem das Questões
                </h3>
              </div>
              <div className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    onClick={() => setConfiguracao({...configuracao, embaralhar: false})}
                    className={`p-3 sm:p-4 rounded-xl border-2 transition-all active:scale-[0.97] text-center min-h-[64px] flex flex-col items-center justify-center gap-1 ${
                      !configuracao.embaralhar
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:border-gray-300'
                    }`}
                  >
                    <ListOrdered className={`h-5 w-5 ${!configuracao.embaralhar ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`text-xs sm:text-sm font-medium ${!configuracao.embaralhar ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>
                      Sequencial
                    </span>
                  </button>
                  <button
                    onClick={() => setConfiguracao({...configuracao, embaralhar: true})}
                    className={`p-3 sm:p-4 rounded-xl border-2 transition-all active:scale-[0.97] text-center min-h-[64px] flex flex-col items-center justify-center gap-1 ${
                      configuracao.embaralhar
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                        : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:border-gray-300'
                    }`}
                  >
                    <Shuffle className={`h-5 w-5 ${configuracao.embaralhar ? 'text-violet-600' : 'text-gray-400'}`} />
                    <span className={`text-xs sm:text-sm font-medium ${configuracao.embaralhar ? 'text-violet-700 dark:text-violet-300' : 'text-gray-600 dark:text-gray-400'}`}>
                      Aleatório
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* ==================== */}
            {/* SEÇÃO: Filtros Inteligentes */}
            {/* ==================== */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6 pb-4 sm:pb-5">
                <FiltrosInteligentes
                  filtros={{
                    apenasNaoRespondidas: configuracao.apenasNaoRespondidas || false,
                    apenasErradas: configuracao.apenasErradas || false,
                    revisaoQuestoesDificeis: configuracao.revisaoQuestoesDificeis || false
                  }}
                  onChange={(novosFiltros) => setConfiguracao({...configuracao, ...novosFiltros})}
                  estatisticas={estatisticasFiltros}
                />
              </div>
            </div>

            {/* ==================== */}
            {/* SEÇÃO: Configurações Avançadas (Colapsável) */}
            {/* ==================== */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                onClick={() => setSecaoAvancadaAberta(!secaoAvancadaAberta)}
                className="w-full px-4 sm:px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors min-h-[52px]"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Configurações Avançadas</span>
                </div>
                {secaoAvancadaAberta ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>
              
              {secaoAvancadaAberta && (
                <div className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6 space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                  {/* Nome da sessão */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                      Nome da Sessão
                    </label>
                    <input
                      type="text"
                      value={configuracao.nomeSessao || ''}
                      onChange={(e) => setConfiguracao({...configuracao, nomeSessao: e.target.value})}
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 min-h-[44px]"
                      placeholder={
                        configuracao.materiasSelecionadas && configuracao.materiasSelecionadas.length > 0
                          ? `Estudo - ${configuracao.materiasSelecionadas.length} matérias`
                          : "Ex: Revisão Direito Civil"
                      }
                    />
                  </div>

                  {/* Cor da sessão */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                      Cor de Identificação
                    </label>
                    <div className="flex gap-2">
                      {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'].map((cor) => (
                        <button
                          key={cor}
                          onClick={() => setConfiguracao({...configuracao, corSessao: cor})}
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full transition-all min-w-[32px] ${
                            configuracao.corSessao === cor 
                              ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800 scale-110' 
                              : 'hover:scale-110'
                          }`}
                          style={{ backgroundColor: cor }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Opções de Admin */}
                  {isAdmin && (
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                      <label className="flex items-center gap-3 p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl cursor-pointer min-h-[48px]">
                        <input
                          type="checkbox"
                          checked={!configuracao.salvarHistorico}
                          onChange={(e) => setConfiguracao({...configuracao, salvarHistorico: !e.target.checked})}
                          className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-violet-800 dark:text-violet-300">
                            Modo teste
                          </span>
                          <span className="text-xs text-violet-600 dark:text-violet-400 block">
                            Não salvar no histórico
                          </span>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

              </div>{/* FIM COLUNA DIREITA */}
            </div>{/* FIM GRID RESPONSIVO */}

            {/* ==================== */}
            {/* Resumo da Sessão */}
            {/* ==================== */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 lg:p-6">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Resumo da Sessão
              </h4>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                  {getModoEstudoInfo(configuracao.modoEstudo).icon} {getModoEstudoInfo(configuracao.modoEstudo).nome}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                  📚 {(configuracao.materiasSelecionadas || []).length > 0 ? `${(configuracao.materiasSelecionadas || []).length} matéria(s)` : 'Todas'}
                </span>
                {configuracao.assuntoIds.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 dark:bg-violet-900/20 rounded-lg text-xs font-medium text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700">
                    📑 {configuracao.assuntoIds.length} assunto(s)
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                  🔢 {configuracao.numeroQuestoes === 'todas' ? 'Todas' : configuracao.numeroQuestoes} questões
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                  {configuracao.embaralhar ? '🎲 Aleatório' : '📋 Sequencial'}
                </span>
                {configuracao.nomeSessao?.trim() && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                    🏷️ {configuracao.nomeSessao.trim()}
                  </span>
                )}
                {isAdmin && !configuracao.salvarHistorico && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs font-medium text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                    🧪 Modo teste
                  </span>
                )}
              </div>
            </div>

            {/* Gerenciar sessões (link, não botão grande) */}
            <button
              onClick={() => setShowGerenciadorSessoesModal(true)}
              className="w-full flex items-center justify-between px-4 py-3.5 lg:px-5 lg:py-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors min-h-[52px] group"
            >
              <div className="flex items-center gap-2.5">
                <Layers className="h-4 w-4 text-violet-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isAdmin ? 'Gerenciar Testes' : 'Gerenciar Sessões'}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* ==================== */}
            {/* Botões INICIAR + PDF (Desktop) */}
            {/* ==================== */}
            <div className="hidden sm:flex gap-3">
              <button
                onClick={iniciarSessao}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2.5 px-6 py-4 lg:py-5 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base lg:text-lg font-semibold shadow-lg shadow-emerald-600/20"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    Carregando questões...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    {isAdmin ? 'Iniciar Teste' : 'Iniciar Sessão'}
                  </>
                )}
              </button>
              <button
                onClick={gerarPdf}
                disabled={gerandoPdf || loading}
                className="flex items-center justify-center gap-2 px-5 py-4 lg:py-5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base font-semibold"
                title="Gerar PDF para impressão"
              >
                {gerandoPdf ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                ) : (
                  <FileDown className="h-5 w-5" />
                )}
                PDF
              </button>
            </div>

            {/* Dicas (simplificadas) */}
            <div className={`rounded-xl p-4 lg:p-5 text-xs sm:text-sm ${
              isAdmin 
                ? 'bg-violet-50 dark:bg-violet-900/10 text-violet-700 dark:text-violet-400'
                : 'bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400'
            }`}>
              <p className="font-medium mb-1.5">💡 {isAdmin ? 'Dica de Teste' : 'Dica de Estudo'}</p>
              <p>
                {isAdmin 
                  ? 'Use o modo teste para verificar questões sem afetar estatísticas. Teste diferentes filtros para validar o conteúdo.'
                  : 'Comece com sessões curtas de 10 questões. Use o modo revisão para focar nas que errou. Estude regularmente para melhores resultados.'
                }
              </p>
            </div>

          </div>
        </div>

        {/* ==================== */}
        {/* Botões INICIAR + PDF Sticky (Mobile) */}
        {/* ==================== */}
        <div className="sm:hidden fixed bottom-0 inset-x-0 p-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 z-40">
          <div className="flex gap-2">
            <button
              onClick={iniciarSessao}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base font-semibold shadow-lg shadow-emerald-600/20"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Carregando...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  {isAdmin ? 'Iniciar Teste' : 'Iniciar'}
                </>
              )}
            </button>
            <button
              onClick={gerarPdf}
              disabled={gerandoPdf || loading}
              className="flex items-center justify-center gap-1.5 px-4 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 text-sm font-semibold"
            >
              {gerandoPdf ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              PDF
            </button>
          </div>
        </div>

        {/* Modal Gerenciador de Sessões */}
        <GerenciadorSessoes
          isOpen={showGerenciadorSessoesModal}
          onClose={() => setShowGerenciadorSessoesModal(false)}
          onContinuarSessao={(sessao) => {
            console.log('Continuar sessão:', sessao)
            continuarSessao(sessao)
          }}
          onNovaSessao={() => {
            setShowGerenciadorSessoesModal(false)
          }}
        />
      </DashboardLayout>
    </ProtectedRoute>
  )
}