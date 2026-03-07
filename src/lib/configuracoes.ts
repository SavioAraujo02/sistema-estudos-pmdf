import { supabase } from './supabase'

export interface ConfiguracaoSistema {
  limite_dispositivos: number
  sessao_expira_minutos: number
  aprovacao_automatica: boolean
  notificacoes_email: boolean
  valor_mensalidade: number
  dias_expiracao: number
}

const DEFAULTS: ConfiguracaoSistema = {
  limite_dispositivos: 3,
  sessao_expira_minutos: 120,
  aprovacao_automatica: false,
  notificacoes_email: true,
  valor_mensalidade: 100,
  dias_expiracao: 30
}

// Buscar todas as configurações
export async function getConfiguracoes(): Promise<ConfiguracaoSistema> {
  try {
    const { data, error } = await supabase
      .from('configuracoes_sistema')
      .select('chave, valor')

    if (error || !data) {
      console.error('Erro ao buscar configurações:', error)
      return DEFAULTS
    }

    const config = { ...DEFAULTS }

    data.forEach(item => {
      const chave = item.chave as keyof ConfiguracaoSistema
      const valor = item.valor

      switch (chave) {
        case 'limite_dispositivos':
        case 'sessao_expira_minutos':
        case 'valor_mensalidade':
        case 'dias_expiracao':
          config[chave] = typeof valor === 'number' ? valor : parseInt(String(valor)) || DEFAULTS[chave]
          break
        case 'aprovacao_automatica':
        case 'notificacoes_email':
          config[chave] = valor === true || valor === 'true'
          break
      }
    })

    return config
  } catch (error) {
    console.error('Erro inesperado ao buscar configurações:', error)
    return DEFAULTS
  }
}

// Salvar uma configuração
export async function salvarConfiguracao(
  chave: keyof ConfiguracaoSistema,
  valor: string | number | boolean
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('configuracoes_sistema')
      .update({
        valor: JSON.stringify(valor),
        atualizado_em: new Date().toISOString(),
        atualizado_por: user?.id || null
      })
      .eq('chave', chave)

    if (error) {
      console.error('Erro ao salvar configuração:', error)
      return false
    }
    return true
  } catch (error) {
    console.error('Erro inesperado ao salvar configuração:', error)
    return false
  }
}

// Salvar múltiplas configurações de uma vez
export async function salvarConfiguracoes(
  configs: Partial<ConfiguracaoSistema>
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    const promises = Object.entries(configs).map(([chave, valor]) =>
      supabase
        .from('configuracoes_sistema')
        .update({
          valor: JSON.stringify(valor),
          atualizado_em: new Date().toISOString(),
          atualizado_por: user?.id || null
        })
        .eq('chave', chave)
    )

    const resultados = await Promise.all(promises)
    const erros = resultados.filter(r => r.error)

    if (erros.length > 0) {
      console.error('Erros ao salvar configurações:', erros)
      return false
    }
    return true
  } catch (error) {
    console.error('Erro inesperado:', error)
    return false
  }
}