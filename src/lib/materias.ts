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
    
    // 1. Buscar matérias básicas
    const { data: materias, error: materiasError } = await supabase
      .from('materias')
      .select('*')
      .order('nome')

    if (materiasError) {
      console.error('Erro ao buscar matérias:', materiasError)
      return []
    }

    // 2. Buscar TODAS as questões usando count
    const { count: totalQuestoes } = await supabase
      .from('questoes')
      .select('*', { count: 'exact', head: true })

    const { count: questoesCertoErrado } = await supabase
      .from('questoes')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'certo_errado')

    const { count: questoesMultipla } = await supabase
      .from('questoes')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'multipla_escolha')

    console.log('📊 CONTAGENS REAIS:')
    console.log('- Total questões:', totalQuestoes)
    console.log('- Certo/Errado:', questoesCertoErrado)
    console.log('- Múltipla Escolha:', questoesMultipla)

    // 3. Para cada matéria, contar suas questões
    const materiasComStats = await Promise.all(
      (materias || []).map(async (materia) => {
        // Contar questões desta matéria
        const { count: questoesMateria } = await supabase
          .from('questoes')
          .select('*', { count: 'exact', head: true })
          .eq('materia_id', materia.id)

        const { count: certoErradoMateria } = await supabase
          .from('questoes')
          .select('*', { count: 'exact', head: true })
          .eq('materia_id', materia.id)
          .eq('tipo', 'certo_errado')

        const { count: multiplaMateria } = await supabase
          .from('questoes')
          .select('*', { count: 'exact', head: true })
          .eq('materia_id', materia.id)
          .eq('tipo', 'multipla_escolha')

        return {
          ...materia,
          questoes_count: questoesMateria || 0,
          questoes_certo_errado: certoErradoMateria || 0,
          questoes_multipla_escolha: multiplaMateria || 0,
          percentual_acertos: 0,
          total_respostas: 0
        }
      })
    )

    console.timeEnd('⏱️ getMateriasComEstatisticas')
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

export async function getAssuntosByMateria(materiaId: string) {
  try {
    const { data, error } = await supabase
      .from('assuntos')
      .select('*')
      .eq('materia_id', materiaId)
      .eq('ativo', true)
      .order('ordem', { ascending: true })

    if (error) {
      console.error('Erro ao buscar assuntos:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Erro inesperado ao buscar assuntos:', error)
    return []
  }
}