import { supabase } from './supabase'
import { Materia } from '@/types/database'

export async function getMaterias(): Promise<Materia[]> {
  const { data, error } = await supabase
    .from('materias')
    .select('*')
    .order('nome')

  if (error) {
    console.error('Erro ao buscar matérias:', error)
    return []
  }

  return data || []
}

export async function createMateria(nome: string, descricao?: string): Promise<Materia | null> {
  const { data, error } = await supabase
    .from('materias')
    .insert([{ nome, descricao }])
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar matéria:', error)
    return null
  }

  return data
}

export async function getMateriasComEstatisticas() {
  try {
    console.time('⏱️ getMateriasComEstatisticas')
    
    // 1. Buscar matérias com contagem de questões (1 query)
    const { data: materias, error: materiasError } = await supabase
      .from('materias')
      .select(`
        *,
        questoes:questoes(count)
      `)
      .order('nome')

    if (materiasError) {
      console.error('Erro ao buscar matérias:', materiasError)
      return []
    }

    // 2. Pegar usuário atual UMA VEZ SÓ
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Se não há usuário, retornar só com contagem de questões
      console.timeEnd('⏱️ getMateriasComEstatisticas')
      return (materias || []).map(materia => ({
        ...materia,
        questoes_count: materia.questoes?.[0]?.count || 0,
        percentual_acertos: 0,
        total_respostas: 0
      }))
    }

    // 3. Buscar TODO o histórico do usuário de UMA VEZ (1 query)
    const { data: historico, error: historicoError } = await supabase
      .from('historico_estudos')
      .select(`
        acertou,
        questoes!inner(materia_id)
      `)
      .eq('usuario_id', user.id)

    if (historicoError) {
      console.error('Erro ao buscar histórico:', historicoError)
    }

    // 4. Processar estatísticas em memória (0 queries)
    const estatisticasPorMateria = new Map()

    if (historico) {
      historico.forEach((h: any) => {
        // h.questoes é um objeto, não array, devido ao inner join
        const materiaId = h.questoes?.materia_id
        if (materiaId) {
          if (!estatisticasPorMateria.has(materiaId)) {
            estatisticasPorMateria.set(materiaId, { total: 0, acertos: 0 })
          }
          const stats = estatisticasPorMateria.get(materiaId)
          stats.total++
          if (h.acertou) stats.acertos++
        }
      })
    }

    // 5. Combinar dados (0 queries)
    const materiasComStats = (materias || []).map(materia => {
      const stats = estatisticasPorMateria.get(materia.id) || { total: 0, acertos: 0 }
      const percentualAcertos = stats.total > 0 ? Math.round((stats.acertos / stats.total) * 100) : 0

      return {
        ...materia,
        questoes_count: materia.questoes?.[0]?.count || 0,
        percentual_acertos: percentualAcertos,
        total_respostas: stats.total
      }
    })

    console.timeEnd('⏱️ getMateriasComEstatisticas')
    console.log('✅ Matérias carregadas:', materiasComStats.length, 'em', performance.now())
    return materiasComStats

  } catch (error) {
    console.error('Erro inesperado ao carregar matérias:', error)
    return []
  }
}

export async function updateMateria(id: string, nome: string, descricao?: string): Promise<boolean> {
  const { error } = await supabase
    .from('materias')
    .update({ nome, descricao })
    .eq('id', id)

  if (error) {
    console.error('Erro ao atualizar matéria:', error)
    return false
  }

  return true
}

export async function deleteMateria(id: string): Promise<boolean> {
  try {
    // Primeiro, verificar se há questões vinculadas
    const { data: questoes, error: questoesError } = await supabase
      .from('questoes')
      .select('id')
      .eq('materia_id', id)
      .limit(1)

    if (questoesError) {
      console.error('Erro ao verificar questões:', questoesError)
      return false
    }

    if (questoes && questoes.length > 0) {
      throw new Error('Não é possível excluir uma matéria que possui questões cadastradas.')
    }

    // Se não há questões, pode excluir
    const { error } = await supabase
      .from('materias')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao excluir matéria:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro ao excluir matéria:', error)
    throw error
  }
}