'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Loader2 } from 'lucide-react'
import { updateQuestao, getQuestaoComAlternativas } from '@/lib/questoes'

interface EditarQuestaoProps {
  questaoId: string
  onClose: () => void
  onSuccess: () => void
}

interface Alternativa {
  id?: string
  texto: string
  correta: boolean
}

// Interface para as alternativas do banco
interface AlternativaBanco {
  id: string
  questao_id: string
  texto: string
  correta: boolean
}

export function EditarQuestao({ questaoId, onClose, onSuccess }: EditarQuestaoProps) {
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [enunciado, setEnunciado] = useState('')
  const [tipo, setTipo] = useState<'certo_errado' | 'multipla_escolha'>('certo_errado')
  const [explicacao, setExplicacao] = useState('')
  const [alternativas, setAlternativas] = useState<Alternativa[]>([
    { texto: '', correta: true },
    { texto: '', correta: false },
    { texto: '', correta: false },
    { texto: '', correta: false }
  ])

  useEffect(() => {
    carregarQuestao()
  }, [questaoId])

  const carregarQuestao = async () => {
    setLoading(true)
    
    const questao = await getQuestaoComAlternativas(questaoId)
    
    if (questao) {
      setEnunciado(questao.enunciado)
      setTipo(questao.tipo)
      setExplicacao(questao.explicacao || '')
      
      if (questao.alternativas && questao.alternativas.length > 0) {
        setAlternativas(questao.alternativas.map((alt: AlternativaBanco) => ({
          id: alt.id,
          texto: alt.texto,
          correta: alt.correta
        })))
      }
    }
    
    setLoading(false)
  }

  const adicionarAlternativa = () => {
    setAlternativas([...alternativas, { texto: '', correta: false }])
  }

  const removerAlternativa = (index: number) => {
    if (alternativas.length > 2) {
      setAlternativas(alternativas.filter((_, i) => i !== index))
    }
  }

  const atualizarAlternativa = (index: number, campo: 'texto' | 'correta', valor: string | boolean) => {
    const novasAlternativas = [...alternativas]
    
    if (campo === 'correta' && valor === true) {
      novasAlternativas.forEach((alt, i) => {
        alt.correta = i === index
      })
    } else if (campo === 'texto') {
      novasAlternativas[index].texto = valor as string
    } else if (campo === 'correta') {
      novasAlternativas[index].correta = valor as boolean
    }
    
    setAlternativas(novasAlternativas)
  }

  const validarFormulario = () => {
    if (!enunciado.trim()) return 'Enunciado é obrigatório'
    
    if (tipo === 'multipla_escolha') {
      const alternativasPreenchidas = alternativas.filter(alt => alt.texto.trim())
      if (alternativasPreenchidas.length < 2) return 'Mínimo 2 alternativas'
      
      const temCorreta = alternativas.some(alt => alt.correta && alt.texto.trim())
      if (!temCorreta) return 'Marque uma alternativa como correta'
    }
    
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const erro = validarFormulario()
    if (erro) {
      alert(erro)
      return
    }

    setSalvando(true)

    const dadosQuestao = {
      enunciado: enunciado.trim(),
      tipo,
      explicacao: explicacao.trim() || undefined,
      alternativas: tipo === 'multipla_escolha' 
        ? alternativas.filter(alt => alt.texto.trim())
        : undefined
    }

    const resultado = await updateQuestao(questaoId, dadosQuestao)
    
    if (resultado) {
      onSuccess()
      onClose()
    } else {
      alert('Erro ao atualizar questão. Tente novamente.')
    }
    
    setSalvando(false)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-gray-900 dark:text-white">Carregando questão...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Editar Questão
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Enunciado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enunciado da Questão *
            </label>
            <textarea
              value={enunciado}
              onChange={(e) => setEnunciado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              required
            />
          </div>

          {/* Tipo */}
          <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Questão
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="certo_errado"
                  checked={tipo === 'certo_errado'}
                  onChange={(e) => setTipo(e.target.value as any)}
                  className="mr-2"
                />
                Certo/Errado
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="multipla_escolha"
                  checked={tipo === 'multipla_escolha'}
                  onChange={(e) => setTipo(e.target.value as any)}
                  className="mr-2"
                />
                Múltipla Escolha
              </label>
            </div>
          </div>

          {/* Alternativas (só para múltipla escolha) */}
          {tipo === 'multipla_escolha' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Alternativas
                </label>
                <button
                  type="button"
                  onClick={adicionarAlternativa}
                  className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar
                </button>
              </div>
              
              <div className="space-y-3">
                {alternativas.map((alternativa, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500 w-6">
                      {String.fromCharCode(65 + index)})
                    </span>
                    <input
                      type="text"
                      value={alternativa.texto}
                      onChange={(e) => atualizarAlternativa(index, 'texto', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Alternativa ${String.fromCharCode(65 + index)}`}
                    />
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name="alternativa_correta"
                        checked={alternativa.correta}
                        onChange={() => atualizarAlternativa(index, 'correta', true)}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Correta</span>
                    </label>
                    {alternativas.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removerAlternativa(index)}
                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Explicação */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Explicação/Comentário (opcional)
            </label>
            <textarea
              value={explicacao}
              onChange={(e) => setExplicacao(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Explique a resposta correta, cite jurisprudência, dicas..."
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={salvando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}