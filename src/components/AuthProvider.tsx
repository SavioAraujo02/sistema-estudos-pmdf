'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { createOrUpdateSession, updateSessionActivity } from '@/lib/sessionManager'

interface UsuarioStatus {
  status: 'pendente' | 'ativo' | 'expirado' | 'bloqueado'
  data_expiracao?: string
  observacoes?: string
}

interface ActiveUsersInfo {
  totalActive: number
  totalDevices: number
  userDevices: Record<string, number>
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isAdmin: boolean
  userRole: 'admin' | 'user' | null
  userStatus: UsuarioStatus | null
  activeUsers: ActiveUsersInfo
  signOut: () => Promise<void>
  verificarStatus: () => Promise<void>
  refreshActiveUsers: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  userRole: null,
  userStatus: null,
  activeUsers: { totalActive: 0, totalDevices: 0, userDevices: {} },
  signOut: async () => {},
  verificarStatus: async () => {},
  refreshActiveUsers: async () => {}
})

// Debounce function para evitar múltiplas chamadas
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout
  return ((...args: any[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}

// Função para buscar usuários ativos com o novo sistema
async function getActiveUsers(): Promise<ActiveUsersInfo> {
  try {
    // Buscar sessões ativas (últimos 10 minutos)
    const { data: sessoes, error } = await supabase
      .from('user_sessions')
      .select('usuario_id, device_fingerprint, last_activity')
      .gte('last_activity', new Date(Date.now() - 10 * 60 * 1000).toISOString())

    if (error) throw error

    // Contar usuários únicos e dispositivos
    const usuariosUnicos = new Set(sessoes.map(s => s.usuario_id))
    const userDevices: Record<string, number> = {}
    
    sessoes.forEach(sessao => {
      userDevices[sessao.usuario_id] = (userDevices[sessao.usuario_id] || 0) + 1
    })

    return {
      totalActive: usuariosUnicos.size,
      totalDevices: sessoes.length,
      userDevices
    }
  } catch (error) {
    console.error('Erro ao buscar usuários ativos:', error)
    return { totalActive: 0, totalDevices: 0, userDevices: {} }
  }
}

// Função para remover sessão do usuário
async function removeUserSession(userId: string) {
  try {
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('usuario_id', userId)

    if (error) {
      console.error('Erro ao remover sessão:', error)
    } else {
      console.log('✅ Sessão removida com sucesso')
    }
  } catch (error) {
    console.error('Erro ao remover sessão:', error)
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userStatus, setUserStatus] = useState<UsuarioStatus | null>(null)
  const [activeUsers, setActiveUsers] = useState<ActiveUsersInfo>({ 
    totalActive: 0, 
    totalDevices: 0, 
    userDevices: {} 
  })
  const [initialized, setInitialized] = useState(false)

  // Função para atualizar usuários ativos
  const refreshActiveUsers = useCallback(async () => {
    try {
      const activeInfo = await getActiveUsers()
      setActiveUsers(activeInfo)
      console.log('📊 Usuários ativos atualizados:', activeInfo)
    } catch (error) {
      console.error('Erro ao atualizar usuários ativos:', error)
    }
  }, [])

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
  }, [criarUsuarioAutomaticamente])

  // Função para atualizar estado do usuário
  const updateUserState = useCallback(async (session: Session | null) => {
    setSession(session)
    setUser(session?.user ?? null)

    if (session?.user) {
      // Verificar status do usuário
      await verificarStatusUsuario(session.user.id)
      
      // Criar/atualizar sessão com dados do dispositivo e IP
      await createOrUpdateSession(session.user.id)
      
      // Atualizar usuários ativos
      await refreshActiveUsers()
    } else {
      // Remover sessão ao fazer logout
      if (user?.id) {
        await removeUserSession(user.id)
      }
      
      setUserRole(null)
      setIsAdmin(false)
      setUserStatus(null)
      
      // Atualizar usuários ativos após logout
      await refreshActiveUsers()
    }
    
    setLoading(false)
  }, [verificarStatusUsuario, refreshActiveUsers, user?.id])

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

  // Atualizar atividade da sessão periodicamente
  useEffect(() => {
    if (!user) return

    const updateActivity = async () => {
      await updateSessionActivity(user.id)
    }

    // Atualizar atividade a cada 5 minutos
    const interval = setInterval(updateActivity, 5 * 60 * 1000)
    
    // Atualizar atividade em eventos de interação
    const events = ['click', 'keypress', 'scroll', 'mousemove']
    let lastUpdate = 0
    
    const handleActivity = () => {
      const now = Date.now()
      // Throttle: só atualiza se passou mais de 1 minuto da última atualização
      if (now - lastUpdate > 60 * 1000) {
        lastUpdate = now
        updateActivity()
      }
    }

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      clearInterval(interval)
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [user])

  // Atualizar usuários ativos periodicamente
  useEffect(() => {
    if (!initialized) return

    // Atualizar usuários ativos a cada 2 minutos
    const interval = setInterval(refreshActiveUsers, 2 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [initialized, refreshActiveUsers])

  useEffect(() => {
    if (initialized) return
    
    let mounted = true
    
    const initializeAuth = async () => {
      try {
        console.log('🔐 Inicializando autenticação com rastreamento avançado de sessões...')
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (error) {
          console.error('❌ Erro ao buscar sessão:', error)
        } else {
          console.log('👤 Sessão encontrada:', !!session)
          await updateUserState(session)
        }
        
        setInitialized(true)
        console.log('✅ Autenticação inicializada com rastreamento avançado')
        
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
        
        console.log('🔄 Auth state changed (sistema avançado):', event)
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
      // Remover sessão antes do logout
      if (user?.id) {
        await removeUserSession(user.id)
      }
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
      activeUsers,
      signOut, 
      verificarStatus,
      refreshActiveUsers
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