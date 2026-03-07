'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthProvider'
import { 
  AlertTriangle, 
  Users, 
  BarChart3, 
  Settings, 
  Flag, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  FileText,
  TrendingUp,
  Shield,
  Eye,
  UserCheck,
  UserX,
  BookOpen,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  CreditCard,
  Smartphone,
  Monitor,
  Globe,
  Activity,
  Calendar,
  PieChart,
  Download,
  Upload,
  Bell,
  Zap,
  Target,
  Award,
  AlertCircle,
  CheckSquare,
  XSquare,
  RefreshCw,
  LogOut,
  MapPin,
  Wifi,
  WifiOff
} from 'lucide-react'
import { getReports } from '@/lib/questoes'
import { getUsuariosDetalhados, getEstatisticasAdmin, desconectarUsuario } from '@/lib/admin'
import { getMaterias } from '@/lib/materias'
import { supabase } from '@/lib/supabase'
import { VisualizarQuestao } from '@/components/VisualizarQuestao'

interface Report {
  id: string
  questao_id: string
  tipo: string
  descricao: string
  status: string
  created_at: string
  usuario: { nome: string; email: string }
  questao: { enunciado: string }
}

interface UsuarioAdmin {
  id: string
  nome: string
  email: string
  status: string
  role: string
  created_at: string
  data_aprovacao?: string
  comprovante_url?: string
  valor_pago?: number
  data_pagamento?: string
  metodo_pagamento?: string
  observacoes_pagamento?: string
}

interface DeviceInfo {
  browser?: string
  os?: string
  device?: string
  screen?: string
}

interface DeviceSession {
  device_info: DeviceInfo
  last_activity: string
  ip_address?: string
  city?: string
  country?: string
  browser_name?: string
  os_name?: string
  is_mobile?: boolean
}

interface UsuarioDetalhado {
  id: string
  nome: string
  email: string
  status: string
  role: string
  created_at: string
  isOnline: boolean
  lastActivity?: string
  deviceCount: number
  devices: DeviceSession[]
  isSuspeito: boolean
  motivoSuspeita?: string
}

interface EstatisticasFinanceiras {
  receitaTotal: number
  receitaMensal: number
  taxaConversao: number
  pagamentosPendentes: number
  usuariosAtivos: number
  crescimentoMensal: number
}

interface EstatisticasDetalhadas {
  totalUsuarios: number
  usuariosOnline: number
  usuariosOffline: number
  totalDispositivos: number
  usuariosMultiplosDispositivos: number
  usuariosSuspeitos: number
  dispositivosPorTipo: Record<string, number>
}

export default function AdminPage() {
  const { isAdmin, user } = useAuth()
  const [abaAtiva, setAbaAtiva] = useState('dashboard')
  const [reports, setReports] = useState<Report[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [usuariosDetalhados, setUsuariosDetalhados] = useState<UsuarioDetalhado[]>([])
  const [estatisticasDetalhadas, setEstatisticasDetalhadas] = useState<EstatisticasDetalhadas | null>(null)
  const [estatisticasFinanceiras, setEstatisticasFinanceiras] = useState<EstatisticasFinanceiras | null>(null)
  const [estatisticas, setEstatisticas] = useState({
    totalReports: 0,
    reportsPendentes: 0,
    totalUsuarios: 0,
    usuariosPendentes: 0,
    totalQuestoes: 0,
    totalMaterias: 0
  })
  const [loading, setLoading] = useState(true)
  const [questaoSelecionada, setQuestaoSelecionada] = useState<string | null>(null)
  const [modalQuestaoAberto, setModalQuestaoAberto] = useState(false)
  const [modalComprovanteAberto, setModalComprovanteAberto] = useState(false)
  const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null)

  useEffect(() => {
    if (isAdmin) {
      carregarDados()
    }
  }, [isAdmin])

  const carregarDados = async () => {
    setLoading(true)
    try {
      await Promise.all([
        carregarReports(),
        carregarUsuarios(),
        carregarEstatisticas(),
        carregarUsuariosDetalhados(),
        carregarEstatisticasFinanceiras()
      ])
    } catch (error) {
      console.error('Erro ao carregar dados admin:', error)
    } finally {
      setLoading(false)
    }
  }

  const carregarEstatisticasFinanceiras = async () => {
    try {
      // Buscar dados financeiros
      const { data: usuariosComPagamento, error } = await supabase
        .from('usuarios')
        .select('valor_pago, data_pagamento, status, created_at')
        .not('valor_pago', 'is', null)

      if (error) throw error

      const agora = new Date()
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
      const mesPassado = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)
      const fimMesPassado = new Date(agora.getFullYear(), agora.getMonth(), 0)

      const receitaTotal = usuariosComPagamento?.reduce((acc, u) => acc + (u.valor_pago || 0), 0) || 0
      const receitaMensal = usuariosComPagamento?.filter(u => 
        u.data_pagamento && new Date(u.data_pagamento) >= inicioMes
      ).reduce((acc, u) => acc + (u.valor_pago || 0), 0) || 0

      const receitaMesPassado = usuariosComPagamento?.filter(u => 
        u.data_pagamento && 
        new Date(u.data_pagamento) >= mesPassado && 
        new Date(u.data_pagamento) <= fimMesPassado
      ).reduce((acc, u) => acc + (u.valor_pago || 0), 0) || 0

      const crescimentoMensal = receitaMesPassado > 0 
        ? ((receitaMensal - receitaMesPassado) / receitaMesPassado) * 100 
        : 0

      const totalCadastros = estatisticas.totalUsuarios
      const totalPagamentos = usuariosComPagamento?.length || 0
      const taxaConversao = totalCadastros > 0 ? (totalPagamentos / totalCadastros) * 100 : 0

      const { count: pagamentosPendentes } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact' })
        .eq('status', 'pendente')
        .not('comprovante_url', 'is', null)

      setEstatisticasFinanceiras({
        receitaTotal,
        receitaMensal,
        taxaConversao,
        pagamentosPendentes: pagamentosPendentes || 0,
        usuariosAtivos: estatisticas.totalUsuarios,
        crescimentoMensal
      })
    } catch (error) {
      console.error('Erro ao carregar estatísticas financeiras:', error)
    }
  }

  const carregarUsuariosDetalhados = async () => {
    try {
      // Busca usuários UMA vez e reutiliza para estatísticas
      const detalhados = await getUsuariosDetalhados()
      const stats = await getEstatisticasAdmin(detalhados)
      setUsuariosDetalhados(detalhados)
      setEstatisticasDetalhadas(stats)
    } catch (error) {
      console.error('Erro ao carregar usuários detalhados:', error)
    }
  }
  
  const handleDesconectarUsuario = async (usuarioId: string, nomeUsuario: string) => {
    if (confirm(`Desconectar ${nomeUsuario} de todos os dispositivos?`)) {
      const sucesso = await desconectarUsuario(usuarioId)
      if (sucesso) {
        alert('Usuário desconectado com sucesso!')
        await carregarUsuariosDetalhados()
      } else {
        alert('Erro ao desconectar usuário.')
      }
    }
  }
  
  const formatarTempoAtividade = (dataString: string) => {
    const agora = new Date()
    const atividade = new Date(dataString)
    const diffMs = agora.getTime() - atividade.getTime()
    const diffMinutos = Math.floor(diffMs / (1000 * 60))
    
    if (diffMinutos < 1) return 'Agora mesmo'
    if (diffMinutos < 60) return `${diffMinutos}min atrás`
    
    const diffHoras = Math.floor(diffMinutos / 60)
    if (diffHoras < 24) return `${diffHoras}h atrás`
    
    const diffDias = Math.floor(diffHoras / 24)
    return `${diffDias}d atrás`
  }
  
  const getDeviceIcon = (deviceInfo: DeviceInfo) => {
    const device = deviceInfo?.device || 'Unknown'
    switch (device) {
      case 'Mobile': return '📱'
      case 'Tablet': return '📱'
      case 'Desktop': return '🖥️'
      default: return '💻'
    }
  }

  const carregarReports = async () => {
    try {
      const dados = await getReports()
      setReports(dados)
    } catch (error) {
      console.error('Erro ao carregar reports:', error)
    }
  }

  const carregarUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setUsuarios(data)
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    }
  }

  const carregarEstatisticas = async () => {
    try {
      const [reportsData, usuariosData, questoesData, materiasData] = await Promise.all([
        supabase.from('questao_reports').select('*', { count: 'exact' }),
        supabase.from('usuarios').select('*', { count: 'exact' }),
        supabase.from('questoes').select('*', { count: 'exact' }),
        supabase.from('materias').select('*', { count: 'exact' })
      ])

      const reportsPendentes = await supabase
        .from('questao_reports')
        .select('*', { count: 'exact' })
        .eq('status', 'pendente')

      const usuariosPendentes = await supabase
        .from('usuarios')
        .select('*', { count: 'exact' })
        .eq('status', 'pendente')

      setEstatisticas({
        totalReports: reportsData.count || 0,
        reportsPendentes: reportsPendentes.count || 0,
        totalUsuarios: usuariosData.count || 0,
        usuariosPendentes: usuariosPendentes.count || 0,
        totalQuestoes: questoesData.count || 0,
        totalMaterias: materiasData.count || 0
      })
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }

  const atualizarStatusReport = async (reportId: string, novoStatus: string) => {
    try {
      const { error } = await supabase
        .from('questao_reports')
        .update({ status: novoStatus })
        .eq('id', reportId)

      if (!error) {
        await carregarReports()
        await carregarEstatisticas()
      }
    } catch (error) {
      console.error('Erro ao atualizar status do report:', error)
    }
  }

  const aprovarUsuario = async (usuarioId: string) => {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ 
          status: 'ativo',
          data_aprovacao: new Date().toISOString(),
          aprovado_por: user?.id
        })
        .eq('id', usuarioId)

      if (!error) {
        await carregarUsuarios()
        await carregarEstatisticas()
        await carregarEstatisticasFinanceiras()
      }
    } catch (error) {
      console.error('Erro ao aprovar usuário:', error)
    }
  }

  const rejeitarUsuario = async (usuarioId: string) => {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ status: 'bloqueado' })
        .eq('id', usuarioId)

      if (!error) {
        await carregarUsuarios()
        await carregarEstatisticas()
      }
    } catch (error) {
      console.error('Erro ao rejeitar usuário:', error)
    }
  }

  const formatarData = (dataString: string) => {
    return new Date(dataString).toLocaleString('pt-BR')
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'ativo': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'resolvido': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'rejeitado': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'bloqueado': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'analisando': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const getTipoReportIcon = (tipo: string) => {
    switch (tipo) {
      case 'erro_enunciado': return '📝'
      case 'erro_alternativa': return '📋'
      case 'erro_resposta': return '❌'
      case 'erro_explicacao': return '💡'
      default: return '🔧'
    }
  }

  if (!isAdmin) {
    return (
      <ProtectedRoute>
        <DashboardLayout title="Acesso Negado">
          <div className="text-center py-12">
            <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Acesso Restrito
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Apenas administradores podem acessar esta página.
            </p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout title="Painel Administrativo">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout title="Painel Administrativo">
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-6 rounded-lg text-white">
            <h1 className="text-2xl font-bold mb-2">🛡️ Painel Administrativo</h1>
            <p className="text-purple-100">
              Sistema completo de gestão e monitoramento
            </p>
          </div>

          {/* Navegação por abas */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex space-x-8 px-6 overflow-x-auto">
                {[
                  { id: 'dashboard', nome: 'Dashboard', icon: BarChart3 },
                  { id: 'pagamentos', nome: `Pagamentos (${estatisticasFinanceiras?.pagamentosPendentes || 0})`, icon: CreditCard },
                  { id: 'dispositivos', nome: 'Dispositivos', icon: Smartphone },
                  { id: 'reports', nome: `Reports (${estatisticas.reportsPendentes})`, icon: Flag },
                  { id: 'usuarios', nome: `Usuários (${estatisticas.usuariosPendentes})`, icon: Users },
                  { id: 'relatorios', nome: 'Relatórios', icon: PieChart },
                  { id: 'configuracoes', nome: 'Configurações', icon: Settings }
                ].map((aba) => {
                  const Icon = aba.icon
                  return (
                    <button
                      key={aba.id}
                      onClick={() => setAbaAtiva(aba.id)}
                      className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
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

            {/* Conteúdo das abas */}
            <div className="p-6">
              {/* ABA DASHBOARD */}
              {abaAtiva === 'dashboard' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    📊 Dashboard Executivo
                  </h2>
                  
                  {/* Métricas Financeiras */}
                  {estatisticasFinanceiras && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-3">
                          <DollarSign className="h-8 w-8 text-green-600" />
                          <div>
                            <p className="text-sm text-green-600 dark:text-green-400">Receita Total</p>
                            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                              {formatarMoeda(estatisticasFinanceiras.receitaTotal)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-8 w-8 text-blue-600" />
                          <div>
                            <p className="text-sm text-blue-600 dark:text-blue-400">Receita Mensal</p>
                            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                              {formatarMoeda(estatisticasFinanceiras.receitaMensal)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-3">
                          <Target className="h-8 w-8 text-purple-600" />
                          <div>
                            <p className="text-sm text-purple-600 dark:text-purple-400">Taxa Conversão</p>
                            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                              {estatisticasFinanceiras.taxaConversao.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-8 w-8 text-orange-600" />
                          <div>
                            <p className="text-sm text-orange-600 dark:text-orange-400">Crescimento</p>
                            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                              {estatisticasFinanceiras.crescimentoMensal > 0 ? '+' : ''}{estatisticasFinanceiras.crescimentoMensal.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Cards de estatísticas gerais */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-3">
                        <Flag className="h-8 w-8 text-red-600" />
                        <div>
                          <p className="text-sm text-red-600 dark:text-red-400">Reports Pendentes</p>
                          <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                            {estatisticas.reportsPendentes}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center gap-3">
                        <UserCheck className="h-8 w-8 text-yellow-600" />
                        <div>
                          <p className="text-sm text-yellow-600 dark:text-yellow-400">Usuários Pendentes</p>
                          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                            {estatisticas.usuariosPendentes}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-3">
                        <Users className="h-8 w-8 text-green-600" />
                        <div>
                          <p className="text-sm text-green-600 dark:text-green-400">Total Usuários</p>
                          <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                            {estatisticas.totalUsuarios}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="text-sm text-blue-600 dark:text-blue-400">Total Questões</p>
                          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                            {estatisticas.totalQuestoes}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="h-8 w-8 text-purple-600" />
                        <div>
                          <p className="text-sm text-purple-600 dark:text-purple-400">Total Reports</p>
                          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                            {estatisticas.totalReports}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-8 w-8 text-indigo-600" />
                        <div>
                          <p className="text-sm text-indigo-600 dark:text-indigo-400">Total Matérias</p>
                          <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                            {estatisticas.totalMaterias}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ações rápidas */}
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">🚀 Ações Rápidas</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <button
                        onClick={() => setAbaAtiva('pagamentos')}
                        className="p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-sm"
                      >
                        💰 Ver Pagamentos
                      </button>
                      <button
                        onClick={() => setAbaAtiva('dispositivos')}
                        className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm"
                      >
                        📱 Monitorar Dispositivos
                      </button>
                      <button
                        onClick={() => setAbaAtiva('reports')}
                        className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm"
                      >
                        🚨 Ver Reports
                      </button>
                      <button
                        onClick={() => setAbaAtiva('usuarios')}
                        className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors text-sm"
                      >
                        👥 Aprovar Usuários
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA PAGAMENTOS */}
              {abaAtiva === 'pagamentos' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      💰 Gestão de Pagamentos
                    </h2>
                    <button
                      onClick={carregarUsuarios}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                                            <RefreshCw className="h-4 w-4 inline mr-2" />
                      Atualizar
                    </button>
                  </div>

                  {/* Estatísticas de pagamento */}
                  {estatisticasFinanceiras && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-3">
                          <DollarSign className="h-6 w-6 text-green-600" />
                          <div>
                            <p className="text-sm text-green-600 dark:text-green-400">Receita Total</p>
                            <p className="text-xl font-bold text-green-700 dark:text-green-300">
                              {formatarMoeda(estatisticasFinanceiras.receitaTotal)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-6 w-6 text-blue-600" />
                          <div>
                            <p className="text-sm text-blue-600 dark:text-blue-400">Este Mês</p>
                            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                              {formatarMoeda(estatisticasFinanceiras.receitaMensal)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-center gap-3">
                          <Clock className="h-6 w-6 text-yellow-600" />
                          <div>
                            <p className="text-sm text-yellow-600 dark:text-yellow-400">Pendentes</p>
                            <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
                              {estatisticasFinanceiras.pagamentosPendentes}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-3">
                          <Target className="h-6 w-6 text-purple-600" />
                          <div>
                            <p className="text-sm text-purple-600 dark:text-purple-400">Conversão</p>
                            <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                              {estatisticasFinanceiras.taxaConversao.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lista de usuários com comprovantes */}
                  <div className="space-y-4">
                    {usuarios
                      .filter(u => u.comprovante_url || u.status === 'pendente')
                      .map((usuario) => (
                        <div key={usuario.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <h3 className="font-medium text-gray-900 dark:text-white">
                                  {usuario.nome}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {usuario.email}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                  Cadastrado: {formatarData(usuario.created_at)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(usuario.status)}`}>
                                {usuario.status}
                              </span>
                            </div>
                          </div>

                          {/* Informações de pagamento */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                            {usuario.valor_pago && (
                              <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Valor Pago</p>
                                <p className="font-medium text-green-600 dark:text-green-400">
                                  {formatarMoeda(usuario.valor_pago)}
                                </p>
                              </div>
                            )}
                            
                            {usuario.data_pagamento && (
                              <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Data Pagamento</p>
                                <p className="font-medium text-gray-700 dark:text-gray-300">
                                  {formatarData(usuario.data_pagamento)}
                                </p>
                              </div>
                            )}

                            {usuario.metodo_pagamento && (
                              <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Método</p>
                                <p className="font-medium text-gray-700 dark:text-gray-300">
                                  {usuario.metodo_pagamento}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Observações de pagamento */}
                          {usuario.observacoes_pagamento && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded mb-3">
                              <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Observações:</p>
                              <p className="text-sm text-blue-700 dark:text-blue-300">
                                {usuario.observacoes_pagamento}
                              </p>
                            </div>
                          )}

                          {/* Ações */}
                          <div className="flex gap-2">
                            {usuario.comprovante_url && (
                              <button
                                onClick={() => {
                                  setComprovanteUrl(usuario.comprovante_url!)
                                  setModalComprovanteAberto(true)
                                }}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors flex items-center gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                Ver Comprovante
                              </button>
                            )}

                            {usuario.status === 'pendente' && (
                              <>
                                <button
                                  onClick={() => aprovarUsuario(usuario.id)}
                                  className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors flex items-center gap-1"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  Aprovar
                                </button>
                                <button
                                  onClick={() => rejeitarUsuario(usuario.id)}
                                  className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors flex items-center gap-1"
                                >
                                  <XCircle className="h-3 w-3" />
                                  Rejeitar
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* ABA DISPOSITIVOS */}
              {abaAtiva === 'dispositivos' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      📱 Monitoramento de Dispositivos
                    </h2>
                    <button
                      onClick={carregarUsuariosDetalhados}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4 inline mr-2" />
                      Atualizar
                    </button>
                  </div>

                  {/* Estatísticas de dispositivos */}
                  {estatisticasDetalhadas && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-3">
                          <Wifi className="h-6 w-6 text-green-600" />
                          <div>
                            <p className="text-sm text-green-600 dark:text-green-400">Online Agora</p>
                            <p className="text-xl font-bold text-green-700 dark:text-green-300">
                              {estatisticasDetalhadas.usuariosOnline}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                          <WifiOff className="h-6 w-6 text-gray-600" />
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Offline</p>
                            <p className="text-xl font-bold text-gray-700 dark:text-gray-300">
                              {estatisticasDetalhadas.usuariosOffline}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-3">
                          <Smartphone className="h-6 w-6 text-blue-600" />
                          <div>
                            <p className="text-sm text-blue-600 dark:text-blue-400">Total Dispositivos</p>
                            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                              {estatisticasDetalhadas.totalDispositivos}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-6 w-6 text-orange-600" />
                          <div>
                            <p className="text-sm text-orange-600 dark:text-orange-400">Múltiplos Devices</p>
                            <p className="text-xl font-bold text-orange-700 dark:text-orange-300">
                              {estatisticasDetalhadas.usuariosMultiplosDispositivos}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Alertas de comportamento suspeito */}
                  {usuariosDetalhados.filter(u => u.isSuspeito).length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <h3 className="font-semibold text-red-800 dark:text-red-300 mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Comportamento Suspeito ({usuariosDetalhados.filter(u => u.isSuspeito).length})
                      </h3>
                      <div className="space-y-2">
                        {usuariosDetalhados
                          .filter(u => u.isSuspeito)
                          .map(u => (
                            <div key={u.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border border-red-100 dark:border-red-900">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-lg">⚠️</span>
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{u.nome}</p>
                                  <p className="text-xs text-red-600 dark:text-red-400">{u.motivoSuspeita}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDesconectarUsuario(u.id, u.nome)}
                                className="shrink-0 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 transition-colors flex items-center gap-1"
                              >
                                <LogOut className="h-3 w-3" />
                                Desconectar
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Lista de usuários com dispositivos */}
                  <div className="space-y-4">
                    {usuariosDetalhados
                      .filter(u => u.deviceCount > 0)
                      .sort((a, b) => b.deviceCount - a.deviceCount)
                      .map((usuario) => (
                        <div key={usuario.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                  <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 ${
                                  usuario.isOnline ? 'bg-green-500' : 'bg-gray-400'
                                }`} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium text-gray-900 dark:text-white">
                                    {usuario.nome}
                                  </h3>
                                  {usuario.isOnline && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                      Online
                                    </span>
                                  )}
                                  {usuario.deviceCount > 1 && (
                                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                                      {usuario.deviceCount} dispositivos
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {usuario.email}
                                </p>
                                {usuario.lastActivity && (
                                  <p className="text-xs text-gray-500 dark:text-gray-500">
                                    Última atividade: {formatarTempoAtividade(usuario.lastActivity)}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(usuario.status)}`}>
                                {usuario.status}
                              </span>
                              {usuario.deviceCount > 1 && (
                                <button
                                  onClick={() => handleDesconectarUsuario(usuario.id, usuario.nome)}
                                  className="text-xs text-red-600 hover:text-red-700 underline flex items-center gap-1"
                                >
                                  <LogOut className="h-3 w-3" />
                                  Desconectar Todos
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Dispositivos conectados */}
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              📱 Dispositivos Conectados ({usuario.deviceCount})
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {usuario.devices.map((device: DeviceSession, index: number) => (
                                <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                                  <div className="flex items-start gap-2">
                                    <span className="text-lg">{getDeviceIcon(device.device_info)}</span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="font-medium text-gray-700 dark:text-gray-300 text-sm truncate">
                                          {device.browser_name || device.device_info?.browser || 'Unknown Browser'}
                                        </p>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                          {device.os_name || device.device_info?.os || 'Unknown OS'}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        {device.device_info?.device || 'Desktop'} • {formatarTempoAtividade(device.last_activity)}
                                      </p>
                                      {device.ip_address && (
                                        <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                                          <Globe className="h-3 w-3" />
                                          <span>{device.ip_address}</span>
                                          {device.city && device.country && (
                                            <>
                                              <MapPin className="h-3 w-3 ml-1" />
                                              <span>{device.city}, {device.country}</span>
                                            </>
                                          )}
                                        </div>
                                      )}
                                      {device.device_info?.screen && (
                                        <p className="text-xs text-gray-400 dark:text-gray-500">
                                          Tela: {device.device_info.screen}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Usuários offline */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
                      👤 Usuários Offline ({usuariosDetalhados.filter(u => !u.isOnline).length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {usuariosDetalhados
                        .filter(u => !u.isOnline)
                        .slice(0, 12)
                        .map((usuario) => (
                          <div key={usuario.id} className="bg-white dark:bg-gray-800 p-2 rounded border">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                <User className="h-3 w-3 text-gray-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                                  {usuario.nome}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {usuario.email}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ABA REPORTS */}
              {abaAtiva === 'reports' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      🚨 Gerenciar Reports
                    </h2>
                    <button
                      onClick={carregarReports}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4 inline mr-2" />
                      Atualizar
                    </button>
                  </div>

                  {reports.length === 0 ? (
                    <div className="text-center py-12">
                      <Flag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Nenhum report encontrado
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Quando usuários reportarem problemas, eles aparecerão aqui.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reports.map((report) => (
                        <div key={report.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{getTipoReportIcon(report.tipo)}</span>
                              <div>
                                <h3 className="font-medium text-gray-900 dark:text-white">
                                  {report.tipo.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Por: {report.usuario.nome} • {formatarData(report.created_at)}
                                </p>
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                              {report.status}
                            </span>
                          </div>

                          <div className="mb-3">
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                              <strong>Questão:</strong> {report.questao.enunciado.substring(0, 100)}...
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              <strong>Descrição:</strong> {report.descricao}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => atualizarStatusReport(report.id, 'analisando')}
                              disabled={report.status === 'analisando'}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors disabled:opacity-50"
                            >
                              Analisar
                            </button>
                            <button
                              onClick={() => atualizarStatusReport(report.id, 'resolvido')}
                              disabled={report.status === 'resolvido'}
                              className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors disabled:opacity-50"
                            >
                              Resolver
                            </button>
                            <button
                              onClick={() => atualizarStatusReport(report.id, 'rejeitado')}
                              disabled={report.status === 'rejeitado'}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors disabled:opacity-50"
                            >
                              Rejeitar
                            </button>
                            <button
                              onClick={() => {
                                setQuestaoSelecionada(report.questao_id)
                                setModalQuestaoAberto(true)
                              }}
                              className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors"
                            >
                              <Eye className="h-3 w-3 inline mr-1" />
                              Ver Questão
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ABA USUÁRIOS */}
              {abaAtiva === 'usuarios' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      👥 Gerenciar Usuários
                    </h2>
                    <button
                      onClick={carregarUsuarios}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4 inline mr-2" />
                      Atualizar
                    </button>
                  </div>

                  {/* Estatísticas de usuários */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                        <div>
                          <p className="text-sm text-green-600 dark:text-green-400">Ativos</p>
                          <p className="text-xl font-bold text-green-700 dark:text-green-300">
                            {usuarios.filter(u => u.status === 'ativo').length}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center gap-3">
                        <Clock className="h-6 w-6 text-yellow-600" />
                        <div>
                          <p className="text-sm text-yellow-600 dark:text-yellow-400">Pendentes</p>
                          <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
                            {usuarios.filter(u => u.status === 'pendente').length}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-3">
                        <XCircle className="h-6 w-6 text-red-600" />
                        <div>
                          <p className="text-sm text-red-600 dark:text-red-400">Bloqueados</p>
                          <p className="text-xl font-bold text-red-700 dark:text-red-300">
                            {usuarios.filter(u => u.status === 'bloqueado').length}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-3">
                        <Users className="h-6 w-6 text-blue-600" />
                        <div>
                          <p className="text-sm text-blue-600 dark:text-blue-400">Total</p>
                          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                            {usuarios.length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lista de usuários */}
                  <div className="space-y-4">
                    {usuarios.map((usuario) => (
                      <div key={usuario.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {usuario.nome}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {usuario.email} • {usuario.role}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500">
                                Cadastrado: {formatarData(usuario.created_at)}
                              </p>
                              {usuario.data_aprovacao && (
                                <p className="text-xs text-green-600 dark:text-green-400">
                                  Aprovado: {formatarData(usuario.data_aprovacao)}
                                </p>
                              )}
                                                        </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(usuario.status)}`}>
                              {usuario.status}
                            </span>

                            {usuario.status === 'pendente' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => aprovarUsuario(usuario.id)}
                                  className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors flex items-center gap-1"
                                >
                                  <UserCheck className="h-3 w-3" />
                                  Aprovar
                                </button>
                                <button
                                  onClick={() => rejeitarUsuario(usuario.id)}
                                  className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors flex items-center gap-1"
                                >
                                  <UserX className="h-3 w-3" />
                                  Rejeitar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ABA RELATÓRIOS */}
              {abaAtiva === 'relatorios' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    📊 Relatórios e Analytics
                  </h2>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-3">
                      🚧 Relatórios Avançados em Desenvolvimento
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
                      Os seguintes relatórios serão implementados em breve:
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-gray-800 p-4 rounded border">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">📈 Performance por Matéria</h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <li>• Taxa de acerto por matéria</li>
                          <li>• Questões mais difíceis</li>
                          <li>• Tempo médio de resposta</li>
                          <li>• Evolução do desempenho</li>
                        </ul>
                      </div>

                      <div className="bg-white dark:bg-gray-800 p-4 rounded border">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">👥 Usuários Mais Ativos</h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <li>• Ranking de atividade</li>
                          <li>• Tempo de estudo diário</li>
                          <li>• Questões respondidas</li>
                          <li>• Sequência de estudos</li>
                        </ul>
                      </div>

                      <div className="bg-white dark:bg-gray-800 p-4 rounded border">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">❌ Questões com Mais Erros</h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <li>• Questões mais erradas</li>
                          <li>• Análise de alternativas</li>
                          <li>• Sugestões de melhoria</li>
                          <li>• Reports relacionados</li>
                        </ul>
                      </div>

                      <div className="bg-white dark:bg-gray-800 p-4 rounded border">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">📊 Estatísticas de Uso</h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <li>• Horários de pico</li>
                          <li>• Dispositivos mais usados</li>
                          <li>• Localização dos usuários</li>
                          <li>• Padrões de navegação</li>
                        </ul>
                      </div>

                      <div className="bg-white dark:bg-gray-800 p-4 rounded border">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">💰 Relatório Financeiro</h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <li>• Receita por período</li>
                          <li>• Métodos de pagamento</li>
                          <li>• Taxa de conversão</li>
                          <li>• Previsão de receita</li>
                        </ul>
                      </div>

                      <div className="bg-white dark:bg-gray-800 p-4 rounded border">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">🔒 Relatório de Segurança</h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <li>• Tentativas de login</li>
                          <li>• IPs suspeitos</li>
                          <li>• Múltiplas sessões</li>
                          <li>• Atividades anômalas</li>
                        </ul>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        💡 <strong>Próxima atualização:</strong> Implementação dos gráficos interativos e exportação em PDF/Excel
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA CONFIGURAÇÕES */}
              {abaAtiva === 'configuracoes' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    ⚙️ Configurações do Sistema
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Configurações Gerais */}
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Configurações Gerais
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Aprovação automática</span>
                          <button className="w-10 h-6 bg-gray-300 rounded-full relative">
                            <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1"></div>
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Notificações por email</span>
                          <button className="w-10 h-6 bg-blue-500 rounded-full relative">
                            <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Backup automático</span>
                          <button className="w-10 h-6 bg-blue-500 rounded-full relative">
                            <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Configurações de Segurança */}
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Segurança
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Limite de dispositivos</span>
                          <select className="text-sm border rounded px-2 py-1">
                            <option>2 dispositivos</option>
                            <option>3 dispositivos</option>
                            <option>5 dispositivos</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Sessão expira em</span>
                          <select className="text-sm border rounded px-2 py-1">
                            <option>30 minutos</option>
                            <option>1 hora</option>
                            <option>2 horas</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Alertas de login</span>
                          <button className="w-10 h-6 bg-blue-500 rounded-full relative">
                            <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Configurações Financeiras */}
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Configurações Financeiras
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm text-gray-600 dark:text-gray-400">Valor da mensalidade</label>
                          <input 
                            type="number" 
                            className="w-full text-sm border rounded px-2 py-1 mt-1"
                            placeholder="100.00"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-600 dark:text-gray-400">Dias para expirar</label>
                          <input 
                            type="number" 
                            className="w-full text-sm border rounded px-2 py-1 mt-1"
                            placeholder="30"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Ações do Sistema */}
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Ações do Sistema
                      </h3>
                      <div className="space-y-2">
                        <button className="w-full text-left px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                          <Download className="h-4 w-4 inline mr-2" />
                          Exportar dados dos usuários
                        </button>
                        <button className="w-full text-left px-3 py-2 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors">
                          <Upload className="h-4 w-4 inline mr-2" />
                          Fazer backup do sistema
                        </button>
                        <button className="w-full text-left px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors">
                          <RefreshCw className="h-4 w-4 inline mr-2" />
                          Limpar sessões antigas
                        </button>
                        <button className="w-full text-left px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">
                          <AlertTriangle className="h-4 w-4 inline mr-2" />
                          Resetar estatísticas
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Informações do Sistema */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                      ℹ️ Informações do Sistema
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-blue-700 dark:text-blue-400">Versão do Sistema</p>
                        <p className="font-medium text-blue-900 dark:text-blue-300">v2.1.0</p>
                      </div>
                      <div>
                        <p className="text-blue-700 dark:text-blue-400">Último Backup</p>
                        <p className="font-medium text-blue-900 dark:text-blue-300">Hoje, 08:30</p>
                      </div>
                      <div>
                        <p className="text-blue-700 dark:text-blue-400">Uptime</p>
                        <p className="font-medium text-blue-900 dark:text-blue-300">15 dias, 4h</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal de visualizar questão */}
        <VisualizarQuestao
          questaoId={questaoSelecionada}
          isOpen={modalQuestaoAberto}
          onClose={() => {
            setModalQuestaoAberto(false)
            setQuestaoSelecionada(null)
          }}
        />

        {/* Modal de visualizar comprovante */}
        {modalComprovanteAberto && comprovanteUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  📄 Comprovante de Pagamento
                </h3>
                <button
                  onClick={() => {
                    setModalComprovanteAberto(false)
                    setComprovanteUrl(null)
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <div className="p-4">
                <img 
                  src={comprovanteUrl} 
                  alt="Comprovante de pagamento"
                  className="max-w-full h-auto rounded border"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'text-center py-8 text-gray-500';
                    errorDiv.innerHTML = '❌ Erro ao carregar imagem';
                    target.parentNode?.appendChild(errorDiv);
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  )
}