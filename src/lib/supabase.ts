import { createBrowserClient } from '@supabase/ssr'

// Verificar se as variáveis existem
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não encontradas')
}

console.log('🔗 Conectando ao Supabase:', supabaseUrl)

export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
)

// Teste de conectividade
supabase.auth.onAuthStateChange((event, session) => {
  console.log('🔐 Auth state changed:', event, session?.user?.id)
})