'use client'

import { useState } from 'react'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'

interface ConfirmarExclusaoProps {
  titulo: string
  mensagem: string
  onConfirmar: () => Promise<void>
  onCancelar: () => void
}

export function ConfirmarExclusao({ titulo, mensagem, onConfirmar, onCancelar }: ConfirmarExclusaoProps) {
  const [excluindo, setExcluindo] = useState(false)

  const handleConfirmar = async () => {
    setExcluindo(true)
    await onConfirmar()
    setExcluindo(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {titulo}
            </h3>
          </div>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {mensagem}
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={onCancelar}
              disabled={excluindo}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmar}
              disabled={excluindo}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {excluindo ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}