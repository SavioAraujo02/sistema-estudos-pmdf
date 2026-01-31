'use client'

import { useState } from 'react'
import { Flag, Send, AlertTriangle, FileText, X, CheckCircle } from 'lucide-react'
import { criarReport } from '@/lib/questoes'
import { useAuth } from './AuthProvider'

interface ReportarErroProps {
  questaoId: string
  isOpen: boolean
  onToggle: () => void
}

const tiposReport = [
  { id: 'erro_enunciado', nome: 'Erro no enunciado', icon: '📝', desc: 'Texto confuso, erro de português, etc.' },
  { id: 'erro_alternativa', nome: 'Erro nas alternativas', icon: '📋', desc: 'Alternativa incorreta ou mal formulada' },
  { id: 'erro_resposta', nome: 'Resposta incorreta', icon: '❌', desc: 'A resposta marcada como correta está errada' },
  { id: 'erro_explicacao', nome: 'Erro na explicação', icon: '💡', desc: 'Explicação confusa ou incorreta' },
  { id: 'outro', nome: 'Outro problema', icon: '🔧', desc: 'Outro tipo de erro não listado acima' }
]

export function ReportarErro({ questaoId, isOpen, onToggle }: ReportarErroProps) {
  const { user } = useAuth()
  const [tipoSelecionado, setTipoSelecionado] = useState('')
  const [descricao, setDescricao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const enviarReport = async () => {
    if (!tipoSelecionado || !descricao.trim() || enviando) return

    setEnviando(true)
    try {
      const report = await criarReport(questaoId, tipoSelecionado, descricao)
      if (report) {
        setEnviado(true)
        setTipoSelecionado('')
        setDescricao('')
        
        // Fechar automaticamente após 2 segundos
        setTimeout(() => {
          setEnviado(false)
          onToggle()
        }, 2000)
      }
    } catch (error) {
      console.error('Erro ao enviar report:', error)
    } finally {
      setEnviando(false)
    }
  }

  const resetar = () => {
    setTipoSelecionado('')
    setDescricao('')
    setEnviado(false)
  }

  if (!user) return null

  return (
    <div className="mt-4">
      {/* Botão para expandir/recolher */}
      <button
        onClick={() => {
          onToggle()
          if (!isOpen) resetar()
        }}
        className="flex items-center gap-2 w-full p-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors text-left border border-red-200 dark:border-red-800"
      >
        <Flag className="h-4 w-4 text-red-600 dark:text-red-400" />
        <span className="font-medium text-red-700 dark:text-red-300">
          Reportar Erro na Questão
        </span>
        {isOpen ? (
          <X className="h-4 w-4 text-red-500 dark:text-red-400 ml-auto" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400 ml-auto" />
        )}
      </button>

      {/* Formulário de report */}
      {isOpen && (
        <div className="mt-4 bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
          {enviado ? (
            <div className="text-center py-6">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-green-700 dark:text-green-300 mb-2">
                Report enviado com sucesso!
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                O administrador será notificado e analisará o problema reportado.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-red-800 dark:text-red-200 mb-3 flex items-center gap-2">
                  <Flag className="h-4 w-4" />
                  Qual é o problema com esta questão?
                </h4>
                
                {/* Tipos de erro */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                  {tiposReport.map((tipo) => (
                    <button
                      key={tipo.id}
                      onClick={() => setTipoSelecionado(tipo.id)}
                      className={`p-3 text-left rounded-lg border-2 transition-all ${
                        tipoSelecionado === tipo.id
                          ? 'border-red-500 bg-red-100 dark:bg-red-900/40'
                          : 'border-red-200 dark:border-red-700 hover:border-red-300 dark:hover:border-red-600 bg-white dark:bg-red-900/10'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg">{tipo.icon}</span>
                        <div>
                          <div className="font-medium text-red-800 dark:text-red-200 text-sm">
                            {tipo.nome}
                          </div>
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {tipo.desc}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Descrição detalhada */}
              {tipoSelecionado && (
                <div>
                  <label className="block text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                    Descreva o problema em detalhes:
                  </label>
                  <textarea
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Explique qual é o erro e, se possível, sugira a correção..."
                    className="w-full h-24 p-3 border border-red-300 dark:border-red-600 rounded-lg bg-white dark:bg-red-900/10 text-black dark:text-white placeholder-red-400 dark:placeholder-red-500 resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={enviarReport}
                  disabled={!tipoSelecionado || !descricao.trim() || enviando}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {enviando ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {enviando ? 'Enviando...' : 'Enviar Report'}
                </button>

                <button
                  onClick={() => {
                    resetar()
                    onToggle()
                  }}
                  className="px-4 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  Cancelar
                </button>
              </div>

              {/* Informação sobre notificação */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>📧 O administrador será notificado:</strong> Seu report será enviado diretamente para o admin do sistema, que analisará e corrigirá o problema reportado.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ReportarErro