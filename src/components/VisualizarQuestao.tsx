'use client'

import { useState, useEffect } from 'react'
import { X, Edit, Play, FileText, CheckCircle, XCircle } from 'lucide-react'
import { getQuestaoComAlternativas } from '@/lib/questoes'
import { EnunciadoFormatado } from './EnunciadoFormatado'

interface VisualizarQuestaoProps {
  questaoId: string | null
  isOpen: boolean
  onClose: () => void
}

interface QuestaoCompleta {
  id: string
  materia_id: string
  enunciado: string
  tipo: 'certo_errado' | 'multipla_escolha'
  explicacao?: string
  resposta_certo_errado?: boolean | null // ADICIONADO | null
  created_at: string
  materia?: { nome: string }
  alternativas?: Array<{
    id: string
    questao_id: string
    texto: string
    correta: boolean
  }>
}

export function VisualizarQuestao({ questaoId, isOpen, onClose }: VisualizarQuestaoProps) {
  const [questao, setQuestao] = useState<QuestaoCompleta | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && questaoId) {
      carregarQuestao()
    }
  }, [isOpen, questaoId])

  const carregarQuestao = async () => {
    if (!questaoId) return
    
    setLoading(true)
    try {
      const dados = await getQuestaoComAlternativas(questaoId)
      setQuestao(dados)
    } catch (error) {
      console.error('Erro ao carregar questão:', error)
    } finally {
      setLoading(false)
    }
  }

  const abrirEdicao = () => {
    if (questao) {
      window.open(`/questoes?edit=${questao.id}`, '_blank')
    }
  }

  const testarQuestao = () => {
    if (questao) {
      window.open(`/estudar?questao=${questao.id}`, '_blank')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Visualizar Questão
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : questao ? (
            <div className="space-y-6">
              {/* Informações da questão */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {questao.materia?.nome || 'Sem matéria'}
                </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    questao.tipo === 'certo_errado'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                  }`}>
                    {questao.tipo === 'certo_errado' ? 'Certo/Errado' : 'Múltipla Escolha'}
                  </span>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  ID: {questao.id}
                </p>
              </div>

              {/* Enunciado */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">📝 Enunciado:</h4>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <EnunciadoFormatado 
                    texto={questao.enunciado}
                    className="text-black dark:text-white"
                  />
                </div>
              </div>

              {/* Alternativas */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  {questao.tipo === 'certo_errado' ? '✅ Resposta Correta:' : '📋 Alternativas:'}
                </h4>
                
                {questao.tipo === 'certo_errado' ? (
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${
                      questao.resposta_certo_errado 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {questao.resposta_certo_errado ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          CERTO
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4" />
                          ERRADO
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {questao.alternativas?.map((alternativa, index) => (
                      <div
                        key={alternativa.id}
                        className={`p-3 rounded-lg border ${
                          alternativa.correta
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-500 w-6">
                            {String.fromCharCode(97 + index)})
                          </span>
                          <span className="text-black dark:text-white flex-1">
                            {alternativa.texto}
                          </span>
                          {alternativa.correta && (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Explicação */}
              {questao.explicacao && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">💡 Explicação:</h4>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-black dark:text-white leading-relaxed">
                      {questao.explicacao}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Questão não encontrada
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Não foi possível carregar os dados da questão.
              </p>
            </div>
          )}
        </div>

        {/* Footer com ações */}
        {questao && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900">
            <div className="flex gap-3 justify-end">
            <button
                onClick={testarQuestao}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
                <Play className="h-4 w-4" />
                Testar Questão
            </button>
            <button
                onClick={() => window.open('/questoes', '_blank')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
                <Edit className="h-4 w-4" />
                Gerenciar Questões
            </button>
            <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
                Fechar
            </button>
            </div>
        </div>
        )}
      </div>
    </div>
  )
}

export default VisualizarQuestao