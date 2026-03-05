export function generateDeviceFingerprint(): string {
  try {
    if (typeof window === 'undefined') {
      return 'server-side-' + Math.random().toString(36).substr(2, 9)
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
    console.error('Erro ao gerar fingerprint:', error)
    return 'error-' + Math.random().toString(36).substr(2, 9)
  }
}

export function getDeviceInfo() {
  try {
    if (typeof window === 'undefined') {
      return {
        browserName: 'Server',
        osName: 'Server',
        isMobile: false,
        screenResolution: 'Unknown',
        userAgent: 'Server-Side'
      }
    }

    const userAgent = navigator.userAgent
    
    let browserName = 'Unknown'
    if (userAgent.includes('Chrome')) browserName = 'Chrome'
    else if (userAgent.includes('Firefox')) browserName = 'Firefox'
    else if (userAgent.includes('Safari')) browserName = 'Safari'
    else if (userAgent.includes('Edge')) browserName = 'Edge'
    
    let osName = 'Unknown'
    if (userAgent.includes('Windows')) osName = 'Windows'
    else if (userAgent.includes('Mac')) osName = 'macOS'
    else if (userAgent.includes('Linux')) osName = 'Linux'
    else if (userAgent.includes('Android')) osName = 'Android'
    else if (userAgent.includes('iOS')) osName = 'iOS'
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    
    return {
      browserName,
      osName,
      isMobile,
      screenResolution: `${screen.width}x${screen.height}`,
      userAgent
    }
  } catch (error) {
    console.error('Erro ao obter info do dispositivo:', error)
    return {
      browserName: 'Unknown',
      osName: 'Unknown',
      isMobile: false,
      screenResolution: 'Unknown',
      userAgent: 'Unknown'
    }
  }
}