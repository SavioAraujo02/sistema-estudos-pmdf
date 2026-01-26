'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Tag as TagIcon, Loader2, X, Palette } from 'lucide-react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthProvider'
import { getTags, createTag, updateTag, deleteTag, CORES_TAGS, type Tag } from '@/lib/tags'

export default function TagsPage() {
  const { isAdmin } = useAuth()
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [tagEditando, setTagEditando] = useState<Tag | null>(null)
  const [tagExcluindo, setTagExcluindo] = useState<Tag | null>(null)
  const [novaTag, setNovaTag] = useState({ nome: '', cor: CORES_TAGS[0] })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregarTags()
  }, [])

  const carregarTags = async () => {
    setLoading(true)
    const dados = await getTags()
    setTags(dados)
    setLoading(false)
  }

  const handleCriarTag = async () => {
    if (!novaTag.nome.trim()) return

    setSalvando(true)
    const tag = await createTag(novaTag.nome, novaTag.cor)
    
    if (tag) {
      await carregarTags()
      setShowModal(false)
      setNovaTag({ nome: '', cor: CORES_TAGS[0] })
    } else {
      alert('Erro ao criar tag. Tente novamente.')
    }
    setSalvando(false)
  }

  const handleEditarTag = async () => {
    if (!tagEditando || !tagEditando.nome.trim()) return

    setSalvando(true)
    const sucesso = await updateTag(tagEditando.id, tagEditando.nome, tagEditando.cor)
    
    if (sucesso) {
      await carregarTags()
      setShowEditModal(false)
      setTagEditando(null)
    } else {
      alert('Erro ao atualizar tag. Tente novamente.')
    }
    setSalvando(false)
  }

  const handleExcluirTag = async () => {
    if (!tagExcluindo) return

    setSalvando(true)
    const sucesso = await deleteTag(tagExcluindo.id)
    
    if (sucesso) {
      await carregarTags()
      setShowDeleteModal(false)
      setTagExcluindo(null)
    } else {
      alert('Erro ao excluir tag. Tente novamente.')
    }
    setSalvando(false)
  }

  const abrirEdicao = (tag: Tag) => {
    setTagEditando({ ...tag })
    setShowEditModal(true)
  }

  const abrirExclusao = (tag: Tag) => {
    setTagExcluindo(tag)
    setShowDeleteModal(true)
  }

  if (!isAdmin) {
    return (
      <ProtectedRoute>
        <DashboardLayout title="Tags">
          <div className="text-center py-12">
            <TagIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Acesso Restrito
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Apenas administradores podem gerenciar tags.
            </p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout title="Gerenciar Tags">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout title="Gerenciar Tags">
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  🏷️ Gerenciamento de Tags
                </h2>
                <p className="text-indigo-100">
                  Organize questões por assuntos específicos
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{tags.length}</div>
                <div className="text-sm text-indigo-200">Tags Cadastradas</div>
              </div>
            </div>
          </div>

          {/* Botão Nova Tag */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Tags do Sistema
            </h3>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nova Tag
            </button>
          </div>

          {/* Lista de Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: tag.cor }}
                    />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {tag.nome}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => abrirEdicao(tag)}
                      className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => abrirExclusao(tag)}
                      className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {tag.questoes_count || 0} questões
                </div>
              </div>
            ))}
          </div>

          {/* Estado vazio */}
          {tags.length === 0 && (
            <div className="text-center py-12">
              <TagIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Nenhuma tag cadastrada
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Crie tags para organizar suas questões por assunto.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Criar Primeira Tag
              </button>
            </div>
          )}
        </div>

        {/* Modal Nova Tag */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Nova Tag
                  </h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nome da Tag
                    </label>
                    <input
                      type="text"
                      value={novaTag.nome}
                      onChange={(e) => setNovaTag({...novaTag, nome: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ex: Direito Constitucional"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Cor da Tag
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                      {CORES_TAGS.map((cor) => (
                        <button
                          key={cor}
                          onClick={() => setNovaTag({...novaTag, cor})}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            novaTag.cor === cor ? 'border-gray-900 dark:border-white scale-110' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: cor }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCriarTag}
                    disabled={!novaTag.nome.trim() || salvando}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
                    Criar Tag
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Editar Tag */}
        {showEditModal && tagEditando && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Editar Tag
                  </h3>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nome da Tag
                    </label>
                    <input
                      type="text"
                      value={tagEditando.nome}
                      onChange={(e) => setTagEditando({...tagEditando, nome: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Cor da Tag
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                      {CORES_TAGS.map((cor) => (
                        <button
                          key={cor}
                          onClick={() => setTagEditando({...tagEditando, cor})}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            tagEditando.cor === cor ? 'border-gray-900 dark:border-white scale-110' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: cor }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                                        onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleEditarTag}
                    disabled={!tagEditando.nome.trim() || salvando}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Excluir Tag */}
        {showDeleteModal && tagExcluindo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Excluir Tag
                  </h3>
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Tem certeza que deseja excluir a tag:
                </p>
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: tagExcluindo.cor }}
                  />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {tagExcluindo.nome}
                  </span>
                </div>
                
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg mb-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    ⚠️ Esta ação removerá a tag de todas as questões associadas.
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleExcluirTag}
                    disabled={salvando}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  )
}