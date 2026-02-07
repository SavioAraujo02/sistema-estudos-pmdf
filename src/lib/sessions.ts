import { supabase } from './supabase'

interface DeviceInfo {
  browser?: string
  os?: string
  device?: string
  screen?: string
}

interface UserSession {
  id: string
  usuario_id: string
  session_id: string
  device_info: DeviceInfo
  ip_address?: string
  user_agent?: string
  last_activity: string
  created_at: string
}

// Função para detectar informações do dispositivo
function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') return {}
  
  const userAgent = navigator.userAgent
  const screen = window.screen
  
  // Detectar browser
  let browser = 'Unknown'
  if (userAgent.includes('Chrome')) browser = 'Chrome'
  else if (userAgent.includes('Firefox')) browser = 'Firefox'
  else if (userAgent.includes('Safari')) browser = 'Safari'
  else if (userAgent.includes('Edge')) browser = 'Edge'
  
  // Detectar OS
  let os = 'Unknown'
  if (userAgent.includes('Windows')) os = 'Windows'
  else if (userAgent.includes('Mac')) os = 'macOS'
  else if (userAgent.includes('Linux')) os = 'Linux'
  else if (userAgent.includes('Android')) os = 'Android'
  else if (userAgent.includes('iOS')) os = 'iOS'
  
  // Detectar tipo de dispositivo
  let device = 'Desktop'
  if (/Mobi|Android/i.test(userAgent)) device = 'Mobile'
  else if (/Tablet|iPad/i.test(userAgent)) device = 'Tablet'
  
  return {
    browser,
    os,
    device,
    screen: `${screen.width}x${screen.height}`
  }
}

// Gerar ID único para a sessão
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Registrar nova sessão
export async function registerSession(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const sessionId = generateSessionId()
    const deviceInfo = getDeviceInfo()
    
    const { data, error } = await supabase
      .from('user_sessions')
      .insert({
        usuario_id: user.id,
        session_id: sessionId,
        device_info: deviceInfo,
        user_agent: typeof window !== 'undefined' ? navigator.userAgent : null
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao registrar sessão:', error)
      return null
    }

    // Salvar session_id no localStorage para identificar esta sessão
    if (typeof window !== 'undefined') {
      localStorage.setItem('session_id', sessionId)
    }

    console.log('✅ Sessão registrada:', sessionId)
    return sessionId
  } catch (error) {
    console.error('Erro inesperado ao registrar sessão:', error)
    return null
  }
}

// Atualizar atividade da sessão
export async function updateSessionActivity(): Promise<boolean> {
  try {
    const sessionId = typeof window !== 'undefined' ? localStorage.getItem('session_id') : null
    if (!sessionId) return false

    const { error } = await supabase
      .from('user_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('session_id', sessionId)

    if (error) {
      console.error('Erro ao atualizar atividade:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro inesperado ao atualizar atividade:', error)
    return false
  }
}

// Remover sessão (logout)
export async function removeSession(): Promise<boolean> {
  try {
    const sessionId = typeof window !== 'undefined' ? localStorage.getItem('session_id') : null
    if (!sessionId) return true

    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('session_id', sessionId)

    if (error) {
      console.error('Erro ao remover sessão:', error)
      return false
    }

    // Limpar localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('session_id')
    }

    console.log('✅ Sessão removida:', sessionId)
    return true
  } catch (error) {
    console.error('Erro inesperado ao remover sessão:', error)
    return false
  }
}

// Buscar usuários ativos (últimos 30 minutos)
export async function getActiveUsers(): Promise<{
  totalActive: number
  totalDevices: number
  userDevices: Record<string, number>
}> {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    
    const { data, error } = await supabase
      .from('user_sessions')
      .select(`
        usuario_id,
        device_info,
        usuarios!inner(nome, email)
      `)
      .gte('last_activity', thirtyMinutesAgo)

    if (error) {
      console.error('Erro ao buscar usuários ativos:', error)
      return { totalActive: 0, totalDevices: 0, userDevices: {} }
    }

    const sessions = data || []
    const uniqueUsers = new Set(sessions.map(s => s.usuario_id))
    const userDevices: Record<string, number> = {}

    // Contar dispositivos por usuário
    sessions.forEach(session => {
      const userId = session.usuario_id
      userDevices[userId] = (userDevices[userId] || 0) + 1
    })

    return {
      totalActive: uniqueUsers.size,
      totalDevices: sessions.length,
      userDevices
    }
  } catch (error) {
    console.error('Erro inesperado ao buscar usuários ativos:', error)
    return { totalActive: 0, totalDevices: 0, userDevices: {} }
  }
}

// Buscar sessões de um usuário específico
export async function getUserSessions(userId: string): Promise<UserSession[]> {
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('usuario_id', userId)
      .order('last_activity', { ascending: false })

    if (error) {
      console.error('Erro ao buscar sessões do usuário:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Erro inesperado ao buscar sessões:', error)
    return []
  }
}

// Limpar sessões antigas (pode ser chamada periodicamente)
export async function cleanupOldSessions(): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('cleanup_old_sessions')
    
    if (error) {
      console.error('Erro ao limpar sessões antigas:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro inesperado ao limpar sessões:', error)
    return false
  }
}