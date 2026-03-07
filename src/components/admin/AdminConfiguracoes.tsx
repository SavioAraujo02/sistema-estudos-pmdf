'use client'

import { useState, useEffect } from 'react'
import { Settings, Shield, DollarSign, Zap, RefreshCw, Save, Check, AlertTriangle, Trash2 } from 'lucide-react'
import { getConfiguracoes, salvarConfiguracoes, ConfiguracaoSistema } from '@/lib/configuracoes'
import { limparSessoesAntigas } from '@/lib/admin'

export function AdminConfiguracoes() {
  const [config, setConfig] = useState<ConfiguracaoSistema | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [limpandoSessoes, setLimpandoSessoes] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null)

  useEffect(() => {
    carregarConfig()
  }, [])

  const carregarConfig = async () => {
    setLoading(true)
    const data = await getConfiguracoes()
    setConfig(data)
    setLoading(false)
  }

  const handleSalvar = async () => {
    if (!config) return
    setSalvando(true)
    setSalvo(false)
    const sucesso = await salvarConfiguracoes(config)
    setSalvando(false)
    if (sucesso) {
      setSalvo(true)
      setMensagem({ tipo: 'success', texto: 'Configurações salvas com sucesso!' })
      setTimeout(() => { setSalvo(false); setMensagem(null) }, 3000)
    } else {
      setMensagem({ tipo: 'error', texto: 'Erro ao salvar configurações.' })
      setTimeout(() => setMensagem(null), 3000)
    }
  }

  const handleLimparSessoes = async () => {
    if (!confirm('Limpar todas as sessões com mais de 7 dias sem atividade?')) return
    setLimpandoSessoes(true)
    const removidas = await limparSessoesAntigas()
    setLimpandoSessoes(false)
    setMensagem({ tipo: 'success', texto: `${removidas} sessões antigas removidas.` })
    setTimeout(() => setMensagem(null), 3000)
  }

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-500" /> Configurações do Sistema
        </h2>
        <button
          onClick={handleSalvar}
          disabled={salvando}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-all font-medium ${
            salvo
              ? 'bg-emerald-600 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } disabled:opacity-50`}
        >
          {salvando ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          ) : salvo ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {salvando ? 'Salvando...' : salvo ? 'Salvo!' : 'Salvar Tudo'}
        </button>
      </div>

      {/* Mensagem */}
      {mensagem && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
          mensagem.tipo === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
          {mensagem.tipo === 'success' ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {mensagem.texto}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Segurança */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-blue-500" /> Segurança
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Limite de dispositivos por usuário
              </label>
              <select
                value={config.limite_dispositivos}
                onChange={(e) => setConfig({ ...config, limite_dispositivos: parseInt(e.target.value) })}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm min-h-[44px]"
              >
                <option value={1}>1 dispositivo</option>
                <option value={2}>2 dispositivos</option>
                <option value={3}>3 dispositivos</option>
                <option value={5}>5 dispositivos</option>
                <option value={10}>10 dispositivos</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Sessão expira em (minutos de inatividade)
              </label>
              <select
                value={config.sessao_expira_minutos}
                onChange={(e) => setConfig({ ...config, sessao_expira_minutos: parseInt(e.target.value) })}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm min-h-[44px]"
              >
                <option value={30}>30 minutos</option>
                <option value={60}>1 hora</option>
                <option value={120}>2 horas</option>
                <option value={480}>8 horas</option>
                <option value={1440}>24 horas</option>
              </select>
            </div>
            <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer min-h-[44px]">
              <input
                type="checkbox"
                checked={config.aprovacao_automatica}
                onChange={(e) => setConfig({ ...config, aprovacao_automatica: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Aprovação automática</span>
                <p className="text-[10px] text-gray-500">Aprovar novos cadastros sem revisão manual</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer min-h-[44px]">
              <input
                type="checkbox"
                checked={config.notificacoes_email}
                onChange={(e) => setConfig({ ...config, notificacoes_email: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Notificações por email</span>
                <p className="text-[10px] text-gray-500">Enviar emails de avisos e alertas</p>
              </div>
            </label>
          </div>
        </div>

        {/* Financeiro */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-emerald-500" /> Financeiro
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Valor da mensalidade (R$)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={config.valor_mensalidade}
                onChange={(e) => setConfig({ ...config, valor_mensalidade: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Dias de acesso após pagamento
              </label>
              <input
                type="number"
                min="1"
                value={config.dias_expiracao}
                onChange={(e) => setConfig({ ...config, dias_expiracao: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm min-h-[44px]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ações do sistema */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-sm">
          <Zap className="h-4 w-4 text-amber-500" /> Ações do Sistema
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={handleLimparSessoes}
            disabled={limpandoSessoes}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors text-sm font-medium border border-amber-200 dark:border-amber-800 min-h-[48px] disabled:opacity-50"
          >
            {limpandoSessoes ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-600 border-t-transparent" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {limpandoSessoes ? 'Limpando...' : 'Limpar Sessões Antigas'}
          </button>
          <button
            onClick={carregarConfig}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm font-medium border border-blue-200 dark:border-blue-800 min-h-[48px]"
          >
            <RefreshCw className="h-4 w-4" />
            Recarregar Configurações
          </button>
        </div>
      </div>
    </div>
  )
}