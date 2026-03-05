import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  console.log('🔐 Auth callback iniciado:', {
    hasCode: !!code,
    hasError: !!error,
    next,
    origin
  })

  // Se há erro na URL, redirecionar para login com mensagem
  if (error) {
    console.error('❌ Erro no callback de auth:', error, errorDescription)
    const loginUrl = new URL('/login', origin)
    loginUrl.searchParams.set('error', error)
    if (errorDescription) {
      loginUrl.searchParams.set('error_description', errorDescription)
    }
    return NextResponse.redirect(loginUrl.toString())
  }

  if (code) {
    try {
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value
            },
            set(name: string, value: string, options: CookieOptions) {
              cookieStore.set({ name, value, ...options })
            },
            remove(name: string, options: CookieOptions) {
              cookieStore.set({ name, value: '', ...options })
            },
          },
        }
      )

      console.log('🔄 Trocando código por sessão...')
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('❌ Erro ao trocar código por sessão:', exchangeError)
        const loginUrl = new URL('/login', origin)
        loginUrl.searchParams.set('error', 'auth_error')
        loginUrl.searchParams.set('error_description', 'Erro na autenticação. Tente novamente.')
        return NextResponse.redirect(loginUrl.toString())
      }

      if (data.user) {
        console.log('✅ Usuário autenticado:', data.user.email)
        
        // Verificar se o usuário existe na nossa tabela
        const { data: usuario, error: userError } = await supabase
          .from('usuarios')
          .select('id, email, status, role, nome')
          .eq('id', data.user.id)
          .single()

        if (userError || !usuario) {
          console.warn('⚠️ Usuário não encontrado na tabela usuarios:', data.user.email)
          // Redirecionar para completar cadastro ou login
          const loginUrl = new URL('/login', origin)
          loginUrl.searchParams.set('error', 'user_not_found')
          loginUrl.searchParams.set('error_description', 'Usuário não encontrado. Complete seu cadastro.')
          return NextResponse.redirect(loginUrl.toString())
        }

        // Verificar status do usuário
        if (usuario.status === 'pendente') {
          console.log('⏳ Usuário com status pendente:', usuario.email)
          const loginUrl = new URL('/login', origin)
          loginUrl.searchParams.set('error', 'pending_approval')
          loginUrl.searchParams.set('error_description', 'Sua conta está pendente de aprovação.')
          return NextResponse.redirect(loginUrl.toString())
        }

        if (usuario.status === 'bloqueado') {
          console.log('🚫 Usuário bloqueado:', usuario.email)
          const loginUrl = new URL('/login', origin)
          loginUrl.searchParams.set('error', 'account_blocked')
          loginUrl.searchParams.set('error_description', 'Sua conta foi bloqueada.')
          return NextResponse.redirect(loginUrl.toString())
        }

        if (usuario.status === 'expirado') {
          console.log('⏰ Usuário com conta expirada:', usuario.email)
          const loginUrl = new URL('/login', origin)
          loginUrl.searchParams.set('error', 'account_expired')
          loginUrl.searchParams.set('error_description', 'Sua conta expirou.')
          return NextResponse.redirect(loginUrl.toString())
        }

        // Registrar login bem-sucedido
        try {
          await supabase.from('historico_logins').insert({
            usuario_id: data.user.id,
            ip_address: request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'Unknown',
            sucesso: true,
            user_agent: request.headers.get('user-agent') || 'Unknown',
            metodo: 'oauth_callback'
          })
        } catch (logError) {
          console.warn('⚠️ Erro ao registrar histórico de login:', logError)
          // Não bloquear o login por causa disso
        }

        console.log('✅ Redirecionando para:', next)
        
        // Redirecionar para página de destino
        const redirectUrl = new URL(next, origin)
        redirectUrl.searchParams.set('login_success', 'true')
        return NextResponse.redirect(redirectUrl.toString())
      }
    } catch (error) {
      console.error('❌ Erro inesperado no callback:', error)
      const loginUrl = new URL('/login', origin)
      loginUrl.searchParams.set('error', 'unexpected_error')
      loginUrl.searchParams.set('error_description', 'Erro inesperado na autenticação.')
      return NextResponse.redirect(loginUrl.toString())
    }
  }

  // Se chegou aqui, algo deu errado
  console.warn('⚠️ Callback sem código válido')
  const loginUrl = new URL('/login', origin)
  loginUrl.searchParams.set('error', 'invalid_callback')
  loginUrl.searchParams.set('error_description', 'Callback de autenticação inválido.')
  return NextResponse.redirect(loginUrl.toString())
}