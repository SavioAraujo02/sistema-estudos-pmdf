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
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (initialized) return // EVITAR MÚLTIPLAS INICIALIZAÇÕES
    
    let mounted = true
    
    const initializeAuth = async () => {
      try {
        console.log('🔐 Inicializando autenticação...')
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (error) {
          console.error('❌ Erro ao buscar sessão:', error)
        } else {
          console.log('👤 Sessão encontrada:', !!session)
          setSession(session)
          setUser(session?.user ?? null)
          
          if (session?.user) {
            // Definir role baseado no email (simples)
            const isUserAdmin = session.user.email === 'savio.ads02@gmail.com'
            setUserRole(isUserAdmin ? 'admin' : 'user')
            setIsAdmin(isUserAdmin)
          }
        }
        
        setLoading(false)
        setInitialized(true)
        console.log('✅ Autenticação inicializada')
        
      } catch (error) {
        console.error('❌ Erro na inicialização:', error)
        if (mounted) {
          setLoading(false)
          setInitialized(true)
        }
      }
    }
    
    initializeAuth()

    // Listener de mudanças (SEM async para evitar loops)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return
        
        console.log('🔄 Auth state changed:', event)
        
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const isUserAdmin = session.user.email === 'savio.ads02@gmail.com'
          setUserRole(isUserAdmin ? 'admin' : 'user')
          setIsAdmin(isUserAdmin)
        } else {
          setUserRole(null)
          setIsAdmin(false)
        }
        
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [initialized]) // DEPENDÊNCIA CRUCIAL

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      setUserRole(null)
      setIsAdmin(false)
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