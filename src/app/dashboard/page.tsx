'use client'

import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthProvider'
import { getEstatisticasEstudo, zerarEstatisticasUsuario, getAtividadeRecente, EstatisticasCompletas, AtividadeRecenteDB } from '@/lib/estudo'
import { getRanking, ordenarRanking, UsuarioRanking } from '@/lib/ranking'
import { getMateriasComEstatisticas } from '@/lib/materias'
import { 
  Clock, Target, BookOpen, Zap, Users, Settings, 
  Plus, BarChart3, AlertCircle, CheckCircle, Trash2, RefreshCw, Calendar,
  Flame, Trophy, Star, Activity, Smartphone, Shield,
  ChevronRight, Play, RotateCcw, Bell,
  Crown, Sparkles, ArrowRight
} from 'lucide-react'
import Link from 'next/link'

interface MetaEstudo {
  questoesDiarias: number
  questoesSemanais: number
  tempoMinimoMinutos: number
  progressoDiario: number
  metaDiariaAlcancada: boolean
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
}

export default function DashboardPage() {
  const { isAdmin, user, activeUsers } = useAuth()
  const [estatisticas, setEstatisticas] = useState<EstatisticasCompletas | null>(null)
  const [materias, setMaterias] = useState<any[]>([])
  const [metaEstudo, setMetaEstudo] = useState<MetaEstudo | null>(null)
  const [atividadeRecente, setAtividadeRecente] = useState<AtividadeRecenteDB[]>([])
  const [rankingTop, setRankingTop] = useState<UsuarioRanking[]>([])
  const [conquistas, setConquistas] = useState<Conquista[]>([])
  const [alertas, setAlertas] = useState<AlertaInteligente[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarModalZerar, setMostrarModalZerar] = useState(false)
  const [zerandoEstatisticas, setZerandoEstatisticas] = useState(false)
  type AbaType = 'visao-geral' | 'performance' | 'metas' | 'conquistas'
  const [abaAtiva, setAbaAtiva] = useState<AbaType>('visao-geral')
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    carregarDados()
  }, [isAdmin])

  const carregarDados = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    
    try {
      const [statsData, materiasData, atividadeData] = await Promise.all([
        getEstatisticasEstudo().catch(() => null),
        getMateriasComEstatisticas().catch(() => []),
        getAtividadeRecente().catch(() => [])
      ])

      const stats = statsData || {
        totalRespostas: 0, acertos: 0, percentualAcertos: 0, porMateria: {},
        sequenciaAtual: 0, melhorSequencia: 0, tempoMedioResposta: 0,
        questoesHoje: 0, tempoEstudoHoje: 0, diasConsecutivos: 0,
        ultimaAtividade: new Date().toISOString()
      }

      setEstatisticas(stats)
      setMaterias(materiasData)
      setAtividadeRecente(atividadeData)

      // Ranking top 5
      const rankingData = await getRanking().catch(() => [])
      const top5 = ordenarRanking(rankingData, 'respostas').slice(0, 5)
      setRankingTop(top5)

      // Metas (localStorage ok — é preferência pessoal)
      const metaSalva = localStorage.getItem('meta_estudo')
      const metaPadrao = { questoesDiarias: 20, questoesSemanais: 100, tempoMinimoMinutos: 30 }
      const meta = metaSalva ? { ...metaPadrao, ...JSON.parse(metaSalva) } : metaPadrao
      const progDiario = Math.min((stats.questoesHoje / meta.questoesDiarias) * 100, 100)
      setMetaEstudo({
        ...meta,
        progressoDiario: progDiario,
        metaDiariaAlcancada: stats.questoesHoje >= meta.questoesDiarias
      })

      // Conquistas (baseadas em dados REAIS do Supabase)
      setConquistas(calcularConquistas(stats))

      // Alertas
      setAlertas(gerarAlertas(stats, materiasData, meta))

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [isAdmin])

  // ✅ Conquistas baseadas em dados reais
  const calcularConquistas = (stats: EstatisticasCompletas): Conquista[] => [
    { id: 'primeira', nome: 'Primeiro Passo', descricao: 'Responda 1 questão', icone: '🎯', desbloqueada: stats.totalRespostas >= 1, progresso: Math.min(stats.totalRespostas, 1), meta: 1 },
    { id: 'dez', nome: 'Iniciante', descricao: 'Responda 10 questões', icone: '📚', desbloqueada: stats.totalRespostas >= 10, progresso: Math.min(stats.totalRespostas, 10), meta: 10 },
    { id: 'cinquenta', nome: 'Estudioso', descricao: 'Responda 50 questões', icone: '📖', desbloqueada: stats.totalRespostas >= 50, progresso: Math.min(stats.totalRespostas, 50), meta: 50 },
    { id: 'cem', nome: 'Centurião', descricao: 'Responda 100 questões', icone: '💯', desbloqueada: stats.totalRespostas >= 100, progresso: Math.min(stats.totalRespostas, 100), meta: 100 },
    { id: 'seq5', nome: 'Aquecendo', descricao: '5 acertos seguidos', icone: '🔥', desbloqueada: stats.melhorSequencia >= 5, progresso: Math.min(stats.melhorSequencia, 5), meta: 5 },
    { id: 'seq10', nome: 'Em Chamas', descricao: '10 acertos seguidos', icone: '🔥', desbloqueada: stats.melhorSequencia >= 10, progresso: Math.min(stats.melhorSequencia, 10), meta: 10 },
    { id: 'dias3', nome: 'Consistente', descricao: '3 dias consecutivos', icone: '📅', desbloqueada: stats.diasConsecutivos >= 3, progresso: Math.min(stats.diasConsecutivos, 3), meta: 3 },
    { id: 'dias7', nome: 'Dedicado', descricao: '7 dias consecutivos', icone: '🗓️', desbloqueada: stats.diasConsecutivos >= 7, progresso: Math.min(stats.diasConsecutivos, 7), meta: 7 },
    { id: 'taxa70', nome: 'Bom Desempenho', descricao: '70% de acertos (min 10)', icone: '👍', desbloqueada: stats.percentualAcertos >= 70 && stats.totalRespostas >= 10, progresso: Math.min(stats.percentualAcertos, 70), meta: 70 },
    { id: 'taxa80', nome: 'Expert', descricao: '80% de acertos (min 20)', icone: '🏆', desbloqueada: stats.percentualAcertos >= 80 && stats.totalRespostas >= 20, progresso: Math.min(stats.percentualAcertos, 80), meta: 80 },
  ]

  // ✅ Alertas inteligentes
  const gerarAlertas = (stats: EstatisticasCompletas, mats: any[], meta: any): AlertaInteligente[] => {
    const a: AlertaInteligente[] = []
    
    // Inatividade
    if (stats.ultimaAtividade) {
      const horas = (Date.now() - new Date(stats.ultimaAtividade).getTime()) / (1000 * 60 * 60)
      if (horas > 24) a.push({ id: '1', tipo: 'motivacao', titulo: 'Que tal voltar aos estudos?', mensagem: `Você não estuda há ${Math.floor(horas)}h.`, acao: { texto: 'Estudar', link: '/estudar' }, icone: '📚' })
    }
    
    // Próximo de conquistas
    if (stats.totalRespostas >= 90 && stats.totalRespostas < 100) {
      a.push({ id: '2', tipo: 'motivacao', titulo: 'Quase Centurião!', mensagem: `Faltam ${100 - stats.totalRespostas} questões!`, acao: { texto: 'Completar', link: '/estudar' }, icone: '💯' })
    }
    
    // Sequência boa
    if (stats.sequenciaAtual >= 5) {
      a.push({ id: '3', tipo: 'parabens', titulo: 'Sequência incrível!', mensagem: `${stats.sequenciaAtual} acertos seguidos!`, acao: { texto: 'Continuar', link: '/estudar' }, icone: '🔥' })
    }
    
    // Matéria com problema
    const matProblema = mats.find(m => (m.total_respostas || 0) > 5 && (m.percentual_acertos || 0) < 60)
    if (matProblema) {
      a.push({ id: '4', tipo: 'sugestao', titulo: 'Atenção necessária', mensagem: `${matProblema.nome} com ${matProblema.percentual_acertos}% de acertos.`, acao: { texto: 'Revisar', link: `/estudar?materia=${matProblema.id}` }, icone: '⚠️' })
    }

    // Meta diária
    const faltam = meta.questoesDiarias - stats.questoesHoje
    if (faltam > 0 && faltam <= 5) {
      a.push({ id: '5', tipo: 'motivacao', titulo: 'Quase na meta!', mensagem: `Faltam ${faltam} questões para a meta diária!`, acao: { texto: 'Completar', link: '/estudar' }, icone: '🎯' })
    } else if (stats.questoesHoje >= meta.questoesDiarias) {
      a.push({ id: '6', tipo: 'parabens', titulo: 'Meta alcançada!', mensagem: 'Parabéns pela dedicação!', icone: '🎉' })
    }

    return a.slice(0, 3)
  }

  const zerarTodasEstatisticas = async () => {
    setZerandoEstatisticas(true)
    try {
      const sucesso = await zerarEstatisticasUsuario()
      if (sucesso) {
        localStorage.removeItem('meta_estudo')
        localStorage.removeItem('atividade_recente')
        localStorage.removeItem('ultima_atividade')
        localStorage.removeItem('dias_consecutivos')
        localStorage.removeItem('sequencia_atual')
        localStorage.removeItem('melhor_sequencia')
        await carregarDados()
        setMostrarModalZerar(false)
        alert('✅ Estatísticas zeradas com sucesso!')
      } else {
        alert('❌ Erro ao zerar estatísticas.')
      }
    } catch (error) {
      console.error('Erro ao zerar:', error)
      alert('❌ Erro inesperado.')
    } finally {
      setZerandoEstatisticas(false)
    }
  }

  const fmtTempo = (seg: number) => {
    if (seg < 60) return `${seg}s`
    const min = Math.floor(seg / 60)
    const h = Math.floor(min / 60)
    if (h > 0) return `${h}h ${min % 60}m`
    return `${min}m ${seg % 60}s`
  }

  const fmtDataRelativa = (ds: string) => {
    if (!isClient) return '...'
    const diff = Math.floor((Date.now() - new Date(ds).getTime()) / 60000)
    if (diff < 1) return 'Agora'
    if (diff < 60) return `${diff}min atrás`
    const h = Math.floor(diff / 60)
    if (h < 24) return `${h}h atrás`
    return `${Math.floor(h / 24)}d atrás`
  }

  const getCorAlerta = (tipo: string) => {
    const cores: Record<string, string> = {
      motivacao: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
      parabens: 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20',
      sugestao: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20',
      alerta: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
    }
    return cores[tipo] || cores.motivacao
  }

  // ==========================================
  // LOADING
  // ==========================================
  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout title="Dashboard">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  const totalQuestoes = materias.reduce((t, m) => t + (m.questoes_count || 0), 0)
  const temDados = estatisticas && estatisticas.totalRespostas > 0
  const materiasComProblemas = materias.filter(m => (m.percentual_acertos || 0) < 70 && (m.total_respostas || 0) > 0)

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <ProtectedRoute>
      <DashboardLayout title={isAdmin ? "Dashboard Admin" : "Meu Dashboard"}>
        <div className="max-w-2xl lg:max-w-6xl mx-auto px-1 space-y-4 sm:space-y-5">

          {/* ============================== */}
          {/* HEADER */}
          {/* ============================== */}
          <div className={`rounded-2xl p-5 sm:p-6 lg:p-8 text-white relative overflow-hidden ${
            isAdmin 
              ? 'bg-gradient-to-br from-violet-600 to-indigo-700' 
              : 'bg-gradient-to-br from-blue-600 to-cyan-600'
          }`}>
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-0.5">
                    {isAdmin ? 'Painel Admin' : `Olá, ${user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Estudante'}!`}
                  </h2>
                  {temDados ? (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm opacity-90 mt-1">
                      <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5" />{estatisticas!.diasConsecutivos}d seguidos</span>
                      <span className="flex items-center gap-1"><Target className="h-3.5 w-3.5" />{estatisticas!.questoesHoje} hoje</span>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{fmtDataRelativa(estatisticas!.ultimaAtividade)}</span>
                    </div>
                  ) : (
                    <p className="text-sm opacity-80 mt-1">
                      {isAdmin ? 'Gerencie questões e acompanhe o sistema' : 'Comece sua jornada de estudos!'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {temDados && (
                    <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                      <div className="text-2xl sm:text-3xl font-bold">{estatisticas!.percentualAcertos}%</div>
                      <div className="text-[10px] sm:text-xs opacity-80">acertos</div>
                    </div>
                  )}
                  <button onClick={() => carregarDados()} className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Atualizar">
                    <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>

              {/* Admin badges */}
              {isAdmin && (
                <div className="flex flex-wrap gap-2 mt-4 text-xs">
                  <span className="bg-white/15 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{activeUsers?.totalActive || 0} online</span>
                  <span className="bg-white/15 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" />{activeUsers?.totalDevices || 0} dispositivos</span>
                  <span className="bg-white/15 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" />{totalQuestoes} questões</span>
                  <span className="bg-white/15 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />Sistema ativo</span>
                </div>
              )}
            </div>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full" />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />
          </div>

          {/* ============================== */}
          {/* AÇÕES ADMIN */}
          {/* ============================== */}
          {isAdmin && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {[
                { href: '/questoes', icon: Plus, label: 'Questões', cor: 'blue' },
                { href: '/materias', icon: BookOpen, label: 'Matérias', cor: 'emerald' },
                { href: '/relatorios', icon: BarChart3, label: 'Relatórios', cor: 'violet' },
                { href: '/estudar', icon: Play, label: 'Estudar', cor: 'amber' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <Link key={item.href} href={item.href}
                    className="flex flex-col items-center gap-2 p-4 sm:p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md active:scale-[0.98] transition-all min-h-[80px] justify-center"
                  >
                    <Icon className={`h-5 w-5 sm:h-6 sm:w-6 text-${item.cor}-500`} />
                    <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          )}

          {/* ============================== */}
          {/* ONBOARDING (sem dados) */}
          {/* ============================== */}
          {!temDados && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <div className="text-5xl mb-4">{isAdmin ? '👨‍💼' : '🎓'}</div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {isAdmin ? 'Bem-vindo ao Painel!' : 'Bem-vindo ao Sistema de Estudos!'}
                </h2>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  {isAdmin 
                    ? 'Configure matérias e adicione questões para seus alunos.' 
                    : 'Prepare-se para o CFP da PMDF com questões e acompanhamento.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {isAdmin ? (
                  <>
                    <Link href="/materias" className="flex items-center gap-4 p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
                      <div className="text-3xl">📚</div>
                      <div><h3 className="font-semibold text-gray-900 dark:text-white">Criar Matérias</h3><p className="text-xs text-gray-500 dark:text-gray-400">Organize por disciplinas</p></div>
                    </Link>
                    <Link href="/questoes" className="flex items-center gap-4 p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
                      <div className="text-3xl">❓</div>
                      <div><h3 className="font-semibold text-gray-900 dark:text-white">Adicionar Questões</h3><p className="text-xs text-gray-500 dark:text-gray-400">Individual ou em lote</p></div>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/estudar" className="flex items-center gap-4 p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
                      <div className="text-3xl">🎯</div>
                      <div><h3 className="font-semibold text-gray-900 dark:text-white">Começar a Estudar</h3><p className="text-xs text-gray-500 dark:text-gray-400">Inicie sua primeira sessão</p></div>
                    </Link>
                    <Link href="/materias" className="flex items-center gap-4 p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
                      <div className="text-3xl">📚</div>
                      <div><h3 className="font-semibold text-gray-900 dark:text-white">Ver Matérias</h3><p className="text-xs text-gray-500 dark:text-gray-400">{materias.length} disciplinas disponíveis</p></div>
                    </Link>
                  </>
                )}
              </div>

              {materias.length > 0 && !isAdmin && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Matérias Disponíveis</h3>
                  <div className="flex flex-wrap gap-2">
                    {materias.map(m => (
                      <Link key={m.id} href={`/estudar?materia=${m.id}`}
                        className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs sm:text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        {m.nome} <span className="opacity-50">({m.questoes_count})</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================== */}
          {/* DASHBOARD COM DADOS */}
          {/* ============================== */}
          {temDados && (
            <>
            {/* Aviso Legal Fixo */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 sm:p-4">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-red-800 dark:text-red-300">
                    <span className="font-bold">Conteúdo exclusivo CFP/PMDF.</span> Proibido compartilhar acesso com terceiros. Este sistema não possui vínculo oficial com a PMDF.
                  </div>
                </div>
              </div>
              {/* Alertas */}
              {alertas.length > 0 && (
                <div className="space-y-2">
                  {alertas.map(a => (
                    <div key={a.id} className={`flex items-start gap-3 p-3 sm:p-4 rounded-xl border ${getCorAlerta(a.tipo)}`}>
                      <span className="text-xl mt-0.5">{a.icone}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{a.titulo}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{a.mensagem}</p>
                      </div>
                      {a.acao && (
                        <Link href={a.acao.link} className="shrink-0 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 active:scale-[0.97] transition-all flex items-center gap-1 min-h-[32px]">
                          {a.acao.texto}<ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Stats rápidas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 lg:p-5">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg shrink-0">
                      <Target className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{estatisticas!.totalRespostas}</div>
                      <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Respondidas</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 lg:p-5">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{estatisticas!.acertos}</div>
                      <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{estatisticas!.percentualAcertos}% acertos</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 lg:p-5">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${estatisticas!.sequenciaAtual >= 5 ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                      <Flame className={`h-4 w-4 sm:h-5 sm:w-5 ${estatisticas!.sequenciaAtual >= 5 ? 'text-orange-600' : 'text-gray-400'}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{estatisticas!.sequenciaAtual}</div>
                      <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Sequência</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 lg:p-5">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg shrink-0">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-violet-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{fmtTempo(estatisticas!.tempoMedioResposta)}</div>
                      <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Tempo médio</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Rápido */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Link href="/estudar" className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all font-medium text-sm sm:text-base min-h-[48px]">
                  <Play className="h-4 w-4" /> Estudar Agora
                </Link>
                {materiasComProblemas.length > 0 && (
                  <Link href={`/estudar?materia=${materiasComProblemas[0].id}`} className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 active:scale-[0.98] transition-all font-medium text-sm sm:text-base min-h-[48px]">
                    <RotateCcw className="h-4 w-4" /> Revisar Erros
                  </Link>
                )}
              </div>

              {/* ============================== */}
              {/* ABAS */}
              {/* ============================== */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Tab bar com scroll horizontal no mobile */}
                <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-hide">
                  <nav className="flex min-w-max px-2 sm:px-4">
                    {([
                      { id: 'visao-geral' as const, nome: 'Geral', icon: BarChart3 },
                      { id: 'performance' as const, nome: 'Performance', icon: Target },
                      { id: 'metas' as const, nome: 'Metas', icon: Calendar },
                      { id: 'conquistas' as const, nome: 'Conquistas', icon: Trophy },
                    ]).map(aba => {
                      const Icon = aba.icon
                      return (
                        <button key={aba.id} onClick={() => setAbaAtiva(aba.id)}
                          className={`flex items-center gap-1.5 py-3 px-3 sm:px-4 border-b-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] ${
                            abaAtiva === aba.id
                              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
                          }`}>
                          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />{aba.nome}
                        </button>
                      )
                    })}
                  </nav>
                </div>

                <div className="p-4 sm:p-5 lg:p-6">

                  {/* ======= VISÃO GERAL ======= */}
                  {abaAtiva === 'visao-geral' && (
                    <div className="space-y-5">
                      {/* Atividade Hoje */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                          <div className="text-xl sm:text-2xl font-bold text-blue-600">{estatisticas!.questoesHoje}</div>
                          <div className="text-[10px] sm:text-xs text-blue-600/70">Questões hoje</div>
                        </div>
                        <div className="text-center p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
                          <div className="text-xl sm:text-2xl font-bold text-violet-600">{fmtTempo(estatisticas!.tempoEstudoHoje)}</div>
                          <div className="text-[10px] sm:text-xs text-violet-600/70">Estudo hoje</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                          <div className="text-xl sm:text-2xl font-bold text-orange-600">{estatisticas!.diasConsecutivos}</div>
                          <div className="text-[10px] sm:text-xs text-orange-600/70">Dias seguidos</div>
                        </div>
                        <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                          <div className="text-xl sm:text-2xl font-bold text-emerald-600">{estatisticas!.melhorSequencia}</div>
                          <div className="text-[10px] sm:text-xs text-emerald-600/70">Melhor seq.</div>
                        </div>
                      </div>

                      {/* Atividade Recente (dados REAIS do Supabase!) */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                          <Activity className="h-4 w-4 text-gray-400" /> Atividade Recente
                        </h3>
                        {atividadeRecente.length > 0 ? (
                          <div className="space-y-2">
                            {atividadeRecente.map(a => (
                              <div key={a.id} className="flex items-center gap-3 p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${a.resultado === 'acerto' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs sm:text-sm text-gray-900 dark:text-white truncate">{a.descricao}</p>
                                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{fmtDataRelativa(a.timestamp)}</p>
                                </div>
                                <span className="shrink-0 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-[10px] sm:text-xs truncate max-w-[80px] sm:max-w-[120px]">
                                  {a.materia}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-xs text-gray-500">Nenhuma atividade ainda. Comece a estudar!</p>
                          </div>
                        )}
                      </div>
                      {/* Mini Ranking */}
                      {rankingTop.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                              <Trophy className="h-4 w-4 text-amber-500" /> Top 5 Estudantes
                            </h3>
                            <Link href="/ranking" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                              Ver completo →
                            </Link>
                          </div>
                          <div className="space-y-2">
                            {rankingTop.map((usr, idx) => (
                              <div key={usr.id} className={`flex items-center gap-3 p-2.5 rounded-lg ${
                                usr.id === user?.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-900/50'
                              }`}>
                                <span className="text-lg w-6 text-center">
                                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {usr.nome} {usr.id === user?.id && '(você)'}
                                  </p>
                                  {usr.pelotao && (
                                    <p className="text-[10px] text-gray-500 truncate">{usr.pelotao}</p>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">{usr.totalRespostas}</p>
                                  <p className="text-[10px] text-gray-500">{usr.percentualAcertos}% acertos</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ======= PERFORMANCE ======= */}
                  {abaAtiva === 'performance' && (
                    <div className="space-y-5">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Performance por Matéria</h3>
                      {materias.length > 0 ? (
                        <div className="space-y-3">
                          {materias.map(m => (
                            <div key={m.id} className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">{m.nome}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div className={`h-2 rounded-full transition-all ${
                                      (m.percentual_acertos || 0) >= 80 ? 'bg-emerald-500' :
                                      (m.percentual_acertos || 0) >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                    }`} style={{ width: `${Math.max(m.percentual_acertos || 0, 3)}%` }} />
                                  </div>
                                  <span className="text-xs text-gray-500 w-10 text-right shrink-0">
                                    {(m.total_respostas || 0) > 0 ? `${m.percentual_acertos || 0}%` : '—'}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-0.5">{m.total_respostas || 0} respondidas</p>
                              </div>
                              <Link href={`/estudar?materia=${m.id}`}
                                className="shrink-0 px-2.5 py-1 text-[10px] sm:text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 transition-colors min-h-[28px] flex items-center">
                                Estudar
                              </Link>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-6">Nenhuma matéria encontrada.</p>
                      )}

                      {/* Estatísticas resumidas */}
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-medium text-gray-900 dark:text-white">{estatisticas!.totalRespostas}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Acertos</span><span className="font-medium text-emerald-600">{estatisticas!.acertos}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Taxa</span><span className="font-medium text-blue-600">{estatisticas!.percentualAcertos}%</span></div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-gray-500">Melhor seq.</span><span className="font-medium text-orange-600">{estatisticas!.melhorSequencia}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Tempo médio</span><span className="font-medium text-violet-600">{fmtTempo(estatisticas!.tempoMedioResposta)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Dias seguidos</span><span className="font-medium text-orange-600">{estatisticas!.diasConsecutivos}</span></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ======= METAS ======= */}
                  {abaAtiva === 'metas' && (
                    <div className="space-y-5">
                      {/* Meta Diária */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Meta Diária
                          </h3>
                          {metaEstudo?.metaDiariaAlcancada && (
                            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Alcançada!
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-gray-500">{estatisticas!.questoesHoje} / {metaEstudo?.questoesDiarias || 20}</span>
                          <span className="font-medium text-blue-600">{Math.round(metaEstudo?.progressoDiario || 0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                          <div className="bg-blue-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(metaEstudo?.progressoDiario || 0, 100)}%` }} />
                        </div>
                      </div>

                      {/* Dias consecutivos */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                          <Flame className="h-4 w-4 text-orange-500" /> Sequência de Estudos
                        </h3>
                        <div className="text-center">
                          <div className="text-3xl sm:text-4xl font-bold text-orange-600 mb-1">{estatisticas!.diasConsecutivos}</div>
                          <div className="text-sm text-gray-500 mb-3">{estatisticas!.diasConsecutivos === 1 ? 'dia consecutivo' : 'dias consecutivos'}</div>
                          <div className="flex justify-center gap-1.5">
                            {Array.from({ length: 7 }, (_, i) => (
                              <div key={i} className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                                i < estatisticas!.diasConsecutivos ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                              }`}>{i + 1}</div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Configurar */}
                      <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Configurar Meta</h4>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-600 dark:text-gray-400 shrink-0">Questões/dia:</span>
                          <input type="number" min="1" max="100"
                            value={metaEstudo?.questoesDiarias || 20}
                            onChange={(e) => {
                              const v = parseInt(e.target.value) || 20
                              const novasMetas = { ...metaEstudo, questoesDiarias: v }
                              setMetaEstudo(novasMetas as MetaEstudo)
                              localStorage.setItem('meta_estudo', JSON.stringify(novasMetas))
                            }}
                            className="w-20 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm min-h-[40px]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ======= CONQUISTAS ======= */}
                  {abaAtiva === 'conquistas' && (
                    <div className="space-y-4">
                      {/* Resumo */}
                      <div className="grid grid-cols-3 gap-3 mb-2">
                        <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                          <div className="text-xl font-bold text-amber-600">{conquistas.filter(c => c.desbloqueada).length}</div>
                          <div className="text-[10px] sm:text-xs text-amber-600/70">Desbloqueadas</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                          <div className="text-xl font-bold text-blue-600">{conquistas.filter(c => !c.desbloqueada && c.progresso > 0).length}</div>
                          <div className="text-[10px] sm:text-xs text-blue-600/70">Em progresso</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                          <div className="text-xl font-bold text-gray-600 dark:text-gray-300">{conquistas.length}</div>
                          <div className="text-[10px] sm:text-xs text-gray-500">Total</div>
                        </div>
                      </div>

                      {/* Lista */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {conquistas.map(c => (
                          <div key={c.id} className={`flex items-start gap-3 p-3 sm:p-4 rounded-xl border transition-all ${
                            c.desbloqueada
                              ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                          }`}>
                            <div className={`text-2xl sm:text-3xl ${c.desbloqueada ? '' : 'grayscale opacity-50'}`}>{c.icone}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{c.nome}</h4>
                                {c.desbloqueada && <Crown className="h-3 w-3 text-amber-500 shrink-0" />}
                              </div>
                              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{c.descricao}</p>
                              <div className="mt-2">
                                <div className="flex justify-between text-[10px] mb-0.5">
                                  <span className="text-gray-500">{c.progresso}/{c.meta}</span>
                                  <span className={c.desbloqueada ? 'text-amber-600' : 'text-blue-600'}>{Math.round((c.progresso / c.meta) * 100)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                  <div className={`h-1.5 rounded-full transition-all ${c.desbloqueada ? 'bg-amber-500' : 'bg-blue-500'}`}
                                    style={{ width: `${Math.min((c.progresso / c.meta) * 100, 100)}%` }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Matérias Overview (admin) */}
              {isAdmin && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" /> Matérias
                  </h3>
                  <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
                    {materias.map(m => (
                      <div key={m.id} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${(m.questoes_count || 0) > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">{m.nome}</p>
                            <p className="text-[10px] text-gray-500">{m.questoes_count || 0} questões</p>
                          </div>
                        </div>
                        <Link href={`/questoes?materia=${m.id}`} className="text-[10px] sm:text-xs text-blue-600 hover:underline flex items-center gap-0.5 shrink-0">
                          Gerenciar<ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Configurações */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Settings className="h-3.5 w-3.5" /> Configurações
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Gerencie seus dados de estudo</p>
                  </div>
                  <button onClick={() => setMostrarModalZerar(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-[0.98] transition-all text-xs sm:text-sm font-medium min-h-[40px]">
                    <Trash2 className="h-3.5 w-3.5" /> Zerar Estatísticas
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Zerar */}
        {mostrarModalZerar && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-5 sm:p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" /> Zerar Estatísticas
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Isso vai deletar permanentemente todo seu histórico de respostas, tempos e progresso. Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setMostrarModalZerar(false)} disabled={zerandoEstatisticas}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-[44px]">
                  Cancelar
                </button>
                <button onClick={zerarTodasEstatisticas} disabled={zerandoEstatisticas}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 min-h-[44px]">
                  {zerandoEstatisticas ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Trash2 className="h-4 w-4" />}
                  {zerandoEstatisticas ? 'Zerando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  )
}