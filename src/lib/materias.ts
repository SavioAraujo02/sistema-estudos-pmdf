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
  // Buscar matérias com contagem de questões
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

  // Para cada matéria, calcular estatísticas de acertos
  const materiasComStats = await Promise.all(
    (materias || []).map(async (materia) => {
      // Buscar histórico de estudos para esta matéria
      const { data: historico } = await supabase
        .from('historico_estudos')
        .select(`
          acertou,
          questoes!inner(materia_id)
        `)
        .eq('questoes.materia_id', materia.id)

      const totalRespostas = historico?.length || 0
      const acertos = historico?.filter(h => h.acertou).length || 0
      const percentualAcertos = totalRespostas > 0 ? Math.round((acertos / totalRespostas) * 100) : 0

      return {
        ...materia,
        questoes_count: materia.questoes?.[0]?.count || 0,
        percentual_acertos: percentualAcertos,
        total_respostas: totalRespostas
      }
    })
  )

  return materiasComStats
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