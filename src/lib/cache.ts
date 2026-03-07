// Cache simples em memória com expiração
interface CacheItem<T> {
    data: T
    expiraEm: number
  }
  
  const cache = new Map<string, CacheItem<any>>()
  
  // Buscar do cache (retorna null se expirou)
  export function cacheGet<T>(chave: string): T | null {
    const item = cache.get(chave)
    if (!item) return null
  
    if (Date.now() > item.expiraEm) {
      cache.delete(chave)
      return null
    }
  
    return item.data as T
  }
  
  // Salvar no cache
  export function cacheSet<T>(chave: string, data: T, duracaoMs: number = 5 * 60 * 1000): void {
    cache.set(chave, {
      data,
      expiraEm: Date.now() + duracaoMs
    })
  }
  
  // Invalidar cache específico
  export function cacheInvalidar(chave: string): void {
    cache.delete(chave)
  }
  
  // Invalidar tudo que começa com um prefixo
  export function cacheInvalidarPrefixo(prefixo: string): void {
    for (const chave of cache.keys()) {
      if (chave.startsWith(prefixo)) {
        cache.delete(chave)
      }
    }
  }
  
  // Limpar todo o cache
  export function cacheLimpar(): void {
    cache.clear()
  }
  
  // Helper: buscar com cache (evita código repetitivo)
  export async function comCache<T>(
    chave: string,
    buscarDados: () => Promise<T>,
    duracaoMs: number = 5 * 60 * 1000
  ): Promise<T> {
    // Tentar do cache
    const cached = cacheGet<T>(chave)
    if (cached !== null) {
      console.log(`⚡ Cache hit: ${chave}`)
      return cached
    }
  
    // Buscar do banco
    console.log(`🔍 Cache miss: ${chave}`)
    const dados = await buscarDados()
    cacheSet(chave, dados, duracaoMs)
    return dados
  }