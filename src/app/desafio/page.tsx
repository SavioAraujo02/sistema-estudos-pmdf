'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthProvider'
import { getDesafiosSemanais, getRankingDesafio, iniciarDesafio, finalizarDesafio, calcularPontuacao, criarDesafio, DesafioSemanal, ParticipacaoDesafio, ResultadoDesafio } from '@/lib/desafioSemanal'
import { supabase } from '@/lib/supabase'
import { EnunciadoFormatado } from '@/components/EnunciadoFormatado'
import { Trophy, Clock, Target, Play, Users, Crown, ChevronDown, ChevronUp, Plus, RefreshCw, CheckCircle, XCircle, Timer, Zap, Star, ArrowRight, Medal } from 'lucide-react'
import { getMaterias } from '@/lib/materias'

type Tela = 'lista' | 'jogando' | 'resultado' | 'criar'

export default function DesafioPage() {
  const { user, isAdmin } = useAuth()
  const [tela, setTela] = useState<Tela>('lista')
  const [desafios, setDesafios] = useState<DesafioSemanal[]>([])
  const [desafioAtual, setDesafioAtual] = useState<DesafioSemanal | null>(null)
  const [ranking, setRanking] = useState<ParticipacaoDesafio[]>([])
  const [resultado, setResultado] = useState<ResultadoDesafio | null>(null)
  const [loading, setLoading] = useState(true)
  const [rankingAberto, setRankingAberto] = useState<string | null>(null)
  const [rankingCache, setRankingCache] = useState<Record<string, ParticipacaoDesafio[]>>({})

  // Estado do jogo
  const [questoes, setQuestoes] = useState<any[]>([])
  const [questaoIdx, setQuestaoIdx] = useState(0)
  const [respostaSelecionada, setRespostaSelecionada] = useState<string | boolean | null>(null)
  const [respostas, setRespostas] = useState<any[]>([])
  const [tempoInicio, setTempoInicio] = useState(0)
  const [tempoQuestao, setTempoQuestao] = useState(0)
  const [pontuacaoTotal, setPontuacaoTotal] = useState(0)
  const [acertosTotal, setAcertosTotal] = useState(0)
  const [mostrarResposta, setMostrarResposta] = useState(false)

  // Estado criar desafio
  const [materias, setMaterias] = useState<any[]>([])
  const [novoDesafio, setNovoDesafio] = useState({ titulo: '', descricao: '', materiaId: '', dataInicio: '', dataFim: '' })
  const [criando, setCriando] = useState(false)

  useEffect(() => {
    carregarDesafios()
  }, [])

  const carregarDesafios = async () => {
    setLoading(true)
    const data = await getDesafiosSemanais()
    setDesafios(data)
    setLoading(false)
  }

  const carregarRanking = async (desafioId: string) => {
    if (rankingCache[desafioId]) {
      setRankingAberto(rankingAberto === desafioId ? null : desafioId)
      return
    }
    const data = await getRankingDesafio(desafioId)
    setRankingCache(prev => ({ ...prev, [desafioId]: data }))
    setRankingAberto(rankingAberto === desafioId ? null : desafioId)
  }

  const handleIniciar = async (desafio: DesafioSemanal) => {
    const sucesso = await iniciarDesafio(desafio.id)
    if (!sucesso) {
      alert('Erro ao iniciar desafio.')
      return
    }

    // Buscar questões
    const { data: questoesData } = await supabase
      .from('questoes')
      .select(`
        id, enunciado, tipo, explicacao, resposta_certo_errado,
        materias!inner(nome),
        assuntos(nome, cor),
        alternativas(id, texto, correta)
      `)
      .in('id', desafio.questoes_ids)

    if (!questoesData || questoesData.length === 0) {
      alert('Erro ao carregar questões do desafio.')
      return
    }

    // Ordenar na mesma ordem do desafio
    const ordenadas = desafio.questoes_ids
      .map(id => questoesData.find((q: any) => q.id === id))
      .filter(Boolean)

    setDesafioAtual(desafio)
    setQuestoes(ordenadas)
    setQuestaoIdx(0)
    setRespostas([])
    setPontuacaoTotal(0)
    setAcertosTotal(0)
    setRespostaSelecionada(null)
    setMostrarResposta(false)
    setTempoInicio(Date.now())
    setTempoQuestao(Date.now())
    setTela('jogando')
  }

  const handleConfirmar = () => {
    if (respostaSelecionada === null) return

    const questao = questoes[questaoIdx]
    const tempoSeg = Math.round((Date.now() - tempoQuestao) / 1000)

    let acertou = false
    if (questao.tipo === 'certo_errado') {
      acertou = respostaSelecionada === questao.resposta_certo_errado
    } else {
      const correta = questao.alternativas?.find((a: any) => a.correta)
      acertou = respostaSelecionada === correta?.id
    }

    const pontos = calcularPontuacao(acertou, tempoSeg)
    const novaPontuacao = pontuacaoTotal + pontos
    const novosAcertos = acertosTotal + (acertou ? 1 : 0)

    setPontuacaoTotal(novaPontuacao)
    setAcertosTotal(novosAcertos)
    setMostrarResposta(true)
    setRespostas([...respostas, { questao_id: questao.id, acertou, tempo: tempoSeg, pontos }])
  }

  const handleProxima = async () => {
    if (questaoIdx < questoes.length - 1) {
      setQuestaoIdx(questaoIdx + 1)
      setRespostaSelecionada(null)
      setMostrarResposta(false)
      setTempoQuestao(Date.now())
    } else {
      // Finalizar
      const tempoTotal = Math.round((Date.now() - tempoInicio) / 1000)
      const result = await finalizarDesafio(
        desafioAtual!.id,
        pontuacaoTotal,
        acertosTotal,
        tempoTotal,
        respostas
      )
      setResultado(result)
      setTela('resultado')
    }
  }

  const handleCriarDesafio = async () => {
    if (!novoDesafio.titulo || !novoDesafio.dataInicio || !novoDesafio.dataFim) {
      alert('Preencha título, data de início e data de fim.')
      return
    }
    setCriando(true)
    const sucesso = await criarDesafio({
      titulo: novoDesafio.titulo,
      descricao: novoDesafio.descricao,
      materiaId: novoDesafio.materiaId || undefined,
      dataInicio: novoDesafio.dataInicio,
      dataFim: novoDesafio.dataFim
    })
    setCriando(false)
    if (sucesso) {
      alert('Desafio criado com sucesso!')
      setNovoDesafio({ titulo: '', descricao: '', materiaId: '', dataInicio: '', dataFim: '' })
      setTela('lista')
      await carregarDesafios()
    } else {
      alert('Erro ao criar desafio.')
    }
  }

  const fmtTempo = (seg: number) => {
    const m = Math.floor(seg / 60)
    const s = seg % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const getMedalha = (pos: number) => {
    if (pos === 1) return '🥇'
    if (pos === 2) return '🥈'
    if (pos === 3) return '🥉'
    return `${pos}º`
  }

  const getTempoRestante = (dataFim: string) => {
    const diff = new Date(dataFim).getTime() - Date.now()
    if (diff <= 0) return 'Encerrado'
    const dias = Math.floor(diff / (1000 * 60 * 60 * 24))
    const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    if (dias > 0) return `${dias}d ${horas}h restantes`
    return `${horas}h restantes`
  }

  // ==========================================
  // TELA: JOGANDO
  // ==========================================
  if (tela === 'jogando' && desafioAtual && questoes.length > 0) {
    const questao = questoes[questaoIdx]
    const isUltima = questaoIdx === questoes.length - 1

    return (
      <ProtectedRoute>
        <DashboardLayout title="Desafio Semanal">
          <div className="max-w-2xl mx-auto space-y-4 px-1">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm">{desafioAtual.titulo}</h3>
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1"><Star className="h-4 w-4" />{pontuacaoTotal}pts</span>
                  <span className="flex items-center gap-1"><Target className="h-4 w-4" />{acertosTotal}/{questaoIdx + (mostrarResposta ? 1 : 0)}</span>
                </div>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${((questaoIdx + 1) / questoes.length) * 100}%` }} />
              </div>
              <p className="text-xs mt-1 opacity-80">Questão {questaoIdx + 1} de {questoes.length}</p>
            </div>

            {/* Questão */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">{(questao as any).materias?.nome}</span>
              </div>
              <div className="mb-4">
                <EnunciadoFormatado texto={questao.enunciado} className="text-sm sm:text-base" />
              </div>

              {/* Alternativas */}
              <div className="space-y-2 mb-4">
                {questao.tipo === 'certo_errado' ? (
                  <div className="grid grid-cols-2 gap-2">
                    {[{ v: true, l: 'CERTO' }, { v: false, l: 'ERRADO' }].map(op => (
                      <button key={String(op.v)} onClick={() => !mostrarResposta && setRespostaSelecionada(op.v)}
                        disabled={mostrarResposta}
                        className={`p-3 rounded-xl border-2 font-semibold text-sm transition-all min-h-[48px] ${
                          mostrarResposta
                            ? op.v === questao.resposta_certo_errado
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700'
                              : respostaSelecionada === op.v
                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700'
                                : 'border-gray-200 dark:border-gray-600 text-gray-400'
                            : respostaSelecionada === op.v
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700'
                              : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                        }`}>
                        {op.l}
                      </button>
                    ))}
                  </div>
                ) : (
                  questao.alternativas?.map((alt: any, idx: number) => (
                    <button key={alt.id} onClick={() => !mostrarResposta && setRespostaSelecionada(alt.id)}
                      disabled={mostrarResposta}
                      className={`w-full p-3 rounded-xl border-2 text-left text-sm transition-all min-h-[44px] ${
                        mostrarResposta
                          ? alt.correta
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                            : respostaSelecionada === alt.id
                              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                              : 'border-gray-200 dark:border-gray-600'
                          : respostaSelecionada === alt.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                      }`}>
                      <span className="font-semibold text-gray-500 mr-2">{String.fromCharCode(97 + idx)})</span>
                      <span className="text-gray-900 dark:text-white">{alt.texto}</span>
                      {mostrarResposta && alt.correta && <CheckCircle className="h-4 w-4 text-emerald-500 inline ml-2" />}
                      {mostrarResposta && respostaSelecionada === alt.id && !alt.correta && <XCircle className="h-4 w-4 text-red-500 inline ml-2" />}
                    </button>
                  ))
                )}
              </div>

              {/* Pontos ganhos */}
              {mostrarResposta && (
                <div className={`text-center p-3 rounded-xl mb-3 ${
                  respostas[respostas.length - 1]?.acertou
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                }`}>
                  <span className="text-lg font-bold">
                    {respostas[respostas.length - 1]?.acertou
                      ? `+${respostas[respostas.length - 1]?.pontos} pontos! 🎉`
                      : '0 pontos 😔'}
                  </span>
                </div>
              )}

              {/* Botões */}
              {!mostrarResposta ? (
                <button onClick={handleConfirmar} disabled={respostaSelecionada === null}
                  className="w-full py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-all font-semibold text-sm disabled:opacity-50 min-h-[48px]">
                  Confirmar
                </button>
              ) : (
                <button onClick={handleProxima}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-semibold text-sm min-h-[48px] flex items-center justify-center gap-2">
                  {isUltima ? 'Finalizar Desafio' : 'Próxima'} <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  // ==========================================
  // TELA: RESULTADO
  // ==========================================
  if (tela === 'resultado' && resultado) {
    return (
      <ProtectedRoute>
        <DashboardLayout title="Resultado do Desafio">
          <div className="max-w-lg mx-auto space-y-5 px-1">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 sm:p-8 text-white text-center">
              <div className="text-5xl mb-3">{resultado.posicao <= 3 ? getMedalha(resultado.posicao) : '🏅'}</div>
              <h2 className="text-2xl font-bold mb-1">Desafio Concluído!</h2>
              <p className="opacity-80 text-sm">{resultado.posicao}º lugar de {resultado.totalParticipantes} participantes</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
                <Star className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                <div className="text-xl font-bold text-gray-900 dark:text-white">{resultado.pontuacao}</div>
                <div className="text-[10px] text-gray-500">Pontos</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
                <Target className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                <div className="text-xl font-bold text-gray-900 dark:text-white">{resultado.acertos}/20</div>
                <div className="text-[10px] text-gray-500">Acertos</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
                <Clock className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                <div className="text-xl font-bold text-gray-900 dark:text-white">{fmtTempo(resultado.tempoTotal)}</div>
                <div className="text-[10px] text-gray-500">Tempo</div>
              </div>
            </div>

            <button onClick={() => { setTela('lista'); carregarDesafios() }}
              className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold text-sm min-h-[48px]">
              Ver Ranking Completo
            </button>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  // ==========================================
  // TELA: CRIAR DESAFIO (Admin)
  // ==========================================
  if (tela === 'criar' && isAdmin) {
    if (materias.length === 0) {
      getMaterias().then(setMaterias)
    }

    return (
      <ProtectedRoute>
        <DashboardLayout title="Criar Desafio">
          <div className="max-w-lg mx-auto space-y-5 px-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" /> Novo Desafio Semanal
              </h2>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Título *</label>
                <input type="text" value={novoDesafio.titulo}
                  onChange={(e) => setNovoDesafio({ ...novoDesafio, titulo: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm min-h-[44px] text-gray-900 dark:text-white"
                  placeholder="Ex: Desafio Direito Constitucional" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Descrição</label>
                <textarea value={novoDesafio.descricao}
                  onChange={(e) => setNovoDesafio({ ...novoDesafio, descricao: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  rows={2} placeholder="Descrição opcional..." />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Matéria (vazio = todas)</label>
                <select value={novoDesafio.materiaId}
                  onChange={(e) => setNovoDesafio({ ...novoDesafio, materiaId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm min-h-[44px] text-gray-900 dark:text-white">
                  <option value="">Todas as matérias</option>
                  {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Início *</label>
                  <input type="datetime-local" value={novoDesafio.dataInicio}
                    onChange={(e) => setNovoDesafio({ ...novoDesafio, dataInicio: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm min-h-[44px] text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Fim *</label>
                  <input type="datetime-local" value={novoDesafio.dataFim}
                    onChange={(e) => setNovoDesafio({ ...novoDesafio, dataFim: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm min-h-[44px] text-gray-900 dark:text-white" />
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl text-xs text-blue-700 dark:text-blue-400">
                <p className="font-medium mb-1">ℹ️ Como funciona:</p>
                <p>O sistema selecionará 20 questões aleatórias da matéria escolhida. Todos os participantes responderão as mesmas questões. Pontuação: 10pts por acerto + até 5pts de bônus por velocidade.</p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setTela('lista')}
                  className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm min-h-[48px]">
                  Cancelar
                </button>
                <button onClick={handleCriarDesafio} disabled={criando}
                  className="flex-1 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-all font-semibold text-sm disabled:opacity-50 min-h-[48px] flex items-center justify-center gap-2">
                  {criando ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Trophy className="h-4 w-4" />}
                  {criando ? 'Criando...' : 'Criar Desafio'}
                </button>
              </div>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  // ==========================================
  // TELA: LISTA DE DESAFIOS
  // ==========================================
  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout title="Desafio Semanal">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-600 border-t-transparent" />
              <p className="text-sm text-gray-500">Carregando desafios...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout title="Desafio Semanal">
        <div className="max-w-2xl lg:max-w-4xl mx-auto space-y-4 sm:space-y-5 px-1">

          {/* Header */}
          <div className="rounded-2xl p-5 sm:p-6 lg:p-8 text-white relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600">
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1 flex items-center gap-2">
                  <Trophy className="h-6 w-6" /> Desafio Semanal
                </h2>
                <p className="text-sm opacity-80">Compita com seus colegas e teste seus conhecimentos!</p>
              </div>
              <div className="flex gap-2">
                {isAdmin && (
                  <button onClick={() => { setTela('criar'); getMaterias().then(setMaterias) }}
                    className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors" title="Criar desafio">
                    <Plus className="h-5 w-5" />
                  </button>
                )}
                <button onClick={carregarDesafios} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full" />
          </div>

          {/* Lista de desafios */}
          {desafios.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Nenhum desafio ativo</h3>
              <p className="text-sm text-gray-500 mb-4">Aguarde o administrador criar o próximo desafio!</p>
              {isAdmin && (
                <button onClick={() => { setTela('criar'); getMaterias().then(setMaterias) }}
                  className="px-5 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors text-sm font-medium">
                  Criar Primeiro Desafio
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {desafios.map(desafio => (
                <div key={desafio.id} className={`bg-white dark:bg-gray-800 rounded-2xl border overflow-hidden ${
                  desafio.status === 'ativo' ? 'border-amber-300 dark:border-amber-700' : 'border-gray-200 dark:border-gray-700'
                }`}>
                  {/* Card do desafio */}
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">{desafio.titulo}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                            desafio.status === 'ativo' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                            desafio.status === 'futuro' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {desafio.status === 'ativo' ? '🟢 Ativo' : desafio.status === 'futuro' ? '🔵 Em breve' : '⚫ Encerrado'}
                          </span>
                        </div>
                        {desafio.descricao && <p className="text-xs text-gray-500 mb-2">{desafio.descricao}</p>}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          {desafio.materia_nome && <span className="flex items-center gap-1">📚 {desafio.materia_nome}</span>}
                          <span className="flex items-center gap-1"><Target className="h-3 w-3" />{desafio.total_questoes} questões</span>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{desafio.participantes} participantes</span>
                          {desafio.status === 'ativo' && <span className="flex items-center gap-1 text-amber-600"><Clock className="h-3 w-3" />{getTempoRestante(desafio.data_fim)}</span>}
                        </div>
                      </div>

                      {/* Minha pontuação */}
                      {desafio.jaParticipou && (
                        <div className="text-right shrink-0 ml-3">
                          <div className="text-lg font-bold text-amber-600">{desafio.minhaPontuacao}pts</div>
                          <div className="text-[10px] text-gray-500">Sua pontuação</div>
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2 mt-3">
                      {desafio.status === 'ativo' && !desafio.jaParticipou && (
                        <button onClick={() => handleIniciar(desafio)}
                          className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-all font-semibold text-sm flex items-center justify-center gap-2 min-h-[44px]">
                          <Play className="h-4 w-4" /> Participar
                        </button>
                      )}
                      {desafio.jaParticipou && (
                        <div className="flex-1 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm flex items-center justify-center gap-2 min-h-[44px] font-medium">
                          <CheckCircle className="h-4 w-4" /> Concluído
                        </div>
                      )}
                      <button onClick={() => carregarRanking(desafio.id)}
                        className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm flex items-center gap-1.5 min-h-[44px]">
                        <Medal className="h-4 w-4" /> Ranking
                        {rankingAberto === desafio.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Ranking expandido */}
                  {rankingAberto === desafio.id && (
                    <div className="border-t border-gray-200 dark:border-gray-700">
                      <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {(rankingCache[desafio.id] || []).length === 0 ? (
                          <div className="text-center py-6 text-sm text-gray-500">Nenhum participante ainda</div>
                        ) : (
                          (rankingCache[desafio.id] || []).map(p => (
                            <div key={p.id} className={`flex items-center gap-3 px-4 py-2.5 ${
                              p.usuario_id === user?.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}>
                              <span className="text-lg w-7 text-center shrink-0">{getMedalha(p.posicao || 0)}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {p.usuario_nome} {p.usuario_id === user?.id && '(você)'}
                                </p>
                                {p.usuario_pelotao && <p className="text-[10px] text-gray-500">{p.usuario_pelotao}</p>}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-bold text-amber-600">{p.pontuacao}pts</p>
                                <p className="text-[10px] text-gray-500">{p.acertos}/20 · {fmtTempo(p.tempo_total_segundos)}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Info */}
          <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-4 text-xs text-amber-700 dark:text-amber-400">
            <p className="font-medium mb-1">🏆 Como funciona a pontuação:</p>
            <p>Cada acerto vale <strong>10 pontos</strong>. Respostas rápidas ganham bônus: até 10s = +5pts, até 20s = +4pts, até 30s = +3pts, até 45s = +2pts, até 60s = +1pt. Máximo possível: <strong>300 pontos</strong> (20 × 15pts).</p>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}