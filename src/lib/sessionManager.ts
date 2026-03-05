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

    console.log('🔄 Criando/atualizando sessão para:', userId)
    
    const deviceInfo = getSimpleDeviceInfo()
    const deviceFingerprint = generateSimpleFingerprint()
    const sessionId = generateSessionId(userId, deviceFingerprint)
    
    console.log('📱 Device fingerprint:', deviceFingerprint)
    console.log('🆔 Session ID:', sessionId)
    
    // Primeiro, verificar se já existe uma sessão
    const { data: existingSession, error: selectError } = await supabase
      .from('user_sessions')
      .select('id, session_id')
      .eq('usuario_id', userId)
      .eq('device_fingerprint', deviceFingerprint)
      .maybeSingle()
    
    if (selectError) {
      console.error('❌ Erro ao verificar sessão:', selectError.message)
      throw selectError
    }
    
    if (existingSession) {
      // Atualizar sessão existente (mantendo o session_id original)
      console.log('🔄 Atualizando sessão existente...')
      
      const { error: updateError } = await supabase
        .from('user_sessions')
        .update({
          last_activity: new Date().toISOString(),
          browser_name: deviceInfo.browser,
          os_name: deviceInfo.os,
          is_mobile: deviceInfo.isMobile,
          user_agent: deviceInfo.userAgent,
          device_info: {
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            device: deviceInfo.isMobile ? 'Mobile' : 'Desktop'
          }
        })
        .eq('id', existingSession.id)
      
      if (updateError) {
        console.error('❌ Erro ao atualizar sessão:', updateError.message)
        throw updateError
      }
      
      console.log('✅ Sessão atualizada com sucesso')
    } else {
      // Criar nova sessão
      console.log('🆕 Criando nova sessão...')
      
      const sessionData = {
        usuario_id: userId,
        session_id: sessionId,
        device_fingerprint: deviceFingerprint,
        browser_name: deviceInfo.browser,
        os_name: deviceInfo.os,
        is_mobile: deviceInfo.isMobile,
        ip_address: 'Unknown',
        user_agent: deviceInfo.userAgent,
        device_info: {
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          device: deviceInfo.isMobile ? 'Mobile' : 'Desktop'
        },
        last_activity: new Date().toISOString(),
        created_at: new Date().toISOString()
      }
      
      const { error: insertError } = await supabase
        .from('user_sessions')
        .insert(sessionData)
      
      if (insertError) {
        console.error('❌ Erro ao criar sessão:', insertError.message)
        throw insertError
      }
      
      console.log('✅ Nova sessão criada com sucesso')
    }
    
  } catch (error) {
    console.error('❌ Erro no gerenciamento de sessão:', error)
    
    // Log detalhado do erro
    if (error instanceof Error) {
      console.error('Mensagem do erro:', error.message)
    } else if (error && typeof error === 'object') {
      console.error('Detalhes do erro:', {
        message: (error as any).message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint
      })
    }
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