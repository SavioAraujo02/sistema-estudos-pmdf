'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, ArrowRight, ArrowLeft, RotateCcw, Clock, Target, Timer, X, RotateCw } from 'lucide-react'
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

interface ModoEstudoProps {
  questoes: QuestaoEstudo[]
  onFinalizar: (resultados: ResultadoSessao) => void
  configuracao?: {
    materiaId?: string
    tagIds: string[]
    numeroQuestoes: number | 'todas'
    modoEstudo: 'normal' | 'revisao' | 'rapido' | 'aleatorio'
    salvarHistorico: boolean
  }
  isAdmin?: boolean
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
  
  // Estados do cronômetro
  const [tempoDecorrido, setTempoDecorrido] = useState(0)
  const [tempoQuestaoAtual, setTempoQuestaoAtual] = useState(0)
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null)
  const [tempoInicioSessao, setTempoInicioSessao] = useState(Date.now())
  const [cronometroQuestaoAtivo, setCronometroQuestaoAtivo] = useState(true)

  // Estados dos comentários e reports
  const [mostrarComentarios, setMostrarComentarios] = useState(false)
  const [mostrarReport, setMostrarReport] = useState(false)
  const [alternativasEliminadas, setAlternativasEliminadas] = useState<string[]>([])

  useEffect(() => {
    const agora = Date.now()
    setTempoInicio(agora)
    setTempoQuestao(agora)
    setTempoInicioSessao(agora)
    setCronometroQuestaoAtivo(true)
    
    // Iniciar cronômetro
    const id = setInterval(() => {
      const agora = Date.now()
      setTempoDecorrido(agora - tempoInicioSessao)
      
      if (cronometroQuestaoAtivo) {
        setTempoQuestaoAtual(agora - tempoQuestao)
      }
    }, 100)
    
    setIntervalId(id)
    
    return () => {
      if (id) clearInterval(id)
    }
  }, [])

  // Atualizar cronômetro quando estado mudar
  useEffect(() => {
    if (intervalId) {
      clearInterval(intervalId)
      
      const id = setInterval(() => {
        const agora = Date.now()
        setTempoDecorrido(agora - tempoInicioSessao)
        
        if (cronometroQuestaoAtivo) {
          setTempoQuestaoAtual(agora - tempoQuestao)
        }
      }, 100)
      
      setIntervalId(id)
    }
  }, [cronometroQuestaoAtivo, tempoQuestao, tempoInicioSessao])

  // Limpar intervalo quando componente for desmontado
  useEffect(() => {
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [intervalId])

  // Carregar alternativas eliminadas quando mudar de questão
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

  // Função para salvar tempo de resposta
  const salvarTempoResposta = async (questaoId: string, tempoSegundos: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('tempo_respostas')
        .insert({
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
  
    const tempoResposta = Date.now() - tempoQuestao
    let correta = false
  
    if (questao.tipo === 'certo_errado') {
      const respostaCorreta = await getRespostaCorretaCertoErrado(questao.id)
      if (respostaCorreta !== null) {
        correta = respostaSelecionada === respostaCorreta
      } else {
        correta = true
        console.warn('Não foi possível detectar a resposta correta para a questão:', questao.id)
      }
    } else {
      const alternativaCorreta = questao.alternativas?.find(alt => alt.correta)
      correta = respostaSelecionada === alternativaCorreta?.id
    }
  
    const novaResposta = {
      questao,
      resposta: respostaSelecionada,
      correta,
      tempo: tempoResposta
    }
  
    const novasRespostas = [...respostas, novaResposta]
    setRespostas(novasRespostas)
    setMostrarResposta(true)
  
    // Salvar no banco conforme configuração
    if (configuracao?.salvarHistorico === true) {
      console.log('🔄 Salvando resposta no histórico...')
      const salvou = await salvarResposta(questao.id, correta)
      console.log('✅ Resposta salva:', salvou)
      
      // Salvar tempo de resposta
      await salvarTempoResposta(questao.id, tempoResposta)
    } else {
      console.log('⚡ Modo rápido: resposta não salva no histórico')
    }

    // PARAR cronômetro da questão após responder
    setCronometroQuestaoAtivo(false)
    // Salvar estado da questão respondida
    setQuestoesRespondidas(prev => new Map(prev.set(questaoAtual, {
      resposta: respostaSelecionada,
      correta,
      mostrarResposta: true
    })))
  }

  const resetarTempoQuestao = () => {
    setTempoQuestao(Date.now())
    setTempoQuestaoAtual(0)
    setCronometroQuestaoAtivo(true)
  }

  const voltarQuestao = () => {
    if (questaoAtual > 0) {
      const novoIndice = questaoAtual - 1
      setQuestaoAtual(novoIndice)
      
      // Restaurar estado da questão se já foi respondida
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
      setAlternativasEliminadas([])
      resetarTempoQuestao()
    }
  }
  
  const avancarQuestao = () => {
    if (questaoAtual < questoes.length - 1) {
      const novoIndice = questaoAtual + 1
      setQuestaoAtual(novoIndice)
      
      // Restaurar estado da questão se já foi respondida
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
      setAlternativasEliminadas([])
      resetarTempoQuestao()
    }
  }

  const pularQuestao = () => {
    if (questaoAtual < questoes.length - 1) {
      const novaResposta = {
        questao,
        resposta: null,
        correta: false,
        tempo: Date.now() - tempoQuestao
      }
      setRespostas([...respostas, novaResposta])
      avancarQuestao()
    }
  }

  const proximaQuestao = () => {
    if (isUltimaQuestao) {
      // Parar cronômetro
      if (intervalId) clearInterval(intervalId)
      
      const tempoTotal = Date.now() - tempoInicioSessao
      const todasRespostas = mostrarResposta ? respostas : [...respostas]
      const acertos = todasRespostas.filter(r => r.correta).length
      
      const resultados: ResultadoSessao = {
        totalQuestoes: questoes.length,
        acertos,
        erros: questoes.length - acertos,
        percentual: Math.round((acertos / questoes.length) * 100),
        tempo: tempoTotal,
        respostas: todasRespostas
      }
  
      onFinalizar(resultados)
    } else {
      avancarQuestao()
    }
  }

  const reiniciarSessao = () => {
    // Parar cronômetro atual
    if (intervalId) clearInterval(intervalId)
    
    // Resetar estados
    setQuestaoAtual(0)
    setRespostaSelecionada(null)
    setMostrarResposta(false)
    setMostrarComentarios(false)
    setMostrarReport(false)
    setRespostas([])
    setQuestoesRespondidas(new Map())
    setAlternativasEliminadas([])
    
    // Reiniciar cronômetro
    const agora = Date.now()
    setTempoInicio(agora)
    setTempoQuestao(agora)
    setTempoInicioSessao(agora)
    setTempoDecorrido(0)
    setTempoQuestaoAtual(0)
    setCronometroQuestaoAtivo(true)
    
    const id = setInterval(() => {
      const agora = Date.now()
      setTempoDecorrido(agora - tempoInicioSessao)
      if (cronometroQuestaoAtivo) {
        setTempoQuestaoAtual(agora - tempoQuestao)
      }
    }, 100)
    
    setIntervalId(id)
  }

  // Função para formatar tempo
  const formatarTempo = (ms: number) => {
    const segundos = Math.floor(ms / 1000)
    const minutos = Math.floor(segundos / 60)
    const seg = segundos % 60
    return `${minutos.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`
  }

  const toggleEliminarAlternativa = async (alternativaId: string) => {
    if (!questao || mostrarResposta) return
    
    const jaEliminada = alternativasEliminadas.includes(alternativaId)
    
    try {
      if (jaEliminada) {
        const sucesso = await restaurarAlternativa(questao.id, alternativaId)
        if (sucesso) {
          setAlternativasEliminadas(prev => prev.filter(id => id !== alternativaId))
        }
      } else {
        const sucesso = await eliminarAlternativa(questao.id, alternativaId)
        if (sucesso) {
          setAlternativasEliminadas(prev => [...prev, alternativaId])
        }
      }
    } catch (error) {
      console.error('Erro ao eliminar/restaurar alternativa:', error)
    }
  }

  const limparTodasEliminacoes = async () => {
    if (!questao) return
    
    try {
      const sucesso = await limparAlternativasEliminadas(questao.id)
      if (sucesso) {
        setAlternativasEliminadas([])
      }
    } catch (error) {
      console.error('Erro ao limpar eliminações:', error)
    }
  }

  if (!questao) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📚</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Nenhuma questão disponível
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Cadastre algumas questões para começar a estudar.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header com cronômetro */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-gray-900 dark:text-white">
                Questão {questaoAtual + 1} de {questoes.length}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span>{questao.materia.nome}</span>
            </div>
          </div>
          
          {/* Cronômetros */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Timer className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-mono text-blue-700 dark:text-blue-300">
                {formatarTempo(tempoQuestaoAtual)}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <Clock className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                {formatarTempo(tempoDecorrido)}
              </span>
            </div>
            <button
              onClick={reiniciarSessao}
              className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Reiniciar
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((questaoAtual + 1) / questoes.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Questão */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="mb-6">
          <div className="mb-4">
            <EnunciadoFormatado 
              texto={questao.enunciado}
              className="text-lg font-medium"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className={`inline-block px-2 py-1 text-xs rounded-full ${
              questao.tipo === 'certo_errado'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
            }`}>
              {questao.tipo === 'certo_errado' ? 'Certo/Errado' : 'Múltipla Escolha'}
            </span>

            {/* Botão para limpar eliminações - só aparece se houver alternativas eliminadas */}
            {questao.tipo === 'multipla_escolha' && alternativasEliminadas.length > 0 && (
              <button
                onClick={limparTodasEliminacoes}
                disabled={mostrarResposta}
                className="flex items-center gap-1 px-2 py-1 text-xs text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors disabled:opacity-50"
              >
                <RotateCw className="h-3 w-3" />
                Restaurar Eliminadas ({alternativasEliminadas.length})
              </button>
            )}
          </div>
        </div>

        {/* Alternativas */}
        <div className="space-y-3 mb-6">
        {questao.tipo === 'certo_errado' ? (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setRespostaSelecionada(true)}
            disabled={mostrarResposta}
            className={`p-4 border-2 rounded-lg transition-all ${
              respostaSelecionada === true
                ? mostrarResposta
                  ? respostas[respostas.length - 1]?.correta
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            } ${mostrarResposta ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className={`h-5 w-5 ${
                mostrarResposta && respostaSelecionada === true
                  ? respostas[respostas.length - 1]?.correta ? 'text-green-600' : 'text-red-600'
                  : 'text-green-600'
              }`} />
              <span className="font-medium">CERTO</span>
              {mostrarResposta && respostaSelecionada === true && (
                respostas[respostas.length - 1]?.correta ? (
                  <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 ml-auto" />
                )
              )}
            </div>
          </button>
          
          <button
            onClick={() => setRespostaSelecionada(false)}
            disabled={mostrarResposta}
            className={`p-4 border-2 rounded-lg transition-all ${
              respostaSelecionada === false
                ? mostrarResposta
                  ? respostas[respostas.length - 1]?.correta
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            } ${mostrarResposta ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <XCircle className={`h-5 w-5 ${
                mostrarResposta && respostaSelecionada === false
                  ? respostas[respostas.length - 1]?.correta ? 'text-green-600' : 'text-red-600'
                  : 'text-red-600'
              }`} />
              <span className="font-medium">ERRADO</span>
              {mostrarResposta && respostaSelecionada === false && (
                respostas[respostas.length - 1]?.correta ? (
                  <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 ml-auto" />
                )
              )}
            </div>
          </button>
        </div>
          ) : (
            questao.alternativas?.map((alternativa, index) => {
              const isEliminada = alternativasEliminadas.includes(alternativa.id)
              
              return (
                <div key={alternativa.id} className="relative">
                  <button
                    onClick={() => setRespostaSelecionada(alternativa.id)}
                    disabled={mostrarResposta || isEliminada}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                      isEliminada
                        ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 opacity-50 cursor-not-allowed'
                        : respostaSelecionada === alternativa.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    } ${mostrarResposta ? 'cursor-not-allowed' : isEliminada ? 'cursor-not-allowed' : 'cursor-pointer'} ${
                      mostrarResposta && alternativa.correta
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : ''
                    } ${
                      mostrarResposta && respostaSelecionada === alternativa.id && !alternativa.correta
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-medium w-6 ${isEliminada ? 'text-gray-400 line-through' : 'text-gray-500'}`}>
                        {String.fromCharCode(97 + index)})
                      </span>
                      <span className={`flex-1 ${isEliminada ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                        {alternativa.texto}
                      </span>
                      {mostrarResposta && alternativa.correta && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {mostrarResposta && respostaSelecionada === alternativa.id && !alternativa.correta && (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  </button>

                  {/* Botão X para eliminar alternativa */}
                  {!mostrarResposta && (
                    <button
                      onClick={() => toggleEliminarAlternativa(alternativa.id)}
                      className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${
                        isEliminada
                          ? 'bg-green-100 text-green-600 hover:bg-green-200'
                          : 'bg-red-100 text-red-600 hover:bg-red-200'
                      }`}
                      title={isEliminada ? 'Restaurar alternativa' : 'Eliminar alternativa'}
                    >
                      {isEliminada ? <RotateCw className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Explicação */}
        {mostrarResposta && questao.explicacao && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              💡 Explicação
            </h4>
            <p className="text-gray-700 dark:text-gray-300">
              {questao.explicacao}
            </p>
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex gap-3">
          <button
            onClick={voltarQuestao}
            disabled={questaoAtual === 0}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Anterior
          </button>

          {!mostrarResposta ? (
            <>
              <button
                onClick={verificarResposta}
                disabled={respostaSelecionada === null}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Confirmar Resposta
              </button>
              
              <button
                onClick={pularQuestao}
                disabled={isUltimaQuestao}
                className="px-4 py-3 border border-yellow-300 text-yellow-700 dark:text-yellow-400 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Pular
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={proximaQuestao}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                {isUltimaQuestao ? 'Finalizar Sessão' : 'Próxima Questão'}
                <ArrowRight className="h-4 w-4" />
              </button>
              
              {!isUltimaQuestao && (
                <button
                  onClick={avancarQuestao}
                  className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                                    Avançar
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Comentários e Reports - AGORA ABAIXO DA QUESTÃO */}
        <ComentariosInline
          questaoId={questao.id}
          isOpen={mostrarComentarios}
          onToggle={() => setMostrarComentarios(!mostrarComentarios)}
        />

        <ReportarErro
          questaoId={questao.id}
          isOpen={mostrarReport}
          onToggle={() => setMostrarReport(!mostrarReport)}
        />
      </div>
    </div>
  )
}