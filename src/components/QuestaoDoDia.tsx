'use client'

import { useState, useEffect } from 'react'
import { Star, CheckCircle, XCircle, Users, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { getQuestaoDoDia, invalidarCacheQuestaoDoDia, QuestaoDoDia as QuestaoDoDiaType } from '@/lib/questaoDoDia'
import { salvarResposta } from '@/lib/estudo'
import { cacheInvalidarPrefixo } from '@/lib/cache'
import { EnunciadoFormatado } from './EnunciadoFormatado'

export function QuestaoDoDia() {
  const [questao, setQuestao] = useState<QuestaoDoDiaType | null>(null)
  const [loading, setLoading] = useState(true)
  const [respostaSelecionada, setRespostaSelecionada] = useState<string | boolean | null>(null)
  const [respondida, setRespondida] = useState(false)
  const [acertou, setAcertou] = useState(false)
  const [expandida, setExpandida] = useState(false)
  const [mostrarExplicacao, setMostrarExplicacao] = useState(false)

  useEffect(() => {
    carregarQuestao()
  }, [])

  const carregarQuestao = async () => {
    setLoading(true)
    const data = await getQuestaoDoDia()
    setQuestao(data)
    if (data?.jaRespondeu) {
      setRespondida(true)
      setAcertou(data.acertou || false)
    }
    setLoading(false)
  }

  const handleResponder = async () => {
    if (!questao || respostaSelecionada === null) return

    let correto = false

    if (questao.tipo === 'certo_errado') {
      correto = respostaSelecionada === questao.resposta_certo_errado
    } else {
      const alternativaCorreta = questao.alternativas.find(a => a.correta)
      correto = respostaSelecionada === alternativaCorreta?.id
    }

    setAcertou(correto)
    setRespondida(true)

    // Salvar no banco
    await salvarResposta(questao.id, correto)

    // Invalidar caches
    invalidarCacheQuestaoDoDia()
    cacheInvalidarPrefixo('materias_stats')
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-2xl border border-amber-200 dark:border-amber-800 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="animate-pulse h-5 w-5 bg-amber-300 rounded-full" />
          <div className="animate-pulse h-4 w-32 bg-amber-200 rounded" />
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-amber-100 rounded w-full" />
          <div className="h-4 bg-amber-100 rounded w-3/4" />
        </div>
      </div>
    )
  }

  if (!questao) return null

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-2xl border-2 border-amber-200 dark:border-amber-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
        <button
          onClick={() => setExpandida(!expandida)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm sm:text-base font-bold text-amber-900 dark:text-amber-200">
              Questão do Dia
            </h3>
            <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-full text-[10px] font-medium">
              {questao.materia}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {respondida && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                acertou
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}>
                {acertou ? '✓ Acertou' : '✗ Errou'}
              </span>
            )}
            {expandida ? (
              <ChevronUp className="h-4 w-4 text-amber-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-amber-500" />
            )}
          </div>
        </button>

        {/* Preview do enunciado (quando colapsada) */}
        {!expandida && (
          <p className="text-sm text-amber-800 dark:text-amber-300 mt-2 line-clamp-2">
            {questao.enunciado.substring(0, 120)}{questao.enunciado.length > 120 ? '...' : ''}
          </p>
        )}

        {/* Stats compactas */}
        {!expandida && questao.stats.totalRespostas > 0 && (
          <div className="flex items-center gap-3 mt-2 text-[10px] text-amber-700 dark:text-amber-400">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" /> {questao.stats.totalRespostas} responderam
            </span>
            <span>{questao.stats.percentualAcertos}% acertaram</span>
          </div>
        )}
      </div>

      {/* Conteúdo expandido */}
      {expandida && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4">
          {/* Enunciado completo */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-amber-100 dark:border-amber-900">
            <EnunciadoFormatado texto={questao.enunciado} className="text-sm sm:text-base" />
          </div>

          {/* Alternativas */}
          {!respondida ? (
            <div className="space-y-2">
              {questao.tipo === 'certo_errado' ? (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { valor: true, label: 'CERTO', cor: 'emerald' },
                    { valor: false, label: 'ERRADO', cor: 'red' }
                  ].map(opcao => (
                    <button
                      key={String(opcao.valor)}
                      onClick={() => setRespostaSelecionada(opcao.valor)}
                      className={`p-3 rounded-xl border-2 transition-all active:scale-[0.97] text-sm font-semibold min-h-[48px] ${
                        respostaSelecionada === opcao.valor
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                      }`}
                    >
                      {opcao.label}
                    </button>
                  ))}
                </div>
              ) : (
                questao.alternativas.map((alt, idx) => (
                  <button
                    key={alt.id}
                    onClick={() => setRespostaSelecionada(alt.id)}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all active:scale-[0.99] text-sm min-h-[44px] ${
                      respostaSelecionada === alt.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-semibold text-gray-500 mr-2">{String.fromCharCode(97 + idx)})</span>
                    <span className="text-gray-900 dark:text-white">{alt.texto}</span>
                  </button>
                ))
              )}

              <button
                onClick={handleResponder}
                disabled={respostaSelecionada === null}
                className="w-full py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 active:scale-[0.98] transition-all font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
              >
                Confirmar Resposta
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Resultado */}
              <div className={`p-4 rounded-xl border-2 text-center ${
                acertou
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
              }`}>
                <div className="text-3xl mb-1">{acertou ? '🎉' : '💪'}</div>
                <p className={`text-sm font-bold ${acertou ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                  {acertou ? 'Parabéns, você acertou!' : 'Não foi dessa vez, continue estudando!'}
                </p>
              </div>

              {/* Estatísticas da questão */}
              {questao.stats.totalRespostas > 0 && (
                <div className="flex items-center justify-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Users className="h-4 w-4" /> {questao.stats.totalRespostas + 1} responderam
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {Math.round(((questao.stats.totalAcertos + (acertou ? 1 : 0)) / (questao.stats.totalRespostas + 1)) * 100)}% acertaram
                  </span>
                </div>
              )}

              {/* Explicação */}
              {questao.explicacao && (
                <div>
                  <button
                    onClick={() => setMostrarExplicacao(!mostrarExplicacao)}
                    className="text-xs text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    💡 {mostrarExplicacao ? 'Ocultar explicação' : 'Ver explicação'}
                  </button>
                  {mostrarExplicacao && (
                    <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-amber-100 dark:border-amber-900">
                      <p className="text-sm text-gray-700 dark:text-gray-300 text-justify">{questao.explicacao}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}