'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthProvider'
import { getEstatisticasEstudo } from '@/lib/estudo'
import { getMateriasComEstatisticas } from '@/lib/materias'
import { TrendingUp, TrendingDown, Clock, Target, BookOpen, Zap, Users, Settings, Plus, BarChart3, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'

interface EstatisticasDashboard {
  totalRespostas: number
  acertos: number
  percentualAcertos: number
  porMateria: Record<string, { total: number; acertos: number; percentual: number }>
}

interface EstatisticasAdmin {
  totalQuestoes: number
  totalMaterias: number
  totalUsuarios: number
  questoesMaisErradas: any[]
  atividadeRecente: any[]
}

export default function DashboardPage() {
  const { isAdmin, user } = useAuth()
  const [estatisticas, setEstatisticas] = useState<EstatisticasDashboard | null>(null)
  const [estatisticasAdmin, setEstatisticasAdmin] = useState<EstatisticasAdmin | null>(null)
  const [materias, setMaterias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarDados()
  }, [isAdmin])

  const carregarDados = async () => {
    setLoading(true)
    
    try {
      console.log('🔄 Carregando dados do dashboard...')
      
      if (isAdmin) {
        await carregarDadosAdmin()
      } else {
        await carregarDadosUsuario()
      }
      
      console.log('✅ Dados do dashboard carregados com sucesso')
    } catch (error) {
      console.error('❌ Erro ao carregar dados do dashboard:', error)
      // Tentar novamente após 2 segundos
      setTimeout(() => {
        console.log('🔄 Tentando carregar dados novamente...')
        carregarDados()
      }, 2000)
    } finally {
      setLoading(false)
    }
  }

  const carregarDadosUsuario = async () => {
    try {
      const [statsData, materiasData] = await Promise.all([
        getEstatisticasEstudo(),
        getMateriasComEstatisticas()
      ])
      
      console.log('📊 Estatísticas carregadas:', statsData)
      console.log('📚 Matérias carregadas:', materiasData.length)
      
      setEstatisticas(statsData)
      setMaterias(materiasData)
    } catch (error) {
      console.error('❌ Erro ao carregar dados do usuário:', error)
      throw error
    }
  }

  const carregarDadosAdmin = async () => {
    // Carregar dados do usuário também
    await carregarDadosUsuario()
    
    // Carregar dados específicos do admin
    const adminStats = await carregarEstatisticasAdmin()
    setEstatisticasAdmin(adminStats)
  }

  const carregarEstatisticasAdmin = async (): Promise<EstatisticasAdmin> => {
    // Aqui você pode implementar queries específicas para admin
    // Por enquanto, vamos usar dados básicos
    const totalQuestoes = materias.reduce((total, m) => total + m.questoes_count, 0)
    const totalMaterias = materias.length
    
    return {
      totalQuestoes,
      totalMaterias,
      totalUsuarios: 1, // Implementar depois
      questoesMaisErradas: [], // Implementar depois
      atividadeRecente: [] // Implementar depois
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout title="Dashboard">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout title={isAdmin ? "Dashboard Admin" : "Meu Dashboard"}>
        {isAdmin ? <DashboardAdmin /> : <DashboardUsuario />}
      </DashboardLayout>
    </ProtectedRoute>
  )

  // DASHBOARD ADMIN
  function DashboardAdmin() {
    const temDados = materias.length > 0
    
    if (!temDados) {
      return <OnboardingAdmin />
    }

    return (
      <div className="space-y-6">
        {/* Header Admin */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-6 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">
                👨‍💼 Painel Administrativo
              </h2>
              <p className="text-purple-100">
                Gerencie questões, matérias e acompanhe o progresso dos usuários
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{materias.reduce((total, m) => total + m.questoes_count, 0)}</div>
              <div className="text-sm text-purple-200">Questões Cadastradas</div>
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas Admin */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Questões</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {materias.reduce((total, m) => total + m.questoes_count, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Matérias</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {materias.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Usuários Ativos</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {estatisticasAdmin?.totalUsuarios || 1}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <BarChart3 className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Taxa Geral</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {estatisticas?.percentualAcertos || 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ações Rápidas Admin */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            🚀 Ações Rápidas
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              href="/questoes"
              className="flex flex-col items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <Plus className="h-6 w-6 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                Nova Questão
              </span>
            </Link>
            
            <Link
              href="/materias"
              className="flex flex-col items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            >
              <BookOpen className="h-6 w-6 text-green-600 mb-2" />
              <span className="text-sm font-medium text-green-900 dark:text-green-300">
                Gerenciar Matérias
              </span>
            </Link>
            
            <Link
              href="/relatorios"
              className="flex flex-col items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
            >
              <BarChart3 className="h-6 w-6 text-purple-600 mb-2" />
              <span className="text-sm font-medium text-purple-900 dark:text-purple-300">
                Relatórios
              </span>
            </Link>
            
            <Link
              href="/estudar"
              className="flex flex-col items-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
            >
              <Zap className="h-6 w-6 text-orange-600 mb-2" />
              <span className="text-sm font-medium text-orange-900 dark:text-orange-300">
                Testar Sistema
              </span>
            </Link>
          </div>
        </div>

        {/* Status das Matérias */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              📚 Status das Matérias
            </h3>
            <div className="space-y-3">
              {materias.slice(0, 5).map((materia) => (
                <div key={materia.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{materia.nome}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {materia.questoes_count} questões
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {materia.questoes_count > 0 ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    )}
                    <Link
                      href={`/questoes?materia=${materia.id}`}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Gerenciar
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              📊 Insights do Sistema
            </h3>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                  💡 Dica: Adicione mais questões nas matérias com poucos dados
                </p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm font-medium text-green-900 dark:text-green-300">
                  ✅ Sistema funcionando perfeitamente
                </p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-sm font-medium text-purple-900 dark:text-purple-300">
                  📈 Use os relatórios para acompanhar o progresso
                </p>
              </div>
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
        atual.percentual_acertos > melhor.percentual_acertos ? atual : melhor
      ) : null

    const materiasComProblemas = materias.filter(m => m.percentual_acertos < 70 && m.total_respostas > 0)

    return (
      <div className="space-y-6">
        {/* Header Usuário */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">
                🎯 Olá, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Estudante'}!
              </h2>
              <p className="text-blue-100">
                Continue sua jornada de estudos para o CFP da PMDF
              </p>
            </div>
            <div className="text-right">
            <div className="flex items-center gap-3">
              <button
                onClick={carregarDados}
                disabled={loading}
                className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
                title="Recarregar dados"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>
              <div>
                <div className="text-2xl font-bold">{estatisticas?.percentualAcertos || 0}%</div>
                <div className="text-sm text-blue-200">Taxa de Acertos</div>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Cards de Progresso do Usuário */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Respondidas</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {estatisticas?.totalRespostas || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Acertos</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {estatisticas?.acertos || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${
                (estatisticas?.percentualAcertos || 0) >= 70 
                  ? 'bg-green-100 dark:bg-green-900' 
                  : 'bg-yellow-100 dark:bg-yellow-900'
              }`}>
                {(estatisticas?.percentualAcertos || 0) >= 70 ? (
                  <TrendingUp className="h-6 w-6 text-green-600" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-yellow-600" />
                )}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Performance</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {estatisticas?.percentualAcertos || 0}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Melhor Matéria</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {melhorMateria?.nome.substring(0, 12) || 'Nenhuma'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Continuar Estudando */}
        <div className="bg-gradient-to-r from-green-500 to-blue-600 p-6 rounded-lg text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">
                🚀 Continuar Estudando
              </h2>
              <p className="text-green-100">
                Você já respondeu {estatisticas?.totalRespostas} questões. Continue praticando!
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/estudar"
                className="px-6 py-3 bg-white text-green-600 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                Sessão Rápida
              </Link>
              <Link
                href="/materias"
                className="px-6 py-3 border border-white text-white rounded-lg hover:bg-white hover:text-green-600 transition-colors font-medium"
              >
                Escolher Matéria
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance por Matéria */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              📊 Sua Performance
            </h3>
            <div className="space-y-4">
              {materias.slice(0, 5).map((materia) => (
                <div key={materia.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {materia.nome}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            materia.percentual_acertos >= 80 ? 'bg-green-500' :
                            materia.percentual_acertos >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.max(materia.percentual_acertos, 5)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400 w-12 text-right">
                        {materia.total_respostas > 0 ? `${materia.percentual_acertos}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/estudar?materia=${materia.id}`}
                    className="ml-3 px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  >
                    Estudar
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Áreas que Precisam de Atenção */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              ⚠️ Focar Nestas Matérias
            </h3>
            <div className="space-y-3">
              {materiasComProblemas.length > 0 ? (
                materiasComProblemas.map((materia) => (
                  <div key={materia.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-yellow-600">⚠️</span>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm text-gray-900 dark:text-white block truncate">
                          {materia.nome}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {materia.total_respostas} questões • {materia.percentual_acertos}% acertos
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/estudar?materia=${materia.id}`}
                      className="px-3 py-1 text-xs bg-yellow-600 text-white rounded-full hover:bg-yellow-700 transition-colors"
                    >
                      Revisar
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🎉</div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Parabéns! Todas as matérias estão com boa performance!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
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
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
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

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
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

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">3. Testar Sistema</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Experimente o modo de estudo
            </p>
            <Link
              href="/estudar"
              className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Testar Estudo
            </Link>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">💡 Dicas para começar:</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-2">
            <li>• Crie matérias baseadas no edital do CFP (Direito, Português, etc.)</li>
            <li>• Use a importação em lote para adicionar várias questões rapidamente</li>
            <li>• Teste o sistema como usuário para verificar a experiência</li>
            <li>• Acompanhe os relatórios para ver o progresso dos estudantes</li>
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
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
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

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
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
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">📋 Matérias Disponíveis:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {materias.map((materia) => (
                <Link
                  key={materia.id}
                  href={`/estudar?materia=${materia.id}`}
                  className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="font-medium text-gray-900 dark:text-white">{materia.nome}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {materia.questoes_count} questões disponíveis
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
          <h3 className="font-semibold text-green-900 dark:text-green-300 mb-3">🚀 Como funciona:</h3>
          <ul className="text-sm text-green-800 dark:text-green-400 space-y-2">
            <li>• Escolha uma matéria ou estude todas de uma vez</li>
            <li>• Responda as questões e veja explicações detalhadas</li>
            <li>• Acompanhe seu progresso e identifique pontos fracos</li>
            <li>• Use os relatórios para revisar seu desempenho</li>
          </ul>
        </div>
      </div>
    )
  }
}