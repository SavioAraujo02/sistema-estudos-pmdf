'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ThemeToggle } from '@/components/ThemeToggle'
import { 
  Loader2, Upload, X, Copy, Check, Eye, EyeOff, 
  Shield, Mail, Lock, User, Phone, MapPin, Calendar,
  AlertCircle, CheckCircle, Info, ArrowLeft, RefreshCw,
  Smartphone, Wifi, WifiOff, Hash
} from 'lucide-react'
import { Toast } from '@/components/Toast'
import { useToast } from '@/hooks/useToast'

type ModoType = 'login' | 'cadastro' | 'reset-senha' | 'trocar-senha'

// Lista de pelotões do CFP (8 Cias × 3 Pelotões cada)
const PELOTOES = [
  { cia: '1ª Cia', pelotoes: ['Pelotão 11', 'Pelotão 12', 'Pelotão 13'] },
  { cia: '2ª Cia', pelotoes: ['Pelotão 21', 'Pelotão 22', 'Pelotão 23'] },
  { cia: '3ª Cia', pelotoes: ['Pelotão 31', 'Pelotão 32', 'Pelotão 33'] },
  { cia: '4ª Cia', pelotoes: ['Pelotão 41', 'Pelotão 42', 'Pelotão 43'] },
  { cia: '5ª Cia', pelotoes: ['Pelotão 51', 'Pelotão 52', 'Pelotão 53'] },
  { cia: '6ª Cia', pelotoes: ['Pelotão 61', 'Pelotão 62', 'Pelotão 63'] },
  { cia: '7ª Cia', pelotoes: ['Pelotão 71', 'Pelotão 72', 'Pelotão 73'] },
  { cia: '8ª Cia', pelotoes: ['Pelotão 81', 'Pelotão 82', 'Pelotão 83'] },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [modo, setModo] = useState<ModoType>('login')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [lembrarMe, setLembrarMe] = useState(false)
  const [tentativasLogin, setTentativasLogin] = useState(0)

  const [isOnline, setIsOnline] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [tempoRestante, setTempoRestante] = useState(0)
  const [bloqueadoAte, setBloqueadoAte] = useState<Date | null>(null)
  
  // Campos do cadastro
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cpf, setCpf] = useState('')
  const [cpfErro, setCpfErro] = useState('')
  const [verificandoCpf, setVerificandoCpf] = useState(false)
  const [dataNascimento, setDataNascimento] = useState('')
  const [endereco, setEndereco] = useState('')
  const [pelotao, setPelotao] = useState('')
  const [matriculaCadastro, setMatriculaCadastro] = useState('')
  
  // Estados do pagamento
  const [showPagamento, setShowPagamento] = useState(false)
  const [comprovante, setComprovante] = useState<File | null>(null)
  const [pixCopiado, setPixCopiado] = useState(false)
  
  // Estados de validação
  const [senhaForte, setSenhaForte] = useState({
    tamanho: false,
    maiuscula: false,
    minuscula: false,
    numero: false,
    especial: false
  })

  const PIX_CHAVE = "9a1b6c3e-85d2-43f9-903b-484ff1899eb6"
  const PIX_NOME = "Dara Lorrane Mota Silva"
  const PIX_BANCO = "PagBank"
  const VALOR_CURSO = "R$ 100,00"
  const MAX_TENTATIVAS = 5

  const { toast, showError, showWarning, showSuccess, hideToast } = useToast()

  // Verificar força da senha
  useEffect(() => {
    if (modo === 'cadastro' || modo === 'trocar-senha') {
      const senhaAtual = modo === 'trocar-senha' ? novaSenha : senha
      setSenhaForte({
        tamanho: senhaAtual.length >= 8,
        maiuscula: /[A-Z]/.test(senhaAtual),
        minuscula: /[a-z]/.test(senhaAtual),
        numero: /\d/.test(senhaAtual),
        especial: /[!@#$%^&*(),.?":{}|<>]/.test(senhaAtual)
      })
    }
  }, [senha, novaSenha, modo])

  // Carregar tentativas e verificar bloqueio
  useEffect(() => {
    const tentativas = localStorage.getItem('login_tentativas')
    const bloqueioAte = localStorage.getItem('bloqueio_ate')
    
    if (tentativas) {
      setTentativasLogin(parseInt(tentativas))
    }
    
    if (bloqueioAte) {
      const dataBloqueio = new Date(bloqueioAte)
      const agora = new Date()
      
      if (agora < dataBloqueio) {
        setBloqueadoAte(dataBloqueio)
        const segundosRestantes = Math.ceil((dataBloqueio.getTime() - agora.getTime()) / 1000)
        setTempoRestante(segundosRestantes)
      } else {
        localStorage.removeItem('login_tentativas')
        localStorage.removeItem('bloqueio_ate')
        setTentativasLogin(0)
      }
    }
  }, [])

  // Contador regressivo do bloqueio
  useEffect(() => {
    if (tempoRestante > 0) {
      const timer = setInterval(() => {
        setTempoRestante(prev => {
          if (prev <= 1) {
            localStorage.removeItem('login_tentativas')
            localStorage.removeItem('bloqueio_ate')
            setTentativasLogin(0)
            setBloqueadoAte(null)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [tempoRestante])

  useEffect(() => {
    if (tempoRestante === 0 && tentativasLogin >= MAX_TENTATIVAS) {
      setTentativasLogin(0)
    }
  }, [tempoRestante, tentativasLogin])

  // Verificar se está no cliente e monitorar conectividade
  useEffect(() => {
    setIsClient(true)
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Carregar email salvo se "Lembrar-me" foi usado
  useEffect(() => {
    const emailSalvo = localStorage.getItem('remember_user')
    if (emailSalvo) {
      setEmail(emailSalvo)
      setLembrarMe(true)
    }
  }, [])

  // Verificar se está vindo de reset de senha
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('modo') === 'trocar-senha') {
      setModo('trocar-senha')
    }
  }, [])

  // Verificar CPF duplicado com debounce
  useEffect(() => {
    const cpfNumeros = cpf.replace(/\D/g, '')
    if (cpfNumeros.length !== 11) {
      setCpfErro('')
      return
    }

    // Validar CPF
    if (!validarCPF(cpf)) {
      setCpfErro('CPF inválido')
      return
    }

    // Verificar duplicata no banco
    const timer = setTimeout(async () => {
      setVerificandoCpf(true)
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('id')
          .eq('cpf', formatarCPF(cpf))
          .maybeSingle()

        if (data) {
          setCpfErro('Este CPF já está cadastrado no sistema')
        } else {
          setCpfErro('')
        }
      } catch (error) {
        console.error('Erro ao verificar CPF:', error)
      } finally {
        setVerificandoCpf(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [cpf])

  // Formatação de campos
  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, '')
    if (numeros.length <= 11) {
      return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }
    return valor
  }

  const formatarCPF = (valor: string) => {
    const numeros = valor.replace(/\D/g, '')
    if (numeros.length <= 11) {
      return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }
    return valor
  }

  const validarCPF = (cpfVal: string) => {
    const numeros = cpfVal.replace(/\D/g, '')
    if (numeros.length !== 11) return false
    if (/^(\d)\1+$/.test(numeros)) return false

    let soma = 0
    for (let i = 0; i < 9; i++) soma += parseInt(numeros[i]) * (10 - i)
    let resto = (soma * 10) % 11
    if (resto === 10) resto = 0
    if (resto !== parseInt(numeros[9])) return false

    soma = 0
    for (let i = 0; i < 10; i++) soma += parseInt(numeros[i]) * (11 - i)
    resto = (soma * 10) % 11
    if (resto === 10) resto = 0
    if (resto !== parseInt(numeros[10])) return false

    return true
  }

  const validarEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  const validarSenhaForte = () => {
    return Object.values(senhaForte).every(Boolean)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (tempoRestante > 0) {
      const minutos = Math.floor(tempoRestante / 60)
      const segundos = tempoRestante % 60
      showError(`Muitas tentativas de login. Tente novamente em ${minutos}:${segundos.toString().padStart(2, '0')}`)
      return
    }

    if (tentativasLogin >= MAX_TENTATIVAS && tempoRestante === 0) {
      localStorage.removeItem('login_tentativas')
      localStorage.removeItem('bloqueio_ate')
      setTentativasLogin(0)
    }

    if (!validarEmail(email)) {
      showError('Por favor, insira um email válido.')
      return
    }

    setLoading(true)
  
    try {
      const { data: usuarioExiste, error: checkError } = await supabase
        .from('usuarios')
        .select('id, email, status, nome, data_expiracao')
        .eq('email', email)
        .single()
  
      if (checkError || !usuarioExiste) {
        setTentativasLogin(prev => {
          const novas = prev + 1
          localStorage.setItem('login_tentativas', novas.toString())
          
          if (novas >= MAX_TENTATIVAS) {
            const agora = new Date()
            const bloqueioAte = new Date(agora.getTime() + 15 * 60 * 1000)
            localStorage.setItem('bloqueio_ate', bloqueioAte.toISOString())
            setBloqueadoAte(bloqueioAte)
            setTempoRestante(15 * 60)
          }
          
          return novas
        })
        showError('Email não encontrado. Use "Criar Conta" para se cadastrar.')
        setLoading(false)
        return
      }
  
      if (usuarioExiste.status === 'pendente') {
        showWarning('Sua conta está pendente de aprovação. Aguarde a liberação do administrador.')
        setLoading(false)
        return
      }
  
      if (usuarioExiste.status === 'bloqueado') {
        showError('Sua conta foi bloqueada. Entre em contato com o administrador.')
        setLoading(false)
        return
      }
  
      if (usuarioExiste.status === 'expirado') {
        showWarning('Sua conta expirou. Entre em contato com o administrador.')
        setLoading(false)
        return
      }

      if (usuarioExiste.data_expiracao) {
        const agora = new Date()
        const expiracao = new Date(usuarioExiste.data_expiracao)
        if (agora > expiracao) {
          showWarning('Sua conta expirou. Entre em contato com o administrador.')
          setLoading(false)
          return
        }
      }
  
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      })
  
      if (error) {
        setTentativasLogin(prev => {
          const novas = prev + 1
          localStorage.setItem('login_tentativas', novas.toString())
          return novas
        })
        
        if (error.message.includes('Invalid login credentials')) {
          showError(`Senha incorreta. Tentativa ${tentativasLogin + 1}/${MAX_TENTATIVAS}`)
        } else {
          showError('Erro ao fazer login: ' + error.message)
        }
      } else if (data.user) {
        localStorage.removeItem('login_tentativas')
        setTentativasLogin(0)
        
        showSuccess(`Bem-vindo, ${usuarioExiste.nome}!`)
        
        if (lembrarMe) {
          localStorage.setItem('remember_user', email)
        }
        
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1000)
      }
    } catch (error) {
      console.error('Erro inesperado:', error)
      showError('Erro inesperado ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const handleResetSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validarEmail(email)) {
      showError('Por favor, insira um email válido.')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login?modo=trocar-senha`
      })

      if (error) {
        showError('Erro ao enviar email de recuperação: ' + error.message)
      } else {
        showSuccess('Email de recuperação enviado! Verifique sua caixa de entrada.')
        setModo('login')
      }
    } catch (error) {
      showError('Erro inesperado ao enviar email de recuperação')
    } finally {
      setLoading(false)
    }
  }

  const handleTrocarSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validarSenhaForte()) {
      showError('A nova senha não atende aos critérios de segurança.')
      return
    }

    if (novaSenha !== confirmarSenha) {
      showError('As senhas não coincidem.')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: novaSenha
      })

      if (error) {
        showError('Erro ao alterar senha: ' + error.message)
      } else {
        showSuccess('Senha alterada com sucesso!')
        setModo('login')
        setNovaSenha('')
        setConfirmarSenha('')
      }
    } catch (error) {
      showError('Erro inesperado ao alterar senha')
    } finally {
      setLoading(false)
    }
  }

  const validarCadastro = () => {
    if (!nomeCompleto.trim()) return 'Nome completo é obrigatório'
    if (!telefone.trim()) return 'Telefone é obrigatório'
    if (!cpf.trim() || !validarCPF(cpf)) return 'CPF inválido'
    if (cpfErro) return cpfErro
    if (matriculaCadastro.replace(/\D/g, '').length !== 8) return 'Matrícula deve ter 8 dígitos'
    if (!dataNascimento) return 'Data de nascimento é obrigatória'
    if (!endereco.trim()) return 'Endereço é obrigatório'
    if (!pelotao) return 'Selecione seu pelotão'
    if (!validarEmail(email)) return 'Email inválido'
    if (!validarSenhaForte()) return 'Senha não atende aos critérios de segurança'
    return null
  }

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const erro = validarCadastro()
    if (erro) {
      showError(erro)
      return
    }
  
    setLoading(true)
  
    try {
      // 1. Verificar se o email já existe
      const { data: usuarioExiste } = await supabase
        .from('usuarios')
        .select('email')
        .eq('email', email)
        .single()
  
      if (usuarioExiste) {
        showError('Este email já está cadastrado. Use "Entrar" para fazer login.')
        setLoading(false)
        return
      }

      // 2. Verificar CPF duplicado (segurança extra)
      const { data: cpfExiste } = await supabase
        .from('usuarios')
        .select('id')
        .eq('cpf', formatarCPF(cpf))
        .maybeSingle()

      if (cpfExiste) {
        showError('Este CPF já está cadastrado no sistema.')
        setLoading(false)
        return
      }
  
      // 3. Criar conta
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            full_name: nomeCompleto
          }
        }
      })
  
      if (authError) {
        if (authError.message.includes('User already registered')) {
          showError('Este email já possui uma conta. Use "Entrar" para fazer login.')
        } else {
          showError('Erro ao criar conta: ' + authError.message)
        }
        return
      }
  
      if (authData.user) {
        // 4. Criar registro na tabela usuarios
        const { error: userError } = await supabase
          .from('usuarios')
          .insert({
            id: authData.user.id,
            email: email,
            nome: email.split('@')[0],
            nome_completo: nomeCompleto,
            telefone: telefone,
            cpf: formatarCPF(cpf),
            matricula: matriculaCadastro,
            data_nascimento: dataNascimento,
            endereco: endereco,
            pelotao: pelotao,
            role: 'user',
            status: 'pendente',
            metodo_pagamento: 'pix'
          })
  
        if (userError) {
          console.error('Erro ao criar usuário:', userError)
          showError('Erro ao salvar dados do usuário')
          return
        }
  
        showSuccess('Conta criada com sucesso! Agora realize o pagamento.')
        setShowPagamento(true)
      }
    } catch (error) {
      console.error('Erro inesperado:', error)
      showError('Erro inesperado ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  const copiarPix = () => {
    navigator.clipboard.writeText(PIX_CHAVE)
    setPixCopiado(true)
    showSuccess('Chave PIX copiada!')
    setTimeout(() => setPixCopiado(false), 2000)
  }

  const handleUploadComprovante = async (file: File) => {
    if (!file) return

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      showError('Arquivo muito grande. Máximo 5MB.')
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      showError('Tipo de arquivo não permitido. Use JPG, PNG ou PDF.')
      return
    }

    try {
      setLoading(true)
      
      const fileName = `comprovantes/${Date.now()}_${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('comprovantes')
        .upload(fileName, file)

      if (uploadError) {
        showError('Erro ao fazer upload do comprovante')
        return
      }

      const { data: urlData } = supabase.storage
        .from('comprovantes')
        .getPublicUrl(fileName)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({
            comprovante_url: urlData.publicUrl,
            comprovante_nome: file.name,
            data_pagamento: new Date().toISOString(),
            valor_pago: 100.00
          })
          .eq('id', user.id)

        if (updateError) {
          showError('Erro ao salvar comprovante')
          return
        }

        showSuccess('Comprovante enviado com sucesso! Aguarde a aprovação do administrador.')
        setModo('login')
        setShowPagamento(false)
        
        // Limpar formulário
        setNomeCompleto('')
        setTelefone('')
        setCpf('')
        setDataNascimento('')
        setEndereco('')
        setPelotao('')
        setMatriculaCadastro('')
        setEmail('')
        setSenha('')
        setComprovante(null)
      }
    } catch (error) {
      console.error('Erro no upload:', error)
      showError('Erro inesperado no upload')
    } finally {
      setLoading(false)
    }
  }

  // Componente de força da senha
  const IndicadorForcaSenha = () => (
    <div className="mt-2 space-y-1">
      <div className="text-xs text-gray-600 dark:text-gray-400">Critérios da senha:</div>
      <div className="grid grid-cols-2 gap-1 text-xs">
        <div className={`flex items-center gap-1 ${senhaForte.tamanho ? 'text-green-600' : 'text-gray-400'}`}>
          {senhaForte.tamanho ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          8+ caracteres
        </div>
        <div className={`flex items-center gap-1 ${senhaForte.maiuscula ? 'text-green-600' : 'text-gray-400'}`}>
          {senhaForte.maiuscula ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          Maiúscula
        </div>
        <div className={`flex items-center gap-1 ${senhaForte.minuscula ? 'text-green-600' : 'text-gray-400'}`}>
          {senhaForte.minuscula ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          Minúscula
        </div>
        <div className={`flex items-center gap-1 ${senhaForte.numero ? 'text-green-600' : 'text-gray-400'}`}>
          {senhaForte.numero ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          Número
        </div>
        <div className={`flex items-center gap-1 ${senhaForte.especial ? 'text-green-600' : 'text-gray-400'}`}>
          {senhaForte.especial ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          Especial (!@#$)
        </div>
      </div>
    </div>
  )

  // ==========================================
  // TELA DE PAGAMENTO
  // ==========================================
  if (showPagamento) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">💳</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Finalizar Pagamento
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Valor: {VALOR_CURSO}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 space-y-6">
            {/* Dados do PIX */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Dados para PIX
              </h3>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                {/* Dados do recebedor */}
                <div className="mb-3 p-3 bg-white dark:bg-gray-800 rounded border border-blue-100 dark:border-blue-900">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-xs text-gray-500">Recebedor:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{PIX_NOME}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Banco:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{PIX_BANCO}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Chave PIX (aleatória):
                  </span>
                  <button
                    onClick={copiarPix}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                  >
                    {pixCopiado ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {pixCopiado ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <div className="text-sm text-gray-900 dark:text-white font-mono bg-white dark:bg-gray-800 p-3 rounded border break-all">
                  {PIX_CHAVE}
                </div>
                <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                  <p className="text-lg font-bold text-green-600 dark:text-green-400 text-center">
                    Valor: {VALOR_CURSO}
                  </p>
                </div>
              </div>
            </div>

            {/* Upload do comprovante */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Enviar Comprovante
              </h3>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setComprovante(file)
                    }
                  }}
                  className="hidden"
                  id="comprovante"
                />
                <label
                  htmlFor="comprovante"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Clique para selecionar o comprovante
                  </span>
                  <span className="text-xs text-gray-500">
                    PNG, JPG ou PDF até 5MB
                  </span>
                </label>
                
                {comprovante && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-700 dark:text-green-300 truncate">
                          {comprovante.name}
                        </span>
                      </div>
                      <button
                        onClick={() => setComprovante(null)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {(comprovante.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPagamento(false)
                  setModo('login')
                }}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>
              <button
                onClick={() => comprovante && handleUploadComprovante(comprovante)}
                disabled={!comprovante || loading}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {loading ? 'Enviando...' : 'Enviar Comprovante'}
              </button>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-yellow-700 dark:text-yellow-300">
                  <p className="font-medium mb-1">Importante:</p>
                  <ul className="space-y-1">
                    <li>• Após o envio, aguarde a aprovação do administrador</li>
                    <li>• O acesso será liberado em até 24 horas</li>
                    <li>• Você receberá um email de confirmação</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={hideToast} />
      </div>
    )
  }

  // ==========================================
  // TELA PRINCIPAL DE LOGIN/CADASTRO
  // ==========================================
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      {isClient && (
        <div className="absolute top-4 left-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {isOnline ? (
              <><Wifi className="h-4 w-4 text-green-500" /><span>Online</span></>
            ) : (
              <><WifiOff className="h-4 w-4 text-red-500" /><span>Offline</span></>
            )}
          </div>
        </div>
      )}
      
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🎖️</div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Sistema de Estudos
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            CFP XII - Preparação para Concursos
          </p>
          
          {tentativasLogin > 0 && tentativasLogin < MAX_TENTATIVAS && (
            <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                ⚠️ Tentativas de login: {tentativasLogin}/{MAX_TENTATIVAS}
              </p>
            </div>
          )}
          
          {(tentativasLogin >= MAX_TENTATIVAS || tempoRestante > 0) && (
            <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
              <p className="text-xs text-red-700 dark:text-red-300">
                🚫 Muitas tentativas. Aguarde: {Math.floor(tempoRestante / 60)}:{(tempoRestante % 60).toString().padStart(2, '0')}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          {/* Navegação entre modos */}
          <div className="flex mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setModo('login')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                modo === 'login'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Lock className="h-4 w-4 inline mr-1" />
              Entrar
            </button>
            <button
              onClick={() => setModo('cadastro')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                modo === 'cadastro'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <User className="h-4 w-4 inline mr-1" />
              Criar Conta
            </button>
          </div>

          {/* ==================== */}
          {/* FORMULÁRIO DE LOGIN */}
          {/* ==================== */}
          {modo === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Mail className="h-4 w-4 inline mr-1" /> Email
                </label>
                <input
                  id="email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="seu.email@exemplo.com" required autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="senha" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Lock className="h-4 w-4 inline mr-1" /> Senha
                </label>
                <div className="relative">
                  <input
                    id="senha" type={mostrarSenha ? 'text' : 'password'} value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••" required autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input id="lembrar-me" type="checkbox" checked={lembrarMe}
                    onChange={(e) => setLembrarMe(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                  <label htmlFor="lembrar-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Lembrar-me
                  </label>
                </div>
                <button type="button" onClick={() => setModo('reset-senha')}
                  className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400">
                  Esqueci minha senha
                </button>
              </div>

              <button type="submit"
                disabled={loading || tentativasLogin >= MAX_TENTATIVAS || tempoRestante > 0}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          )}

          {/* ==================== */}
          {/* FORMULÁRIO DE CADASTRO */}
          {/* ==================== */}
          {modo === 'cadastro' && (
            <form onSubmit={handleCadastro} className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <User className="h-4 w-4 inline mr-1" /> Nome Completo *
                </label>
                <input type="text" value={nomeCompleto}
                  onChange={(e) => setNomeCompleto(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Seu nome completo" required autoComplete="name" />
              </div>

              {/* Telefone + CPF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Phone className="h-4 w-4 inline mr-1" /> Telefone *
                  </label>
                  <input type="tel" value={telefone}
                    onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="(61) 99999-9999" required autoComplete="tel" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CPF *
                  </label>
                  <div className="relative">
                    <input type="text" value={cpf}
                      onChange={(e) => setCpf(formatarCPF(e.target.value))}
                      maxLength={14}
                      className={`w-full px-3 py-2 pr-8 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        cpfErro ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="000.000.000-00" required />
                    {verificandoCpf && (
                      <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
                    )}
                    {!verificandoCpf && cpf.replace(/\D/g, '').length === 11 && !cpfErro && (
                      <CheckCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  {cpfErro && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {cpfErro}
                    </p>
                  )}
                </div>
              </div>

              {/* Matrícula + Data Nascimento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Hash className="h-4 w-4 inline mr-1" /> Matrícula PMDF *
                  </label>
                  <input type="text" value={matriculaCadastro}
                    onChange={(e) => setMatriculaCadastro(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    maxLength={8} inputMode="numeric"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 35139641" required />
                  {matriculaCadastro.length > 0 && matriculaCadastro.length < 8 && (
                    <p className="text-xs text-amber-600 mt-1">{8 - matriculaCadastro.length} dígitos restantes</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Calendar className="h-4 w-4 inline mr-1" /> Nascimento *
                  </label>
                  <input type="date" value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required />
                </div>
              </div>

              {/* Endereço */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <MapPin className="h-4 w-4 inline mr-1" /> Endereço *
                </label>
                <textarea value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Rua, número, bairro, cidade - UF" rows={2} required />
              </div>

              {/* Pelotão (select agrupado por Cia) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pelotão *
                </label>
                <select value={pelotao}
                  onChange={(e) => setPelotao(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required>
                  <option value="">Selecione seu pelotão</option>
                  {PELOTOES.map(cia => (
                    <optgroup key={cia.cia} label={cia.cia}>
                      {cia.pelotoes.map(pel => (
                        <option key={pel} value={pel}>{pel}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Mail className="h-4 w-4 inline mr-1" /> Email *
                </label>
                <input type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="seu.email@exemplo.com" required autoComplete="email" />
              </div>

              {/* Senha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Lock className="h-4 w-4 inline mr-1" /> Senha *
                </label>
                <div className="relative">
                  <input type={mostrarSenha ? 'text' : 'password'} value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••" required autoComplete="new-password" />
                  <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {senha && <IndicadorForcaSenha />}
              </div>

              {/* Info do curso */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" /> Informações do Curso
                </h4>
                <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
                  <li>• Valor: {VALOR_CURSO} (pagamento único via PIX)</li>
                  <li>• Recebedor: {PIX_NOME} ({PIX_BANCO})</li>
                  <li>• Acesso liberado após confirmação do pagamento</li>
                  <li>• Questões atualizadas constantemente</li>
                  <li>• Suporte via WhatsApp</li>
                </ul>
              </div>

              <button type="submit"
                disabled={loading || !validarSenhaForte() || !!cpfErro}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {loading ? 'Criando conta...' : 'Criar Conta e Pagar'}
              </button>
            </form>
          )}

          {/* ==================== */}
          {/* RESET DE SENHA */}
          {/* ==================== */}
          {modo === 'reset-senha' && (
            <div className="space-y-4">
              <div className="text-center">
                <Mail className="h-12 w-12 text-blue-500 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recuperar Senha</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Digite seu email para receber o link de recuperação
                </p>
              </div>

              <form onSubmit={handleResetSenha} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input type="email" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="seu.email@exemplo.com" required autoComplete="email" />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setModo('login')}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <ArrowLeft className="h-4 w-4 inline mr-1" /> Voltar
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    {loading ? 'Enviando...' : 'Enviar Email'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ==================== */}
          {/* TROCAR SENHA */}
          {/* ==================== */}
          {modo === 'trocar-senha' && (
            <div className="space-y-4">
              <div className="text-center">
                <Shield className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nova Senha</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Digite sua nova senha</p>
              </div>

              <form onSubmit={handleTrocarSenha} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nova Senha</label>
                  <div className="relative">
                    <input type={mostrarSenha ? 'text' : 'password'} value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="••••••••" required autoComplete="new-password" />
                    <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                      {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {novaSenha && <IndicadorForcaSenha />}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmar Nova Senha</label>
                  <input type="password" value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••" required autoComplete="new-password" />
                  {confirmarSenha && (
                    <div className="mt-1 flex items-center gap-1 text-xs">
                      {novaSenha === confirmarSenha ? (
                        <><CheckCircle className="h-3 w-3 text-green-600" /><span className="text-green-600">Senhas coincidem</span></>
                      ) : (
                        <><AlertCircle className="h-3 w-3 text-red-600" /><span className="text-red-600">Senhas não coincidem</span></>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setModo('login')}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <ArrowLeft className="h-4 w-4 inline mr-1" /> Voltar
                  </button>
                  <button type="submit"
                    disabled={loading || !validarSenhaForte() || novaSenha !== confirmarSenha}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                    {loading ? 'Alterando...' : 'Alterar Senha'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Links adicionais */}
          {modo === 'login' && (
            <div className="mt-6 space-y-3">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Não tem conta? Clique em "Criar Conta" acima
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700">
                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  📞 Precisa de ajuda?
                </h4>
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <p>• WhatsApp: (61) 98278-5865</p>
                  <p>• Email: savio.ads02@gmail.com</p>
                  <p>• Horário: 10h às 22h (Sábado e Domingo)</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Aviso Legal */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-2 text-xs text-red-800 dark:text-red-300">
              <p className="font-bold text-sm">⚠️ Aviso Importante</p>
              <p className="text-justify">
                Este sistema é de uso <strong>exclusivo</strong> para alunos do Curso de Formação de Praças (CFP) da Polícia Militar do Distrito Federal. O conteúdo aqui disponibilizado é de caráter exclusivo de formação policial.
              </p>
              <p className="text-justify">
                É <strong>terminantemente proibido</strong> compartilhar login, senha ou qualquer conteúdo deste sistema com terceiros. Cidadãos comuns não podem ter acesso a este material sob nenhuma hipótese.
              </p>
              <p className="text-justify">
                Este sistema <strong>não possui vínculo oficial</strong> com a PMDF. Trata-se de uma ferramenta independente de apoio aos estudos.
              </p>
              <p className="text-[10px] text-red-600 dark:text-red-400 mt-1">
                O uso indevido poderá resultar no bloqueio permanente da conta.
              </p>
            </div>
          </div>
        </div>

        {/* Informações do sistema */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>Sistema de Estudos CFP XII v2.0</p>
          <p>Desenvolvido para preparação de concursos</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" /> Seguro
            </span>
            <span className="flex items-center gap-1">
              <Smartphone className="h-3 w-3" /> Mobile
            </span>
            {isClient && (
              <span className="flex items-center gap-1">
                {isOnline ? <Wifi className="h-3 w-3 text-green-500" /> : <WifiOff className="h-3 w-3 text-red-500" />}
                {isOnline ? 'Online' : 'Offline'}
              </span>
            )}
          </div>
        </div>
      </div>

      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={hideToast} />
    </div>
  )
}