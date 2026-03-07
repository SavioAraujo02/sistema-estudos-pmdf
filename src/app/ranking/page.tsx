'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthProvider'
import { getRanking, ordenarRanking, UsuarioRanking, CategoriaRanking } from '@/lib/ranking'
import { Trophy, Target, Flame, Zap, Crown, Medal, Award, RefreshCw } from 'lucide-react'

const CATEGORIAS = [
  { id: 'respostas' as const, nome: 'Mais Respondidas', icone: Target, cor: 'blue', emoji: '📊' },
  { id: 'acertos' as const, nome: 'Maior Acerto %', icone: Trophy, cor: 'emerald', emoji: '🎯' },
  { id: 'consecutivos' as const, nome: 'Dias Seguidos', icone: Flame, cor: 'orange', emoji: '🔥' },
  { id: 'hoje' as const, nome: 'Hoje', icone: Zap, cor: 'violet', emoji: '⚡' },
]

function getMedalha(posicao: number) {
  if (posicao === 1) return '🥇'
  if (posicao === 2) return '🥈'
  if (posicao === 3) return '🥉'
  return `${posicao}º`
}

function getCorPosicao(posicao: number) {
  if (posicao === 1) return 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
  if (posicao === 2) return 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
  if (posicao === 3) return 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
  return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
}

function getValorCategoria(user: UsuarioRanking, categoria: CategoriaRanking): string {
  switch (categoria) {
    case 'respostas': return `${user.totalRespostas} questões`
    case 'acertos': return `${user.percentualAcertos}% (${user.acertos}/${user.totalRespostas})`
    case 'consecutivos': return `${user.diasConsecutivos} dia${user.diasConsecutivos !== 1 ? 's' : ''}`
    case 'hoje': return `${user.questoesHoje} questões`
  }
}

export default function RankingPage() {
  const { user } = useAuth()
  const [ranking, setRanking] = useState<UsuarioRanking[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaRanking>('respostas')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarRanking()
  }, [])

  const carregarRanking = async () => {
    setLoading(true)
    const dados = await getRanking()
    setRanking(dados)
    setLoading(false)
  }

  const rankingOrdenado = ordenarRanking(ranking, categoriaAtiva)
  const meuUsuario = rankingOrdenado.find(u => u.id === user?.id)

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout title="Ranking">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
              <p className="text-sm text-gray-500">Calculando ranking...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout title="Ranking">
        <div className="max-w-2xl lg:max-w-4xl mx-auto space-y-4 sm:space-y-5 px-1">

          {/* Header */}
          <div className="rounded-2xl p-5 sm:p-6 lg:p-8 text-white relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600">
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1 flex items-center gap-2">
                    <Trophy className="h-6 w-6" /> Ranking dos Estudantes
                  </h2>
                  <p className="text-sm opacity-80">
                    {ranking.length} estudantes no ranking
                  </p>
                </div>
                <button
                  onClick={carregarRanking}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Atualizar"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full" />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />
          </div>

          {/* Minha posição (destaque) */}
          {meuUsuario && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="text-2xl sm:text-3xl font-bold">
                  {getMedalha(meuUsuario.posicao || 0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Sua posição</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                    {getValorCategoria(meuUsuario, categoriaAtiva)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg sm:text-xl font-bold text-blue-700 dark:text-blue-300">
                    {meuUsuario.posicao}º
                  </div>
                  <div className="text-[10px] text-blue-600 dark:text-blue-400">de {rankingOrdenado.length}</div>
                </div>
              </div>
            </div>
          )}

          {/* Abas de categorias */}
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max">
              {CATEGORIAS.map(cat => {
                const Icon = cat.icone
                const ativa = categoriaAtiva === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaAtiva(cat.id)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.97] min-h-[44px] whitespace-nowrap ${
                      ativa
                        ? `bg-${cat.cor}-600 text-white shadow-sm`
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    {cat.nome}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Pódio (top 3) */}
          {rankingOrdenado.length >= 3 && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {/* 2º lugar */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 text-center order-1 mt-4">
                <div className="text-3xl sm:text-4xl mb-1">🥈</div>
                <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {rankingOrdenado[1].nome}
                </p>
                {rankingOrdenado[1].pelotao && (
                  <p className="text-[10px] text-gray-500 truncate">{rankingOrdenado[1].pelotao}</p>
                )}
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {getValorCategoria(rankingOrdenado[1], categoriaAtiva)}
                </p>
              </div>

              {/* 1º lugar */}
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border-2 border-amber-300 dark:border-amber-700 p-3 sm:p-4 text-center order-2 relative">
                <Crown className="h-5 w-5 text-amber-500 absolute -top-2 left-1/2 -translate-x-1/2" />
                <div className="text-4xl sm:text-5xl mb-1 mt-1">🥇</div>
                <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                  {rankingOrdenado[0].nome}
                </p>
                {rankingOrdenado[0].pelotao && (
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 truncate">{rankingOrdenado[0].pelotao}</p>
                )}
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mt-1">
                  {getValorCategoria(rankingOrdenado[0], categoriaAtiva)}
                </p>
              </div>

              {/* 3º lugar */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 text-center order-3 mt-4">
                <div className="text-3xl sm:text-4xl mb-1">🥉</div>
                <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {rankingOrdenado[2].nome}
                </p>
                {rankingOrdenado[2].pelotao && (
                  <p className="text-[10px] text-gray-500 truncate">{rankingOrdenado[2].pelotao}</p>
                )}
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {getValorCategoria(rankingOrdenado[2], categoriaAtiva)}
                </p>
              </div>
            </div>
          )}

          {/* Lista completa */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Classificação Completa
              </h3>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {rankingOrdenado.map((usr) => {
                const isMe = usr.id === user?.id
                return (
                  <div
                    key={usr.id}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      isMe ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    {/* Posição */}
                    <div className="w-8 text-center shrink-0">
                      {(usr.posicao || 0) <= 3 ? (
                        <span className="text-lg">{getMedalha(usr.posicao || 0)}</span>
                      ) : (
                        <span className="text-sm font-bold text-gray-400">{usr.posicao}º</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isMe
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                    }`}>
                      {usr.nome.charAt(0).toUpperCase()}
                    </div>

                    {/* Nome e pelotão */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        isMe ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                      }`}>
                        {usr.nome} {isMe && '(você)'}
                      </p>
                      {usr.pelotao && (
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                          {usr.pelotao}
                        </p>
                      )}
                    </div>

                    {/* Valor principal */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {categoriaAtiva === 'respostas' && usr.totalRespostas}
                        {categoriaAtiva === 'acertos' && `${usr.percentualAcertos}%`}
                        {categoriaAtiva === 'consecutivos' && `${usr.diasConsecutivos}d`}
                        {categoriaAtiva === 'hoje' && usr.questoesHoje}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {categoriaAtiva === 'respostas' && 'questões'}
                        {categoriaAtiva === 'acertos' && `${usr.acertos}/${usr.totalRespostas}`}
                        {categoriaAtiva === 'consecutivos' && 'seguidos'}
                        {categoriaAtiva === 'hoje' && 'hoje'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {rankingOrdenado.length === 0 && (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Nenhum estudante no ranking ainda.</p>
              </div>
            )}
          </div>

          {/* Nota sobre ranking de acertos */}
          {categoriaAtiva === 'acertos' && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Mínimo de 10 questões respondidas para entrar no ranking de acertos.
            </p>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}