'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, BookOpen, Loader2, Edit, Trash2, BarChart3, Users, Target, TrendingUp, Play, Eye, Settings } from 'lucide-react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthProvider'
import { getMaterias, createMateria, getMateriasComEstatisticas, updateMateria, deleteMateria } from '@/lib/materias'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface MateriaComStats {
  id: string
  nome: string
  descricao?: string
  questoes_count: number
  percentual_acertos: number
  total_respostas: number
  usuarios_estudaram?: number
  ultima_atividade?: string
}

export default function MateriasPage() {
  const { isAdmin } = useAuth()
  const [materias, setMaterias] = useState<MateriaComStats[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [novaMateria, setNovaMateria] = useState({ nome: '', descricao: '' })
  const [materiaEditando, setMateriaEditando] = useState<MateriaComStats | null>(null)
  const [materiaExcluindo, setMateriaExcluindo] = useState<MateriaComStats | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [filtro, setFiltro] = useState<'todas' | 'com_questoes' | 'sem_questoes'>('todas')

  useEffect(() => {
    carregarMaterias()
  }, [])

  const carregarMaterias = async () => {
    setLoading(true)
    const dados = await getMateriasComEstatisticas()
    
    // Adicionar dados extras para admin
    if (isAdmin) {
      const materiasComExtras = await Promise.all(
        dados.map(async (materia) => {
          const usuariosEstudaram = await contarUsuariosQueEstudaram(materia.id)
          return {
            ...materia,
            usuarios_estudaram: usuariosEstudaram
          }
        })
      )
      setMaterias(materiasComExtras)
    } else {
      setMaterias(dados)
    }
    
    setLoading(false)
  }

  const contarUsuariosQueEstudaram = async (materiaId: string): Promise<number> => {
    const { data, error } = await supabase
      .from('historico_estudos')
      .select('usuario_id, questoes!inner(materia_id)')
      .eq('questoes.materia_id', materiaId)

    if (error) return 0

    // Contar usuários únicos
    const usuariosUnicos = new Set(data?.map(item => item.usuario_id) || [])
    return usuariosUnicos.size
  }

  const handleSalvarMateria = async () => {
    if (!novaMateria.nome.trim()) return

    setSalvando(true)
    const materia = await createMateria(novaMateria.nome, novaMateria.descricao)
    
    if (materia) {
      await carregarMaterias()
      setShowModal(false)
      setNovaMateria({ nome: '', descricao: '' })
    }
    setSalvando(false)
  }

  const handleEditarMateria = async () => {
    if (!materiaEditando || !materiaEditando.nome.trim()) return

    setSalvando(true)
    const sucesso = await updateMateria(
      materiaEditando.id, 
      materiaEditando.nome, 
      materiaEditando.descricao
    )
    
    if (sucesso) {
      await carregarMaterias()
      setShowEditModal(false)
      setMateriaEditando(null)
    } else {
      alert('Erro ao atualizar matéria. Tente novamente.')
    }
    setSalvando(false)
  }

  const handleExcluirMateria = async () => {
    if (!materiaExcluindo) return

    setSalvando(true)
    try {
      const sucesso = await deleteMateria(materiaExcluindo.id)
      
      if (sucesso) {
        await carregarMaterias()
        setShowDeleteModal(false)
        setMateriaExcluindo(null)
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir matéria.')
    }
    setSalvando(false)
  }

  const abrirEdicao = (materia: MateriaComStats) => {
    setMateriaEditando({ ...materia })
    setShowEditModal(true)
  }

  const abrirExclusao = (materia: MateriaComStats) => {
    setMateriaExcluindo(materia)
    setShowDeleteModal(true)
  }

  const materiasFiltradas = materias
    .filter(materia => {
      const matchBusca = materia.nome.toLowerCase().includes(busca.toLowerCase())
      const matchFiltro = 
        filtro === 'todas' ? true :
        filtro === 'com_questoes' ? materia.questoes_count > 0 :
        filtro === 'sem_questoes' ? materia.questoes_count === 0 : true
      
      return matchBusca && matchFiltro
    })
    .sort((a, b) => {
      // Ordenar por questões (mais questões primeiro) e depois por nome
      if (a.questoes_count !== b.questoes_count) {
        return b.questoes_count - a.questoes_count
      }
      return a.nome.localeCompare(b.nome)
    })

  const getCorCard = (acertos: number, questoes: number) => {
    if (questoes === 0) return 'border-gray-200 bg-gray-50 dark:bg-gray-800'
    if (acertos >= 80) return 'border-green-200 bg-green-50 dark:bg-green-900/20'
    if (acertos >= 60) return 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20'
    return 'border-red-200 bg-red-50 dark:bg-red-900/20'
  }

  const getCorTexto = (acertos: number, questoes: number) => {
    if (questoes === 0) return 'text-gray-500 dark:text-gray-400'
    if (acertos >= 80) return 'text-green-600 dark:text-green-400'
    if (acertos >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getStatusMateria = (materia: MateriaComStats) => {
    if (materia.questoes_count === 0) return { texto: 'Sem questões', cor: 'gray' }
    if (materia.total_respostas === 0) return { texto: 'Não estudada', cor: 'blue' }
    if (materia.percentual_acertos >= 80) return { texto: 'Excelente', cor: 'green' }
    if (materia.percentual_acertos >= 60) return { texto: 'Bom', cor: 'yellow' }
    return { texto: 'Precisa atenção', cor: 'red' }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout title="Matérias">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout title={isAdmin ? "Gerenciar Matérias" : "Matérias de Estudo"}>
        <div className="space-y-6">
          {/* Header com estatísticas */}
          <div className={`p-6 rounded-lg text-white ${
            isAdmin 
              ? 'bg-gradient-to-r from-purple-500 to-blue-600' 
              : 'bg-gradient-to-r from-blue-500 to-green-600'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  {isAdmin ? '🛠️ Painel de Matérias' : '📚 Suas Matérias de Estudo'}
                </h2>
                <p className={isAdmin ? 'text-purple-100' : 'text-blue-100'}>
                  {isAdmin 
                    ? 'Gerencie as disciplinas e acompanhe o progresso dos estudantes'
                    : 'Explore as disciplinas disponíveis e acompanhe seu progresso'
                  }
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{materias.length}</div>
                <div className={`text-sm ${isAdmin ? 'text-purple-200' : 'text-blue-200'}`}>
                  {materias.length === 1 ? 'Matéria' : 'Matérias'}
                </div>
              </div>
            </div>
          </div>

          {/* Estatísticas rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">
                    {materias.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Com Questões</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">
                    {materias.filter(m => m.questoes_count > 0).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Questões</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">
                    {materias.reduce((total, m) => total + m.questoes_count, 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  {isAdmin ? <Users className="h-5 w-5 text-orange-600" /> : <TrendingUp className="h-5 w-5 text-orange-600" />}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {isAdmin ? 'Estudantes' : 'Média Geral'}
                  </p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">
                    {isAdmin 
                      ? materias.reduce((total, m) => total + (m.usuarios_estudaram || 0), 0)
                      : `${Math.round(materias.reduce((acc, m) => acc + m.percentual_acertos, 0) / (materias.length || 1))}%`
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Controles */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Busca */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Buscar matérias..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filtros */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFiltro('todas')}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    filtro === 'todas'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFiltro('com_questoes')}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    filtro === 'com_questoes'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Com Questões
                </button>
                <button
                  onClick={() => setFiltro('sem_questoes')}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    filtro === 'sem_questoes'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Sem Questões
                </button>
              </div>
            </div>
            
            {/* Botão Nova Matéria (só admin) */}
            {isAdmin && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Nova Matéria
              </button>
            )}
          </div>

          {/* Grid de matérias */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {materiasFiltradas.map((materia) => {
              const status = getStatusMateria(materia)
              
              return (
                <div
                  key={materia.id}
                  className={`p-6 rounded-lg border-2 transition-all hover:shadow-md ${getCorCard(materia.percentual_acertos, materia.questoes_count)}`}
                >
                  {/* Header do card */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <BookOpen className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {materia.nome}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {materia.questoes_count} questões
                        </p>
                      </div>
                    </div>
                    
                    {/* Status badge */}
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      status.cor === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                      status.cor === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                      status.cor === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                      status.cor === 'blue' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                    }`}>
                      {status.texto}
                    </span>
                  </div>

                  {/* Descrição */}
                  {materia.descricao && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {materia.descricao}
                    </p>
                  )}

                  {/* Estatísticas */}
                  <div className="space-y-3 mb-4">
                    {/* Performance */}
                    {materia.total_respostas > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {isAdmin ? 'Taxa média' : 'Sua taxa'}
                          </span>
                          <span className={`font-semibold ${getCorTexto(materia.percentual_acertos, materia.questoes_count)}`}>
                            {materia.percentual_acertos}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              materia.percentual_acertos >= 80 ? 'bg-green-500' :
                              materia.percentual_acertos >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${materia.percentual_acertos}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Estatísticas extras para admin */}
                    {isAdmin && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white dark:bg-gray-900 p-2 rounded">
                          <div className="text-gray-600 dark:text-gray-400">Estudantes</div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {materia.usuarios_estudaram || 0}
                          </div>
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-2 rounded">
                          <div className="text-gray-600 dark:text-gray-400">Respostas</div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {materia.total_respostas}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2">
                    {isAdmin ? (
                      // Ações do Admin
                      <>
                        <Link
                          href={`/questoes?materia=${materia.id}`}
                          className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center flex items-center justify-center gap-1"
                        >
                          <Settings className="h-3 w-3" />
                          Questões
                        </Link>
                        <button
                          onClick={() => abrirEdicao(materia)}
                          className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          Editar
                        </button>
                        <button
                          onClick={() => abrirExclusao(materia)}
                          className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Excluir
                        </button>
                      </>
                    ) : (
                      // Ações do Usuário
                      <>
                        <Link
                          href={`/estudar?materia=${materia.id}`}
                          className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-center flex items-center justify-center gap-1"
                          title={`Estudar ${materia.nome}`}
                        >
                          <Play className="h-3 w-3" />
                          Estudar
                        </Link>
                        <Link
                          href={`/questoes?materia=${materia.id}`}
                          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
                          title={`Ver questões de ${materia.nome}`}
                        >
                          <Eye className="h-3 w-3" />
                          Ver
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Estado vazio */}
          {materiasFiltradas.length === 0 && !loading && (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {materias.length === 0 
                  ? 'Nenhuma matéria cadastrada' 
                  : busca 
                  ? 'Nenhuma matéria encontrada'
                  : 'Nenhuma matéria neste filtro'
                }
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {materias.length === 0 
                  ? isAdmin 
                    ? 'Comece criando a primeira matéria do sistema.'
                    : 'Aguarde o administrador cadastrar as matérias.'
                  : busca
                  ? 'Tente ajustar sua busca.'
                  : 'Tente outro filtro.'
                }
              </p>
              
              {materias.length === 0 && isAdmin && (
                <button
                  onClick={() => setShowModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Criar Primeira Matéria
                </button>
              )}
            </div>
          )}

          {/* Dicas contextuais */}
          {materias.length > 0 && (
            <div className={`p-6 rounded-lg ${
              isAdmin 
                ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800'
                : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
            }`}>
              <h4 className={`font-medium mb-2 ${
                isAdmin ? 'text-purple-900 dark:text-purple-300' : 'text-blue-900 dark:text-blue-300'
              }`}>
                💡 {isAdmin ? 'Dicas de Administração' : 'Dicas de Estudo'}
              </h4>
              <ul className={`text-sm space-y-1 ${
                isAdmin ? 'text-purple-800 dark:text-purple-400' : 'text-blue-800 dark:text-blue-400'
              }`}>
                {isAdmin ? (
                  <>
                    <li>• Matérias sem questões aparecem em cinza - adicione conteúdo</li>
                    <li>• Use "Gerenciar" para adicionar/editar questões de cada matéria</li>
                    <li>• Acompanhe quantos estudantes estão usando cada matéria</li>
                    <li>• Teste o sistema como usuário para verificar a experiência</li>
                  </>
                ) : (
                  <>
                    <li>• Comece pelas matérias com mais questões disponíveis</li>
                    <li>• Foque nas matérias com menor taxa de acertos</li>
                    <li>• Use "Ver" para explorar as questões antes de estudar</li>
                    <li>• Acompanhe seu progresso nos cards coloridos</li>
                  </>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Modal para nova matéria (só admin) */}
        {showModal && isAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md mx-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Nova Matéria
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome da Matéria *
                  </label>
                  <input
                    type="text"
                    value={novaMateria.nome}
                    onChange={(e) => setNovaMateria({...novaMateria, nome: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Direito Civil"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={novaMateria.descricao}
                    onChange={(e) => setNovaMateria({...novaMateria, descricao: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Descrição da matéria..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowModal(false)
                    setNovaMateria({ nome: '', descricao: '' })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  disabled={salvando}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarMateria}
                  disabled={!novaMateria.nome.trim() || salvando}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
              {/* Modal para editar matéria */}
              {showEditModal && materiaEditando && isAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md mx-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Editar Matéria
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome da Matéria *
                  </label>
                  <input
                    type="text"
                    value={materiaEditando.nome}
                    onChange={(e) => setMateriaEditando({...materiaEditando, nome: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Direito Civil"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={materiaEditando.descricao || ''}
                    onChange={(e) => setMateriaEditando({...materiaEditando, descricao: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Descrição da matéria..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setMateriaEditando(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  disabled={salvando}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEditarMateria}
                  disabled={!materiaEditando.nome.trim() || salvando}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para confirmar exclusão */}
        {showDeleteModal && materiaExcluindo && isAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Excluir Matéria
                </h2>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Tem certeza que deseja excluir a matéria:
              </p>
              <p className="font-semibold text-gray-900 dark:text-white mb-4">
                "{materiaExcluindo.nome}"
              </p>
              
              {materiaExcluindo.questoes_count > 0 ? (
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mb-4">
                  <p className="text-sm text-red-800 dark:text-red-300">
                    ⚠️ Esta matéria possui {materiaExcluindo.questoes_count} questões cadastradas. 
                    Não é possível excluí-la. Remova todas as questões primeiro.
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
                    setShowDeleteModal(false)
                    setMateriaExcluindo(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  disabled={salvando}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExcluirMateria}
                  disabled={materiaExcluindo.questoes_count > 0 || salvando}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
    </ProtectedRoute>
  )
}