'use client'

import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthProvider'
import { getEstatisticasEstudo, zerarEstatisticasUsuario } from '@/lib/estudo'
import { getMateriasComEstatisticas } from '@/lib/materias'
import { 
  TrendingUp, TrendingDown, Clock, Target, BookOpen, Zap, Users, Settings, 
  Plus, BarChart3, AlertCircle, CheckCircle, Trash2, RefreshCw, Calendar,
  Award, Flame, Brain, Trophy, Star, Activity, Smartphone, Globe, Shield,
  ChevronRight, Play, Pause, RotateCcw, Eye, Download, Upload, Bell,
  Timer, Medal, Crown, Sparkles, ArrowRight
} from 'lucide-react'
import Link from 'next/link'

interface EstatisticasDashboard {
  totalRespostas: number
  acertos: number
  percentualAcertos: number
  porMateria: Record<string, { total: number; acertos: number; percentual: number }>
  sequenciaAtual: number
  melhorSequencia: number
  tempoMedioResposta: number
  ultimaAtividade: string
  questoesHoje: number
  tempoEstudoHoje: number
  diasConsecutivos: number
}

interface MetaEstudo {
  questoesDiarias: number
  questoesSemanais: number
  tempoMinimoMinutos: number
  diasConsecutivos: number
  metaDiariaAlcancada: boolean
  metaSemanalAlcancada: boolean
  progressoDiario: number
  progressoSemanal: number
}

interface AtividadeRecente {
  id: string
  tipo: 'questao' | 'sessao' | 'meta'
  descricao: string
  timestamp: string
  resultado?: 'acerto' | 'erro'
  materia?: string
}

interface Conquista {
  id: string
  nome: string
  descricao: string
  icone: string
  desbloqueada: boolean
  progresso: number
  meta: number
}

interface AlertaInteligente {
  id: string
  tipo: 'motivacao' | 'alerta' | 'parabens' | 'sugestao'
  titulo: string
  mensagem: string
  acao?: { texto: string; link: string }
  icone: string
  cor: string
}

export default function DashboardPage() {
  const { isAdmin, user, activeUsers, refreshActiveUsers } = useAuth()
  const [estatisticas, setEstatisticas] = useState<EstatisticasDashboard | null>(null)
  const [materias, setMaterias] = useState<any[]>([])
  const [metaEstudo, setMetaEstudo] = useState<MetaEstudo | null>(null)
  const [atividadeRecente, setAtividadeRecente] = useState<AtividadeRecente[]>([])
  const [conquistas, setConquistas] = useState<Conquista[]>([])
  const [alertas, setAlertas] = useState<AlertaInteligente[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarModalZerar, setMostrarModalZerar] = useState(false)
  const [zerandoEstatisticas, setZerandoEstatisticas] = useState(false)
  type AbaType = 'visao-geral' | 'performance' | 'metas' | 'ranking'
  const [abaAtiva, setAbaAtiva] = useState<AbaType>('visao-geral')
  const [isClient, setIsClient] = useState(false)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Inicialização
  useEffect(() => {
    setIsClient(true)
    carregarDados()
  }, [isAdmin])

  // Auto-refresh a cada 2 minutos
  useEffect(() => {
    if (!isClient || !autoRefresh) return

    const interval = setInterval(() => {
      carregarDados(true) // true = silent refresh
      setUltimaAtualizacao(new Date())
    }, 2 * 60 * 1000)

    return () => clearInterval(interval)
  }, [isClient, autoRefresh])

  // ✅ CORREÇÃO: Ordem de carregamento corrigida
  const carregarDados = useCallback(async (silentRefresh = false) => {
    if (!silentRefresh) setLoading(true)
    
    try {
      console.log('🔄 Carregando dados do dashboard...')
      
      // PASSO 1: Carregar dados básicos PRIMEIRO
      let dadosBasicos: { estatisticas: EstatisticasDashboard; materias: any[] }
      
      if (isAdmin) {
        dadosBasicos = await carregarDadosAdmin()
      } else {
        dadosBasicos = await carregarDadosUsuario()
      }
      
      // PASSO 2: Definir os dados básicos
      setEstatisticas(dadosBasicos.estatisticas)
      setMaterias(dadosBasicos.materias)
      
      // PASSO 3: Carregar dados que DEPENDEM dos básicos
      const [metaEstudo, atividadeRecente, conquistas, alertas] = await Promise.all([
        carregarMetasEstudo(dadosBasicos.estatisticas),
        carregarAtividadeRecente(),
        carregarConquistas(dadosBasicos.estatisticas),
        gerarAlertasInteligentes(dadosBasicos.estatisticas, dadosBasicos.materias)
      ])
      
      setMetaEstudo(metaEstudo)
      setAtividadeRecente(atividadeRecente)
      setConquistas(conquistas)
      setAlertas(alertas)
      
      console.log('✅ Dados do dashboard carregados com sucesso')
      console.log('📊 Estatísticas:', dadosBasicos.estatisticas)
      console.log('🏆 Conquistas:', conquistas.filter(c => c.desbloqueada).length, 'desbloqueadas')
      console.log('🔔 Alertas:', alertas.length, 'gerados')
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados do dashboard:', error)
      definirDadosPadrao()
    } finally {
      if (!silentRefresh) setLoading(false)
    }
  }, [isAdmin])

  const definirDadosPadrao = () => {
    const dadosPadrao: EstatisticasDashboard = { 
      totalRespostas: 0, 
      acertos: 0, 
      percentualAcertos: 0, 
      porMateria: {},
      sequenciaAtual: 0,
      melhorSequencia: 0,
      tempoMedioResposta: 0,
      ultimaAtividade: new Date().toISOString(),
      questoesHoje: 0,
      tempoEstudoHoje: 0,
      diasConsecutivos: 0
    }
    
    setEstatisticas(dadosPadrao)
    setMaterias([])
    setMetaEstudo({
      questoesDiarias: 20,
      questoesSemanais: 100,
      tempoMinimoMinutos: 30,
      diasConsecutivos: 0,
      metaDiariaAlcancada: false,
      metaSemanalAlcancada: false,
      progressoDiario: 0,
      progressoSemanal: 0
    })
    setConquistas([])
    setAlertas([])
  }

  // ✅ VERSÃO CORRIGIDA - apenas esta função no dashboard
const carregarDadosUsuario = async (): Promise<{ estatisticas: EstatisticasDashboard; materias: any[] }> => {
  try {
    const [statsData, materiasData] = await Promise.all([
      getEstatisticasEstudo().catch(() => null),
      getMateriasComEstatisticas().catch(() => [])
    ])
    
    // Enriquecer estatísticas com dados do localStorage
    const hoje = new Date().toDateString()
    const questoesHoje = parseInt(localStorage.getItem(`questoes_hoje_${hoje}`) || '0')
    const tempoEstudoHoje = parseInt(localStorage.getItem(`tempo_estudo_hoje_${hoje}`) || '0')
    const diasConsecutivos = parseInt(localStorage.getItem('dias_consecutivos') || '0')
    
    // ✅ AGORA FUNCIONA - os campos existem na função getEstatisticasEstudo()
    const estatisticasEnriquecidas: EstatisticasDashboard = {
      totalRespostas: statsData?.totalRespostas || 0,
      acertos: statsData?.acertos || 0,
      percentualAcertos: statsData?.percentualAcertos || 0,
      porMateria: statsData?.porMateria || {},
      
      // ✅ AGORA ESTES CAMPOS EXISTEM
      sequenciaAtual: statsData?.sequenciaAtual || 0,
      melhorSequencia: statsData?.melhorSequencia || 0,
      tempoMedioResposta: statsData?.tempoMedioResposta || 0,
      
      questoesHoje,
      tempoEstudoHoje,
      diasConsecutivos,
      ultimaAtividade: localStorage.getItem('ultima_atividade') || new Date().toISOString()
    }
    
    return {
      estatisticas: estatisticasEnriquecidas,
      materias: materiasData
    }
    
  } catch (error) {
    console.error('❌ Erro ao carregar dados do usuário:', error)
    throw error
  }
}

  const carregarDadosAdmin = async (): Promise<{ estatisticas: EstatisticasDashboard; materias: any[] }> => {
    // Admin também tem dados pessoais
    const dadosUsuario = await carregarDadosUsuario()
    
    // Dados específicos do admin podem ser adicionados aqui
    console.log('👨‍💼 Dados de admin carregados')
    
    return dadosUsuario
  }

  // ✅ CORREÇÃO: Recebe estatísticas como parâmetro
  const carregarMetasEstudo = async (estatisticas: EstatisticasDashboard): Promise<MetaEstudo> => {
    try {
      const metaSalva = localStorage.getItem('meta_estudo')
      const metaPadrao: MetaEstudo = {
        questoesDiarias: 20,
        questoesSemanais: 100,
        tempoMinimoMinutos: 30,
        diasConsecutivos: estatisticas.diasConsecutivos,
        metaDiariaAlcancada: false,
        metaSemanalAlcancada: false,
        progressoDiario: 0,
        progressoSemanal: 0
      }

      if (metaSalva) {
        const meta = { ...metaPadrao, ...JSON.parse(metaSalva) }
        
        // Calcular progresso
        const questoesHoje = estatisticas.questoesHoje
        meta.progressoDiario = Math.min((questoesHoje / meta.questoesDiarias) * 100, 100)
        meta.metaDiariaAlcancada = questoesHoje >= meta.questoesDiarias
        
        // Progresso semanal (simplificado)
        meta.progressoSemanal = Math.min((questoesHoje * 7 / meta.questoesSemanais) * 100, 100)
        meta.metaSemanalAlcancada = meta.progressoSemanal >= 100
        
        return meta
      } else {
        return metaPadrao
      }
    } catch (error) {
      console.error('Erro ao carregar metas:', error)
      return {
        questoesDiarias: 20,
        questoesSemanais: 100,
        tempoMinimoMinutos: 30,
        diasConsecutivos: 0,
        metaDiariaAlcancada: false,
        metaSemanalAlcancada: false,
        progressoDiario: 0,
        progressoSemanal: 0
      }
    }
  }

  // ✅ APENAS DADOS REAIS DO LOCALSTORAGE
  const carregarAtividadeRecente = async (): Promise<AtividadeRecente[]> => {
    try {
      const atividadeSalva = localStorage.getItem('atividade_recente')
      if (atividadeSalva) {
        const atividade = JSON.parse(atividadeSalva)
        return atividade.slice(0, 5) // Últimas 5
      }
      
      // Se não há dados, retorna array vazio
      return []
    } catch (error) {
      console.error('Erro ao carregar atividade recente:', error)
      return []
    }
  }

  // ✅ CORREÇÃO: Recebe estatísticas como parâmetro e funciona corretamente
  const carregarConquistas = async (estatisticas: EstatisticasDashboard): Promise<Conquista[]> => {
    try {
      console.log('🏆 Carregando conquistas com estatísticas:', estatisticas)
      
      const conquistasPadrao: Conquista[] = [
        {
          id: 'primeira_questao',
          nome: 'Primeiro Passo',
          descricao: 'Responda sua primeira questão',
          icone: '🎯',
          desbloqueada: estatisticas.totalRespostas > 0,
          progresso: Math.min(estatisticas.totalRespostas, 1),
          meta: 1
        },
        {
          id: 'dez_questoes',
          nome: 'Iniciante',
          descricao: 'Responda 10 questões',
          icone: '📚',
          desbloqueada: estatisticas.totalRespostas >= 10,
          progresso: Math.min(estatisticas.totalRespostas, 10),
          meta: 10
        },
        {
          id: 'cinquenta_questoes',
          nome: 'Estudioso',
          descricao: 'Responda 50 questões',
          icone: '📖',
          desbloqueada: estatisticas.totalRespostas >= 50,
          progresso: Math.min(estatisticas.totalRespostas, 50),
          meta: 50
        },
        {
          id: 'cem_questoes',
          nome: 'Centurião',
          descricao: 'Responda 100 questões',
          icone: '💯',
          desbloqueada: estatisticas.totalRespostas >= 100,
          progresso: Math.min(estatisticas.totalRespostas, 100),
          meta: 100
        },
        {
          id: 'sequencia_cinco',
          nome: 'Aquecendo',
          descricao: 'Acerte 5 questões seguidas',
          icone: '🔥',
          desbloqueada: estatisticas.melhorSequencia >= 5,
          progresso: Math.min(estatisticas.melhorSequencia, 5),
          meta: 5
        },
        {
          id: 'sequencia_dez',
          nome: 'Em Chamas',
          descricao: 'Acerte 10 questões seguidas',
          icone: '🔥',
          desbloqueada: estatisticas.melhorSequencia >= 10,
          progresso: Math.min(estatisticas.melhorSequencia, 10),
          meta: 10
        },
        {
          id: 'tres_dias',
          nome: 'Consistente',
          descricao: 'Estude por 3 dias consecutivos',
          icone: '📅',
          desbloqueada: estatisticas.diasConsecutivos >= 3,
          progresso: Math.min(estatisticas.diasConsecutivos, 3),
          meta: 3
        },
        {
          id: 'sete_dias',
          nome: 'Dedicado',
          descricao: 'Estude por 7 dias consecutivos',
          icone: '🗓️',
          desbloqueada: estatisticas.diasConsecutivos >= 7,
          progresso: Math.min(estatisticas.diasConsecutivos, 7),
          meta: 7
        },
        {
          id: 'taxa_setenta',
          nome: 'Bom Desempenho',
          descricao: 'Mantenha 70% de acertos',
          icone: '👍',
          desbloqueada: estatisticas.percentualAcertos >= 70 && estatisticas.totalRespostas >= 10,
          progresso: Math.min(estatisticas.percentualAcertos, 70),
          meta: 70
        },
        {
          id: 'taxa_oitenta',
          nome: 'Expert',
          descricao: 'Mantenha 80% de acertos',
          icone: '🏆',
          desbloqueada: estatisticas.percentualAcertos >= 80 && estatisticas.totalRespostas >= 20,
          progresso: Math.min(estatisticas.percentualAcertos, 80),
          meta: 80
        },
        {
          id: 'rapido',
          nome: 'Velocista',
          descricao: 'Responda em menos de 30 segundos em média',
          icone: '⚡',
          desbloqueada: estatisticas.tempoMedioResposta > 0 && estatisticas.tempoMedioResposta <= 30 && estatisticas.totalRespostas >= 10,
          progresso: estatisticas.tempoMedioResposta > 0 ? Math.max(0, 30 - estatisticas.tempoMedioResposta) : 0,
          meta: 30
        }
      ]
      
      console.log('🏆 Conquistas processadas:', conquistasPadrao.filter(c => c.desbloqueada).length, 'desbloqueadas')
      return conquistasPadrao
    } catch (error) {
      console.error('Erro ao carregar conquistas:', error)
      return []
    }
  }

  // ✅ CORREÇÃO: Alertas baseados em dados reais
  const gerarAlertasInteligentes = async (
    estatisticas: EstatisticasDashboard, 
    materias: any[]
  ): Promise<AlertaInteligente[]> => {
    try {
      const alertasGerados: AlertaInteligente[] = []
      
      console.log('🔔 Gerando alertas com dados reais:', { 
        totalRespostas: estatisticas.totalRespostas,
        materias: materias.length,
        questoesHoje: estatisticas.questoesHoje,
        diasConsecutivos: estatisticas.diasConsecutivos
      })
      
      // Verificar última atividade
      if (estatisticas.ultimaAtividade) {
        const ultimaAtividade = new Date(estatisticas.ultimaAtividade)
        const agora = new Date()
        const horasSemEstudar = (agora.getTime() - ultimaAtividade.getTime()) / (1000 * 60 * 60)
        
        if (horasSemEstudar > 24) {
          alertasGerados.push({
            id: 'sem_estudar',
            tipo: 'motivacao',
            titulo: 'Que tal voltar aos estudos?',
            mensagem: `Você não estuda há ${Math.floor(horasSemEstudar)}h. Que tal uma sessão rápida?`,
            acao: { texto: 'Estudar Agora', link: '/estudar' },
            icone: '📚',
            cor: 'blue'
          })
        }
      }
      
      // Verificar se está próximo de conquistas
      if (estatisticas.totalRespostas >= 90 && estatisticas.totalRespostas < 100) {
        alertasGerados.push({
          id: 'quase_centuriao',
          tipo: 'motivacao',
          titulo: 'Quase Centurião! 💯',
          mensagem: `Faltam apenas ${100 - estatisticas.totalRespostas} questões para a conquista "Centurião"!`,
          acao: { texto: 'Completar Agora', link: '/estudar' },
          icone: '🎯',
          cor: 'purple'
        })
      }

      if (estatisticas.totalRespostas >= 45 && estatisticas.totalRespostas < 50) {
        alertasGerados.push({
          id: 'quase_estudioso',
          tipo: 'motivacao',
          titulo: 'Quase Estudioso! 📖',
          mensagem: `Faltam apenas ${50 - estatisticas.totalRespostas} questões para a conquista "Estudioso"!`,
          acao: { texto: 'Completar Agora', link: '/estudar' },
          icone: '📖',
          cor: 'green'
        })
      }

      if (estatisticas.diasConsecutivos >= 5 && estatisticas.diasConsecutivos < 7) {
        alertasGerados.push({
          id: 'quase_dedicado',
          tipo: 'motivacao',
          titulo: 'Quase Dedicado! 🗓️',
          mensagem: `Faltam apenas ${7 - estatisticas.diasConsecutivos} dias para a conquista "Dedicado"!`,
          acao: { texto: 'Continuar Sequência', link: '/estudar' },
          icone: '🗓️',
          cor: 'orange'
        })
      }
      
      // Verificar sequência atual
      if (estatisticas.sequenciaAtual >= 5) {
        alertasGerados.push({
          id: 'sequencia_boa',
          tipo: 'parabens',
          titulo: 'Você está em chamas! 🔥',
          mensagem: `${estatisticas.sequenciaAtual} acertos seguidos! Continue assim!`,
          acao: { texto: 'Continuar', link: '/estudar' },
          icone: '🔥',
          cor: 'orange'
        })
      }
      
      // Verificar matérias com baixo desempenho (apenas se há dados reais)
      const materiasComDados = materias.filter(m => (m.total_respostas || 0) > 0)
      const materiasProblema = materiasComDados.filter(m => 
        (m.total_respostas || 0) > 5 && (m.percentual_acertos || 0) < 60
      )
      
      if (materiasProblema.length > 0) {
        const materia = materiasProblema[0]
        alertasGerados.push({
          id: 'materia_problema',
          tipo: 'sugestao',
          titulo: 'Área que precisa de atenção',
          mensagem: `${materia.nome} está com ${materia.percentual_acertos || 0}% de acertos. Que tal revisar?`,
          acao: { texto: 'Revisar Matéria', link: `/estudar?materia=${materia.id}` },
          icone: '⚠️',
          cor: 'yellow'
        })
      }

      // Verificar meta diária (apenas se há meta configurada)
      const metaSalva = localStorage.getItem('meta_estudo')
      if (metaSalva) {
        const meta = JSON.parse(metaSalva)
        const faltam = meta.questoesDiarias - estatisticas.questoesHoje
        
        if (faltam > 0 && faltam <= 5) {
          alertasGerados.push({
            id: 'quase_meta',
            tipo: 'motivacao',
            titulo: 'Quase lá!',
            mensagem: `Faltam apenas ${faltam} questões para sua meta diária!`,
            acao: { texto: 'Completar Meta', link: '/estudar' },
            icone: '🎯',
            cor: 'green'
          })
        } else if (estatisticas.questoesHoje >= meta.questoesDiarias) {
          alertasGerados.push({
            id: 'meta_alcancada',
            tipo: 'parabens',
            titulo: 'Parabéns! 🎉',
            mensagem: 'Você alcançou sua meta diária de estudos!',
            icone: '🎉',
            cor: 'green'
          })
        }
      }

      // Verificar performance geral
      if (estatisticas.totalRespostas >= 20 && estatisticas.percentualAcertos >= 80) {
        alertasGerados.push({
          id: 'performance_excelente',
          tipo: 'parabens',
          titulo: 'Performance Excelente! 🌟',
          mensagem: `${estatisticas.percentualAcertos}% de acertos em ${estatisticas.totalRespostas} questões. Parabéns!`,
          icone: '🌟',
          cor: 'green'
        })
      }
      
      console.log('✅ Alertas gerados:', alertasGerados.length)
      return alertasGerados.slice(0, 3) // Máximo 3 alertas
    } catch (error) {
      console.error('Erro ao gerar alertas:', error)
      return []
    }
  }

  const zerarTodasEstatisticas = async () => {
    setZerandoEstatisticas(true)
    try {
      const sucesso = await zerarEstatisticasUsuario()
      if (sucesso) {
        // Limpar localStorage também
        const hoje = new Date().toDateString()
        localStorage.removeItem(`questoes_hoje_${hoje}`)
        localStorage.removeItem(`tempo_estudo_hoje_${hoje}`)
        localStorage.removeItem('dias_consecutivos')
        localStorage.removeItem('meta_estudo')
        localStorage.removeItem('atividade_recente')
        localStorage.removeItem('ultima_atividade')
        
        await carregarDados()
        setMostrarModalZerar(false)
        alert('✅ Estatísticas zeradas com sucesso!')
      } else {
        alert('❌ Erro ao zerar estatísticas. Tente novamente.')
      }
    } catch (error) {
      console.error('Erro ao zerar estatísticas:', error)
      alert('❌ Erro inesperado ao zerar estatísticas.')
    } finally {
      setZerandoEstatisticas(false)
    }
  }

  const formatarTempo = (segundos: number) => {
    if (segundos < 60) return `${segundos}s`
    const minutos = Math.floor(segundos / 60)
    const horas = Math.floor(minutos / 60)
    if (horas > 0) return `${horas}h ${minutos % 60}m`
    return `${minutos}m ${segundos % 60}s`
  }

  const formatarDataRelativa = (dataString: string) => {
    if (!isClient) return 'Carregando...'
    
    const agora = new Date()
    const data = new Date(dataString)
    const diffMs = agora.getTime() - data.getTime()
    const diffMinutos = Math.floor(diffMs / (1000 * 60))
    
    if (diffMinutos < 1) return 'Agora mesmo'
    if (diffMinutos < 60) return `${diffMinutos}min atrás`
    const diffHoras = Math.floor(diffMinutos / 60)
    if (diffHoras < 24) return `${diffHoras}h atrás`
    const diffDias = Math.floor(diffHoras / 24)
    return `${diffDias}d atrás`
  }

  const getCorAlerta = (tipo: string) => {
    switch (tipo) {
      case 'motivacao': return 'border-blue-200 bg-blue-50 dark:bg-blue-900/20'
      case 'alerta': return 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20'
      case 'parabens': return 'border-green-200 bg-green-50 dark:bg-green-900/20'
      case 'sugestao': return 'border-purple-200 bg-purple-50 dark:bg-purple-900/20'
      default: return 'border-gray-200 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout title="Dashboard">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Carregando dashboard...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout title={isAdmin ? "Dashboard Admin" : "Meu Dashboard"}>
        {isAdmin ? <DashboardAdmin /> : <DashboardUsuario />}
        
        {/* Modal de confirmação para zerar estatísticas */}
        {mostrarModalZerar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                Zerar Todas as Estatísticas
              </h3>
              
              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  ⚠️ Esta ação irá <strong>deletar permanentemente</strong>:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                <li>• Todo seu histórico de respostas</li>
                  <li>• Tempos de resposta registrados</li>
                  <li>• Alternativas eliminadas</li>
                  <li>• Sequências de acertos</li>
                  <li>• Metas e conquistas</li>
                  <li>• Todas as estatísticas de progresso</li>
                </ul>
                <p className="text-red-600 dark:text-red-400 text-sm mt-4 font-medium">
                  ⚠️ Esta ação não pode ser desfeita!
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setMostrarModalZerar(false)}
                  disabled={zerandoEstatisticas}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={zerarTodasEstatisticas}
                  disabled={zerandoEstatisticas}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {zerandoEstatisticas ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Zerando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Confirmar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  )


// DASHBOARD ADMIN PREMIUM - MUITO MELHOR QUE O USUÁRIO
function DashboardAdmin() {
  const temDados = materias.length > 0
  
  if (!temDados) {
    return <OnboardingAdmin />
  }

  return (
    <div className="space-y-6">
      {/* Header Admin PREMIUM */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 rounded-xl text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white bg-opacity-10 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white bg-opacity-5 rounded-full translate-y-24 -translate-x-24"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                  <Crown className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Dashboard Administrativo</h1>
                  <p className="text-indigo-100 text-sm">Sistema CFP XII - Controle Total</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{activeUsers.totalActive} Online</span>
                  </div>
                </div>
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    <span>{activeUsers.totalDevices} Dispositivos</span>
                  </div>
                </div>
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span>{materias.reduce((total, m) => total + (m.questoes_count || 0), 0)} Questões</span>
                  </div>
                </div>
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>Sistema Ativo</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <button
                onClick={() => carregarDados()}
                disabled={loading}
                className="mb-4 p-3 bg-white bg-opacity-20 rounded-xl hover:bg-opacity-30 transition-all backdrop-blur-sm"
                title="Recarregar dados"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                ) : (
                  <RefreshCw className="h-6 w-6" />
                )}
              </button>
              
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-3xl font-bold">{estatisticas?.percentualAcertos || 0}%</div>
                <div className="text-sm text-indigo-100">Sua Performance</div>
                <div className="text-xs text-indigo-200 mt-1">
                  {estatisticas?.totalRespostas || 0} questões respondidas
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Painel de Controle Rápido */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ações Administrativas */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Centro de Controle
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/questoes"
              className="group bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <div className="flex flex-col items-center text-center">
                <div className="p-3 bg-blue-500 text-white rounded-xl mb-3 group-hover:scale-110 transition-transform">
                  <Plus className="h-6 w-6" />
                </div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">Nova Questão</h4>
                <p className="text-xs text-blue-600 dark:text-blue-400">Adicionar conteúdo</p>
              </div>
            </Link>

            <Link
              href="/materias"
              className="group bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-xl border border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <div className="flex flex-col items-center text-center">
                <div className="p-3 bg-green-500 text-white rounded-xl mb-3 group-hover:scale-110 transition-transform">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h4 className="font-semibold text-green-900 dark:text-green-300 mb-1">Matérias</h4>
                <p className="text-xs text-green-600 dark:text-green-400">Gerenciar disciplinas</p>
              </div>
            </Link>

            <Link
              href="/relatorios"
              className="group bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-xl border border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <div className="flex flex-col items-center text-center">
                <div className="p-3 bg-purple-500 text-white rounded-xl mb-3 group-hover:scale-110 transition-transform">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-1">Relatórios</h4>
                <p className="text-xs text-purple-600 dark:text-purple-400">Analytics avançado</p>
              </div>
            </Link>

            <Link
              href="/estudar"
              className="group bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-6 rounded-xl border border-orange-200 dark:border-orange-800 hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <div className="flex flex-col items-center text-center">
                <div className="p-3 bg-orange-500 text-white rounded-xl mb-3 group-hover:scale-110 transition-transform">
                  <Play className="h-6 w-6" />
                </div>
                <h4 className="font-semibold text-orange-900 dark:text-orange-300 mb-1">Estudar</h4>
                <p className="text-xs text-orange-600 dark:text-orange-400">Modo estudante</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Status do Sistema */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-500" />
            Status do Sistema
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-800 dark:text-green-300">Sistema Online</span>
              </div>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Banco de Dados</span>
              </div>
              <CheckCircle className="h-4 w-4 text-blue-500" />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm font-medium text-purple-800 dark:text-purple-300">Autenticação</span>
              </div>
              <CheckCircle className="h-4 w-4 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Gamificação Admin PREMIUM */}
      {estatisticas && estatisticas.totalRespostas > 0 && (
        <div className="bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 dark:from-yellow-900/10 dark:via-orange-900/10 dark:to-red-900/10 rounded-xl border-2 border-yellow-200 dark:border-yellow-800 p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Painel de Gamificação Admin</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Suas conquistas como estudante</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-yellow-600">{conquistas.filter(c => c.desbloqueada).length}</div>
              <div className="text-xs text-yellow-600">Conquistas</div>
            </div>
          </div>

          {/* Métricas Premium */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-3">
                <Target className="h-8 w-8 text-green-500" />
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 px-2 py-1 rounded-full">
                  +{estatisticas.questoesHoje} hoje
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{estatisticas.totalRespostas}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Questões Respondidas</div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-3">
                <CheckCircle className="h-8 w-8 text-blue-500" />
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full">
                  {estatisticas.percentualAcertos}%
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{estatisticas.acertos}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Acertos Totais</div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-3">
                <Flame className={`h-8 w-8 ${estatisticas.sequenciaAtual >= 5 ? 'text-orange-500' : 'text-gray-400'}`} />
                <span className={`text-xs px-2 py-1 rounded-full ${
                  estatisticas.sequenciaAtual >= 5 
                    ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300'
                    : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400'
                  }`}>
                    {estatisticas.sequenciaAtual >= 5 ? '🔥 Em chamas!' : 'Neutro'}
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{estatisticas.sequenciaAtual}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Sequência Atual</div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Melhor: {estatisticas.melhorSequencia}</div>
              </div>
  
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between mb-3">
                  <Clock className="h-8 w-8 text-purple-500" />
                  <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300 px-2 py-1 rounded-full">
                    Média
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatarTempo(estatisticas.tempoMedioResposta)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Tempo por Questão</div>
              </div>
            </div>
  
            {/* Alertas Premium */}
            {alertas.length > 0 && (
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Bell className="h-5 w-5 text-blue-500" />
                  Central de Alertas
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full">
                    {alertas.length}
                  </span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {alertas.map((alerta) => (
                    <div key={alerta.id} className={`p-6 rounded-xl border-2 ${getCorAlerta(alerta.tipo)} hover:shadow-lg transition-all`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="text-3xl">{alerta.icone}</div>
                          <div>
                            <h5 className="font-semibold text-gray-900 dark:text-white mb-1">{alerta.titulo}</h5>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{alerta.mensagem}</p>
                            {alerta.acao && (
                              <Link
                                href={alerta.acao.link}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                              >
                                {alerta.acao.texto}
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
  
            {/* Conquistas Premium */}
            {conquistas.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Hall da Fama
                  <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded-full">
                    {conquistas.filter(c => c.desbloqueada).length}/{conquistas.length}
                  </span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {conquistas.map((conquista) => (
                    <div
                      key={conquista.id}
                      className={`relative p-6 rounded-xl border-2 transition-all hover:scale-105 ${
                        conquista.desbloqueada
                          ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-300 dark:border-yellow-700 shadow-lg'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {conquista.desbloqueada && (
                        <div className="absolute -top-2 -right-2">
                          <div className="bg-yellow-400 text-yellow-900 rounded-full p-2">
                            <Crown className="h-4 w-4" />
                          </div>
                        </div>
                      )}
                      
                      <div className="text-center">
                        <div className={`text-5xl mb-4 ${conquista.desbloqueada ? 'grayscale-0' : 'grayscale opacity-50'}`}>
                          {conquista.icone}
                        </div>
                        <h5 className="font-bold text-gray-900 dark:text-white mb-2">{conquista.nome}</h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{conquista.descricao}</p>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Progresso</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {conquista.progresso}/{conquista.meta}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all duration-500 ${
                                conquista.desbloqueada 
                                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500' 
                                  : 'bg-blue-500'
                              }`}
                              style={{ width: `${Math.min((conquista.progresso / conquista.meta) * 100, 100)}%` }}
                            />
                          </div>
                          <div className="text-xs text-center">
                            <span className={`font-medium ${
                              conquista.desbloqueada ? 'text-yellow-600' : 'text-blue-600'
                            }`}>
                              {Math.round((conquista.progresso / conquista.meta) * 100)}% Completo
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
  
            {/* Call to Action Premium */}
            <div className="mt-8 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-6 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold mb-2 flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Continue Dominando!
                  </h4>
                  <p className="text-blue-100">
                    Você é admin E estudante. Mantenha o exemplo e continue evoluindo!
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link
                    href="/estudar"
                    className="px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-gray-100 transition-colors font-semibold flex items-center gap-2"
                  >
                    <Play className="h-5 w-5" />
                    Estudar Agora
                  </Link>
                  <Link
                    href="/questoes"
                    className="px-6 py-3 border-2 border-white text-white rounded-xl hover:bg-white hover:text-blue-600 transition-colors font-semibold flex items-center gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    Adicionar Questão
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
  
        {/* Configurações e Ações Avançadas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Matérias Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Visão Geral das Matérias
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {materias.slice(0, 8).map((materia) => (
                <div key={materia.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      (materia.questoes_count || 0) > 0 ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{materia.nome}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {materia.questoes_count || 0} questões
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/questoes?materia=${materia.id}`}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    Gerenciar
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
  
          {/* Configurações Admin */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações Avançadas
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Auto-refresh</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Atualização automática dos dados</p>
                </div>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoRefresh ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoRefresh ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
  
              {estatisticas && estatisticas.totalRespostas > 0 && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <h4 className="font-medium text-red-900 dark:text-red-300 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Zona de Perigo
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                    Esta ação irá zerar TODAS as suas estatísticas pessoais de estudo.
                  </p>
                  <button
                    onClick={() => setMostrarModalZerar(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    <Trash2 className="h-4 w-4" />
                    Zerar Minhas Estatísticas
                  </button>
                </div>
              )}
  
              {isClient && (
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Última atualização: {ultimaAtualizacao.toLocaleTimeString('pt-BR')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
  // DASHBOARD USUÁRIO
  function DashboardUsuario() {
    const temDados = estatisticas && estatisticas.totalRespostas > 0
    
    if (!temDados) {
      return <OnboardingUsuario />
    }

    const melhorMateria = materias.length > 0 ? 
      materias.reduce((melhor, atual) => 
        (atual.percentual_acertos || 0) > (melhor.percentual_acertos || 0) ? atual : melhor
      ) : null

    const materiasComProblemas = materias.filter(m => 
      (m.percentual_acertos || 0) < 70 && (m.total_respostas || 0) > 0
    )

    return (
      <div className="space-y-6">
        {/* Header Usuário Melhorado */}
        <div className="bg-gradient-to-r from-blue-500 via-purple-600 to-indigo-600 p-6 rounded-lg text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                  <Trophy className="h-6 w-6" />
                  Olá, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Estudante'}!
                </h2>
                <p className="text-blue-100 mb-3">
                  Continue sua jornada de estudos para o CFP da PMDF
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Flame className="h-4 w-4" />
                    {estatisticas?.diasConsecutivos || 0} dias seguidos
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    {estatisticas?.questoesHoje || 0} questões hoje
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Última atividade: {formatarDataRelativa(estatisticas?.ultimaAtividade || new Date().toISOString())}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => carregarDados()}
                    disabled={loading}
                    className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
                    title="Recarregar dados"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <RefreshCw className="h-5 w-5" />
                    )}
                  </button>
                  <div>
                    <div className="text-3xl font-bold">{estatisticas?.percentualAcertos || 0}%</div>
                    <div className="text-sm text-blue-200">Taxa de Acertos</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navegação por Abas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6">
            {[
              { id: 'visao-geral' as const, nome: 'Visão Geral', icon: BarChart3 },
              { id: 'performance' as const, nome: 'Performance', icon: TrendingUp },
              { id: 'metas' as const, nome: 'Metas', icon: Target },
              { id: 'ranking' as const, nome: 'Conquistas', icon: Trophy }
            ].map((aba) => {
                const Icon = aba.icon
                return (
                  <button
                    key={aba.id}
                    onClick={() => setAbaAtiva(aba.id)}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      abaAtiva === aba.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {aba.nome}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Conteúdo das Abas */}
          <div className="p-6">
            {/* ABA VISÃO GERAL */}
            {abaAtiva === 'visao-geral' && (
              <div className="space-y-6">
                {/* Alertas Inteligentes */}
                {alertas.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Alertas
                    </h3>
                    {alertas.map((alerta) => (
                      <div key={alerta.id} className={`p-4 rounded-lg border ${getCorAlerta(alerta.tipo)}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <span className="text-xl">{alerta.icone}</span>
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">{alerta.titulo}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{alerta.mensagem}</p>
                            </div>
                          </div>
                          {alerta.acao && (
                            <Link
                              href={alerta.acao.link}
                              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
                            >
                              {alerta.acao.texto}
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Cards de Progresso do Usuário */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all group">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg group-hover:scale-110 transition-transform">
                        <Target className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Respondidas</p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                          {estatisticas?.totalRespostas || 0}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {estatisticas?.questoesHoje || 0} hoje
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all group">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg group-hover:scale-110 transition-transform">
                        <CheckCircle className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Acertos</p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                          {estatisticas?.acertos || 0}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {estatisticas?.percentualAcertos || 0}% de taxa
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all group">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg group-hover:scale-110 transition-transform ${
                        (estatisticas?.sequenciaAtual || 0) >= 5 
                          ? 'bg-orange-100 dark:bg-orange-900' 
                          : 'bg-gray-100 dark:bg-gray-900'
                      }`}>
                        <Flame className={`h-6 w-6 ${
                          (estatisticas?.sequenciaAtual || 0) >= 5 ? 'text-orange-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Sequência</p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                          {estatisticas?.sequenciaAtual || 0}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Melhor: {estatisticas?.melhorSequencia || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all group">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg group-hover:scale-110 transition-transform">
                        <Clock className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tempo Médio</p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                          {formatarTempo(estatisticas?.tempoMedioResposta || 0)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Por questão
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Atalhos Rápidos */}
                <div className="bg-gradient-to-r from-green-500 to-blue-600 p-6 rounded-lg text-white">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Atalhos Rápidos
                      </h2>
                      <p className="text-green-100">
                        Continue de onde parou ou inicie uma nova sessão
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Link
                        href="/estudar"
                        className="px-6 py-3 bg-white text-green-600 rounded-lg hover:bg-gray-100 transition-colors font-medium flex items-center gap-2"
                      >
                        <Play className="h-4 w-4" />
                        Sessão Rápida
                      </Link>
                      {materiasComProblemas.length > 0 && (
                        <Link
                          href={`/estudar?materia=${materiasComProblemas[0].id}`}
                          className="px-6 py-3 border border-white text-white rounded-lg hover:bg-white hover:text-green-600 transition-colors font-medium flex items-center gap-2"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Revisar Erros
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
  
                  {/* Atividade Recente */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Atividade Recente
                    </h3>
                    <div className="space-y-3">
                      {atividadeRecente.length > 0 ? (
                        atividadeRecente.map((atividade) => (
                          <div key={atividade.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div className={`w-2 h-2 rounded-full ${
                              atividade.resultado === 'acerto' ? 'bg-green-500' :
                              atividade.resultado === 'erro' ? 'bg-red-500' : 'bg-blue-500'
                            }`} />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {atividade.descricao}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatarDataRelativa(atividade.timestamp)}
                              </p>
                            </div>
                            {atividade.materia && (
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                                {atividade.materia}
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600 dark:text-gray-400">
                            Nenhuma atividade recente. Comece a estudar!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
  
              {/* ABA PERFORMANCE */}
              {abaAtiva === 'performance' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    📊 Análise de Performance
                  </h3>
  
                  {/* Performance por Matéria */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">Performance por Matéria</h4>
                    <div className="space-y-4">
                      {materias.length > 0 ? materias.map((materia) => (
                        <div key={materia.id} className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {materia.nome}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    (materia.percentual_acertos || 0) >= 80 ? 'bg-green-500' :
                                    (materia.percentual_acertos || 0) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.max(materia.percentual_acertos || 0, 5)}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-600 dark:text-gray-400 w-12 text-right">
                                {(materia.total_respostas || 0) > 0 ? `${materia.percentual_acertos || 0}%` : 'N/A'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {materia.total_respostas || 0} questões respondidas
                            </p>
                          </div>
                          <Link
                            href={`/estudar?materia=${materia.id}`}
                            className="ml-3 px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                          >
                            Estudar
                          </Link>
                        </div>
                      )) : (
                        <div className="text-center py-8">
                          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600 dark:text-gray-400">
                            Nenhuma matéria encontrada. Comece estudando!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
  
                  {/* Áreas que Precisam de Atenção */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                      Áreas que Precisam de Atenção
                    </h4>
                    <div className="space-y-3">
                      {materiasComProblemas.length > 0 ? (
                        materiasComProblemas.map((materia) => (
                          <div key={materia.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="text-yellow-600">⚠️</span>
                              <div className="min-w-0 flex-1">
                                <span className="text-sm text-gray-900 dark:text-white block truncate">
                                  {materia.nome}
                                </span>
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  {materia.total_respostas || 0} questões • {materia.percentual_acertos || 0}% acertos
                                </span>
                              </div>
                            </div>
                            <Link
                              href={`/estudar?materia=${materia.id}`}
                              className="px-3 py-1 text-xs bg-yellow-600 text-white rounded-full hover:bg-yellow-700 transition-colors flex items-center gap-1"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Revisar
                            </Link>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <div className="text-4xl mb-3">🎉</div>
                          <p className="text-gray-600 dark:text-gray-400">
                            {materias.length > 0 ? 'Parabéns! Todas as matérias estão com boa performance!' : 'Comece a estudar para ver sua performance!'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
  
                  {/* Estatísticas Detalhadas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-4">Estatísticas Gerais</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Total de Respostas</span>
                          <span className="font-medium text-gray-900 dark:text-white">{estatisticas?.totalRespostas || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Total de Acertos</span>
                          <span className="font-medium text-green-600">{estatisticas?.acertos || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Taxa de Acertos</span>
                          <span className="font-medium text-blue-600">{estatisticas?.percentualAcertos || 0}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Melhor Sequência</span>
                          <span className="font-medium text-orange-600">{estatisticas?.melhorSequencia || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Tempo Médio</span>
                          <span className="font-medium text-purple-600">{formatarTempo(estatisticas?.tempoMedioResposta || 0)}</span>
                        </div>
                      </div>
                    </div>
  
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-4">Atividade Hoje</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Questões Respondidas</span>
                          <span className="font-medium text-gray-900 dark:text-white">{estatisticas?.questoesHoje || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Tempo de Estudo</span>
                          <span className="font-medium text-blue-600">{formatarTempo(estatisticas?.tempoEstudoHoje || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Dias Consecutivos</span>
                          <span className="font-medium text-orange-600 flex items-center gap-1">
                            <Flame className="h-4 w-4" />
                            {estatisticas?.diasConsecutivos || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Última Atividade</span>
                          <span className="font-medium text-gray-600 dark:text-gray-400">
                            {formatarDataRelativa(estatisticas?.ultimaAtividade || new Date().toISOString())}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
  
              {/* ABA METAS */}
              {abaAtiva === 'metas' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Metas de Estudo
                  </h3>
  
                  {/* Meta Diária */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Meta Diária
                      </h4>
                      {metaEstudo?.metaDiariaAlcancada && (
                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-sm flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          Alcançada!
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600 dark:text-gray-400">
                            Questões: {estatisticas?.questoesHoje || 0} / {metaEstudo?.questoesDiarias || 20}
                          </span>
                          <span className="font-medium text-blue-600">
                            {Math.round(metaEstudo?.progressoDiario || 0)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                          <div
                            className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(metaEstudo?.progressoDiario || 0, 100)}%` }}
                          />
                        </div>
                      </div>
  
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{estatisticas?.questoesHoje || 0}</div>
                          <div className="text-sm text-blue-600 dark:text-blue-400">Hoje</div>
                          </div>
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{metaEstudo?.questoesDiarias || 20}</div>
                        <div className="text-sm text-green-600 dark:text-green-400">Meta</div>
                      </div>
                    </div>

                    {!metaEstudo?.metaDiariaAlcancada && (
                      <Link
                        href="/estudar"
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Play className="h-4 w-4" />
                        Continuar Estudando
                      </Link>
                    )}
                  </div>
                </div>

                {/* Sequência de Dias */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    Sequência de Estudos
                  </h4>
                  
                  <div className="text-center">
                    <div className="text-4xl font-bold text-orange-600 mb-2">
                      {estatisticas?.diasConsecutivos || 0}
                    </div>
                    <div className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                      {(estatisticas?.diasConsecutivos || 0) === 1 ? 'dia consecutivo' : 'dias consecutivos'}
                    </div>
                    
                    <div className="flex justify-center gap-2 mb-4">
                      {Array.from({ length: 7 }, (_, i) => (
                        <div
                          key={i}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            i < (estatisticas?.diasConsecutivos || 0)
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                          }`}
                        >
                          {i + 1}
                        </div>
                      ))}
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {(estatisticas?.diasConsecutivos || 0) >= 7 
                        ? '🎉 Parabéns! Você completou uma semana de estudos!'
                        : `Faltam ${7 - (estatisticas?.diasConsecutivos || 0)} dias para completar uma semana`
                      }
                    </p>
                  </div>
                </div>

                {/* Configurar Metas */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Configurar Metas
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Questões por dia
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={metaEstudo?.questoesDiarias || 20}
                        onChange={(e) => {
                          const novasMetas = { ...metaEstudo, questoesDiarias: parseInt(e.target.value) || 20 }
                          setMetaEstudo(novasMetas as MetaEstudo)
                          localStorage.setItem('meta_estudo', JSON.stringify(novasMetas))
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tempo mínimo por dia (minutos)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="480"
                        value={metaEstudo?.tempoMinimoMinutos || 30}
                        onChange={(e) => {
                          const novasMetas = { ...metaEstudo, tempoMinimoMinutos: parseInt(e.target.value) || 30 }
                          setMetaEstudo(novasMetas as MetaEstudo)
                          localStorage.setItem('meta_estudo', JSON.stringify(novasMetas))
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ABA CONQUISTAS */}
            {abaAtiva === 'ranking' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Conquistas e Badges
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {conquistas.length > 0 ? conquistas.map((conquista) => (
                    <div
                      key={conquista.id}
                      className={`p-6 rounded-lg border transition-all ${
                        conquista.desbloqueada
                          ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`text-4xl ${conquista.desbloqueada ? 'grayscale-0' : 'grayscale'}`}>
                          {conquista.icone}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {conquista.nome}
                            </h4>
                            {conquista.desbloqueada && (
                              <Crown className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {conquista.descricao}
                          </p>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">
                                Progresso: {conquista.progresso} / {conquista.meta}
                              </span>
                              <span className="font-medium text-blue-600">
                                {Math.round((conquista.progresso / conquista.meta) * 100)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${
                                  conquista.desbloqueada ? 'bg-yellow-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${Math.min((conquista.progresso / conquista.meta) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-2 text-center py-8">
                      <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400">
                        Comece a estudar para desbloquear conquistas!
                      </p>
                    </div>
                  )}
                </div>

                {/* Estatísticas de Conquistas */}
                {conquistas.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      Resumo de Conquistas
                    </h4>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {conquistas.filter(c => c.desbloqueada).length}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Desbloqueadas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {conquistas.filter(c => !c.desbloqueada && c.progresso > 0).length}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Em Progresso</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-600">
                          {conquistas.length}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Configurações do Usuário */}
        {estatisticas && estatisticas.totalRespostas > 0 && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configurações
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Gerencie seus dados de estudo
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    autoRefresh 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => setMostrarModalZerar(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Zerar Estatísticas
                </button>
              </div>
            </div>
            
            {isClient && (
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Última atualização: {ultimaAtualizacao.toLocaleTimeString('pt-BR')}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ONBOARDING ADMIN
  function OnboardingAdmin() {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="text-6xl mb-6">👨‍💼</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Bem-vindo ao Painel Admin!
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Vamos configurar seu sistema de estudos para o CFP da PMDF
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 text-center hover:shadow-md transition-shadow">
            <div className="text-3xl mb-4">📚</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">1. Criar Matérias</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Organize o conteúdo por disciplinas do CFP
            </p>
            <Link
              href="/materias"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Criar Matérias
            </Link>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 text-center hover:shadow-md transition-shadow">
            <div className="text-3xl mb-4">❓</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">2. Adicionar Questões</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Cadastre questões individuais ou em lote
            </p>
            <Link
              href="/questoes"
              className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Adicionar Questões
              </Link>
            </div>
  
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 text-center hover:shadow-md transition-shadow">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">3. Começar a Estudar</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Experimente o modo de estudo
              </p>
              <Link
                href="/estudar"
                className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Estudar
              </Link>
            </div>
          </div>
  
          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Dicas para começar:
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-2">
              <li>• Crie matérias baseadas no edital do CFP (Direito, Português, etc.)</li>
              <li>• Use a importação em lote para adicionar várias questões rapidamente</li>
              <li>• Teste o sistema como usuário para verificar a experiência</li>
              <li>• Acompanhe os relatórios para ver o progresso dos estudantes</li>
              <li>• Configure metas pessoais para manter a motivação</li>
            </ul>
          </div>
        </div>
      )
    }
  
    // ONBOARDING USUÁRIO
    function OnboardingUsuario() {
      return (
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-6xl mb-6">🎓</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Bem-vindo ao Sistema de Estudos!
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              Prepare-se para o CFP da PMDF com questões organizadas e acompanhamento de progresso
            </p>
          </div>
  
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 text-center hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">📚</div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Explore as Matérias</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Veja todas as disciplinas disponíveis para estudo
              </p>
              <Link
                href="/materias"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ver Matérias
              </Link>
            </div>
  
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 text-center hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Começar a Estudar</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Inicie uma sessão de estudos personalizada
              </p>
              <Link
                href="/estudar"
                className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Iniciar Estudo
              </Link>
            </div>
          </div>
  
          {materias.length > 0 && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Matérias Disponíveis:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {materias.map((materia) => (
                  <Link
                    key={materia.id}
                    href={`/estudar?materia=${materia.id}`}
                    className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                  >
                    <div className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {materia.nome}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {materia.questoes_count || 0} questões disponíveis
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
  
          <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="font-semibold text-green-900 dark:text-green-300 mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Como funciona:
            </h3>
            <ul className="text-sm text-green-800 dark:text-green-400 space-y-2">
              <li>• Escolha uma matéria ou estude todas de uma vez</li>
              <li>• Responda as questões e veja explicações detalhadas</li>
              <li>• Acompanhe seu progresso e identifique pontos fracos</li>
              <li>• Defina metas diárias e mantenha uma sequência de estudos</li>
              <li>• Desbloqueie conquistas conforme evolui</li>
              <li>• Use os relatórios para revisar seu desempenho</li>
            </ul>
          </div>
        </div>
      )
    }
  }