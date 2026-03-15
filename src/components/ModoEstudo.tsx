'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, ArrowRight, ArrowLeft, RotateCcw, Clock, Target, Timer, X, RotateCw, MessageCircle, Flag, ChevronUp, Sparkles, Scissors } from 'lucide-react'
import { QuestaoEstudo, salvarResposta } from '@/lib/estudo'
import { 
  getRespostaCorretaCertoErrado, 
  eliminarAlternativa, 
  restaurarAlternativa, 
  getAlternativasEliminadas, 
  limparAlternativasEliminadas 
} from '@/lib/questoes'
import { EnunciadoFormatado } from './EnunciadoFormatado'
import { ComentariosInline } from './ComentariosInline'
import { ReportarErro } from './ReportarErro'
import { supabase } from '@/lib/supabase'
import { atualizarQuestaoAtual, adicionarRespostaProgresso } from '@/lib/progresso'
import { finalizarSessao } from '@/lib/progresso'
import { useTimerInteligente } from '@/hooks/useTimerInteligente'

interface ModoEstudoProps {
  questoes: QuestaoEstudo[]
  onFinalizar: (resultados: ResultadoSessao) => void
  configuracao?: {
    materiaId?: string
    materiasSelecionadas?: string[]
    assuntoIds: string[]
    numeroQuestoes: number | 'todas'
    modoEstudo: 'normal' | 'revisao' | 'rapido' | 'aleatorio' | 'simulado'
    salvarHistorico: boolean
    tempoLimiteMinutos?: number
  }
  isAdmin?: boolean
  restaurarSessao?: boolean
}

interface ResultadoSessao {
  totalQuestoes: number
  acertos: number
  erros: number
  percentual: number
  tempo: number
  respostas: {
    questao: QuestaoEstudo
    resposta: string | boolean | null
    correta: boolean
    tempo: number
  }[]
}

export function ModoEstudo({ questoes, onFinalizar, configuracao, isAdmin }: ModoEstudoProps) {
  const [questaoAtual, setQuestaoAtual] = useState(0)
  const [respostaSelecionada, setRespostaSelecionada] = useState<string | boolean | null>(null)
  const [mostrarResposta, setMostrarResposta] = useState(false)
  const [respostas, setRespostas] = useState<ResultadoSessao['respostas']>([])
  const [questoesRespondidas, setQuestoesRespondidas] = useState<Map<number, {
    resposta: string | boolean | null
    correta: boolean
    mostrarResposta: boolean
  }>>(new Map())
  const [tempoInicio, setTempoInicio] = useState(Date.now())
  const [tempoQuestao, setTempoQuestao] = useState(Date.now())
  
  const timerSessao = useTimerInteligente()
  const timerQuestao = useTimerInteligente()

  const [mostrarComentarios, setMostrarComentarios] = useState(false)
  const [mostrarReport, setMostrarReport] = useState(false)
  const [mostrarExplicacaoModal, setMostrarExplicacaoModal] = useState(false)

  const isSimulado = configuracao?.modoEstudo === 'simulado'
  const [tempoRestante, setTempoRestante] = useState<number | null>(null)
  const [simuladoFinalizado, setSimuladoFinalizado] = useState(false)
  const [alternativasEliminadas, setAlternativasEliminadas] = useState<string[]>([])
  // Histórico de questões já respondidas anteriormente
  const [historicoQuestoes, setHistoricoQuestoes] = useState<Map<string, { acertou: boolean, vezes: number, ultimaResposta: any }>>(new Map())

  // ==========================================
  // TODA A LÓGICA (INALTERADA)
  // ==========================================

  useEffect(() => {
    const dadosRestauracao = localStorage.getItem('sessao_restauracao')
    
    if (dadosRestauracao) {
      try {
        const dados = JSON.parse(dadosRestauracao)
        setQuestaoAtual(dados.questaoAtual || 0)
        
        if (dados.respostasAnteriores && dados.respostasAnteriores.length > 0) {
          const respostasFormatadas = dados.respostasAnteriores.map((resp: any) => ({
            questao: questoes.find(q => q.id === resp.questao_id) || questoes[0],
            resposta: resp.resposta_usuario,
            correta: resp.acertou,
            tempo: resp.tempo_resposta
          }))
          
          setRespostas(respostasFormatadas)
          
          const questoesRespondidasMap = new Map()
          dados.respostasAnteriores.forEach((resp: any, index: number) => {
            questoesRespondidasMap.set(index, {
              resposta: resp.resposta_usuario,
              correta: resp.acertou,
              mostrarResposta: true
            })
          })
          setQuestoesRespondidas(questoesRespondidasMap)
        }
        
        if (dados.tempoInicio) {
          timerSessao.iniciar(dados.tempoInicio)
        } else {
          timerSessao.iniciar()
        }
        
        localStorage.removeItem('sessao_restauracao')
      } catch (error) {
        console.error('Erro ao restaurar sessão:', error)
        timerSessao.iniciar()
      }
    } else {
      timerSessao.iniciar()
    }
    
    timerQuestao.iniciar()
    setTempoInicio(Date.now())
    setTempoQuestao(Date.now())
  }, [])

  // Carregar histórico de respostas anteriores para marcar questões já respondidas
  useEffect(() => {
    let cancelado = false

    const carregarHistoricoQuestoes = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || questoes.length === 0 || cancelado) return

        const ids = questoes.map(q => q.id)
        const mapa = new Map<string, { acertou: boolean, vezes: number, ultimaResposta: any }>()
        
        for (let i = 0; i < ids.length; i += 50) {
          if (cancelado) return
          const lote = ids.slice(i, i + 50)

          // Buscar do historico_respostas_detalhado (tem a resposta do usuário)
          const { data: detalhado, error: errDet } = await supabase
            .from('historico_respostas_detalhado')
            .select('questao_id, acertou, resposta_usuario, created_at')
            .eq('usuario_id', user.id)
            .in('questao_id', lote)
            .order('created_at', { ascending: false })

          if (errDet) {
            console.error('Erro ao buscar histórico detalhado:', errDet)
          }

          // Buscar também do historico_estudos (pode ter mais registros)
          const { data: simples, error: errSimples } = await supabase
            .from('historico_estudos')
            .select('questao_id, acertou')
            .eq('usuario_id', user.id)
            .in('questao_id', lote)

          if (errSimples) {
            console.error('Erro ao buscar histórico:', errSimples)
          }

          // Primeiro, processar o detalhado (tem a resposta)
          if (detalhado) {
            detalhado.forEach(h => {
              const existing = mapa.get(h.questao_id)
              if (existing) {
                existing.vezes++
                if (h.acertou) existing.acertou = true
                // Manter a resposta mais recente (já vem ordenado desc)
              } else {
                mapa.set(h.questao_id, { 
                  acertou: h.acertou, 
                  vezes: 1, 
                  ultimaResposta: h.resposta_usuario 
                })
              }
            })
          }

          // Depois, complementar com historico_estudos (questões que não estão no detalhado)
          if (simples) {
            simples.forEach(h => {
              const existing = mapa.get(h.questao_id)
              if (existing) {
                // Já existe do detalhado, só incrementar contagem se for registro a mais
                const vezesDetalhado = detalhado?.filter(d => d.questao_id === h.questao_id).length || 0
                const vezesSimplesAteMomento = simples.filter(s => s.questao_id === h.questao_id).indexOf(h)
                if (vezesSimplesAteMomento >= vezesDetalhado) {
                  existing.vezes++
                }
              } else {
                mapa.set(h.questao_id, { acertou: h.acertou, vezes: 1, ultimaResposta: null })
              }
            })
          }
        }

        if (!cancelado) {
          setHistoricoQuestoes(mapa)
          console.log(`📊 Histórico carregado: ${mapa.size} questões já respondidas de ${ids.length}`)
        }
      } catch (error: any) {
        if (!cancelado && error?.name !== 'AbortError') {
          console.error('Erro ao carregar histórico:', error)
        }
      }
    }

    carregarHistoricoQuestoes()

    return () => { cancelado = true }
  }, [questoes.length])

  useEffect(() => {
    if (questoes.length === 0) return
    
    const dadosRestauracao = localStorage.getItem('sessao_restauracao')
    
    if (dadosRestauracao) {
      try {
        const dados = JSON.parse(dadosRestauracao)
        setQuestaoAtual(dados.questaoAtual || 0)
        
        if (dados.respostasAnteriores && dados.respostasAnteriores.length > 0) {
          const respostasFormatadas = dados.respostasAnteriores.map((resp: any) => ({
            questao: questoes.find(q => q.id === resp.questao_id) || questoes[0],
            resposta: resp.resposta_usuario,
            correta: resp.acertou,
            tempo: resp.tempo_resposta
          }))
          
          setRespostas(respostasFormatadas)
          
          const questoesRespondidasMap = new Map()
          dados.respostasAnteriores.forEach((resp: any, index: number) => {
            questoesRespondidasMap.set(index, {
              resposta: resp.resposta_usuario,
              correta: resp.acertou,
              mostrarResposta: true
            })
          })
          setQuestoesRespondidas(questoesRespondidasMap)
        }
        
        localStorage.removeItem('sessao_restauracao')
      } catch (error) {
        console.error('Erro ao restaurar sessão:', error)
      }
    }
  }, [questoes.length])

  useEffect(() => {
    if (!isSimulado || !configuracao?.tempoLimiteMinutos) return

    const tempoTotalSeg = configuracao.tempoLimiteMinutos * 60
    setTempoRestante(tempoTotalSeg)

    const interval = setInterval(() => {
      setTempoRestante(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          setSimuladoFinalizado(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isSimulado, configuracao?.tempoLimiteMinutos])

  useEffect(() => {
    if (!simuladoFinalizado) return

    timerSessao.pausar()
    timerQuestao.pausar()

    const tempoTotal = timerSessao.tempo
    const acertos = respostas.filter(r => r.correta).length

    const resultados: ResultadoSessao = {
      totalQuestoes: questoes.length,
      acertos,
      erros: questoes.length - acertos,
      percentual: Math.round((acertos / questoes.length) * 100),
      tempo: tempoTotal,
      respostas
    }

    finalizarSessao(resultados).catch(console.error)
    onFinalizar(resultados)
  }, [simuladoFinalizado])

  useEffect(() => {
    const questao = questoes[questaoAtual]
    if (questao && questao.tipo === 'multipla_escolha') {
      carregarAlternativasEliminadas()
    }
  }, [questaoAtual])

  const carregarAlternativasEliminadas = async () => {
    const questao = questoes[questaoAtual]
    if (!questao) return
    try {
      const eliminadas = await getAlternativasEliminadas(questao.id)
      setAlternativasEliminadas(eliminadas)
    } catch (error) {
      console.error('Erro ao carregar alternativas eliminadas:', error)
    }
  }

  const questao = questoes[questaoAtual]
  const isUltimaQuestao = questaoAtual === questoes.length - 1

  const salvarTempoResposta = async (questaoId: string, tempoSegundos: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('tempo_respostas').insert({
        questao_id: questaoId,
        usuario_id: user.id,
        tempo_segundos: Math.round(tempoSegundos / 1000)
      })
    } catch (error) {
      console.error('Erro ao salvar tempo de resposta:', error)
    }
  }

  const verificarResposta = async () => {
    if (respostaSelecionada === null) return
  
    const tempoResposta = timerQuestao.tempo
    let correta = false
    let respostaDetectada = true
  
    if (questao.tipo === 'certo_errado') {
      if (questao.resposta_certo_errado !== null && questao.resposta_certo_errado !== undefined) {
        correta = respostaSelecionada === questao.resposta_certo_errado
      } else {
        respostaDetectada = false
        const respostaCorreta = await getRespostaCorretaCertoErrado(questao.id)
        if (respostaCorreta !== null) {
          correta = respostaSelecionada === respostaCorreta
        } else {
          correta = true
        }
      }
    } else {
      const alternativaCorreta = questao.alternativas?.find(alt => alt.correta)
      correta = respostaSelecionada === alternativaCorreta?.id
    }
  
    const novaResposta = { questao, resposta: respostaSelecionada, correta, tempo: tempoResposta }
    const novasRespostas = [...respostas, novaResposta]
    setRespostas(novasRespostas)

    if (isSimulado) {
      setMostrarResposta(false)
      
      if (isUltimaQuestao) {
        timerSessao.pausar()
        timerQuestao.pausar()
        const tempoTotal = timerSessao.tempo
        const totalAcertos = novasRespostas.filter(r => r.correta).length
        const resultados: ResultadoSessao = {
          totalQuestoes: questoes.length, acertos: totalAcertos,
          erros: questoes.length - totalAcertos,
          percentual: Math.round((totalAcertos / questoes.length) * 100),
          tempo: tempoTotal, respostas: novasRespostas
        }
        finalizarSessao(resultados).catch(console.error)
        onFinalizar(resultados)
      } else {
        const novoIndice = questaoAtual + 1
        atualizarQuestaoAtual(novoIndice)
        setQuestaoAtual(novoIndice)
        setRespostaSelecionada(null)
        setMostrarComentarios(false)
        setMostrarReport(false)
        setAlternativasEliminadas([])
        resetarTempoQuestao()
      }
    } else {
      setMostrarResposta(true)
    }
  
    // Sempre salvar no histórico (exceto modo rápido/teste)
    if (configuracao?.modoEstudo !== 'rapido') {
      await salvarResposta(questao.id, correta)
      await salvarTempoResposta(questao.id, tempoResposta)
    }
  
    await adicionarRespostaProgresso({
      questao_id: questao.id, resposta_usuario: respostaSelecionada,
      tempo_resposta: tempoResposta, acertou: correta, timestamp: new Date().toISOString()
    })
  
    timerQuestao.pausar()
    
    setQuestoesRespondidas(prev => new Map(prev.set(questaoAtual, {
      resposta: respostaSelecionada, correta, mostrarResposta: true
    })))
  }

  const resetarTempoQuestao = () => {
    timerQuestao.resetar()
    timerQuestao.iniciar()
    setTempoQuestao(Date.now())
  }

  const voltarQuestao = () => {
    if (questaoAtual > 0) {
      const novoIndice = questaoAtual - 1
      atualizarQuestaoAtual(novoIndice)
      setQuestaoAtual(novoIndice)
      const estadoQuestao = questoesRespondidas.get(novoIndice)
      if (estadoQuestao) {
        setRespostaSelecionada(estadoQuestao.resposta)
        setMostrarResposta(estadoQuestao.mostrarResposta)
      } else {
        setRespostaSelecionada(null)
        setMostrarResposta(false)
      }
      setMostrarComentarios(false)
      setMostrarReport(false)
      setMostrarExplicacaoModal(false)
      setAlternativasEliminadas([])
      resetarTempoQuestao()
    }
  }
  
  const avancarQuestao = () => {
    if (questaoAtual < questoes.length - 1) {
      const novoIndice = questaoAtual + 1
      atualizarQuestaoAtual(novoIndice)
      setQuestaoAtual(novoIndice)
      const estadoQuestao = questoesRespondidas.get(novoIndice)
      if (estadoQuestao) {
        setRespostaSelecionada(estadoQuestao.resposta)
        setMostrarResposta(estadoQuestao.mostrarResposta)
      } else {
        setRespostaSelecionada(null)
        setMostrarResposta(false)
      }
      setMostrarComentarios(false)
      setMostrarReport(false)
      setMostrarExplicacaoModal(false)
      setAlternativasEliminadas([])
      resetarTempoQuestao()
    }
  }

  const pularQuestao = () => {
    if (questaoAtual < questoes.length - 1) {
      setRespostas([...respostas, { questao, resposta: null, correta: false, tempo: Date.now() - tempoQuestao }])
      avancarQuestao()
    }
  }

  const proximaQuestao = () => {
    if (isUltimaQuestao) {
      timerSessao.pausar()
      timerQuestao.pausar()
      const tempoTotal = timerSessao.tempo
      const todasRespostas = mostrarResposta ? respostas : [...respostas]
      const acertos = todasRespostas.filter(r => r.correta).length
      const resultados: ResultadoSessao = {
        totalQuestoes: questoes.length, acertos, erros: questoes.length - acertos,
        percentual: Math.round((acertos / questoes.length) * 100),
        tempo: tempoTotal, respostas: todasRespostas
      }
      finalizarSessao(resultados).catch(console.error)
      onFinalizar(resultados)
    } else {
      avancarQuestao()
    }
  }

  const reiniciarSessao = () => {
    setQuestaoAtual(0)
    setRespostaSelecionada(null)
    setMostrarResposta(false)
    setMostrarComentarios(false)
    setMostrarReport(false)
    setMostrarExplicacaoModal(false)
    setRespostas([])
    setQuestoesRespondidas(new Map())
    setAlternativasEliminadas([])
    timerSessao.resetar(); timerQuestao.resetar()
    timerSessao.iniciar(); timerQuestao.iniciar()
    const agora = Date.now()
    setTempoInicio(agora); setTempoQuestao(agora)
  }

  const toggleEliminarAlternativa = async (alternativaId: string) => {
    if (!questao || mostrarResposta) return
    const jaEliminada = alternativasEliminadas.includes(alternativaId)
    try {
      if (jaEliminada) {
        const sucesso = await restaurarAlternativa(questao.id, alternativaId)
        if (sucesso) setAlternativasEliminadas(prev => prev.filter(id => id !== alternativaId))
      } else {
        const sucesso = await eliminarAlternativa(questao.id, alternativaId)
        if (sucesso) setAlternativasEliminadas(prev => [...prev, alternativaId])
      }
    } catch (error) {
      console.error('Erro ao eliminar/restaurar alternativa:', error)
    }
  }

  const limparTodasEliminacoes = async () => {
    if (!questao) return
    try {
      const sucesso = await limparAlternativasEliminadas(questao.id)
      if (sucesso) setAlternativasEliminadas([])
    } catch (error) {
      console.error('Erro ao limpar eliminações:', error)
    }
  }

  // ==========================================
  // RENDER
  // ==========================================

  if (!questao) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-3">📚</div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Nenhuma questão disponível</h3>
        <p className="text-sm text-gray-500">Cadastre questões para começar.</p>
      </div>
    )
  }

  const respostasReais = respostas.filter(r => r.resposta !== null)
  const acertosAteAgora = respostasReais.filter(r => r.correta).length
  const errosAteAgora = respostasReais.filter(r => !r.correta).length
  const puladasAteAgora = respostas.filter(r => r.resposta === null).length

  return (
    <div className="max-w-2xl mx-auto pb-24 sm:pb-6 space-y-3 px-1">

      {/* ============================== */}
      {/* HEADER COMPACTO */}
      {/* ============================== */}
      <div className={`rounded-2xl p-3 sm:p-4 text-white relative overflow-hidden ${
        isSimulado
          ? 'bg-gradient-to-r from-red-500 to-rose-600'
          : 'bg-gradient-to-r from-blue-600 to-cyan-600'
      }`}>
        {/* Linha 1: Progresso + Timers */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-bold">
              Q {questaoAtual + 1}/{questoes.length}
            </span>
            <span className="text-xs opacity-70 hidden sm:inline">·</span>
            <span className="text-xs opacity-70 truncate max-w-[100px] sm:max-w-[200px] hidden sm:inline">
              {questao.materia.nome}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Cronômetro regressivo (simulado) */}
            {isSimulado && tempoRestante !== null && (
              <span className={`px-2 py-0.5 rounded-lg font-mono text-xs sm:text-sm font-bold ${
                tempoRestante <= 60 ? 'bg-white/30 animate-pulse' :
                tempoRestante <= 300 ? 'bg-white/20' : 'bg-white/15'
              }`}>
                ⏱️ {Math.floor(tempoRestante / 60)}:{(tempoRestante % 60).toString().padStart(2, '0')}
              </span>
            )}

            {/* Timer da questão */}
            <span className="bg-white/15 px-2 py-0.5 rounded-lg font-mono text-xs">
              {timerQuestao.tempoFormatado}
            </span>

            {/* Timer da sessão */}
            <span className="bg-white/10 px-2 py-0.5 rounded-lg font-mono text-xs hidden sm:inline-block">
              {timerSessao.tempoFormatado}
            </span>

            {/* Pause/Play */}
            <button
              onClick={() => {
                if (timerSessao.pausado) { timerSessao.continuar(); timerQuestao.continuar() }
                else { timerSessao.pausar(); timerQuestao.pausar() }
              }}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              {timerSessao.pausado ? (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              ) : (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
              )}
            </button>
          </div>
        </div>

        {/* Linha 2: Barra de progresso */}
        <div className="w-full bg-white/20 rounded-full h-1.5">
          <div className="bg-white h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${((questaoAtual + 1) / questoes.length) * 100}%` }} />
        </div>

        {/* Linha 3: Stats compactas */}
        <div className="flex items-center justify-between mt-2 text-[10px] sm:text-xs opacity-80">
          <div className="flex items-center gap-3">
            <span className="sm:hidden">{questao.materia.nome}</span>
            <span>✅ {acertosAteAgora}</span>
            <span>❌ {errosAteAgora}</span>
            {puladasAteAgora > 0 && <span>⏭️ {puladasAteAgora}</span>}
            {historicoQuestoes.size > 0 && (
              <span className="opacity-60">📋 {historicoQuestoes.size}/{questoes.length}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {questao.assunto && (
              <span className="px-1.5 py-0.5 bg-white/20 rounded text-[10px]">{questao.assunto.nome}</span>
            )}
            <span className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">
              {questao.tipo === 'certo_errado' ? 'C/E' : 'ME'}
            </span>
          </div>
        </div>
      </div>

      {/* ============================== */}
      {/* ENUNCIADO */}
      {/* ============================== */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
        {/* Indicador de questão já respondida */}
        {historicoQuestoes.has(questao.id) && (() => {
          const hist = historicoQuestoes.get(questao.id)!
          let respostaTexto = ''
          
          if (hist.ultimaResposta !== null && hist.ultimaResposta !== undefined) {
            if (questao.tipo === 'certo_errado') {
              respostaTexto = hist.ultimaResposta === true ? 'CERTO' : 'ERRADO'
            } else {
              // Encontrar a letra da alternativa
              const idx = questao.alternativas?.findIndex(a => a.id === hist.ultimaResposta)
              if (idx !== undefined && idx >= 0) {
                respostaTexto = `alternativa ${String.fromCharCode(97 + idx)})`
              }
            }
          }

          return (
            <div className={`mb-3 px-3 py-1.5 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 ${
              hist.acertou
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
            }`}>
              {hist.acertou ? '✅' : '❌'}
              Já respondida ({hist.vezes}x)
              {hist.acertou ? ' — acertou' : ' — errou'}
              {respostaTexto && <span className="opacity-70">· Respondeu: {respostaTexto}</span>}
            </div>
          )
        })()}

        {/* Alerta de questão sem gabarito */}
        {questao.tipo === 'certo_errado' && (questao.resposta_certo_errado === null || questao.resposta_certo_errado === undefined) && (
          <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl">
            <p className="text-[10px] sm:text-xs text-yellow-800 dark:text-yellow-300">
              ⚠️ Questão sem gabarito definido. Sua resposta será considerada correta.
            </p>
          </div>
        )}

        <EnunciadoFormatado texto={questao.enunciado} className="text-sm sm:text-base" />

        {/* Imagem */}
        {questao.imagem_url && (
          <div className="mt-3">
            <img src={questao.imagem_url} alt="Imagem da questão"
              className="max-w-full h-auto max-h-64 sm:max-h-96 mx-auto rounded-xl border border-gray-200 dark:border-gray-600"
              onError={(e) => { e.currentTarget.style.display = 'none' }} />
          </div>
        )}
      </div>

      {/* ============================== */}
      {/* ALTERNATIVAS */}
      {/* ============================== */}
      <div className="space-y-2">
        {questao.tipo === 'certo_errado' ? (
          <div className="grid grid-cols-2 gap-2">
            {[
              { valor: true, label: 'CERTO', iconOk: CheckCircle },
              { valor: false, label: 'ERRADO', iconOk: XCircle }
            ].map(opcao => {
              const selecionada = respostaSelecionada === opcao.valor
              const ultimaResposta = respostas[respostas.length - 1]
              const Icon = opcao.iconOk

              const histCE = historicoQuestoes.get(questao.id)
              const foiRespostaAnteriorCE = !mostrarResposta && !selecionada && histCE?.ultimaResposta === opcao.valor

              let estilo = 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-300'
              if (selecionada && !mostrarResposta) {
                estilo = 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              } else if (foiRespostaAnteriorCE) {
                estilo = histCE.acertou
                  ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10'
                  : 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10'
              } else if (mostrarResposta && selecionada) {
                estilo = ultimaResposta?.correta
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-red-500 bg-red-50 dark:bg-red-900/20'
              } else if (mostrarResposta && questao.resposta_certo_errado === opcao.valor) {
                estilo = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
              }

              return (
                <button key={String(opcao.valor)}
                  onClick={() => !mostrarResposta && setRespostaSelecionada(opcao.valor)}
                  disabled={mostrarResposta}
                  className={`p-3 sm:p-4 rounded-2xl border-2 transition-all active:scale-[0.97] min-h-[56px] flex items-center justify-center gap-2 font-semibold text-sm sm:text-base ${estilo}`}
                >
                  <Icon className={`h-5 w-5 ${opcao.valor ? 'text-emerald-500' : 'text-red-500'}`} />
                  {opcao.label}
                  {foiRespostaAnteriorCE && (
                    <span className={`text-[10px] ${histCE!.acertou ? 'text-emerald-500' : 'text-red-500'}`}>
                      (anterior)
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          questao.alternativas?.map((alternativa, index) => {
            const isEliminada = alternativasEliminadas.includes(alternativa.id)
            const selecionada = respostaSelecionada === alternativa.id

            const hist = historicoQuestoes.get(questao.id)
            const foiRespostaAnterior = !mostrarResposta && !selecionada && hist?.ultimaResposta === alternativa.id

            let estilo = 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
            if (isEliminada) {
              estilo = 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 opacity-40'
            } else if (selecionada && !mostrarResposta) {
              estilo = 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            } else if (mostrarResposta && alternativa.correta) {
              estilo = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
            } else if (mostrarResposta && selecionada && !alternativa.correta) {
              estilo = 'border-red-500 bg-red-50 dark:bg-red-900/20'
            } else if (foiRespostaAnterior) {
              estilo = hist.acertou
                ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10'
                : 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10'
            }

            return (
              <div key={alternativa.id} className="flex items-start gap-1.5">
                <button
                  onClick={() => !mostrarResposta && !isEliminada && setRespostaSelecionada(alternativa.id)}
                  disabled={mostrarResposta || isEliminada}
                  className={`flex-1 p-3 sm:p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] min-h-[48px] ${estilo}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={`font-bold text-sm shrink-0 mt-0.5 ${isEliminada ? 'text-gray-300 line-through' : 'text-gray-400'}`}>
                      {String.fromCharCode(97 + index)})
                    </span>
                    <span className={`flex-1 text-sm text-justify ${isEliminada ? 'text-gray-300 line-through' : 'text-gray-900 dark:text-white'}`}>
                      {alternativa.texto}
                    </span>
                    {mostrarResposta && alternativa.correta && <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />}
                    {mostrarResposta && selecionada && !alternativa.correta && <XCircle className="h-5 w-5 text-red-500 shrink-0" />}
                    {foiRespostaAnterior && (
                      <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        hist!.acertou 
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      }`}>
                        {hist!.acertou ? '✅ acertou antes' : '❌ errou antes'}
                      </span>
                    )}
                  </div>
                </button>

                {/* Botão eliminar */}
                {!mostrarResposta && !isSimulado && (
                  <button
                    onClick={() => toggleEliminarAlternativa(alternativa.id)}
                    className={`mt-3 shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                      isEliminada ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500 hover:bg-red-200'
                    }`}
                  >
                    {isEliminada ? <RotateCw className="h-3.5 w-3.5" /> : <Scissors className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
            )
          })
        )}

        {/* Restaurar eliminadas */}
        {questao.tipo === 'multipla_escolha' && alternativasEliminadas.length > 0 && !mostrarResposta && (
          <button onClick={limparTodasEliminacoes}
            className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 px-1">
            <RotateCw className="h-3 w-3" /> Restaurar {alternativasEliminadas.length} eliminada(s)
          </button>
        )}
      </div>

      {/* ============================== */}
      {/* FEEDBACK + EXPLICAÇÃO (após responder) */}
      {/* ============================== */}
      {mostrarResposta && (
        <div className={`rounded-2xl p-4 border-2 text-center ${
          respostas[respostas.length - 1]?.correta
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
            : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
        }`}>
          <div className="text-2xl mb-1">
            {respostas[respostas.length - 1]?.correta ? '🎉' : '💪'}
          </div>
          <p className={`text-sm font-bold ${
            respostas[respostas.length - 1]?.correta
              ? 'text-emerald-700 dark:text-emerald-300'
              : 'text-red-700 dark:text-red-300'
          }`}>
            {respostas[respostas.length - 1]?.correta ? 'Correto!' : 'Incorreto'}
          </p>

          {/* Botão ver explicação */}
          {questao.explicacao && (
            <button
              onClick={() => setMostrarExplicacaoModal(!mostrarExplicacaoModal)}
              className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mx-auto"
            >
              💡 {mostrarExplicacaoModal ? 'Ocultar explicação' : 'Ver explicação'}
            </button>
          )}

          {mostrarExplicacaoModal && questao.explicacao && (
            <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-xl text-left border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-700 dark:text-gray-300 text-justify">{questao.explicacao}</p>
            </div>
          )}
        </div>
      )}

      {/* ============================== */}
      {/* AÇÕES: Comentários + Report (ícones flutuantes) */}
      {/* ============================== */}
      {!isSimulado && (
        <div className="flex items-center gap-2 px-1">
          <button
            onClick={() => { setMostrarComentarios(!mostrarComentarios); setMostrarReport(false) }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              mostrarComentarios
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <MessageCircle className="h-3.5 w-3.5" /> Comentários
          </button>
          <button
            onClick={() => { setMostrarReport(!mostrarReport); setMostrarComentarios(false) }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              mostrarReport
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Flag className="h-3.5 w-3.5" /> Reportar
          </button>
          <div className="flex-1" />
          <button onClick={reiniciarSessao}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
          </button>
        </div>
      )}

      {/* Painéis de comentários/report */}
      {!isSimulado && mostrarComentarios && (
        <ComentariosInline questaoId={questao.id} isOpen={true} onToggle={() => setMostrarComentarios(false)} />
      )}
      {!isSimulado && mostrarReport && (
        <ReportarErro questaoId={questao.id} isOpen={true} onToggle={() => setMostrarReport(false)} />
      )}

      {/* ============================== */}
      {/* BOTÕES DE NAVEGAÇÃO (Desktop) */}
      {/* ============================== */}
      <div className="hidden sm:flex gap-2">
        <button onClick={voltarQuestao} disabled={questaoAtual === 0}
          className="px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 flex items-center gap-2 text-sm">
          <ArrowLeft className="h-4 w-4" /> Anterior
        </button>

        {!mostrarResposta ? (
          <>
            <button onClick={verificarResposta} disabled={respostaSelecionada === null}
              className={`flex-1 py-3 text-white rounded-xl transition-all disabled:opacity-40 font-semibold text-sm flex items-center justify-center gap-2 ${
                isSimulado ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}>
              {isSimulado
                ? (isUltimaQuestao ? 'Finalizar Simulado' : 'Confirmar e Avançar')
                : 'Confirmar Resposta'
              }
            </button>
            {!isSimulado && (
              <button onClick={pularQuestao} disabled={isUltimaQuestao}
                className="px-4 py-3 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-30 flex items-center gap-2 text-sm">
                Pular <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <button onClick={proximaQuestao}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-semibold text-sm flex items-center justify-center gap-2">
            {isUltimaQuestao ? 'Finalizar Sessão' : 'Próxima Questão'} <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ============================== */}
      {/* BOTÕES STICKY (Mobile) */}
      {/* ============================== */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 p-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 z-40">
        <div className="flex gap-2">
          <button onClick={voltarQuestao} disabled={questaoAtual === 0}
            className="px-3 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl disabled:opacity-30 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>

          {!mostrarResposta ? (
            <>
              <button onClick={verificarResposta} disabled={respostaSelecionada === null}
                className={`flex-1 py-3 text-white rounded-xl transition-all disabled:opacity-40 font-semibold text-sm ${
                  isSimulado ? 'bg-red-600 active:bg-red-700' : 'bg-blue-600 active:bg-blue-700'
                }`}>
                {isSimulado
                  ? (isUltimaQuestao ? 'Finalizar' : 'Confirmar')
                  : 'Confirmar'
                }
              </button>
              {!isSimulado && (
                <button onClick={pularQuestao} disabled={isUltimaQuestao}
                  className="px-3 py-3 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-xl disabled:opacity-30 text-sm font-medium">
                  Pular
                </button>
              )}
            </>
          ) : (
            <button onClick={proximaQuestao}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl active:bg-emerald-700 font-semibold text-sm flex items-center justify-center gap-2">
              {isUltimaQuestao ? 'Finalizar' : 'Próxima'} <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}