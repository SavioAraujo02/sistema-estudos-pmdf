import { supabase } from './supabase'

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
  devices: {
    device_info: any
    last_activity: string
    ip_address?: string
  }[]
}

// Buscar todos os usuários com informações de sessão
export async function getUsuariosDetalhados(): Promise<UsuarioDetalhado[]> {
  try {
    // Buscar todos os usuários
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false })

    if (usuariosError) {
      console.error('Erro ao buscar usuários:', usuariosError)
      return []
    }

    // Buscar sessões ativas (últimos 30 minutos)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data: sessoes, error: sessoesError } = await supabase
      .from('user_sessions')
      .select('*')
      .gte('last_activity', thirtyMinutesAgo)

    if (sessoesError) {
      console.error('Erro ao buscar sessões:', sessoesError)
    }

    // Combinar dados
    const usuariosDetalhados: UsuarioDetalhado[] = usuarios.map(usuario => {
      const sessoesUsuario = (sessoes || []).filter(s => s.usuario_id === usuario.id)
      const isOnline = sessoesUsuario.length > 0
      const lastActivity = sessoesUsuario.length > 0 
        ? sessoesUsuario.sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime())[0].last_activity
        : undefined

      return {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        status: usuario.status,
        role: usuario.role,
        created_at: usuario.created_at,
        isOnline,
        lastActivity,
        deviceCount: sessoesUsuario.length,
        devices: sessoesUsuario.map(s => ({
          device_info: s.device_info,
          last_activity: s.last_activity,
          ip_address: s.ip_address
        }))
      }
    })

    return usuariosDetalhados
  } catch (error) {
    console.error('Erro inesperado ao buscar usuários detalhados:', error)
    return []
  }
}

// Buscar estatísticas gerais para admin
export async function getEstatisticasAdmin() {
  try {
    const [usuarios, sessoes] = await Promise.all([
      getUsuariosDetalhados(),
      supabase.from('user_sessions').select('*').gte('last_activity', new Date(Date.now() - 30 * 60 * 1000).toISOString())
    ])

    const usuariosOnline = usuarios.filter(u => u.isOnline)
    const totalDispositivos = sessoes.data?.length || 0
    
    // Usuários com múltiplos dispositivos
    const usuariosMultiplosDispositivos = usuariosOnline.filter(u => u.deviceCount > 1)
    
    // Dispositivos por tipo
    const dispositivosPorTipo = (sessoes.data || []).reduce((acc: any, sessao) => {
      const device = sessao.device_info?.device || 'Unknown'
      acc[device] = (acc[device] || 0) + 1
      return acc
    }, {})

    return {
      totalUsuarios: usuarios.length,
      usuariosOnline: usuariosOnline.length,
      usuariosOffline: usuarios.length - usuariosOnline.length,
      totalDispositivos,
      usuariosMultiplosDispositivos: usuariosMultiplosDispositivos.length,
      dispositivosPorTipo,
      usuariosDetalhados: usuarios
    }
  } catch (error) {
    console.error('Erro ao buscar estatísticas admin:', error)
    return {
      totalUsuarios: 0,
      usuariosOnline: 0,
      usuariosOffline: 0,
      totalDispositivos: 0,
      usuariosMultiplosDispositivos: 0,
      dispositivosPorTipo: {},
      usuariosDetalhados: []
    }
  }
}

// Desconectar usuário de todos os dispositivos (emergência)
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
      .eq('session_id', sessionId)

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