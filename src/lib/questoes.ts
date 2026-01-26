import { supabase } from './supabase'
import { Questao, Alternativa } from '@/types/database'

// Interface específica para alternativas do banco
interface AlternativaBanco {
  id: string
  questao_id: string
  texto: string
  correta: boolean
}

// Interface para questão completa do banco
interface QuestaoCompleta {
  id: string
  materia_id: string
  enunciado: string
  tipo: 'certo_errado' | 'multipla_escolha'
  explicacao?: string
  created_at: string
  alternativas?: AlternativaBanco[]
}

export async function getQuestoesByMateria(materiaId: string) {
  const { data, error } = await supabase
    .from('questoes')
    .select(`
      *,
      alternativas(*),
      materia:materias(nome)
    `)
    .eq('materia_id', materiaId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar questões:', error)
    return []
  }

  return data || []
}

export async function createQuestao(questaoData: {
  materia_id: string
  enunciado: string
  tipo: 'certo_errado' | 'multipla_escolha'
  explicacao?: string
  alternativas?: { texto: string; correta: boolean }[]
}) {
  // Criar a questão
  const { data: questao, error: questaoError } = await supabase
    .from('questoes')
    .insert([{
      materia_id: questaoData.materia_id,
      enunciado: questaoData.enunciado,
      tipo: questaoData.tipo,
      explicacao: questaoData.explicacao
    }])
    .select()
    .single()

  if (questaoError) {
    console.error('Erro ao criar questão:', questaoError)
    return null
  }

  // Se for múltipla escolha, criar as alternativas
  if (questaoData.tipo === 'multipla_escolha' && questaoData.alternativas) {
    const alternativasData = questaoData.alternativas.map(alt => ({
      questao_id: questao.id,
      texto: alt.texto,
      correta: alt.correta
    }))

    const { error: alternativasError } = await supabase
      .from('alternativas')
      .insert(alternativasData)

    if (alternativasError) {
      console.error('Erro ao criar alternativas:', alternativasError)
      // Deletar a questão se não conseguir criar as alternativas
      await supabase.from('questoes').delete().eq('id', questao.id)
      return null
    }
  }

  return questao
}

export async function getQuestaoComAlternativas(questaoId: string): Promise<QuestaoCompleta | null> {
  const { data, error } = await supabase
    .from('questoes')
    .select(`
      *,
      alternativas(*),
      materia:materias(nome)
    `)
    .eq('id', questaoId)
    .single()

  if (error) {
    console.error('Erro ao buscar questão:', error)
    return null
  }

  return data as QuestaoCompleta
}

export async function updateQuestao(questaoId: string, questaoData: {
  enunciado: string
  tipo: 'certo_errado' | 'multipla_escolha'
  explicacao?: string
  alternativas?: { id?: string; texto: string; correta: boolean }[]
}) {
  try {
    // Atualizar a questão
    const { data: questao, error: questaoError } = await supabase
      .from('questoes')
      .update({
        enunciado: questaoData.enunciado,
        tipo: questaoData.tipo,
        explicacao: questaoData.explicacao
      })
      .eq('id', questaoId)
      .select()
      .single()

    if (questaoError) {
      console.error('Erro ao atualizar questão:', questaoError)
      return null
    }

    // Se for múltipla escolha, atualizar alternativas
    if (questaoData.tipo === 'multipla_escolha' && questaoData.alternativas) {
      // Deletar alternativas existentes
      await supabase
        .from('alternativas')
        .delete()
        .eq('questao_id', questaoId)

      // Inserir novas alternativas
      const alternativasData = questaoData.alternativas.map(alt => ({
        questao_id: questaoId,
        texto: alt.texto,
        correta: alt.correta
      }))

      const { error: alternativasError } = await supabase
        .from('alternativas')
        .insert(alternativasData)

      if (alternativasError) {
        console.error('Erro ao atualizar alternativas:', alternativasError)
        return null
      }
    } else if (questaoData.tipo === 'certo_errado') {
      // Se mudou para certo/errado, deletar alternativas
      await supabase
        .from('alternativas')
        .delete()
        .eq('questao_id', questaoId)
    }

    return questao
  } catch (error) {
    console.error('Erro inesperado ao atualizar questão:', error)
    return null
  }
}

export async function deleteQuestao(questaoId: string) {
  try {
    // Deletar alternativas primeiro (cascade deve fazer isso automaticamente, mas vamos garantir)
    await supabase
      .from('alternativas')
      .delete()
      .eq('questao_id', questaoId)

    // Deletar histórico de estudos
    await supabase
      .from('historico_estudos')
      .delete()
      .eq('questao_id', questaoId)

    // Deletar a questão
    const { error } = await supabase
      .from('questoes')
      .delete()
      .eq('id', questaoId)

    if (error) {
      console.error('Erro ao deletar questão:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro inesperado ao deletar questão:', error)
    return false
  }
}

export async function duplicateQuestao(questaoId: string) {
  try {
    // Buscar a questão original
    const questaoOriginal = await getQuestaoComAlternativas(questaoId)
    
    if (!questaoOriginal) {
      return null
    }

    // Criar nova questão com tipos corretos
    const novaQuestao = await createQuestao({
      materia_id: questaoOriginal.materia_id,
      enunciado: questaoOriginal.enunciado + ' (Cópia)',
      tipo: questaoOriginal.tipo,
      explicacao: questaoOriginal.explicacao,
      alternativas: questaoOriginal.alternativas?.map((alt: AlternativaBanco) => ({
        texto: alt.texto,
        correta: alt.correta
      }))
    })

    return novaQuestao
  } catch (error) {
    console.error('Erro ao duplicar questão:', error)
    return null
  }
}

// Função para buscar a resposta correta para questões certo/errado
export async function getRespostaCorretaCertoErrado(questaoId: string): Promise<boolean | null> {
  const { data, error } = await supabase
    .from('questoes')
    .select('resposta_certo_errado, explicacao')
    .eq('id', questaoId)
    .single()

  if (error || !data) return null

  // Se tem resposta definida no campo específico, usar ela
  if (data.resposta_certo_errado !== null) {
    return data.resposta_certo_errado
  }

  // Fallback: tentar detectar pela explicação (para questões antigas)
  const explicacao = data.explicacao?.toLowerCase() || ''
  
  if (explicacao.includes('correto') || explicacao.includes('certo') || explicacao.includes('verdadeiro')) {
    return true
  } else if (explicacao.includes('incorreto') || explicacao.includes('errado') || explicacao.includes('falso')) {
    return false
  }

  // Se não conseguir detectar, retornar null
  return null
}