'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Users, AlertTriangle, Clock, Target, BookOpen, TrendingUp, RefreshCw, Flame } from 'lucide-react'
import { getUsuariosMaisAtivos, getQuestoesMaisErradas, getEstatisticasSistema, UsuarioAtivo, QuestaoProblematica, EstatisticasSistema } from '@/lib/relatoriosAdmin'
import Link from 'next/link'

export function AdminRelatorios() {
  const [usuariosAtivos, setUsuariosAtivos] = useState<UsuarioAtivo[]>([])
  const [questoesProblematicas, setQuestoesProblematicas] = useState<QuestaoProblematica[]>([])
  const [estatisticas, setEstatisticas] = useState<EstatisticasSistema | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setLoading(true)
    const [usuarios, questoes, stats] = await Promise.all([
      getUsuariosMaisAtivos(10),
      getQuestoesMaisErradas(10),
      getEstatisticasSistema()
    ])
    setUsuariosAtivos(usuarios)
    setQuestoesProblematicas(questoes)
    setEstatisticas(stats)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Carregando relatórios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-violet-500" /> Relatórios do Sistema
        </h2>
        <button
          onClick={carregarDados}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" /> Atualizar
        </button>
      </div>

      {/* Estatísticas de uso */}
      {estatisticas && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 sm:p-4 text-center border border-blue-200 dark:border-blue-800">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{estatisticas.totalRespostasHoje}</div>
            <div className="text-[10px] sm:text-xs text-blue-600/70">Respostas hoje</div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 sm:p-4 text-center border border-emerald-200 dark:border-emerald-800">
            <div className="text-xl sm:text-2xl font-bold text-emerald-600">{estatisticas.totalRespostasSemana}</div>
            <div className="text-[10px] sm:text-xs text-emerald-600/70">Esta semana</div>
          </div>
          <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3 sm:p-4 text-center border border-violet-200 dark:border-violet-800">
            <div className="text-xl sm:text-2xl font-bold text-violet-600">{estatisticas.totalRespostasMes}</div>
            <div className="text-[10px] sm:text-xs text-violet-600/70">Este mês</div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 sm:p-4 text-center border border-amber-200 dark:border-amber-800">
            <div className="text-xl sm:text-2xl font-bold text-amber-600">{estatisticas.mediaRespostasDia}</div>
            <div className="text-[10px] sm:text-xs text-amber-600/70">Média/dia</div>
          </div>
        </div>
      )}

      {/* Info extra */}
      {estatisticas && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" /> Horário de Pico
            </h3>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{estatisticas.horarioPico}</div>
            <p className="text-xs text-gray-500 mt-1">Hora com mais respostas</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-gray-400" /> Matérias Mais Estudadas
            </h3>
            <div className="space-y-1.5">
              {estatisticas.materiasMaisEstudadas.map((m, idx) => (
                <div key={m.nome} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300 truncate">{idx + 1}. {m.nome}</span>
                  <span className="text-gray-500 shrink-0 ml-2">{m.total}</span>
                </div>
              ))}
              {estatisticas.materiasMaisEstudadas.length === 0 && (
                <p className="text-xs text-gray-500">Sem dados este mês</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ranking de alunos */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" /> Top 10 Alunos Mais Ativos
          </h3>
          <Link href="/ranking" className="text-xs text-blue-600 hover:underline">
            Ver ranking completo →
          </Link>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {usuariosAtivos.map((usr, idx) => (
            <div key={usr.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <span className="text-lg w-7 text-center shrink-0">
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{usr.nome}</p>
                {usr.pelotao && <p className="text-[10px] text-gray-500 truncate">{usr.pelotao}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{usr.totalRespostas}</p>
                <p className="text-[10px] text-gray-500">{usr.percentualAcertos}% acertos</p>
              </div>
            </div>
          ))}
          {usuariosAtivos.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Nenhum aluno com respostas ainda</p>
            </div>
          )}
        </div>
      </div>

      {/* Questões problemáticas */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" /> Questões com Mais Erros
          </h3>
          <p className="text-[10px] text-gray-500 mt-0.5">Mínimo 5 respostas e +40% de erro</p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {questoesProblematicas.map((q) => (
            <div key={q.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">{q.enunciado}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{q.materia}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-red-600">{q.percentualErros}%</div>
                  <div className="text-[10px] text-gray-500">{q.totalErros}/{q.totalRespostas} erros</div>
                </div>
              </div>
              <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${q.percentualErros}%` }} />
              </div>
            </div>
          ))}
          {questoesProblematicas.length === 0 && (
            <div className="text-center py-8">
              <Target className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Nenhuma questão problemática encontrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}