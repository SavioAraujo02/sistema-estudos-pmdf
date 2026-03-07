import { supabase } from './supabase'

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

// Buscar ranking completo
export async function getRanking(): Promise<UsuarioRanking[]> {
  try {
    // 1. Buscar usuários ativos
    const { data: usuarios, error: usrError } = await supabase
      .from('usuarios')
      .select('id, nome, pelotao')
      .eq('status', 'ativo')

    if (usrError || !usuarios) {
      console.error('Erro ao buscar usuários:', usrError)
      return []
    }

    // 2. Buscar TODO o histórico (paginado para passar do limite de 1000)
    const BATCH = 1000
    let historico: any[] = []
    let offset = 0
    while (true) {
      const { data, error } = await supabase
        .from('historico_estudos')
        .select('usuario_id, acertou, data_resposta')
        .range(offset, offset + BATCH - 1)

      if (error || !data || data.length === 0) break
      historico = [...historico, ...data]
      if (data.length < BATCH) break
      offset += BATCH
    }

    // 3. Calcular stats por usuário
    const hoje = new Date()
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`

    const ranking: UsuarioRanking[] = usuarios.map(usuario => {
      const respostasUser = historico.filter(h => h.usuario_id === usuario.id)
      const totalRespostas = respostasUser.length
      const acertos = respostasUser.filter(h => h.acertou).length
      const percentualAcertos = totalRespostas > 0
        ? Math.round((acertos / totalRespostas) * 100)
        : 0

      // Questões hoje
      const questoesHoje = respostasUser.filter(h => {
        const d = new Date(h.data_resposta)
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        return dStr === hojeStr
      }).length

      // Dias consecutivos
      const datasUnicas = [...new Set(
        respostasUser.map(h => {
          const d = new Date(h.data_resposta)
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        })
      )].sort().reverse()

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
        id: usuario.id,
        nome: usuario.nome,
        pelotao: usuario.pelotao,
        totalRespostas,
        acertos,
        percentualAcertos,
        questoesHoje,
        diasConsecutivos
      }
    })

    // Filtrar quem nunca respondeu
    return ranking.filter(u => u.totalRespostas > 0)
  } catch (error) {
    console.error('Erro ao buscar ranking:', error)
    return []
  }
}

// Ordenar por categoria
export function ordenarRanking(ranking: UsuarioRanking[], categoria: CategoriaRanking): UsuarioRanking[] {
  const sorted = [...ranking].sort((a, b) => {
    switch (categoria) {
      case 'respostas':
        return b.totalRespostas - a.totalRespostas
      case 'acertos':
        // Mínimo de 10 respostas pra entrar no ranking de acertos
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

  // Adicionar posição
  return sorted.map((user, idx) => ({ ...user, posicao: idx + 1 }))
}