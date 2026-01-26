'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
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

// Debounce function para evitar múltiplas chamadas
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout
  return ((...args: any[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Função para atualizar estado do usuário
  const updateUserState = useCallback((session: Session | null) => {
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
  }, [])

  // Debounced version para evitar múltiplas atualizações
  const debouncedUpdateUserState = useCallback(
    debounce(updateUserState, 500), // 500ms de delay
    [updateUserState]
  )

  useEffect(() => {
    if (initialized) return
    
    let mounted = true
    
    const initializeAuth = async () => {
      try {
        console.log('🔐 Inicializando autenticação (dispositivo único)...')
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (error) {
          console.error('❌ Erro ao buscar sessão:', error)
        } else {
          console.log('👤 Sessão encontrada:', !!session)
          updateUserState(session)
        }
        
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

    // Listener com debounce para múltiplos dispositivos
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return
        
        console.log('🔄 Auth state changed (debounced):', event)
        debouncedUpdateUserState(session)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [initialized, updateUserState, debouncedUpdateUserState])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      updateUserState(null)
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