'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Check } from 'lucide-react'
import { getAssuntosPorMateria } from '@/lib/assuntos'

interface SeletorAssuntosProps {
  materiaId?: string
  assuntosSelecionados: string[]
  onChange: (assuntos: string[]) => void
}

export function SeletorAssuntos({ materiaId, assuntosSelecionados, onChange }: SeletorAssuntosProps) {
  const [assuntos, setAssuntos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (materiaId) {
      carregarAssuntos()
    } else {
      setAssuntos([])
    }
  }, [materiaId])

  const carregarAssuntos = async () => {
    if (!materiaId) return
    
    setLoading(true)
    try {
      const assuntosData = await getAssuntosPorMateria(materiaId)
      setAssuntos(assuntosData)
    } catch (error) {
      console.error('Erro ao carregar assuntos:', error)
      setAssuntos([])
    } finally {
      setLoading(false)
    }
  }

  const toggleAssunto = (assuntoId: string) => {
    const novosAssuntos = assuntosSelecionados.includes(assuntoId)
      ? assuntosSelecionados.filter(id => id !== assuntoId)
      : [...assuntosSelecionados, assuntoId]
    
    onChange(novosAssuntos)
  }

  const selecionarTodos = () => {
    onChange(assuntos.map(a => a.id))
  }

  const limparSelecao = () => {
    onChange([])
  }

  if (!materiaId) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg">
        Selecione uma matéria primeiro
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 text-center border border-gray-300 dark:border-gray-600 rounded-lg">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
        <span className="text-sm text-gray-600 dark:text-gray-400 mt-2">Carregando assuntos...</span>
      </div>
    )
  }

  if (assuntos.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg">
        Nenhum assunto cadastrado para esta matéria
      </div>
    )
  }

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
      {/* Header com ações */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Assuntos ({assuntos.length})
          </span>
          <div className="flex gap-2">
            <button
              onClick={selecionarTodos}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Todos
            </button>
            <button
              onClick={limparSelecao}
              className="text-xs text-gray-600 dark:text-gray-400 hover:underline"
            >
              Limpar
            </button>
          </div>
        </div>
        {assuntosSelecionados.length > 0 && (
          <div className="text-xs text-green-600 dark:text-green-400 mt-1">
            {assuntosSelecionados.length} selecionados
          </div>
        )}
      </div>

      {/* Lista de assuntos */}
      <div className="max-h-48 overflow-y-auto">
        {assuntos.map(assunto => (
          <label
            key={assunto.id}
            className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-b-0"
          >
            <input
              type="checkbox"
              checked={assuntosSelecionados.includes(assunto.id)}
              onChange={() => toggleAssunto(assunto.id)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: assunto.cor }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-900 dark:text-white block truncate">
                {assunto.nome}
              </span>
              {assunto.descricao && (
                <span className="text-xs text-gray-500 dark:text-gray-400 block truncate">
                  {assunto.descricao}
                </span>
              )}
            </div>
            {assunto.questoes_count !== undefined && (
              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                {assunto.questoes_count} questões
              </span>
            )}
          </label>
        ))}
      </div>
    </div>
  )
}