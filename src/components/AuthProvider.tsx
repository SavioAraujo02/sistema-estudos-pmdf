'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isAdmin: boolean
  userRole: 'admin' | 'user' | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  userRole: null,
  signOut: async () => {}
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let mounted = true
    
    const initializeAuth = async () => {
      try {
        console.log('🔐 Inicializando autenticação...')
        
        // Pegar sessão inicial
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (error) {
          console.error('❌ Erro ao buscar sessão:', error)
          setLoading(false)
          return
        }
        
        console.log('👤 Sessão encontrada:', !!session)
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await buscarRoleUsuario(session.user.id)
        }
        
        setLoading(false)
        console.log('✅ Autenticação inicializada')
        
      } catch (error) {
        console.error('❌ Erro na inicialização:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }
    
    // Inicializar autenticação
    initializeAuth()

    // Escutar mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event)
        
        if (!mounted) return
        
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          if (event === 'SIGNED_IN') {
            await criarOuAtualizarUsuario(session.user)
          } else {
            await buscarRoleUsuario(session.user.id)
          }
        } else {
          setUserRole(null)
          setIsAdmin(false)
        }
        
        setLoading(false)
      }
    )

    // Cleanup function
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const criarOuAtualizarUsuario = async (user: User) => {
    try {
      // Primeiro, verificar se é admin (seu email específico)
      const isUserAdmin = user.email === 'savio.ads02@gmail.com' // SUBSTITUA PELO SEU EMAIL

      const { data, error } = await supabase
        .from('usuarios')
        .upsert({
          id: user.id,
          email: user.email!,
          nome: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
          foto: user.user_metadata?.avatar_url,
          role: isUserAdmin ? 'admin' : 'user'
        })
        .select()
        .single()

      if (error) {
        console.error('Erro ao criar/atualizar usuário:', error)
      } else if (data) {
        setUserRole(data.role)
        setIsAdmin(data.role === 'admin')
      }
    } catch (error) {
      console.error('Erro inesperado ao criar/atualizar usuário:', error)
    }
  }

  const buscarRoleUsuario = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('role')
        .eq('id', userId)
        .single()

      if (!error && data) {
        setUserRole(data.role)
        setIsAdmin(data.role === 'admin')
      }
    } catch (error) {
      console.error('Erro ao buscar role do usuário:', error)
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, userRole, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}