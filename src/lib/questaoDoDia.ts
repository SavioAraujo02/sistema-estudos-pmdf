import { supabase } from './supabase'
import { comCache, cacheInvalidarPrefixo } from './cache'

export interface QuestaoDoDia {
  id: string
  enunciado: string
  tipo: 'certo_errado' | 'multipla_escolha'
  explicacao?: string
  resposta_certo_errado?: boolean | null
  materia: string
  assunto?: string
  alternativas: { id: string; texto: string; correta: boolean }[]
  stats: {
    totalRespostas: number
    totalAcertos: number
    percentualAcertos: number
  }
  jaRespondeu: boolean
  acertou?: boolean
}

// Gerar um número "aleatório" fixo baseado na data (mesmo resultado pra todos os usuários no mesmo dia)
function seedDoDia(): number {
  const hoje = new Date()
  const seed = hoje.getFullYear() * 10000 + (hoje.getMonth() + 1) * 100 + hoje.getDate()
  // Hash simples
  let hash = seed
  hash = ((hash >> 16) ^ hash) * 0x45d9f3b
  hash = ((hash >> 16) ^ hash) * 0x45d9f3b
  hash = (hash >> 16) ^ hash
  return Math.abs(hash)
}

export async function getQuestaoDoDia(): Promise<QuestaoDoDia | null> {
  return comCache('questao_do_dia', async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // 1. Contar total de questões
      const { count } = await supabase
        .from('questoes')
        .select('id', { count: 'exact', head: true })

      if (!count || count === 0) return null

      // 2. Escolher índice baseado na data
      const indice = seedDoDia() % count

      // 3. Buscar a questão nesse índice
      const { data: questaoData, error } = await supabase
        .from('questoes')
        .select(`
          id, enunciado, tipo, explicacao, resposta_certo_errado,
          materias!inner(nome),
          assuntos(nome),
          alternativas(id, texto, correta)
        `)
        .range(indice, indice)
        .single()

      if (error || !questaoData) {
        console.error('Erro ao buscar questão do dia:', error)
        return null
      }

      // 4. Buscar estatísticas dessa questão (todos os usuários)
      const { data: historico } = await supabase
        .from('historico_estudos')
        .select('acertou, usuario_id')
        .eq('questao_id', questaoData.id)

      const totalRespostas = historico?.length || 0
      const totalAcertos = historico?.filter(h => h.acertou).length || 0
      const percentualAcertos = totalRespostas > 0
        ? Math.round((totalAcertos / totalRespostas) * 100)
        : 0

      // 5. Verificar se o usuário atual já respondeu
      let jaRespondeu = false
      let acertou: boolean | undefined

      if (user && historico) {
        const minhaResposta = historico.find(h => h.usuario_id === user.id)
        if (minhaResposta) {
          jaRespondeu = true
          acertou = minhaResposta.acertou
        }
      }

      return {
        id: questaoData.id,
        enunciado: questaoData.enunciado,
        tipo: questaoData.tipo,
        explicacao: questaoData.explicacao,
        resposta_certo_errado: questaoData.resposta_certo_errado,
        materia: (questaoData.materias as any)?.nome || 'Sem matéria',
        assunto: (questaoData.assuntos as any)?.nome || undefined,
        alternativas: questaoData.alternativas || [],
        stats: { totalRespostas, totalAcertos, percentualAcertos },
        jaRespondeu,
        acertou
      }
    } catch (error) {
      console.error('Erro ao buscar questão do dia:', error)
      return null
    }
  }, 10 * 60 * 1000) // Cache por 10 minutos
}

// Invalidar cache quando responder
export function invalidarCacheQuestaoDoDia() {
  cacheInvalidarPrefixo('questao_do_dia')
}