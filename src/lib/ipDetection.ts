interface IPInfo {
  ip: string
  country?: string
  city?: string
  region?: string
  isp?: string
  isVPN?: boolean
  timezone?: string
}

export async function getIPInfo(): Promise<IPInfo> {
  try {
    // Tentar APIs em ordem de preferência
    const apis = [
      {
        url: 'https://ipapi.co/json/',
        parser: (data: any) => ({
          ip: data.ip || 'Unknown',
          country: data.country_name,
          city: data.city,
          region: data.region,
          isp: data.org,
          isVPN: data.threat?.is_anonymous || false,
          timezone: data.timezone
        })
      },
      {
        url: 'https://ip-api.com/json/',
        parser: (data: any) => ({
          ip: data.query || 'Unknown',
          country: data.country,
          city: data.city,
          region: data.regionName,
          isp: data.isp,
          isVPN: data.proxy || false,
          timezone: data.timezone
        })
      },
      {
        url: 'https://ipinfo.io/json',
        parser: (data: any) => ({
          ip: data.ip || 'Unknown',
          country: data.country,
          city: data.city,
          region: data.region,
          isp: data.org,
          timezone: data.timezone
        })
      }
    ]

    for (const api of apis) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout
        
        const response = await fetch(api.url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          }
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        const data = await response.json()
        const result = api.parser(data)
        
        if (result.ip && result.ip !== 'Unknown') {
          console.log('✅ IP Info obtido com sucesso:', result.ip)
          return result
        }
      } catch (error) {
        console.warn(`⚠️ Erro na API ${api.url}:`, error)
        continue
      }
    }
    
    // Fallback final: apenas IP básico
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      
      const response = await fetch('https://api.ipify.org?format=json', {
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const data = await response.json()
        if (data.ip) {
          console.log('✅ IP básico obtido:', data.ip)
          return { ip: data.ip }
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro no fallback de IP:', error)
    }
    
    // Último recurso
    console.warn('⚠️ Não foi possível obter IP, usando Unknown')
    return { ip: 'Unknown' }
    
  } catch (error) {
    console.error('❌ Erro geral ao detectar IP:', error)
    return { ip: 'Unknown' }
  }
}

// Função para detectar se é VPN/Proxy (básica)
export function detectVPN(ip: string): boolean {
  // Lista básica de ranges de VPN conhecidos
  const vpnRanges = [
    '10.', '172.16.', '192.168.', // IPs privados
    '127.', // Localhost
  ]
  
  return vpnRanges.some(range => ip.startsWith(range))
}

// Função para formatar localização
export function formatLocation(ipInfo: IPInfo): string {
  const parts = []
  if (ipInfo.city) parts.push(ipInfo.city)
  if (ipInfo.region) parts.push(ipInfo.region)
  if (ipInfo.country) parts.push(ipInfo.country)
  
  return parts.length > 0 ? parts.join(', ') : 'Localização desconhecida'
}

// Função para obter flag do país
export function getCountryFlag(countryCode?: string): string {
  if (!countryCode) return '🌍'
  
  const flags: Record<string, string> = {
    'BR': '🇧🇷', 'US': '🇺🇸', 'CA': '🇨🇦', 'GB': '🇬🇧',
    'DE': '🇩🇪', 'FR': '🇫🇷', 'IT': '🇮🇹', 'ES': '🇪🇸',
    'PT': '🇵🇹', 'AR': '🇦🇷', 'MX': '🇲🇽', 'CL': '🇨🇱'
  }
  
  return flags[countryCode.toUpperCase()] || '🌍'
}

// Cache simples para evitar múltiplas chamadas
let ipCache: { data: IPInfo; timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

export async function getCachedIPInfo(): Promise<IPInfo> {
  const now = Date.now()
  
  if (ipCache && (now - ipCache.timestamp) < CACHE_DURATION) {
    console.log('📋 Usando IP do cache:', ipCache.data.ip)
    return ipCache.data
  }
  
  const ipInfo = await getIPInfo()
  ipCache = { data: ipInfo, timestamp: now }
  
  return ipInfo
}