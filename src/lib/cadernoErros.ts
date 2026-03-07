import { supabase } from './supabase'
import { comCache, cacheInvalidarPrefixo } from './cache'

export interface QuestaoErrada {
  id: string
  enunciado: string
  tipo: 'certo_errado' | 'multipla_escolha'
  explicacao?: string
  resposta_certo_errado?: boolean | null
  materia: string
  materiaId: string
  assunto?: string
  alternativas: { id: string; texto: string; correta: boolean }[]
  totalTentativas: number
  totalErros: number
  ultimoErro: string
  jaAcertou: boolean // Acertou pelo menos uma vez depois
}

export interface ResumoErros {
  totalErradas: number
  totalMaterias: number
  porMateria: { nome: string; id: string; quantidade: number }[]
  nuncaAcertou: number // Nunca acertou nenhuma vez
}

export async function getCadernoErros(): Promise<QuestaoErrada[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const cacheKey = `caderno_erros_${user.id}`

    return await comCache(cacheKey, async () => {
      // Buscar todo o histórico do usuário (paginado)
      const BATCH = 1000
      let historico: any[] = []
      let offset = 0
      while (true) {
        const { data, error } = await supabase
          .from('historico_estudos')
          .select('questao_id, acertou, data_resposta')
          .eq('usuario_id', user.id)
          .range(offset, offset + BATCH - 1)
        if (error || !data || data.length === 0) break
        historico = [...historico, ...data]
        if (data.length < BATCH) break
        offset += BATCH
      }

      if (historico.length === 0) return []

      // Agrupar por questão
      const statsMap = new Map<string, { erros: number; total: number; ultimoErro: string; acertouDepois: boolean }>()

      // Ordenar por data pra calcular "acertou depois"
      historico.sort((a, b) => new Date(a.data_resposta).getTime() - new Date(b.data_resposta).getTime())

      historico.forEach(h => {
        const stats = statsMap.get(h.questao_id) || { erros: 0, total: 0, ultimoErro: '', acertouDepois: false }
        stats.total++
        if (!h.acertou) {
          stats.erros++
          stats.ultimoErro = h.data_resposta
        }
        // Se já errou antes e agora acertou
        if (h.acertou && stats.erros > 0) {
          stats.acertouDepois = true
        }
        statsMap.set(h.questao_id, stats)
      })

      // Filtrar só as que teve pelo menos 1 erro
      const questoesComErro = Array.from(statsMap.entries())
        .filter(([_, stats]) => stats.erros > 0)
        .map(([id, stats]) => ({ id, ...stats }))

      if (questoesComErro.length === 0) return []

      // Buscar detalhes das questões (em batches de 50)
      const questoesDetalhadas: QuestaoErrada[] = []

      for (let i = 0; i < questoesComErro.length; i += 50) {
        const lote = questoesComErro.slice(i, i + 50)
        const ids = lote.map(q => q.id)

        const { data: questoes } = await supabase
          .from('questoes')
          .select(`
            id, enunciado, tipo, explicacao, resposta_certo_errado, materia_id,
            materias!inner(nome),
            assuntos(nome),
            alternativas(id, texto, correta)
          `)
          .in('id', ids)

        if (questoes) {
          questoes.forEach((q: any) => {
            const stats = questoesComErro.find(qe => qe.id === q.id)
            if (stats) {
              questoesDetalhadas.push({
                id: q.id,
                enunciado: q.enunciado,
                tipo: q.tipo,
                explicacao: q.explicacao,
                resposta_certo_errado: q.resposta_certo_errado,
                materia: q.materias?.nome || 'Sem matéria',
                materiaId: q.materia_id,
                assunto: q.assuntos?.nome || undefined,
                alternativas: q.alternativas || [],
                totalTentativas: stats.total,
                totalErros: stats.erros,
                ultimoErro: stats.ultimoErro,
                jaAcertou: stats.acertouDepois
              })
            }
          })
        }
      }

      // Ordenar: nunca acertou primeiro, depois por mais erros
      return questoesDetalhadas.sort((a, b) => {
        if (a.jaAcertou !== b.jaAcertou) return a.jaAcertou ? 1 : -1
        return b.totalErros - a.totalErros
      })
    }, 3 * 60 * 1000) // Cache 3 minutos
  } catch (error) {
    console.error('Erro ao buscar caderno de erros:', error)
    return []
  }
}

export function getResumoErros(questoes: QuestaoErrada[]): ResumoErros {
  const materiasMap = new Map<string, { nome: string; id: string; quantidade: number }>()

  questoes.forEach(q => {
    const mat = materiasMap.get(q.materiaId) || { nome: q.materia, id: q.materiaId, quantidade: 0 }
    mat.quantidade++
    materiasMap.set(q.materiaId, mat)
  })

  const porMateria = Array.from(materiasMap.values()).sort((a, b) => b.quantidade - a.quantidade)

  return {
    totalErradas: questoes.length,
    totalMaterias: porMateria.length,
    porMateria,
    nuncaAcertou: questoes.filter(q => !q.jaAcertou).length
  }
}

export function invalidarCacheCadernoErros() {
  cacheInvalidarPrefixo('caderno_erros')
}