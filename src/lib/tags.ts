import { supabase } from './supabase'

export interface Tag {
  id: string
  nome: string
  cor: string
  created_at: string
  questoes_count?: number
}

export interface QuestaoTag {
  questao_id: string
  tag_id: string
}

// Buscar todas as tags
export async function getTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('nome')

  if (error) {
    console.error('Erro ao buscar tags:', error)
    return []
  }

  return data || []
}

// Buscar tags com contagem de questões
export async function getTagsComContagem(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select(`
      *,
      questoes_tags(count)
    `)
    .order('nome')

  if (error) {
    console.error('Erro ao buscar tags:', error)
    return []
  }

  return (data || []).map(tag => ({
    ...tag,
    questoes_count: tag.questoes_tags?.[0]?.count || 0
  }))
}

// Criar nova tag
export async function createTag(nome: string, cor: string = '#3B82F6'): Promise<Tag | null> {
  const { data, error } = await supabase
    .from('tags')
    .insert([{ nome, cor }])
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar tag:', error)
    return null
  }

  return data
}

// Atualizar tag
export async function updateTag(id: string, nome: string, cor: string): Promise<boolean> {
  const { error } = await supabase
    .from('tags')
    .update({ nome, cor })
    .eq('id', id)

  if (error) {
    console.error('Erro ao atualizar tag:', error)
    return false
  }

  return true
}

// Excluir tag
export async function deleteTag(id: string): Promise<boolean> {
  try {
    // Primeiro, remover associações com questões
    await supabase
      .from('questoes_tags')
      .delete()
      .eq('tag_id', id)

    // Depois, excluir a tag
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao excluir tag:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro ao excluir tag:', error)
    return false
  }
}

// Buscar tags de uma questão (mantendo compatibilidade)
export async function getTagsByQuestao(questaoId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('questoes_tags')
    .select(`
      tags (
        id,
        nome,
        cor,
        created_at
      )
    `)
    .eq('questao_id', questaoId)

  if (error) {
    console.error('Erro ao buscar tags da questão:', error)
    return []
  }

  return data?.map((item: any) => item.tags as Tag).filter((tag: Tag) => tag !== null) || []
}

// Buscar tags de uma questão (nova versão)
export async function getTagsQuestao(questaoId: string): Promise<Tag[]> {
  return getTagsByQuestao(questaoId)
}

// Adicionar tag a questão (mantendo compatibilidade)
export async function addTagToQuestao(questaoId: string, tagId: string): Promise<boolean> {
  const { error } = await supabase
    .from('questoes_tags')
    .insert([{ questao_id: questaoId, tag_id: tagId }])

  if (error) {
    console.error('Erro ao adicionar tag à questão:', error)
    return false
  }

  return true
}

// Remover tag de questão (mantendo compatibilidade)
export async function removeTagFromQuestao(questaoId: string, tagId: string): Promise<boolean> {
  const { error } = await supabase
    .from('questoes_tags')
    .delete()
    .eq('questao_id', questaoId)
    .eq('tag_id', tagId)

  if (error) {
    console.error('Erro ao remover tag da questão:', error)
    return false
  }

  return true
}

// Atualizar tags de questão (mantendo compatibilidade)
export async function updateQuestaoTags(questaoId: string, tagIds: string[]): Promise<boolean> {
  return associarTagsQuestao(questaoId, tagIds)
}

// Associar tags a uma questão (nova versão melhorada)
export async function associarTagsQuestao(questaoId: string, tagIds: string[]): Promise<boolean> {
  try {
    // Primeiro, remover associações existentes
    await supabase
      .from('questoes_tags')
      .delete()
      .eq('questao_id', questaoId)

    // Depois, adicionar novas associações
    if (tagIds.length > 0) {
      const associacoes = tagIds.map(tagId => ({
        questao_id: questaoId,
        tag_id: tagId
      }))

      const { error } = await supabase
        .from('questoes_tags')
        .insert(associacoes)

      if (error) {
        console.error('Erro ao associar tags:', error)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Erro ao associar tags:', error)
    return false
  }
}

// Buscar questões por tags
export async function getQuestoesPorTags(tagIds: string[]): Promise<string[]> {
  if (tagIds.length === 0) return []

  const { data, error } = await supabase
    .from('questoes_tags')
    .select('questao_id')
    .in('tag_id', tagIds)

  if (error) {
    console.error('Erro ao buscar questões por tags:', error)
    return []
  }

  // Retornar IDs únicos das questões
  const questaoIds = [...new Set((data || []).map(item => item.questao_id))]
  return questaoIds
}

// Estatísticas por tag
export async function getEstatisticasPorTag(tagId: string) {
  const { data, error } = await supabase
    .from('historico_estudos')
    .select(`
      acertou,
      questoes!inner(
        questoes_tags!inner(tag_id)
      )
    `)
    .eq('questoes.questoes_tags.tag_id', tagId)

  if (error) {
    console.error('Erro ao buscar estatísticas da tag:', error)
    return {
      totalRespostas: 0,
      acertos: 0,
      percentualAcertos: 0
    }
  }

  const totalRespostas = data?.length || 0
  const acertos = data?.filter(r => r.acertou).length || 0
  const percentualAcertos = totalRespostas > 0 ? Math.round((acertos / totalRespostas) * 100) : 0

  return {
    totalRespostas,
    acertos,
    percentualAcertos
  }
}

// Cores predefinidas para tags
export const CORES_TAGS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#F97316', // orange
  '#EC4899', // pink
  '#6B7280', // gray
  '#14B8A6', // teal
  '#A855F7', // purple
]

// Tags sugeridas para PMDF
export const TAGS_SUGERIDAS_PMDF = [
  { nome: 'Direito Constitucional', cor: '#3B82F6' },
  { nome: 'Direito Penal', cor: '#EF4444' },
  { nome: 'Direito Processual Penal', cor: '#DC2626' },
  { nome: 'Direito Administrativo', cor: '#059669' },
  { nome: 'Português', cor: '#7C3AED' },
  { nome: 'Legislação PMDF', cor: '#D97706' },
  { nome: 'Ética Policial', cor: '#0891B2' },
  { nome: 'Direitos Humanos', cor: '#BE185D' },
  { nome: 'Criminologia', cor: '#7C2D12' },
  { nome: 'Conhecimentos Gerais', cor: '#374151' },
  { nome: 'Estatuto da PMDF', cor: '#1E40AF' },
  { nome: 'Código de Ética', cor: '#166534' },
]

// Função para criar tags sugeridas (usar apenas uma vez)
export async function criarTagsSugeridas(): Promise<void> {
  console.log('Criando tags sugeridas para PMDF...')
  
  for (const tagSugerida of TAGS_SUGERIDAS_PMDF) {
    // Verificar se já existe
    const { data: existente } = await supabase
      .from('tags')
      .select('id')
      .eq('nome', tagSugerida.nome)
      .single()

    if (!existente) {
      await createTag(tagSugerida.nome, tagSugerida.cor)
      console.log(`Tag criada: ${tagSugerida.nome}`)
    }
  }
  
  console.log('Tags sugeridas criadas com sucesso!')
}