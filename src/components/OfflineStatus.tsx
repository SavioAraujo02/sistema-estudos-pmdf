'use client'

import { useState, useEffect } from 'react'
import { Wifi, WifiOff, Download, RefreshCw, AlertCircle } from 'lucide-react'
import { getStatusCache, sincronizarRespostas } from '@/lib/offline'

export function OfflineStatus() {
  const [status, setStatus] = useState({
    online: true,
    materiasCache: false,
    questoesCache: false,
    respostasPendentes: 0
  })
  const [sincronizando, setSincronizando] = useState(false)

  useEffect(() => {
    const updateStatus = async () => {
      const statusCache = await getStatusCache()
      setStatus(statusCache)
    }

    updateStatus()

    // Atualizar status quando conexão mudar
    const handleOnline = () => updateStatus()
    const handleOffline = () => updateStatus()

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Atualizar a cada 30 segundos
    const interval = setInterval(updateStatus, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  const handleSincronizar = async () => {
    setSincronizando(true)
    await sincronizarRespostas()
    const statusCache = await getStatusCache()
    setStatus(statusCache)
    setSincronizando(false)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-sm ${
        status.online 
          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
          : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      }`}>
        {status.online ? (
          <Wifi className="h-4 w-4" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
        
        <span className="font-medium">
          {status.online ? 'Online' : 'Offline'}
        </span>

        {status.respostasPendentes > 0 && (
          <>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-xs">
              {status.respostasPendentes} pendentes
            </span>
            {status.online && (
              <button
                onClick={handleSincronizar}
                disabled={sincronizando}
                className="ml-2 p-1 hover:bg-green-200 dark:hover:bg-green-800 rounded transition-colors"
              >
                {sincronizando ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
              </button>
            )}
          </>
        )}

        {!status.online && (status.materiasCache || status.questoesCache) && (
          <Download className="h-4 w-4 text-blue-600" />
        )}
      </div>
    </div>
  )
}