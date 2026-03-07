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
    
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Buscar matérias básicas
    const { data: materias, error: materiasError } = await supabase
      .from('materias')
      .select('*')
      .order('nome')

    if (materiasError) {
      console.error('Erro ao buscar matérias:', materiasError)
      return []
    }

    // 2. Buscar TODAS as questões (Supabase limita a 1000 por padrão)
    const BATCH = 1000
    let todasQuestoes: any[] = []
    let offset = 0
    while (true) {
      const { data, error } = await supabase
        .from('questoes')
        .select('id, materia_id, tipo')
        .range(offset, offset + BATCH - 1)
      
      if (error || !data || data.length === 0) break
      todasQuestoes = [...todasQuestoes, ...data]
      if (data.length < BATCH) break
      offset += BATCH
    }

    // 3. Buscar histórico de respostas do usuário (SE logado)
    let historico: any[] = []
    if (user) {
      let hOffset = 0
      while (true) {
        const { data, error } = await supabase
          .from('historico_estudos')
          .select(`
            acertou,
            questoes!inner(materia_id)
          `)
          .eq('usuario_id', user.id)
          .range(hOffset, hOffset + BATCH - 1)
        
        if (error || !data || data.length === 0) break
        historico = [...historico, ...data]
        if (data.length < BATCH) break
        hOffset += BATCH
      }
    }

    // 4. Montar estatísticas por matéria
    const materiasComStats = (materias || []).map((materia) => {
      // Contagens de questões
      const questoesMateria = todasQuestoes.filter(q => q.materia_id === materia.id)
      const questoesCount = questoesMateria.length
      const certoErrado = questoesMateria.filter(q => q.tipo === 'certo_errado').length
      const multipla = questoesMateria.filter(q => q.tipo === 'multipla_escolha').length

      // Respostas do usuário nesta matéria
      const respostasMateria = historico.filter(
        (h: any) => h.questoes?.materia_id === materia.id
      )
      const totalRespostas = respostasMateria.length
      const acertos = respostasMateria.filter((h: any) => h.acertou).length
      const percentualAcertos = totalRespostas > 0 
        ? Math.round((acertos / totalRespostas) * 100) 
        : 0

      return {
        ...materia,
        questoes_count: questoesCount,
        questoes_certo_errado: certoErrado,
        questoes_multipla_escolha: multipla,
        total_respostas: totalRespostas,
        percentual_acertos: percentualAcertos
      }
    })

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