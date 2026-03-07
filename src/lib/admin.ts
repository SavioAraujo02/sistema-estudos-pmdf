import { supabase } from './supabase'

export interface DeviceSession {
  id: string
  device_info: any
  last_activity: string
  ip_address?: string
  browser_name?: string
  os_name?: string
  is_mobile?: boolean
  device_fingerprint?: string
}

export interface UsuarioDetalhado {
  id: string
  nome: string
  email: string
  status: string
  role: string
  created_at: string
  isOnline: boolean
  lastActivity?: string
  deviceCount: number
  devices: DeviceSession[]
  // Novos campos
  isSuspeito: boolean
  motivoSuspeita?: string
}

const ONLINE_THRESHOLD_MS = 30 * 60 * 1000 // 30 minutos
const DEVICE_LIMIT = 3 // Alerta se passar disso

// Buscar todos os usuários com TODAS as sessões (não só últimos 30min)
export async function getUsuariosDetalhados(): Promise<UsuarioDetalhado[]> {
  try {
    // Buscar usuários e TODAS as sessões em paralelo
    const [usuariosRes, sessoesRes] = await Promise.all([
      supabase
        .from('usuarios')
        .select('id, nome, email, status, role, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('user_sessions')
        .select('*')
        .order('last_activity', { ascending: false })
    ])

    if (usuariosRes.error) {
      console.error('Erro ao buscar usuários:', usuariosRes.error)
      return []
    }

    const agora = Date.now()
    const sessoes = sessoesRes.data || []

    const usuariosDetalhados: UsuarioDetalhado[] = (usuariosRes.data || []).map(usuario => {
      const sessoesUsuario = sessoes.filter(s => s.usuario_id === usuario.id)
      
      // Online = teve atividade nos últimos 30 min
      const sessoesRecentes = sessoesUsuario.filter(
        s => agora - new Date(s.last_activity).getTime() < ONLINE_THRESHOLD_MS
      )
      const isOnline = sessoesRecentes.length > 0

      // Última atividade (de qualquer sessão)
      const lastActivity = sessoesUsuario.length > 0
        ? sessoesUsuario[0].last_activity // já ordenado desc
        : undefined

      // Agrupar sessões por fingerprint (mesmo dispositivo = 1 entrada)
      const deviceMap = new Map<string, typeof sessoesUsuario[0]>()
      sessoesUsuario.forEach(s => {
        const key = s.device_fingerprint || s.id
        const existing = deviceMap.get(key)
        // Manter a sessão mais recente de cada dispositivo
        if (!existing || new Date(s.last_activity) > new Date(existing.last_activity)) {
          deviceMap.set(key, s)
        }
      })
      const dispositivosUnicos = Array.from(deviceMap.values())
      const deviceCount = dispositivosUnicos.length

      // Detectar comportamento suspeito
      let isSuspeito = false
      let motivoSuspeita: string | undefined

      if (deviceCount > DEVICE_LIMIT) {
        isSuspeito = true
        motivoSuspeita = `${deviceCount} dispositivos (limite: ${DEVICE_LIMIT})`
      }

      // Múltiplos dispositivos SIMULTÂNEOS (online ao mesmo tempo)
      if (sessoesRecentes.length > 2) {
        isSuspeito = true
        motivoSuspeita = `${sessoesRecentes.length} dispositivos online ao mesmo tempo`
      }

      return {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        status: usuario.status,
        role: usuario.role,
        created_at: usuario.created_at,
        isOnline,
        lastActivity,
        deviceCount,
        devices: dispositivosUnicos.map(s => ({
          id: s.id,
          device_info: s.device_info || {},
          last_activity: s.last_activity,
          ip_address: s.ip_address,
          browser_name: s.browser_name,
          os_name: s.os_name,
          is_mobile: s.is_mobile,
          device_fingerprint: s.device_fingerprint
        })),
        isSuspeito,
        motivoSuspeita
      }
    })

    return usuariosDetalhados
  } catch (error) {
    console.error('Erro inesperado ao buscar usuários detalhados:', error)
    return []
  }
}

// Estatísticas gerais (sem duplicar busca)
export async function getEstatisticasAdmin(usuariosJaBuscados?: UsuarioDetalhado[]) {
  try {
    // Reusar dados se já foram buscados, evita query duplicada
    const usuarios = usuariosJaBuscados || await getUsuariosDetalhados()

    const usuariosOnline = usuarios.filter(u => u.isOnline)
    const totalDispositivos = usuarios.reduce((acc, u) => acc + u.deviceCount, 0)
    const usuariosMultiplosDispositivos = usuarios.filter(u => u.deviceCount > 1)
    const usuariosSuspeitos = usuarios.filter(u => u.isSuspeito)

    // Dispositivos por tipo
    const dispositivosPorTipo: Record<string, number> = {}
    usuarios.forEach(u => {
      u.devices.forEach(d => {
        const tipo = d.is_mobile ? 'Mobile' : (d.device_info?.device || 'Desktop')
        dispositivosPorTipo[tipo] = (dispositivosPorTipo[tipo] || 0) + 1
      })
    })

    return {
      totalUsuarios: usuarios.length,
      usuariosOnline: usuariosOnline.length,
      usuariosOffline: usuarios.length - usuariosOnline.length,
      totalDispositivos,
      usuariosMultiplosDispositivos: usuariosMultiplosDispositivos.length,
      usuariosSuspeitos: usuariosSuspeitos.length,
      dispositivosPorTipo
    }
  } catch (error) {
    console.error('Erro ao buscar estatísticas admin:', error)
    return {
      totalUsuarios: 0, usuariosOnline: 0, usuariosOffline: 0,
      totalDispositivos: 0, usuariosMultiplosDispositivos: 0,
      usuariosSuspeitos: 0, dispositivosPorTipo: {}
    }
  }
}

// Desconectar usuário de todos os dispositivos
export async function desconectarUsuario(usuarioId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('usuario_id', usuarioId)

    if (error) {
      console.error('Erro ao desconectar usuário:', error)
      return false
    }
    return true
  } catch (error) {
    console.error('Erro inesperado ao desconectar usuário:', error)
    return false
  }
}

// Desconectar dispositivo específico
export async function desconectarDispositivo(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) {
      console.error('Erro ao desconectar dispositivo:', error)
      return false
    }
    return true
  } catch (error) {
    console.error('Erro inesperado ao desconectar dispositivo:', error)
    return false
  }
}

// Limpar sessões antigas (mais de 7 dias sem atividade)
export async function limparSessoesAntigas(): Promise<number> {
  try {
    const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('user_sessions')
      .delete()
      .lt('last_activity', seteDiasAtras)
      .select('id')

    if (error) {
      console.error('Erro ao limpar sessões antigas:', error)
      return 0
    }
    return data?.length || 0
  } catch (error) {
    console.error('Erro inesperado:', error)
    return 0
  }
}