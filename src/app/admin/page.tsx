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
  Trash2
} from 'lucide-react'
import { getReports } from '@/lib/questoes'
import { getAssuntosComEstatisticas, createAssunto, updateAssunto, deleteAssunto } from '@/lib/assuntos'
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
}

export default function AdminPage() {
  const { isAdmin, user } = useAuth()
  const [abaAtiva, setAbaAtiva] = useState('dashboard')
  const [reports, setReports] = useState<Report[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [usuariosDetalhados, setUsuariosDetalhados] = useState<UsuarioDetalhado[]>([])
  const [estatisticasDetalhadas, setEstatisticasDetalhadas] = useState<{
    totalUsuarios: number
    usuariosOnline: number
    usuariosOffline: number
    totalDispositivos: number
    usuariosMultiplosDispositivos: number
    dispositivosPorTipo: Record<string, number>
  } | null>(null)
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
  const [assuntos, setAssuntos] = useState<any[]>([])
  const [materiasDisponiveis, setMateriasDisponiveis] = useState<any[]>([])
  const [showAssuntoModal, setShowAssuntoModal] = useState(false)
  const [showEditAssuntoModal, setShowEditAssuntoModal] = useState(false)
  const [showDeleteAssuntoModal, setShowDeleteAssuntoModal] = useState(false)
  const [novoAssunto, setNovoAssunto] = useState({
    materia_id: '',
    nome: '',
    descricao: '',
    cor: '#3B82F6',
    ordem: 0
  })
  const [assuntoEditando, setAssuntoEditando] = useState<any>(null)
  const [assuntoExcluindo, setAssuntoExcluindo] = useState<any>(null)

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
        carregarAssuntos(),
        carregarUsuariosDetalhados(),
        carregarMateriasDisponiveis()
      ])
    } catch (error) {
      console.error('Erro ao carregar dados admin:', error)
    } finally {
      setLoading(false)
    }
  }

  const carregarAssuntos = async () => {
    try {
      const dados = await getAssuntosComEstatisticas()
      setAssuntos(dados)
    } catch (error) {
      console.error('Erro ao carregar assuntos:', error)
    }
  }
  
  const carregarMateriasDisponiveis = async () => {
    try {
      const dados = await getMaterias()
      setMateriasDisponiveis(dados)
    } catch (error) {
      console.error('Erro ao carregar matérias:', error)
    }
  }

  const carregarUsuariosDetalhados = async () => {
    try {
      const [detalhados, stats] = await Promise.all([
        getUsuariosDetalhados(),
        getEstatisticasAdmin()
      ])
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
              Gerencie reports, usuários e monitore o sistema
            </p>
          </div>

          {/* Navegação por abas */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex space-x-8 px-6">
              {[
                { id: 'dashboard', nome: 'Dashboard', icon: BarChart3 },
                { id: 'reports', nome: `Reports (${estatisticas.reportsPendentes})`, icon: Flag },
                { id: 'usuarios', nome: `Usuários (${estatisticas.usuariosPendentes})`, icon: Users },
                { id: 'assuntos', nome: `Assuntos (${assuntos.length})`, icon: BookOpen },
                { id: 'configuracoes', nome: 'Configurações', icon: Settings }
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

            {/* Conteúdo das abas */}
            <div className="p-6">
              {/* ABA DASHBOARD */}
              {abaAtiva === 'dashboard' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    📊 Visão Geral do Sistema
                  </h2>
                  
                  {/* Cards de estatísticas */}
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
                        <BarChart3 className="h-8 w-8 text-indigo-600" />
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
                        onClick={() => setAbaAtiva('reports')}
                        className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm"
                      >
                        Ver Reports
                      </button>
                      <button
                        onClick={() => setAbaAtiva('usuarios')}
                        className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors text-sm"
                      >
                        Aprovar Usuários
                      </button>
                      <button
                        onClick={() => window.open('/questoes', '_blank')}
                        className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm"
                      >
                        Gerenciar Questões
                      </button>
                      <button
                        onClick={() => window.open('/materias', '_blank')}
                        className="p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-sm"
                      >
                        Gerenciar Matérias
                      </button>
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
        onClick={carregarUsuariosDetalhados}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Atualizar
      </button>
    </div>

    {/* Estatísticas de conexão */}
    {estatisticasDetalhadas && (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <span className="text-green-600 text-sm">🟢</span>
            </div>
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
            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center">
              <span className="text-gray-600 text-sm">⚫</span>
            </div>
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
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-sm">📱</span>
            </div>
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400">Dispositivos</p>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                {estatisticasDetalhadas.totalDispositivos}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
              <span className="text-orange-600 text-sm">⚠️</span>
            </div>
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

    {/* Lista de usuários detalhada */}
    <div className="space-y-4">
      {usuariosDetalhados.map((usuario) => (
        <div key={usuario.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                {/* Indicador online/offline */}
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
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {usuario.email} • {usuario.role}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Cadastrado em: {formatarData(usuario.created_at)}
                </p>
                {usuario.lastActivity && (
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Última atividade: {formatarTempoAtividade(usuario.lastActivity)}
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

          {/* Dispositivos conectados */}
          {usuario.deviceCount > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  📱 Dispositivos Conectados ({usuario.deviceCount})
                </h4>
                {usuario.deviceCount > 1 && (
                  <button
                    onClick={() => handleDesconectarUsuario(usuario.id, usuario.nome)}
                    className="text-xs text-red-600 hover:text-red-700 underline"
                  >
                    Desconectar todos
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {usuario.devices.map((device: DeviceSession, index: number) => (
                  <div key={index} className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-lg">{getDeviceIcon(device.device_info)}</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-700 dark:text-gray-300">
                          {device.device_info?.browser || 'Unknown'} • {device.device_info?.os || 'Unknown'}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400">
                          {device.device_info?.device || 'Desktop'} • {formatarTempoAtividade(device.last_activity)}
                        </p>
                        {device.ip_address && (
                          <p className="text-gray-400 dark:text-gray-500">
                            IP: {device.ip_address}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
)}

                            {/* ABA ASSUNTOS */}
                            {abaAtiva === 'assuntos' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      📚 Gerenciar Assuntos
                    </h2>
                    <button
                      onClick={() => setShowAssuntoModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Novo Assunto
                    </button>
                  </div>

                  {assuntos.length === 0 ? (
                    <div className="text-center py-12">
                      <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Nenhum assunto encontrado
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Crie assuntos para organizar as questões por tópicos.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {assuntos.map((assunto) => (
                        <div key={assunto.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3 flex-1">
                              <div 
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: assunto.cor }}
                              />
                              <div className="min-w-0 flex-1">
                                <h3 className="font-medium text-gray-900 dark:text-white truncate">
                                  {assunto.nome}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {assunto.materia?.nome}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                              {assunto.questoes_count} questões
                            </span>
                          </div>

                          {assunto.descricao && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                              {assunto.descricao}
                            </p>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setAssuntoEditando({...assunto})
                                setShowEditAssuntoModal(true)
                              }}
                              className="flex-1 px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors flex items-center justify-center gap-1"
                            >
                              <Edit className="h-3 w-3" />
                              Editar
                            </button>
                            <button
                              onClick={() => {
                                setAssuntoExcluindo(assunto)
                                setShowDeleteAssuntoModal(true)
                              }}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors flex items-center gap-1"
                            >
                              <Trash2 className="h-3 w-3" />
                              Excluir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ABA CONFIGURAÇÕES */}
              {abaAtiva === 'configuracoes' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    ⚙️ Configurações do Sistema
                  </h2>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                      🚧 Em Desenvolvimento
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      Configurações avançadas do sistema serão implementadas em breve:
                    </p>
                    <ul className="text-sm text-blue-700 dark:text-blue-400 mt-2 space-y-1">
                      <li>• Configurar notificações por email</li>
                      <li>• Definir limites de tempo para questões</li>
                      <li>• Configurar aprovação automática de usuários</li>
                      <li>• Backup e exportação de dados</li>
                    </ul>
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
              {/* Modal para novo assunto */}
              {showAssuntoModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md mx-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Novo Assunto
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Matéria *
                  </label>
                  <select
                    value={novoAssunto.materia_id}
                    onChange={(e) => setNovoAssunto({...novoAssunto, materia_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione uma matéria</option>
                    {materiasDisponiveis.map((materia) => (
                      <option key={materia.id} value={materia.id}>
                        {materia.nome}
                      </option>
                    ))}
                  </select>
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
                    setShowAssuntoModal(false)
                    setNovoAssunto({ materia_id: '', nome: '', descricao: '', cor: '#3B82F6', ordem: 0 })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!novoAssunto.nome.trim() || !novoAssunto.materia_id) return
                    setLoading(true)
                    const assunto = await createAssunto(novoAssunto)
                    if (assunto) {
                      await carregarAssuntos()
                      setShowAssuntoModal(false)
                      setNovoAssunto({ materia_id: '', nome: '', descricao: '', cor: '#3B82F6', ordem: 0 })
                    }
                    setLoading(false)
                  }}
                  disabled={!novoAssunto.nome.trim() || !novoAssunto.materia_id || loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
                {/* Modal para editar assunto */}
                {showEditAssuntoModal && assuntoEditando && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md mx-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Editar Assunto
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Matéria
                  </label>
                  <select
                    value={assuntoEditando.materia_id}
                    onChange={(e) => setAssuntoEditando({...assuntoEditando, materia_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {materiasDisponiveis.map((materia) => (
                      <option key={materia.id} value={materia.id}>
                        {materia.nome}
                      </option>
                    ))}
                  </select>
                </div>
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
                    setShowEditAssuntoModal(false)
                    setAssuntoEditando(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!assuntoEditando.nome.trim()) return
                    setLoading(true)
                    const sucesso = await updateAssunto(assuntoEditando.id, {
                      nome: assuntoEditando.nome,
                      descricao: assuntoEditando.descricao,
                      cor: assuntoEditando.cor,
                      ordem: assuntoEditando.ordem
                    })
                    if (sucesso) {
                      await carregarAssuntos()
                      setShowEditAssuntoModal(false)
                      setAssuntoEditando(null)
                    }
                    setLoading(false)
                  }}
                  disabled={!assuntoEditando.nome.trim() || loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para excluir assunto */}
        {showDeleteAssuntoModal && assuntoExcluindo && (
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
              
              {assuntoExcluindo.questoes_count > 0 ? (
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mb-4">
                  <p className="text-sm text-red-800 dark:text-red-300">
                    ⚠️ Este assunto possui {assuntoExcluindo.questoes_count} questões cadastradas. 
                    Não é possível excluí-lo. Remova todas as questões primeiro.
                  </p>
                </div>
              ) : (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg mb-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    ⚠️ Esta ação não pode ser desfeita.
                  </p>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteAssuntoModal(false)
                    setAssuntoExcluindo(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (assuntoExcluindo.questoes_count > 0) return
                    setLoading(true)
                    try {
                      const sucesso = await deleteAssunto(assuntoExcluindo.id)
                      if (sucesso) {
                        await carregarAssuntos()
                        setShowDeleteAssuntoModal(false)
                        setAssuntoExcluindo(null)
                      }
                    } catch (error: any) {
                      alert(error.message || 'Erro ao excluir assunto.')
                    }
                    setLoading(false)
                  }}
                  disabled={assuntoExcluindo.questoes_count > 0 || loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  )
}