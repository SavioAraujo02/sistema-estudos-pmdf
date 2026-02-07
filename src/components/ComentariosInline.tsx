'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, ThumbsUp, ThumbsDown, Send, User, Clock, ChevronDown, ChevronUp, Edit, Trash2, X, Check } from 'lucide-react'
import { EditorVisual } from './EditorVisual'
import { getComentarios, criarComentario, curtirComentario, editarComentario, excluirComentario } from '@/lib/questoes'
import { useAuth } from './AuthProvider'

interface ComentariosInlineProps {
  questaoId: string
  isOpen: boolean
  onToggle: () => void
}

interface Comentario {
  id: string
  texto: string
  created_at: string
  editado_em?: string
  usuario_id: string
  usuario: { nome: string; email: string }
  likes_count: number
  dislikes_count: number
  score: number
  user_like: 'like' | 'dislike' | null
}

export function ComentariosInline({ questaoId, isOpen, onToggle }: ComentariosInlineProps) {
  const { user } = useAuth()
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [novoComentario, setNovoComentario] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [totalComentarios, setTotalComentarios] = useState(0)
  
  // Estados para edição
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [textoEditando, setTextoEditando] = useState('')
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  
  // Estados para exclusão
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null)

  useEffect(() => {
    carregarComentarios()
  }, [questaoId])

  const carregarComentarios = async () => {
    setLoading(true)
    try {
      const dados = await getComentarios(questaoId)
      setComentarios(dados)
      setTotalComentarios(dados.length)
    } catch (error) {
      console.error('Erro ao carregar comentários:', error)
    } finally {
      setLoading(false)
    }
  }

  const enviarComentario = async () => {
    if (!novoComentario.trim() || enviando) return

    setEnviando(true)
    try {
      const comentario = await criarComentario(questaoId, novoComentario)
      if (comentario) {
        setComentarios([comentario, ...comentarios])
        setTotalComentarios(prev => prev + 1)
        setNovoComentario('')
      }
    } catch (error) {
      console.error('Erro ao enviar comentário:', error)
      alert('Erro ao enviar comentário. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  const iniciarEdicao = (comentario: Comentario) => {
    setEditandoId(comentario.id)
    setTextoEditando(comentario.texto)
  }

  const cancelarEdicao = () => {
    setEditandoId(null)
    setTextoEditando('')
  }

  const salvarEdicao = async () => {
    if (!textoEditando.trim() || !editandoId || salvandoEdicao) return

    setSalvandoEdicao(true)
    try {
      const comentarioEditado = await editarComentario(editandoId, textoEditando)
      if (comentarioEditado) {
        // Atualizar o comentário na lista
        setComentarios(prev => prev.map(c => 
          c.id === editandoId 
            ? { ...c, texto: textoEditando, editado_em: new Date().toISOString() }
            : c
        ))
        setEditandoId(null)
        setTextoEditando('')
      }
    } catch (error) {
      console.error('Erro ao editar comentário:', error)
      alert('Erro ao editar comentário. Tente novamente.')
    } finally {
      setSalvandoEdicao(false)
    }
  }

  const confirmarExclusao = (comentarioId: string) => {
    setConfirmandoExclusao(comentarioId)
  }

  const cancelarExclusao = () => {
    setConfirmandoExclusao(null)
  }

  const executarExclusao = async (comentarioId: string) => {
    setExcluindoId(comentarioId)
    try {
      const sucesso = await excluirComentario(comentarioId)
      if (sucesso) {
        setComentarios(prev => prev.filter(c => c.id !== comentarioId))
        setTotalComentarios(prev => prev - 1)
        setConfirmandoExclusao(null)
      }
    } catch (error) {
      console.error('Erro ao excluir comentário:', error)
      alert('Erro ao excluir comentário. Tente novamente.')
    } finally {
      setExcluindoId(null)
    }
  }

  const curtir = async (comentarioId: string, tipo: 'like' | 'dislike') => {
    try {
      const sucesso = await curtirComentario(comentarioId, tipo)
      if (sucesso) {
        await carregarComentarios()
      }
    } catch (error) {
      console.error('Erro ao curtir comentário:', error)
    }
  }

  const formatarTempo = (dataString: string) => {
    const data = new Date(dataString)
    const agora = new Date()
    const diff = agora.getTime() - data.getTime()
    
    const minutos = Math.floor(diff / (1000 * 60))
    const horas = Math.floor(diff / (1000 * 60 * 60))
    const dias = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (minutos < 60) return `${minutos}min atrás`
    if (horas < 24) return `${horas}h atrás`
    return `${dias}d atrás`
  }

  const renderizarTexto = (texto: string) => {
    return texto
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/==(.*?)==/g, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>')
      .replace(/~~(.*?)~~/g, '<del class="line-through text-gray-500 dark:text-gray-400">$1</del>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1 rounded text-sm font-mono text-black dark:text-white">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300" target="_blank">$1</a>')
      .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400 my-2">$1</blockquote>')
      .replace(/\n/g, '<br>')
  }

  const comentarioPertenceAoUsuario = (comentario: Comentario) => {
    return user && comentario.usuario_id === user.id
  }

  return (
    <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
      {/* Botão para expandir/recolher comentários */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
      >
        <MessageCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <span className="font-medium text-black dark:text-white">
          Comentários ({totalComentarios})
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-500 dark:text-gray-400 ml-auto" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400 ml-auto" />
        )}
      </button>

      {/* Seção de comentários expandida */}
      {isOpen && (
        <div className="mt-4 space-y-4">
          {/* Formulário de novo comentário */}
          {user && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-black dark:text-white mb-3">Adicionar comentário</h4>
              <div className="space-y-3">
              <EditorVisual
                value={novoComentario}
                onChange={setNovoComentario}
                placeholder="Escreva seu comentário sobre esta questão..."
                minHeight="100px"
              />
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    💡 Use **negrito**, *itálico*, `código`, [links](url) e ==destaque==
                  </div>
                  <button
                    onClick={enviarComentario}
                    disabled={!novoComentario.trim() || enviando}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {enviando ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {enviando ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lista de comentários */}
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : comentarios.length === 0 ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum comentário ainda.</p>
                <p className="text-sm">Seja o primeiro a comentar!</p>
              </div>
            ) : (
              comentarios.map((comentario) => (
                <div key={comentario.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  {/* Header do comentário */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <User className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="font-medium text-black dark:text-white text-sm">
                          {comentario.usuario.nome}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="h-3 w-3" />
                          {formatarTempo(comentario.created_at)}
                          {comentario.editado_em && (
                            <span className="text-orange-500 dark:text-orange-400">
                              • editado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botões de ação (só para comentários próprios) */}
                    {comentarioPertenceAoUsuario(comentario) && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => iniciarEdicao(comentario)}
                          disabled={editandoId === comentario.id}
                          className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
                          title="Editar comentário"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => confirmarExclusao(comentario.id)}
                          disabled={excluindoId === comentario.id}
                          className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Excluir comentário"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Texto do comentário ou editor */}
                  {editandoId === comentario.id ? (
                    <div className="space-y-3 mb-3">
                      <EditorVisual
                        value={textoEditando}
                        onChange={setTextoEditando}
                        placeholder="Edite seu comentário..."
                        minHeight="80px"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={salvarEdicao}
                          disabled={!textoEditando.trim() || salvandoEdicao}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {salvandoEdicao ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          {salvandoEdicao ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          onClick={cancelarEdicao}
                          disabled={salvandoEdicao}
                          className="flex items-center gap-1 px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 transition-colors disabled:opacity-50"
                        >
                          <X className="h-3 w-3" />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="prose prose-sm max-w-none text-black dark:text-white mb-3 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: renderizarTexto(comentario.texto) }}
                    />
                  )}
  
                    {/* Modal de confirmação de exclusão */}
                    {confirmandoExclusao === comentario.id && (
                      <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm text-red-800 dark:text-red-300 mb-3">
                          ⚠️ Tem certeza que deseja excluir este comentário? Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => executarExclusao(comentario.id)}
                            disabled={excluindoId === comentario.id}
                            className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            {excluindoId === comentario.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                            {excluindoId === comentario.id ? 'Excluindo...' : 'Sim, excluir'}
                          </button>
                          <button
                            onClick={cancelarExclusao}
                            disabled={excluindoId === comentario.id}
                            className="flex items-center gap-1 px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 transition-colors disabled:opacity-50"
                          >
                            <X className="h-3 w-3" />
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
  
                    {/* Ações de curtir/descurtir */}
                    {editandoId !== comentario.id && (
                      <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <button
                          onClick={() => curtir(comentario.id, 'like')}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                            comentario.user_like === 'like'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          <ThumbsUp className="h-3 w-3" />
                          {comentario.likes_count}
                        </button>
  
                        <button
                          onClick={() => curtir(comentario.id, 'dislike')}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                            comentario.user_like === 'dislike'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          <ThumbsDown className="h-3 w-3" />
                          {comentario.dislikes_count}
                        </button>
  
                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                          Score: <span className="font-medium">{comentario.score}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
  
            {/* Dica de formatação */}
            {isOpen && comentarios.length > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2 border-t border-gray-200 dark:border-gray-700">
                💡 Dica: Use formatação rica nos comentários - **negrito**, *itálico*, `código`, [links](url)
              </div>
            )}
          </div>
        )}
      </div>
    )
  }
  
  export default ComentariosInline