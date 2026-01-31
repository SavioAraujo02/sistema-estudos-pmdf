'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, ThumbsUp, ThumbsDown, Send, User, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { EditorRico } from './EditorRico'
import { getComentarios, criarComentario, curtirComentario } from '@/lib/questoes'
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
    } finally {
      setEnviando(false)
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
                <EditorRico
                  value={novoComentario}
                  onChange={setNovoComentario}
                  placeholder="Escreva seu comentário sobre esta questão..."
                  className="min-h-[100px]"
                />
                <div className="flex justify-end">
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
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <User className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-black dark:text-white text-sm">
                        {comentario.usuario.nome}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="h-3 w-3" />
                        {formatarTempo(comentario.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Texto do comentário */}
                  <div 
                    className="prose prose-sm max-w-none text-black dark:text-white mb-3 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderizarTexto(comentario.texto) }}
                  />

                  {/* Ações */}
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
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ComentariosInline