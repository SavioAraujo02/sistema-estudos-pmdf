import { supabase } from './supabase'

export interface Assunto {
  id: string
  materia_id: string
  nome: string
  descricao?: string
  cor: string
  ativo: boolean
  ordem: number
  created_at: string
  materia?: { nome: string }
}

export async function getAssuntos(): Promise<Assunto[]> {
  const { data, error } = await supabase
    .from('assuntos')
    .select(`
      *,
      materia:materias(nome)
    `)
    .eq('ativo', true)
    .order('ordem')

  if (error) {
    console.error('Erro ao buscar assuntos:', error)
    return []
  }

  return data || []
}

export async function getAssuntosPorMateria(materiaId: string): Promise<Assunto[]> {
  const { data, error } = await supabase
    .from('assuntos')
    .select('*')
    .eq('materia_id', materiaId)
    .eq('ativo', true)
    .order('ordem')

  if (error) {
    console.error('Erro ao buscar assuntos por matéria:', error)
    return []
  }

  return data || []
}

export async function createAssunto(assuntoData: {
  materia_id: string
  nome: string
  descricao?: string
  cor?: string
  ordem?: number
}): Promise<Assunto | null> {
  const { data, error } = await supabase
    .from('assuntos')
    .insert([{
      materia_id: assuntoData.materia_id,
      nome: assuntoData.nome,
      descricao: assuntoData.descricao,
      cor: assuntoData.cor || '#3B82F6',
      ordem: assuntoData.ordem || 0
    }])
    .select(`
      *,
      materia:materias(nome)
    `)
    .single()

  if (error) {
    console.error('Erro ao criar assunto:', error)
    return null
  }

  return data
}

export async function updateAssunto(
  id: string, 
  assuntoData: {
    nome: string
    descricao?: string
    cor?: string
    ordem?: number
    ativo?: boolean
  }
): Promise<boolean> {
  const { error } = await supabase
    .from('assuntos')
    .update(assuntoData)
    .eq('id', id)

  if (error) {
    console.error('Erro ao atualizar assunto:', error)
    return false
  }

  return true
}

export async function deleteAssunto(id: string): Promise<boolean> {
  try {
    // Verificar se há questões vinculadas
    const { data: questoes, error: questoesError } = await supabase
      .from('questoes')
      .select('id')
      .eq('assunto_id', id)
      .limit(1)

    if (questoesError) {
      console.error('Erro ao verificar questões:', questoesError)
      return false
    }

    if (questoes && questoes.length > 0) {
      throw new Error('Não é possível excluir um assunto que possui questões cadastradas.')
    }

    // Se não há questões, pode excluir
    const { error } = await supabase
      .from('assuntos')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao excluir assunto:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro ao excluir assunto:', error)
    throw error
  }
}

export async function getAssuntosComEstatisticas() {
  const { data: assuntos, error } = await supabase
    .from('assuntos')
    .select(`
      *,
      materia:materias(nome),
      questoes:questoes(count)
    `)
    .eq('ativo', true)
    .order('ordem')

  if (error) {
    console.error('Erro ao buscar assuntos com estatísticas:', error)
    return []
  }

  return (assuntos || []).map(assunto => ({
    ...assunto,
    questoes_count: assunto.questoes?.[0]?.count || 0
  }))
}