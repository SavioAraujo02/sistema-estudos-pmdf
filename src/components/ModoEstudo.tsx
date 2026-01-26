'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, ArrowRight, ArrowLeft, RotateCcw, Clock, Target } from 'lucide-react'
import { QuestaoEstudo, salvarResposta } from '@/lib/estudo'
import { getRespostaCorretaCertoErrado } from '@/lib/questoes'
import { EnunciadoFormatado } from './EnunciadoFormatado'

interface ModoEstudoProps {
  questoes: QuestaoEstudo[]
  onFinalizar: (resultados: ResultadoSessao) => void
  configuracao?: {
    materiaId?: string
    tagIds: string[]
    numeroQuestoes: number | 'todas'
    modoEstudo: 'normal' | 'revisao' | 'rapido' | 'aleatorio'
    salvarHistorico: boolean
  }
  isAdmin?: boolean
}

interface ResultadoSessao {
  totalQuestoes: number
  acertos: number
  erros: number
  percentual: number
  tempo: number
  respostas: {
    questao: QuestaoEstudo
    resposta: string | boolean | null
    correta: boolean
    tempo: number
  }[]
}

export function ModoEstudo({ questoes, onFinalizar, configuracao, isAdmin }: ModoEstudoProps) {
  const [questaoAtual, setQuestaoAtual] = useState(0)
  const [respostaSelecionada, setRespostaSelecionada] = useState<string | boolean | null>(null)
  const [mostrarResposta, setMostrarResposta] = useState(false)
  const [respostas, setRespostas] = useState<ResultadoSessao['respostas']>([])
  const [tempoInicio, setTempoInicio] = useState(Date.now())
  const [tempoQuestao, setTempoQuestao] = useState(Date.now())

  useEffect(() => {
    setTempoInicio(Date.now())
    setTempoQuestao(Date.now())
  }, [])

  const questao = questoes[questaoAtual]
  const isUltimaQuestao = questaoAtual === questoes.length - 1

  const verificarResposta = async () => {
    if (respostaSelecionada === null) return
  
    const tempoResposta = Date.now() - tempoQuestao
    let correta = false
  
    if (questao.tipo === 'certo_errado') {
      // Buscar a resposta correta no banco
      const respostaCorreta = await getRespostaCorretaCertoErrado(questao.id)
      if (respostaCorreta !== null) {
        correta = respostaSelecionada === respostaCorreta
      } else {
        // Se não conseguir detectar, assumir que acertou (temporário)
        correta = true
        console.warn('Não foi possível detectar a resposta correta para a questão:', questao.id)
      }
    } else {
      // Para múltipla escolha, verificar qual alternativa está marcada como correta
      const alternativaCorreta = questao.alternativas?.find(alt => alt.correta)
      correta = respostaSelecionada === alternativaCorreta?.id
    }
  
    const novaResposta = {
      questao,
      resposta: respostaSelecionada,
      correta,
      tempo: tempoResposta
    }
  
    // Adicionar a resposta ao array
    const novasRespostas = [...respostas, novaResposta]
    setRespostas(novasRespostas)
    setMostrarResposta(true)
  
    // Salvar no banco conforme configuração
    if (configuracao?.salvarHistorico === true) {
      console.log('Salvando resposta no histórico')
      salvarResposta(questao.id, correta)
    } else {
      console.log('Modo rápido: resposta não salva no histórico')
    }
  }

  const voltarQuestao = () => {
    if (questaoAtual > 0) {
      setQuestaoAtual(prev => prev - 1)
      setRespostaSelecionada(null)
      setMostrarResposta(false)
      setTempoQuestao(Date.now())
    }
  }

  const avancarQuestao = () => {
    if (questaoAtual < questoes.length - 1) {
      setQuestaoAtual(prev => prev + 1)
      setRespostaSelecionada(null)
      setMostrarResposta(false)
      setTempoQuestao(Date.now())
    }
  }

  const pularQuestao = () => {
    // Permite avançar sem responder
    if (questaoAtual < questoes.length - 1) {
      const novaResposta = {
        questao,
        resposta: null,
        correta: false,
        tempo: Date.now() - tempoQuestao
      }
      setRespostas([...respostas, novaResposta])
      avancarQuestao()
    }
  }

  const proximaQuestao = () => {
    if (isUltimaQuestao) {
      // Finalizar sessão
      const tempoTotal = Date.now() - tempoInicio
      
      // Incluir a resposta atual se ainda não foi adicionada
      const todasRespostas = mostrarResposta ? respostas : [...respostas]
      const acertos = todasRespostas.filter(r => r.correta).length
      
      const resultados: ResultadoSessao = {
        totalQuestoes: questoes.length,
        acertos,
        erros: questoes.length - acertos,
        percentual: Math.round((acertos / questoes.length) * 100),
        tempo: tempoTotal,
        respostas: todasRespostas
      }
  
      onFinalizar(resultados)
    } else {
      setQuestaoAtual(prev => prev + 1)
      setRespostaSelecionada(null)
      setMostrarResposta(false)
      setTempoQuestao(Date.now())
    }
  }

  const reiniciarSessao = () => {
    setQuestaoAtual(0)
    setRespostaSelecionada(null)
    setMostrarResposta(false)
    setRespostas([])
    setTempoInicio(Date.now())
    setTempoQuestao(Date.now())
  }

  if (!questao) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📚</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Nenhuma questão disponível
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Cadastre algumas questões para começar a estudar.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-gray-900 dark:text-white">
                Questão {questaoAtual + 1} de {questoes.length}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span>{questao.materia.nome}</span>
            </div>
          </div>
          
          <button
            onClick={reiniciarSessao}
            className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Reiniciar
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((questaoAtual + 1) / questoes.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Questão */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="mb-6">
        <div className="mb-4">
          <EnunciadoFormatado 
            texto={questao.enunciado}
            className="text-lg font-medium"
          />
        </div>
          
          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
            questao.tipo === 'certo_errado'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
              : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
          }`}>
            {questao.tipo === 'certo_errado' ? 'Certo/Errado' : 'Múltipla Escolha'}
          </span>
        </div>

        {/* Alternativas */}
        <div className="space-y-3 mb-6">
        {questao.tipo === 'certo_errado' ? (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setRespostaSelecionada(true)}
            disabled={mostrarResposta}
            className={`p-4 border-2 rounded-lg transition-all ${
              respostaSelecionada === true
                ? mostrarResposta
                  ? respostas[respostas.length - 1]?.correta
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            } ${mostrarResposta ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className={`h-5 w-5 ${
                mostrarResposta && respostaSelecionada === true
                  ? respostas[respostas.length - 1]?.correta ? 'text-green-600' : 'text-red-600'
                  : 'text-green-600'
              }`} />
              <span className="font-medium">CERTO</span>
              {mostrarResposta && respostaSelecionada === true && (
                respostas[respostas.length - 1]?.correta ? (
                  <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 ml-auto" />
                )
              )}
            </div>
          </button>
          
          <button
            onClick={() => setRespostaSelecionada(false)}
            disabled={mostrarResposta}
            className={`p-4 border-2 rounded-lg transition-all ${
              respostaSelecionada === false
                ? mostrarResposta
                  ? respostas[respostas.length - 1]?.correta
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            } ${mostrarResposta ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <XCircle className={`h-5 w-5 ${
                mostrarResposta && respostaSelecionada === false
                  ? respostas[respostas.length - 1]?.correta ? 'text-green-600' : 'text-red-600'
                  : 'text-red-600'
              }`} />
              <span className="font-medium">ERRADO</span>
              {mostrarResposta && respostaSelecionada === false && (
                respostas[respostas.length - 1]?.correta ? (
                  <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 ml-auto" />
                )
              )}
            </div>
          </button>
        </div>
          ) : (
            questao.alternativas?.map((alternativa, index) => (
              <button
                key={alternativa.id}
                onClick={() => setRespostaSelecionada(alternativa.id)}
                disabled={mostrarResposta}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                  respostaSelecionada === alternativa.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                } ${mostrarResposta ? 'cursor-not-allowed' : 'cursor-pointer'} ${
                  mostrarResposta && alternativa.correta
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : ''
                } ${
                  mostrarResposta && respostaSelecionada === alternativa.id && !alternativa.correta
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-500 w-6">
                    {String.fromCharCode(97 + index)})
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {alternativa.texto}
                  </span>
                  {mostrarResposta && alternativa.correta && (
                    <CheckCircle className="h-5 w-5 text-green-600 ml-auto" />
                  )}
                  {mostrarResposta && respostaSelecionada === alternativa.id && !alternativa.correta && (
                    <XCircle className="h-5 w-5 text-red-600 ml-auto" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Explicação (só aparece após responder) */}
        {mostrarResposta && questao.explicacao && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              💡 Explicação
            </h4>
            <p className="text-gray-700 dark:text-gray-300">
              {questao.explicacao}
            </p>
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex gap-3">
          {/* Botão Voltar */}
          <button
            onClick={voltarQuestao}
            disabled={questaoAtual === 0}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Anterior
          </button>

          {!mostrarResposta ? (
            <>
              {/* Botão Confirmar */}
              <button
                onClick={verificarResposta}
                disabled={respostaSelecionada === null}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Confirmar Resposta
              </button>
              
              {/* Botão Pular */}
              <button
                onClick={pularQuestao}
                disabled={isUltimaQuestao}
                className="px-4 py-3 border border-yellow-300 text-yellow-700 dark:text-yellow-400 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Pular
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              {/* Botão Próxima/Finalizar */}
              <button
                onClick={proximaQuestao}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                {isUltimaQuestao ? 'Finalizar Sessão' : 'Próxima Questão'}
                <ArrowRight className="h-4 w-4" />
              </button>
              
              {/* Botão Avançar sem próxima */}
              {!isUltimaQuestao && (
                <button
                  onClick={avancarQuestao}
                  className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  Avançar
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}