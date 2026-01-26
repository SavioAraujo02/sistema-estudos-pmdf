import { createBrowserClient } from '@supabase/ssr'

// Criar cliente com configurações otimizadas
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'x-client-info': 'estudos-pmdf@1.0.0'
      }
    }
  }
)

// Função helper para retry em caso de erro
export async function supabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  let retries = 3
  
  while (retries > 0) {
    try {
      const result = await queryFn()
      return result
    } catch (error: any) {
      console.warn(`Tentativa falhou, restam ${retries - 1} tentativas:`, error.message)
      retries--
      
      if (retries === 0) {
        return { data: null, error }
      }
      
      // Aguardar antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  return { data: null, error: new Error('Máximo de tentativas excedido') }
}