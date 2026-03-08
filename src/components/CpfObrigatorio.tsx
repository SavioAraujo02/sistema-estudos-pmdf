'use client'

import { useState, useEffect } from 'react'
import { Shield, Check, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'

export function CpfObrigatorio() {
  const { user } = useAuth()
  const [mostrar, setMostrar] = useState(false)
  const [cpf, setCpf] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [verificando, setVerificando] = useState(true)

  useEffect(() => {
    if (!user) return
    verificarCpf()
  }, [user])

  const verificarCpf = async () => {
    setVerificando(true)
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('cpf')
        .eq('id', user!.id)
        .single()

      if (!error && data) {
        // Mostrar modal se CPF está vazio, null ou muito curto
        const temCpf = data.cpf && data.cpf.replace(/\D/g, '').length >= 11
        setMostrar(!temCpf)
      }
    } catch (error) {
      console.error('Erro ao verificar CPF:', error)
    } finally {
      setVerificando(false)
    }
  }

  const formatarCPF = (valor: string) => {
    const numeros = valor.replace(/\D/g, '')
    if (numeros.length <= 11) {
      return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }
    return valor
  }

  const validarCPF = (cpf: string) => {
    const numeros = cpf.replace(/\D/g, '')
    if (numeros.length !== 11) return false
    if (/^(\d)\1+$/.test(numeros)) return false // todos iguais
    
    // Validação dos dígitos verificadores
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

  const handleSalvar = async () => {
    if (!validarCPF(cpf)) {
      alert('CPF inválido. Verifique e tente novamente.')
      return
    }

    setSalvando(true)
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ cpf: formatarCPF(cpf) })
        .eq('id', user!.id)

      if (error) {
        alert('Erro ao salvar CPF. Tente novamente.')
        console.error('Erro:', error)
      } else {
        setMostrar(false)
      }
    } catch (error) {
      alert('Erro inesperado.')
      console.error('Erro:', error)
    } finally {
      setSalvando(false)
    }
  }

  if (verificando || !mostrar) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-5 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-2xl">
        {/* Ícone */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <Shield className="h-7 w-7 text-blue-600" />
          </div>
        </div>

        {/* Título */}
        <h2 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-2">
          Cadastre seu CPF
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-1">
          Para sua segurança e identificação no sistema, precisamos do seu CPF.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 text-center mb-5">
          Seus dados são protegidos e utilizados apenas para identificação interna.
        </p>

        {/* Input CPF */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            CPF *
          </label>
          <input
            type="text"
            value={cpf}
            onChange={(e) => setCpf(formatarCPF(e.target.value))}
            maxLength={14}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-base text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[48px]"
            placeholder="000.000.000-00"
            autoFocus
          />
          {cpf.replace(/\D/g, '').length === 11 && !validarCPF(cpf) && (
            <p className="text-xs text-red-500 mt-1 text-center">CPF inválido</p>
          )}
        </div>

        {/* Botão */}
        <button
          onClick={handleSalvar}
          disabled={salvando || cpf.replace(/\D/g, '').length !== 11}
          className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[48px]"
        >
          {salvando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {salvando ? 'Salvando...' : 'Salvar CPF'}
        </button>

        {/* Aviso LGPD */}
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center leading-relaxed">
            🔒 Em conformidade com a LGPD (Lei 13.709/2018), seus dados pessoais são tratados com sigilo e utilizados exclusivamente para fins de identificação no sistema de estudos. Não compartilhamos seus dados com terceiros.
          </p>
        </div>
      </div>
    </div>
  )
}