'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { getCadernoErros, getResumoErros, QuestaoErrada, ResumoErros } from '@/lib/cadernoErros'
import { EnunciadoFormatado } from '@/components/EnunciadoFormatado'
import { BookOpen, AlertTriangle, CheckCircle, XCircle, RefreshCw, Filter, Play, ChevronDown, ChevronUp, Target, Flame, Search, X } from 'lucide-react'
import Link from 'next/link'

export default function CadernoErrosPage() {
  const [questoes, setQuestoes] = useState<QuestaoErrada[]>([])
  const [resumo, setResumo] = useState<ResumoErros | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtroMateria, setFiltroMateria] = useState<string>('todas')
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'nunca_acertou' | 'ja_acertou'>('todas')
  const [busca, setBusca] = useState('')
  const [expandida, setExpandida] = useState<string | null>(null)

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setLoading(true)
    const dados = await getCadernoErros()
    setQuestoes(dados)
    setResumo(getResumoErros(dados))
    setLoading(false)
  }

  const questoesFiltradas = questoes.filter(q => {
    const matchMateria = filtroMateria === 'todas' || q.materiaId === filtroMateria
    const matchStatus = filtroStatus === 'todas' ||
      (filtroStatus === 'nunca_acertou' && !q.jaAcertou) ||
      (filtroStatus === 'ja_acertou' && q.jaAcertou)
    const matchBusca = !busca || q.enunciado.toLowerCase().includes(busca.toLowerCase())
    return matchMateria && matchStatus && matchBusca
  })

  const fmtDataRelativa = (ds: string) => {
    const diff = Math.floor((Date.now() - new Date(ds).getTime()) / 60000)
    if (diff < 1) return 'Agora'
    if (diff < 60) return `${diff}min atrás`
    const h = Math.floor(diff / 60)
    if (h < 24) return `${h}h atrás`
    return `${Math.floor(h / 24)}d atrás`
  }

  const iniciarQuestaoEspecifica = (q: QuestaoErrada) => {
    const dadosEstudo = {
      questoes: [{
        id: q.id,
        enunciado: q.enunciado,
        tipo: q.tipo,
        explicacao: q.explicacao,
        resposta_certo_errado: q.resposta_certo_errado,
        materia: { nome: q.materia },
        assunto: q.assunto ? { id: '', nome: q.assunto, cor: '#6366f1' } : undefined,
        alternativas: q.alternativas
      }],
      configuracao: {
        modoEstudo: 'normal',
        salvarHistorico: true,
        materiaId: q.materiaId,
        assuntoIds: [],
        numeroQuestoes: 1
      }
    }
    localStorage.setItem('estudo_questao_especifica', JSON.stringify(dadosEstudo))
    window.location.href = '/estudar?modo=questao-especifica'
  }

  const iniciarRevisaoMateria = (materiaId: string) => {
    // Pegar todas as questões erradas dessa matéria
    const questoesMateria = questoes.filter(q => q.materiaId === materiaId)
    
    if (questoesMateria.length === 0) return

    const nomeMateria = questoesMateria[0].materia

    const dadosEstudo = {
      questoes: questoesMateria.map(q => ({
        id: q.id,
        enunciado: q.enunciado,
        tipo: q.tipo,
        explicacao: q.explicacao,
        resposta_certo_errado: q.resposta_certo_errado,
        materia: { nome: q.materia },
        assunto: q.assunto ? { id: '', nome: q.assunto, cor: '#6366f1' } : undefined,
        alternativas: q.alternativas
      })),
      configuracao: {
        modoEstudo: 'revisao',
        salvarHistorico: true,
        materiaId: materiaId,
        assuntoIds: [],
        numeroQuestoes: questoesMateria.length
      }
    }

    localStorage.setItem('estudo_questao_especifica', JSON.stringify(dadosEstudo))
    window.location.href = '/estudar?modo=questao-especifica'
  }


  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout title="Caderno de Erros">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent" />
              <p className="text-sm text-gray-500">Analisando seus erros...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout title="Caderno de Erros">
        <div className="max-w-2xl lg:max-w-4xl mx-auto space-y-4 sm:space-y-5 px-1">

          {/* Header */}
          <div className="rounded-2xl p-5 sm:p-6 lg:p-8 text-white relative overflow-hidden bg-gradient-to-br from-red-500 to-rose-600">
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1 flex items-center gap-2">
                    <BookOpen className="h-6 w-6" /> Caderno de Erros
                  </h2>
                  <p className="text-sm opacity-80">
                    Revise as questões que você errou e domine seus pontos fracos
                  </p>
                </div>
                <button onClick={carregarDados} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full" />
          </div>

          {/* Estado vazio */}
          {questoes.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Nenhum erro encontrado!</h3>
              <p className="text-sm text-gray-500 mb-4">Você ainda não errou nenhuma questão, ou ainda não começou a estudar.</p>
              <Link href="/estudar" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium">
                <Play className="h-4 w-4" /> Começar a Estudar
              </Link>
            </div>
          )}

          {/* Conteúdo quando tem erros */}
          {questoes.length > 0 && resumo && (
            <>
              {/* Stats rápidas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 sm:p-4 text-center border border-red-200 dark:border-red-800">
                  <div className="text-xl sm:text-2xl font-bold text-red-600">{resumo.totalErradas}</div>
                  <div className="text-[10px] sm:text-xs text-red-600/70">Questões erradas</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 sm:p-4 text-center border border-amber-200 dark:border-amber-800">
                  <div className="text-xl sm:text-2xl font-bold text-amber-600">{resumo.nuncaAcertou}</div>
                  <div className="text-[10px] sm:text-xs text-amber-600/70">Nunca acertou</div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 sm:p-4 text-center border border-emerald-200 dark:border-emerald-800">
                  <div className="text-xl sm:text-2xl font-bold text-emerald-600">{resumo.totalErradas - resumo.nuncaAcertou}</div>
                  <div className="text-[10px] sm:text-xs text-emerald-600/70">Já superou</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 sm:p-4 text-center border border-blue-200 dark:border-blue-800">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">{resumo.totalMaterias}</div>
                  <div className="text-[10px] sm:text-xs text-blue-600/70">Matérias</div>
                </div>
              </div>

              {/* Erros por matéria */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-red-500" /> Pontos Fracos por Matéria
                </h3>
                <div className="space-y-2">
                  {resumo.porMateria.map(mat => (
                    <div key={mat.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{mat.nome}</span>
                          <span className="text-xs text-red-600 font-medium shrink-0 ml-2">{mat.quantidade} erros</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${Math.min((mat.quantidade / resumo.totalErradas) * 100, 100)}%` }} />
                        </div>
                      </div>
                      <button
                        onClick={() => iniciarRevisaoMateria(mat.id)}
                        className="shrink-0 px-2.5 py-1 text-[10px] sm:text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 transition-colors min-h-[28px]"
                      >
                        Revisar
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filtros */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Busca */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar no enunciado..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm min-h-[44px]"
                    />
                    {busca && (
                      <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Filtro por matéria */}
                  <select
                    value={filtroMateria}
                    onChange={(e) => setFiltroMateria(e.target.value)}
                    className="px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm min-h-[44px]"
                  >
                    <option value="todas">Todas as matérias</option>
                    {resumo.porMateria.map(m => (
                      <option key={m.id} value={m.id}>{m.nome} ({m.quantidade})</option>
                    ))}
                  </select>

                  {/* Filtro por status */}
                  <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value as any)}
                    className="px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm min-h-[44px]"
                  >
                    <option value="todas">Todas ({resumo.totalErradas})</option>
                    <option value="nunca_acertou">Nunca acertou ({resumo.nuncaAcertou})</option>
                    <option value="ja_acertou">Já superou ({resumo.totalErradas - resumo.nuncaAcertou})</option>
                  </select>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  Mostrando {questoesFiltradas.length} de {questoes.length} questões
                </p>
              </div>

              {/* Lista de questões */}
              <div className="space-y-3">
                {questoesFiltradas.map((q) => (
                  <div key={q.id} className={`bg-white dark:bg-gray-800 rounded-2xl border overflow-hidden transition-all ${
                    q.jaAcertou
                      ? 'border-gray-200 dark:border-gray-700'
                      : 'border-red-200 dark:border-red-800'
                  }`}>
                    {/* Header da questão */}
                    <button
                      onClick={() => setExpandida(expandida === q.id ? null : q.id)}
                      className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className={`mt-0.5 shrink-0 ${q.jaAcertou ? 'text-emerald-500' : 'text-red-500'}`}>
                        {q.jaAcertou ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                          {q.enunciado.substring(0, 150)}{q.enunciado.length > 150 ? '...' : ''}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-[10px]">
                            {q.materia}
                          </span>
                          {q.assunto && (
                            <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full text-[10px]">
                              {q.assunto}
                            </span>
                          )}
                          <span className="text-[10px] text-red-600 font-medium">
                            {q.totalErros}x errou
                          </span>
                          <span className="text-[10px] text-gray-500">
                            Último: {fmtDataRelativa(q.ultimoErro)}
                          </span>
                        </div>
                      </div>
                      {expandida === q.id ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0 mt-1" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 mt-1" />}
                    </button>

                    {/* Detalhes expandidos */}
                    {expandida === q.id && (
                      <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3 space-y-3">
                        {/* Enunciado completo */}
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3">
                          <EnunciadoFormatado texto={q.enunciado} className="text-sm" />
                        </div>

                        {/* Resposta correta */}
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800">
                          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1">✅ Resposta correta:</p>
                          {q.tipo === 'certo_errado' ? (
                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                              {q.resposta_certo_errado === true ? 'CERTO' : q.resposta_certo_errado === false ? 'ERRADO' : 'Não definida'}
                            </p>
                          ) : (
                            q.alternativas.filter(a => a.correta).map(a => (
                              <p key={a.id} className="text-sm text-emerald-700 dark:text-emerald-300">{a.texto}</p>
                            ))
                          )}
                        </div>

                        {/* Todas as alternativas (múltipla escolha) */}
                        {q.tipo === 'multipla_escolha' && (
                          <div className="space-y-1.5">
                            {q.alternativas.map((alt, idx) => (
                              <div key={alt.id} className={`flex items-start gap-2 p-2 rounded-lg text-sm ${
                                alt.correta ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-800 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-400'
                              }`}>
                                <span className="font-semibold shrink-0">{String.fromCharCode(97 + idx)})</span>
                                <span className="text-justify">{alt.texto}</span>
                                {alt.correta && <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Explicação */}
                        {q.explicacao && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-200 dark:border-blue-800">
                            <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">💡 Explicação:</p>
                            <p className="text-sm text-blue-700 dark:text-blue-400 text-justify">{q.explicacao}</p>
                          </div>
                        )}

                        {/* Stats e ação */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="text-xs text-gray-500">
                            {q.totalTentativas} tentativas · {q.totalErros} erros · {q.jaAcertou ? '✅ Já acertou depois' : '❌ Nunca acertou'}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => iniciarQuestaoEspecifica(q)}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] sm:text-xs font-medium hover:bg-blue-700 transition-colors flex items-center gap-1"
                            >
                              <Play className="h-3 w-3" /> Refazer
                            </button>
                            <button
                              onClick={() => iniciarRevisaoMateria(q.materiaId)}
                              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-[10px] sm:text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
                            >
                              <Target className="h-3 w-3" /> Matéria
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {questoesFiltradas.length === 0 && questoes.length > 0 && (
                  <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <Filter className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Nenhuma questão com os filtros selecionados.</p>
                  </div>
                )}
              </div>

              {/* Dica */}
              <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 text-xs text-blue-700 dark:text-blue-400">
                <p className="font-medium mb-1">💡 Dica de estudo</p>
                <p>Foque primeiro nas questões que você <strong>nunca acertou</strong> — são seus pontos mais fracos. Questões marcadas com ✅ já foram superadas, mas revisá-las periodicamente ajuda na fixação.</p>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}