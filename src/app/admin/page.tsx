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
  UserX
} from 'lucide-react'
import { getReports } from '@/lib/questoes'
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

export default function AdminPage() {
  const { isAdmin, user } = useAuth()
  const [abaAtiva, setAbaAtiva] = useState('dashboard')
  const [reports, setReports] = useState<Report[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
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
        carregarEstatisticas()
      ])
    } catch (error) {
      console.error('Erro ao carregar dados admin:', error)
    } finally {
      setLoading(false)
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
                      onClick={carregarUsuarios}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Atualizar
                    </button>
                  </div>

                  <div className="space-y-4">
                    {usuarios.map((usuario) => (
                      <div key={usuario.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
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
                                Cadastrado em: {formatarData(usuario.created_at)}
                              </p>
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
      </DashboardLayout>
    </ProtectedRoute>
  )
}