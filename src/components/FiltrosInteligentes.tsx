'use client'

import { useState } from 'react'
import { Brain, Target, RotateCcw, TrendingDown } from 'lucide-react'

interface FiltrosInteligentesProps {
  filtros: {
    apenasNaoRespondidas?: boolean
    apenasErradas?: boolean
    revisaoQuestoesDificeis?: boolean
  }
  onChange: (filtros: any) => void
  estatisticas?: {
    totalQuestoes: number
    naoRespondidas: number
    comErros: number
    dificeis: number
  }
}

export function FiltrosInteligentes({ filtros, onChange, estatisticas }: FiltrosInteligentesProps) {
  const [filtrosAtivos, setFiltrosAtivos] = useState(filtros)

  const atualizarFiltro = (campo: string, valor: boolean) => {
    // Se ativando um filtro, desativar os outros (exclusivo)
    const novosFiltros = {
      apenasNaoRespondidas: false,
      apenasErradas: false,
      revisaoQuestoesDificeis: false,
      [campo]: valor
    }
    
    setFiltrosAtivos(novosFiltros)
    onChange(novosFiltros)
  }

  const limparFiltros = () => {
    const filtrosLimpos = {
      apenasNaoRespondidas: false,
      apenasErradas: false,
      revisaoQuestoesDificeis: false
    }
    setFiltrosAtivos(filtrosLimpos)
    onChange(filtrosLimpos)
  }

  const algumFiltroAtivo = Object.values(filtrosAtivos).some(Boolean)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          <h3 className="font-medium text-gray-900 dark:text-white">
            Filtros Inteligentes
          </h3>
        </div>
        
        {algumFiltroAtivo && (
          <button
            onClick={limparFiltros}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Limpar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Apenas Não Respondidas */}
        <button
          onClick={() => atualizarFiltro('apenasNaoRespondidas', !filtrosAtivos.apenasNaoRespondidas)}
          className={`p-3 rounded-lg border-2 transition-all text-left ${
            filtrosAtivos.apenasNaoRespondidas
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm text-gray-900 dark:text-white">
              Não Respondidas
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Questões que você nunca respondeu
          </p>
          {estatisticas && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {estatisticas.naoRespondidas} questões
            </p>
          )}
        </button>

        {/* Apenas Erradas */}
        <button
          onClick={() => atualizarFiltro('apenasErradas', !filtrosAtivos.apenasErradas)}
          className={`p-3 rounded-lg border-2 transition-all text-left ${
            filtrosAtivos.apenasErradas
              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="h-4 w-4 text-red-600" />
            <span className="font-medium text-sm text-gray-900 dark:text-white">
              Revisar Erros
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Questões que você já errou
          </p>
          {estatisticas && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {estatisticas.comErros} questões
            </p>
          )}
        </button>

        {/* Questões Difíceis */}
        <button
          onClick={() => atualizarFiltro('revisaoQuestoesDificeis', !filtrosAtivos.revisaoQuestoesDificeis)}
          className={`p-3 rounded-lg border-2 transition-all text-left ${
            filtrosAtivos.revisaoQuestoesDificeis
              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Brain className="h-4 w-4 text-orange-600" />
            <span className="font-medium text-sm text-gray-900 dark:text-white">
              Questões Difíceis
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Baixo percentual de acerto (&lt;70%)
          </p>
          {estatisticas && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              {estatisticas.dificeis} questões
            </p>
          )}
        </button>
      </div>

      {algumFiltroAtivo && (
        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-xs text-blue-800 dark:text-blue-300">
            💡 Filtro ativo: {
              filtrosAtivos.apenasNaoRespondidas ? 'Mostrando apenas questões não respondidas' :
              filtrosAtivos.apenasErradas ? 'Mostrando apenas questões que você errou' :
              filtrosAtivos.revisaoQuestoesDificeis ? 'Mostrando apenas questões difíceis para você' :
              ''
            }
          </p>
        </div>
      )}
    </div>
  )
}