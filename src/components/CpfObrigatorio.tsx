'use client'

import { useState, useEffect } from 'react'
import { Shield, Check, Loader2, AlertTriangle, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'

export function CpfObrigatorio() {
  const { user } = useAuth()
  const [mostrar, setMostrar] = useState(false)
  const [cpf, setCpf] = useState('')
  const [matricula, setMatricula] = useState('')
  const [aceitouTermos, setAceitouTermos] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [verificando, setVerificando] = useState(true)
  const [termosExpandidos, setTermosExpandidos] = useState(false)
  const [etapa, setEtapa] = useState<'dados' | 'termos'>('dados')

  useEffect(() => {
    if (!user) return
    verificar()
  }, [user])

  const verificar = async () => {
    setVerificando(true)
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('cpf, matricula, termos_aceitos_em')
        .eq('id', user!.id)
        .single()

      if (!error && data) {
        // Mostrar se NÃO aceitou os termos (força todos)
        if (!data.termos_aceitos_em) {
          setMostrar(true)
          // Pré-preencher CPF e matrícula se já tiver
          if (data.cpf && data.cpf.replace(/\D/g, '').length >= 11) {
            setCpf(data.cpf)
          }
          if (data.matricula) {
            setMatricula(data.matricula)
          }
        }
      }
    } catch (error) {
      console.error('Erro ao verificar dados:', error)
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

  const handleAvancar = () => {
    if (!validarCPF(cpf)) {
      alert('CPF inválido. Verifique e tente novamente.')
      return
    }
    if (matricula.replace(/\D/g, '').length !== 8) {
      alert('Matrícula deve ter 8 dígitos.')
      return
    }
    setEtapa('termos')
  }

  const handleSalvar = async () => {
    if (!aceitouTermos) {
      alert('Você precisa aceitar os termos para continuar.')
      return
    }

    setSalvando(true)
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          cpf: formatarCPF(cpf),
          matricula: matricula.trim(),
          termos_aceitos_em: new Date().toISOString()
        })
        .eq('id', user!.id)

      if (error) {
        alert('Erro ao salvar. Tente novamente.')
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-2xl my-4">

        {/* ============================== */}
        {/* ETAPA 1: DADOS PESSOAIS */}
        {/* ============================== */}
        {etapa === 'dados' && (
          <div className="p-5 sm:p-6">
            {/* Header */}
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Shield className="h-7 w-7 text-blue-600" />
              </div>
            </div>

            <h2 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-1">
              Complete seu Cadastro
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-5">
              Para sua segurança e identificação no sistema, precisamos de alguns dados.
            </p>

            {/* Aviso importante */}
            <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-800 dark:text-red-300 text-justify">
                  Este sistema é de <strong>uso exclusivo e pessoal</strong>. Sua conta está vinculada aos seus dados pessoais (CPF e matrícula). O compartilhamento de acesso é <strong>estritamente proibido</strong> e poderá resultar em bloqueio permanente.
                </p>
              </div>
            </div>

            {/* CPF */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                CPF *
              </label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(formatarCPF(e.target.value))}
                maxLength={14}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-base text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]"
                placeholder="000.000.000-00"
                autoFocus
              />
              {cpf.replace(/\D/g, '').length === 11 && !validarCPF(cpf) && (
                <p className="text-xs text-red-500 mt-1 text-center">CPF inválido</p>
              )}
            </div>

            {/* Matrícula */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Matrícula PMDF *
              </label>
              <input
                type="text"
                value={matricula}
                onChange={(e) => {
                  const nums = e.target.value.replace(/\D/g, '').slice(0, 8)
                  setMatricula(nums)
                }}
                maxLength={8}
                inputMode="numeric"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-base text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]"
                placeholder="Preencha aqui sua matrícula"
              />
              {matricula.length > 0 && matricula.length < 8 && (
                <p className="text-xs text-amber-600 mt-1 text-center">{8 - matricula.length} dígitos restantes</p>
              )}
            </div>

            {/* Botão avançar */}
            <button
              onClick={handleAvancar}
              disabled={cpf.replace(/\D/g, '').length !== 11 || matricula.replace(/\D/g, '').length !== 8}
              className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
            >
              Continuar para os Termos de Uso
            </button>

            {/* LGPD */}
            <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center mt-3">
              🔒 Seus dados são protegidos pela LGPD (Lei 13.709/2018).
            </p>
          </div>
        )}

        {/* ============================== */}
        {/* ETAPA 2: TERMOS DE USO */}
        {/* ============================== */}
        {etapa === 'termos' && (
          <div className="p-5 sm:p-6">
            {/* Header */}
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <FileText className="h-7 w-7 text-amber-600" />
              </div>
            </div>

            <h2 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-1">
              Termos de Uso
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
              Leia atentamente e aceite para continuar.
            </p>

            {/* Caixa de termos */}
            <div className="mb-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl max-h-[45vh] overflow-y-auto">
              <div className="p-4 space-y-3 text-xs text-gray-700 dark:text-gray-300 text-justify leading-relaxed">

                <p className="text-sm font-bold text-red-700 dark:text-red-400 text-center">
                  ⚠️ TERMO DE RESPONSABILIDADE E USO DO SISTEMA
                </p>

                <p className="font-bold text-gray-900 dark:text-white">1. IDENTIFICAÇÃO DO USUÁRIO</p>
                <p>
                  Ao utilizar este sistema, o aluno declara que os dados fornecidos — incluindo nome completo, CPF ({formatarCPF(cpf)}), 
                  matrícula PMDF ({matricula}) e demais informações cadastrais — são verdadeiros e de sua exclusiva titularidade.
                </p>

                <p className="font-bold text-gray-900 dark:text-white">2. USO EXCLUSIVO E PESSOAL</p>
                <p>
                  O acesso a este sistema é <strong>estritamente pessoal e intransferível</strong>. O conteúdo aqui disponibilizado é de 
                  caráter exclusivo para alunos do Curso de Formação de Praças (CFP) da Polícia Militar do Distrito Federal (PMDF) 
                  e destina-se exclusivamente ao apoio aos estudos do titular da conta.
                </p>

                <p className="font-bold text-red-700 dark:text-red-400">3. PROIBIÇÕES</p>
                <p>É expressamente <strong>PROIBIDO</strong>:</p>
                <p className="pl-3">
                  a) Compartilhar login, senha ou qualquer forma de acesso com terceiros, sejam eles alunos ou não do CFP;
                </p>
                <p className="pl-3">
                  b) Reproduzir, copiar, distribuir, imprimir para terceiros ou divulgar por qualquer meio (digital ou físico) 
                  o conteúdo das questões, simulados, gabaritos ou qualquer material disponibilizado neste sistema;
                </p>
                <p className="pl-3">
                  c) Utilizar dispositivos, softwares ou métodos para capturar, extrair ou armazenar o conteúdo do sistema 
                  de forma não autorizada;
                </p>
                <p className="pl-3">
                  d) Permitir que cidadãos comuns ou pessoas não autorizadas tenham acesso ao conteúdo, sob nenhuma hipótese.
                </p>

                <p className="font-bold text-gray-900 dark:text-white">4. MONITORAMENTO E SEGURANÇA</p>
                <p>
                  O sistema realiza monitoramento ativo de dispositivos, sessões e padrões de uso. Comportamentos suspeitos — 
                  como múltiplos dispositivos simultâneos, acesso de localidades incomuns ou compartilhamento de credenciais — 
                  serão detectados e poderão resultar em:
                </p>
                <p className="pl-3">a) Notificação e advertência ao usuário;</p>
                <p className="pl-3">b) Suspensão temporária do acesso;</p>
                <p className="pl-3">c) <strong>Bloqueio permanente da conta, sem direito a reembolso;</strong></p>
                <p className="pl-3">d) Identificação do infrator por meio dos dados cadastrais (CPF e matrícula) vinculados à conta.</p>

                <p className="font-bold text-gray-900 dark:text-white">5. DOCUMENTOS GERADOS (PDFs)</p>
                <p>
                  Todo documento gerado pelo sistema (simulados, relatórios, questões em PDF) contém identificação do usuário 
                  (CPF, matrícula e nome) no rodapé de todas as páginas. Em caso de vazamento ou compartilhamento indevido, 
                  o responsável será identificado pelos dados presentes no documento.
                </p>

                <p className="font-bold text-gray-900 dark:text-white">6. AUSÊNCIA DE VÍNCULO OFICIAL</p>
                <p>
                  Este sistema <strong>não possui vínculo oficial</strong> com a Polícia Militar do Distrito Federal (PMDF). 
                  Trata-se de uma ferramenta independente de apoio aos estudos, desenvolvida por terceiros.
                </p>

                <p className="font-bold text-gray-900 dark:text-white">7. PROTEÇÃO DE DADOS (LGPD)</p>
                <p>
                  Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), os dados pessoais coletados 
                  são tratados com sigilo e utilizados exclusivamente para fins de identificação, segurança e operação do sistema. 
                  O usuário poderá solicitar a exclusão de seus dados a qualquer momento.
                </p>

                <p className="font-bold text-gray-900 dark:text-white">8. ACEITE</p>
                <p>
                  Ao clicar em "Aceitar e Continuar", o usuário declara ter lido, compreendido e concordado integralmente com 
                  os termos acima descritos, ciente das consequências do descumprimento.
                </p>

                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300 text-center">
                    Usuário: {formatarCPF(cpf)} | Matrícula: {matricula}
                  </p>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 text-center mt-1">
                    Data do aceite: {new Date().toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>

            {/* Checkbox de aceite */}
            <label className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={aceitouTermos}
                onChange={(e) => setAceitouTermos(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5 shrink-0"
              />
              <span className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                <strong>Declaro que li, compreendi e aceito integralmente</strong> os Termos de Uso acima. 
                Estou ciente de que meu acesso é pessoal e intransferível, e que o descumprimento 
                resultará em bloqueio da conta.
              </span>
            </label>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={() => setEtapa('dados')}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm min-h-[48px]"
              >
                Voltar
              </button>
              <button
                onClick={handleSalvar}
                disabled={salvando || !aceitouTermos}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[48px]"
              >
                {salvando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {salvando ? 'Salvando...' : 'Aceitar e Continuar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}