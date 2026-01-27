'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface UsuarioStatus {
  status: 'pendente' | 'ativo' | 'expirado' | 'bloqueado'
  data_expiracao?: string
  observacoes?: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isAdmin: boolean
  userRole: 'admin' | 'user' | null
  userStatus: UsuarioStatus | null
  signOut: () => Promise<void>
  verificarStatus: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  userRole: null,
  userStatus: null,
  signOut: async () => {},
  verificarStatus: async () => {}
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
  const [userStatus, setUserStatus] = useState<UsuarioStatus | null>(null)
  const [initialized, setInitialized] = useState(false)

  
  // Função para criar usuário automaticamente
  const criarUsuarioAutomaticamente = useCallback(async (userId: string) => {
    try {
      // Buscar dados do usuário do auth
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return null

      // Verificar se é admin
      const isUserAdmin = user.email === 'savio.ads02@gmail.com'

      const { data, error } = await supabase
        .from('usuarios')
        .insert({
          id: userId,
          email: user.email!,
          nome: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
          foto: user.user_metadata?.avatar_url,
          role: isUserAdmin ? 'admin' : 'user',
          status: isUserAdmin ? 'ativo' : 'pendente'
        })
        .select()
        .single()

      if (error) {
        console.error('Erro ao criar usuário:', error)
        return null
      }

      console.log('✅ Usuário criado automaticamente:', data)

      const statusInfo: UsuarioStatus = {
        status: data.status,
        data_expiracao: data.data_expiracao,
        observacoes: data.observacoes
      }

      setUserStatus(statusInfo)
      setUserRole(data.role)
      setIsAdmin(data.role === 'admin')

      return statusInfo
    } catch (error) {
      console.error('Erro ao criar usuário automaticamente:', error)
      return null
    }
  }, [])
    
  // Função para verificar status do usuário no banco
  const verificarStatusUsuario = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('status, data_expiracao, observacoes, role')
        .eq('id', userId)
        .single()

      if (error) {
        // Se usuário não existe, criar automaticamente
        if (error.code === 'PGRST116') {
          console.log('👤 Usuário não encontrado, criando automaticamente...')
          return await criarUsuarioAutomaticamente(userId)
        }
        
        console.error('Erro ao verificar status:', error)
        return null
      }

      // Verificar se expirou
      let status = data.status
      if (status === 'ativo' && data.data_expiracao) {
        const agora = new Date()
        const expiracao = new Date(data.data_expiracao)
        if (agora > expiracao) {
          status = 'expirado'
          // Atualizar no banco
          await supabase
            .from('usuarios')
            .update({ status: 'expirado' })
            .eq('id', userId)
        }
      }

      const statusInfo: UsuarioStatus = {
        status,
        data_expiracao: data.data_expiracao,
        observacoes: data.observacoes
      }

      setUserStatus(statusInfo)
      setUserRole(data.role)
      setIsAdmin(data.role === 'admin')

      return statusInfo
    } catch (error) {
      console.error('Erro ao verificar status:', error)
      return null
    }
  }, [])

  // Função para atualizar estado do usuário
  const updateUserState = useCallback(async (session: Session | null) => {
    setSession(session)
    setUser(session?.user ?? null)

    if (session?.user) {
      await verificarStatusUsuario(session.user.id)
    } else {
      setUserRole(null)
      setIsAdmin(false)
      setUserStatus(null)
    }
    
    setLoading(false)
  }, [verificarStatusUsuario])

  // Função para verificar status manualmente
  const verificarStatus = useCallback(async () => {
    if (user) {
      await verificarStatusUsuario(user.id)
    }
  }, [user, verificarStatusUsuario])

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
          await updateUserState(session)
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
      await updateUserState(null)
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      isAdmin, 
      userRole, 
      userStatus, 
      signOut, 
      verificarStatus 
    }}>
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