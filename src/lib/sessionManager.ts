import { supabase } from './supabase'

// Função simples para gerar fingerprint
function generateSimpleFingerprint(): string {
  try {
    if (typeof window === 'undefined') {
      return 'server-' + Math.random().toString(36).substr(2, 9)
    }

    const components = [
      navigator.userAgent || 'unknown',
      navigator.language || 'unknown',
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset().toString()
    ]
    
    const fingerprint = components.join('|')
    
    // Hash simples
    let hash = 0
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    
    return Math.abs(hash).toString(36)
  } catch (error) {
    return 'error-' + Math.random().toString(36).substr(2, 9)
  }
}

// Função para gerar session_id baseado no fingerprint (sempre o mesmo para o mesmo dispositivo)
function generateSessionId(userId: string, deviceFingerprint: string): string {
  return `${userId}-${deviceFingerprint}-${Date.now().toString().slice(-6)}`
}

// Função simples para obter info do dispositivo
function getSimpleDeviceInfo() {
  try {
    if (typeof window === 'undefined') {
      return {
        browser: 'Server',
        os: 'Server',
        isMobile: false,
        userAgent: 'Server-Side'
      }
    }

    const userAgent = navigator.userAgent
    
    let browser = 'Unknown'
    if (userAgent.includes('Chrome')) browser = 'Chrome'
    else if (userAgent.includes('Firefox')) browser = 'Firefox'
    else if (userAgent.includes('Safari')) browser = 'Safari'
    else if (userAgent.includes('Edge')) browser = 'Edge'
    
    let os = 'Unknown'
    if (userAgent.includes('Windows')) os = 'Windows'
    else if (userAgent.includes('Mac')) os = 'macOS'
    else if (userAgent.includes('Linux')) os = 'Linux'
    else if (userAgent.includes('Android')) os = 'Android'
    else if (userAgent.includes('iOS')) os = 'iOS'
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    
    return {
      browser,
      os,
      isMobile,
      userAgent
    }
  } catch (error) {
    return {
      browser: 'Unknown',
      os: 'Unknown',
      isMobile: false,
      userAgent: 'Unknown'
    }
  }
}

export async function createOrUpdateSession(userId: string) {
  try {
    if (typeof window === 'undefined') {
      console.log('⚠️ Sessão não pode ser criada no servidor')
      return
    }

    const deviceInfo = getSimpleDeviceInfo()
    const deviceFingerprint = generateSimpleFingerprint()
    
    console.log('🔄 Sessão para:', userId, '| Fingerprint:', deviceFingerprint)
    
    // UPSERT: insere se não existe, atualiza se já existe
    // Depende da constraint UNIQUE em (usuario_id, device_fingerprint)
    const { error } = await supabase
      .from('user_sessions')
      .upsert(
        {
          usuario_id: userId,
          device_fingerprint: deviceFingerprint,
          session_id: `${userId}-${deviceFingerprint}`,
          last_activity: new Date().toISOString(),
          browser_name: deviceInfo.browser,
          os_name: deviceInfo.os,
          is_mobile: deviceInfo.isMobile,
          user_agent: deviceInfo.userAgent,
          device_info: {
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            device: deviceInfo.isMobile ? 'Mobile' : 'Desktop',
            screen: typeof screen !== 'undefined' ? `${screen.width}×${screen.height}` : 'Unknown'
          }
        },
        { 
          onConflict: 'usuario_id,device_fingerprint' 
        }
      )

    if (error) {
      console.error('❌ Erro no upsert de sessão:', error.message)
    } else {
      console.log('✅ Sessão atualizada com sucesso')
    }
  } catch (error) {
    console.error('❌ Erro no gerenciamento de sessão:', error)
  }
}

export async function updateSessionActivity(userId: string) {
  try {
    if (typeof window === 'undefined') return
    
    const deviceFingerprint = generateSimpleFingerprint()
    
    const { error } = await supabase
      .from('user_sessions')
      .update({ 
        last_activity: new Date().toISOString() 
      })
      .eq('usuario_id', userId)
      .eq('device_fingerprint', deviceFingerprint)
    
    if (error) {
      console.error('Erro ao atualizar atividade:', error.message)
    }
  } catch (error) {
    console.error('Erro ao atualizar atividade:', error)
  }
}

export async function cleanupOldSessions() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .lt('last_activity', sevenDaysAgo)
    
    if (error) {
      console.error('Erro ao limpar sessões antigas:', error.message)
    } else {
      console.log('✅ Sessões antigas limpas com sucesso')
    }
  } catch (error) {
    console.error('Erro ao limpar sessões antigas:', error)
  }
}