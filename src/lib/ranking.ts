import { supabase } from './supabase'
import { comCache } from './cache'

export interface UsuarioRanking {
  id: string
  nome: string
  pelotao: string | null
  totalRespostas: number
  acertos: number
  percentualAcertos: number
  questoesHoje: number
  diasConsecutivos: number
  posicao?: number
}

export type CategoriaRanking = 'respostas' | 'acertos' | 'consecutivos' | 'hoje'

export async function getRanking(): Promise<UsuarioRanking[]> {
  return comCache('ranking_geral', async () => {
    try {
      // 1. Buscar dados agregados via função SECURITY DEFINER (sem RLS)
      const { data: rankingData, error: rankError } = await supabase
        .rpc('get_ranking_data')

      if (rankError || !rankingData) {
        console.error('Erro ao buscar ranking:', rankError)
        return []
      }

      // 2. Buscar dias consecutivos — precisa das datas individuais
      //    Usar função separada ou calcular no banco
      //    Por simplicidade, buscar datas via outra função
      const { data: datasData } = await supabase
        .rpc('get_ranking_datas')

      const datasMap = new Map<string, string[]>()
      if (datasData) {
        datasData.forEach((d: any) => {
          const existing = datasMap.get(d.usuario_id) || []
          existing.push(d.dia)
          datasMap.set(d.usuario_id, existing)
        })
      }

      const hoje = new Date()
      const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`

      const ranking: UsuarioRanking[] = rankingData.map((r: any) => {
        const totalRespostas = Number(r.total_respostas)
        const acertos = Number(r.acertos)
        const percentualAcertos = totalRespostas > 0 ? Math.round((acertos / totalRespostas) * 100) : 0
        const questoesHoje = Number(r.questoes_hoje)

        // Calcular dias consecutivos
        const datas = datasMap.get(r.usuario_id) || []
        const datasUnicas = [...new Set(datas)].sort().reverse()

        let diasConsecutivos = 0
        if (datasUnicas.length > 0) {
          const ontem = new Date(hoje)
          ontem.setDate(ontem.getDate() - 1)
          const ontemStr = `${ontem.getFullYear()}-${String(ontem.getMonth() + 1).padStart(2, '0')}-${String(ontem.getDate()).padStart(2, '0')}`

          if (datasUnicas[0] === hojeStr || datasUnicas[0] === ontemStr) {
            diasConsecutivos = 1
            for (let i = 1; i < datasUnicas.length; i++) {
              const dataAtual = new Date(datasUnicas[i - 1])
              const dataAnterior = new Date(datasUnicas[i])
              const diffDias = Math.round((dataAtual.getTime() - dataAnterior.getTime()) / (1000 * 60 * 60 * 24))
              if (diffDias === 1) {
                diasConsecutivos++
              } else {
                break
              }
            }
          }
        }

        return {
          id: r.usuario_id,
          nome: r.nome,
          pelotao: r.pelotao,
          totalRespostas,
          acertos,
          percentualAcertos,
          questoesHoje,
          diasConsecutivos
        }
      })

      return ranking
    } catch (error) {
      console.error('Erro ao buscar ranking:', error)
      return []
    }
  }, 5 * 60 * 1000)
}

export function ordenarRanking(ranking: UsuarioRanking[], categoria: CategoriaRanking): UsuarioRanking[] {
  const sorted = [...ranking].sort((a, b) => {
    switch (categoria) {
      case 'respostas':
        return b.totalRespostas - a.totalRespostas
      case 'acertos':
        const aValido = a.totalRespostas >= 10 ? a.percentualAcertos : -1
        const bValido = b.totalRespostas >= 10 ? b.percentualAcertos : -1
        return bValido - aValido
      case 'consecutivos':
        return b.diasConsecutivos - a.diasConsecutivos
      case 'hoje':
        return b.questoesHoje - a.questoesHoje
      default:
        return b.totalRespostas - a.totalRespostas
    }
  })

  return sorted.map((user, idx) => ({ ...user, posicao: idx + 1 }))
}