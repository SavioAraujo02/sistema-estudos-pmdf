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
  assunto?: string
  subtopico?: string
  dificuldade?: 'facil' | 'medio' | 'dificil'
  ano_prova?: number
  banca?: string
}) {
  // Criar a questão
  const { data: questao, error: questaoError } = await supabase
  .from('questoes')
  .insert([{
    materia_id: questaoData.materia_id,
    enunciado: questaoData.enunciado,
    tipo: questaoData.tipo,
    explicacao: questaoData.explicacao,
    assunto: questaoData.assunto,
    subtopico: questaoData.subtopico,
    dificuldade: questaoData.dificuldade,
    ano_prova: questaoData.ano_prova,
    banca: questaoData.banca
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

// ==================== FUNÇÕES DE COMENTÁRIOS ====================

export async function getComentarios(questaoId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('comentarios')
      .select(`
        *,
        usuario:usuarios(nome, email),
        comentario_likes(tipo, usuario_id)
      `)
      .eq('questao_id', questaoId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar comentários:', error)
      return []
    }

    // Processar likes/dislikes
    const comentariosProcessados = (data || []).map(comentario => {
      const likes = comentario.comentario_likes?.filter((like: any) => like.tipo === 'like').length || 0
      const dislikes = comentario.comentario_likes?.filter((like: any) => like.tipo === 'dislike').length || 0
      const userLike = user ? comentario.comentario_likes?.find((like: any) => like.usuario_id === user.id)?.tipo : null
      
      return {
        ...comentario,
        likes_count: likes,
        dislikes_count: dislikes,
        score: likes - dislikes,
        user_like: userLike || null
      }
    })

    // Ordenar por score (mais curtidos primeiro)
    return comentariosProcessados.sort((a, b) => b.score - a.score)
  } catch (error) {
    console.error('Erro inesperado ao buscar comentários:', error)
    return []
  }
}

export async function criarComentario(questaoId: string, texto: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { data, error } = await supabase
      .from('comentarios')
      .insert({
        questao_id: questaoId,
        usuario_id: user.id,
        texto: texto
      })
      .select(`
        *,
        usuario:usuarios(nome, email)
      `)
      .single()

    if (error) {
      console.error('Erro ao criar comentário:', error)
      return null
    }

    return {
      ...data,
      likes_count: 0,
      dislikes_count: 0,
      score: 0,
      user_like: null
    }
  } catch (error) {
    console.error('Erro inesperado ao criar comentário:', error)
    return null
  }
}

export async function curtirComentario(comentarioId: string, tipo: 'like' | 'dislike') {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    // Verificar se já curtiu/descurtiu
    const { data: existente } = await supabase
      .from('comentario_likes')
      .select('*')
      .eq('comentario_id', comentarioId)
      .eq('usuario_id', user.id)
      .single()

    if (existente) {
      if (existente.tipo === tipo) {
        // Se já curtiu/descurtiu, remover
        const { error } = await supabase
          .from('comentario_likes')
          .delete()
          .eq('id', existente.id)
        
        return !error
      } else {
        // Se curtiu e agora quer descurtir (ou vice-versa), atualizar
        const { error } = await supabase
          .from('comentario_likes')
          .update({ tipo })
          .eq('id', existente.id)
        
        return !error
      }
    } else {
      // Criar novo like/dislike
      const { error } = await supabase
        .from('comentario_likes')
        .insert({
          comentario_id: comentarioId,
          usuario_id: user.id,
          tipo
        })
      
      return !error
    }
  } catch (error) {
    console.error('Erro ao curtir comentário:', error)
    return false
  }
}

// ==================== NOVAS FUNÇÕES DE EDIÇÃO/EXCLUSÃO ====================

// Editar comentário próprio
export async function editarComentario(comentarioId: string, novoTexto: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    // Verificar se o comentário pertence ao usuário
    const { data: comentario, error: verificarError } = await supabase
      .from('comentarios')
      .select('usuario_id')
      .eq('id', comentarioId)
      .single()

    if (verificarError || !comentario) {
      throw new Error('Comentário não encontrado')
    }

    if (comentario.usuario_id !== user.id) {
      throw new Error('Você só pode editar seus próprios comentários')
    }

    // Atualizar o comentário
    const { data, error } = await supabase
      .from('comentarios')
      .update({ 
        texto: novoTexto,
        editado_em: new Date().toISOString()
      })
      .eq('id', comentarioId)
      .select(`
        *,
        usuario:usuarios(nome, email)
      `)
      .single()

    if (error) {
      console.error('Erro ao editar comentário:', error)
      return null
    }

    return {
      ...data,
      likes_count: 0,
      dislikes_count: 0,
      score: 0,
      user_like: null
    }
  } catch (error) {
    console.error('Erro inesperado ao editar comentário:', error)
    throw error
  }
}

// Excluir comentário próprio
export async function excluirComentario(comentarioId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    // Verificar se o comentário pertence ao usuário
    const { data: comentario, error: verificarError } = await supabase
      .from('comentarios')
      .select('usuario_id')
      .eq('id', comentarioId)
      .single()

    if (verificarError || !comentario) {
      throw new Error('Comentário não encontrado')
    }

    if (comentario.usuario_id !== user.id) {
      throw new Error('Você só pode excluir seus próprios comentários')
    }

    // Excluir likes/dislikes do comentário primeiro
    await supabase
      .from('comentario_likes')
      .delete()
      .eq('comentario_id', comentarioId)

    // Excluir o comentário
    const { error } = await supabase
      .from('comentarios')
      .delete()
      .eq('id', comentarioId)

    if (error) {
      console.error('Erro ao excluir comentário:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro inesperado ao excluir comentário:', error)
    throw error
  }
}

// Verificar se comentário pertence ao usuário
export async function comentarioPertenceAoUsuario(comentarioId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await supabase
      .from('comentarios')
      .select('usuario_id')
      .eq('id', comentarioId)
      .single()

    if (error || !data) return false

    return data.usuario_id === user.id
  } catch (error) {
    console.error('Erro ao verificar propriedade do comentário:', error)
    return false
  }
}

// ==================== FUNÇÕES DE REPORTS ====================

export async function criarReport(questaoId: string, tipo: string, descricao: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { data, error } = await supabase
      .from('questao_reports')
      .insert({
        questao_id: questaoId,
        usuario_id: user.id,
        tipo,
        descricao
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar report:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Erro inesperado ao criar report:', error)
    return null
  }
}

export async function getReports(questaoId?: string) {
  try {
    let query = supabase
      .from('questao_reports')
      .select(`
        *,
        usuario:usuarios(nome, email),
        questao:questoes(enunciado)
      `)
      .order('created_at', { ascending: false })

    if (questaoId) {
      query = query.eq('questao_id', questaoId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar reports:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Erro inesperado ao buscar reports:', error)
    return []
  }
}

// ==================== FUNÇÕES DE ELIMINAÇÃO DE ALTERNATIVAS ====================

export async function eliminarAlternativa(questaoId: string, alternativaId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { data, error } = await supabase
      .from('alternativas_eliminadas')
      .insert({
        questao_id: questaoId,
        usuario_id: user.id,
        alternativa_id: alternativaId
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao eliminar alternativa:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro inesperado ao eliminar alternativa:', error)
    return false
  }
}

export async function restaurarAlternativa(questaoId: string, alternativaId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { error } = await supabase
      .from('alternativas_eliminadas')
      .delete()
      .eq('questao_id', questaoId)
      .eq('usuario_id', user.id)
      .eq('alternativa_id', alternativaId)

    if (error) {
      console.error('Erro ao restaurar alternativa:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro inesperado ao restaurar alternativa:', error)
    return false
  }
}

export async function getAlternativasEliminadas(questaoId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from('alternativas_eliminadas')
      .select('alternativa_id')
      .eq('questao_id', questaoId)
      .eq('usuario_id', user.id)

    if (error) {
      console.error('Erro ao buscar alternativas eliminadas:', error)
      return []
    }

    return (data || []).map(item => item.alternativa_id)
  } catch (error) {
    console.error('Erro inesperado ao buscar alternativas eliminadas:', error)
    return []
  }
}

export async function limparAlternativasEliminadas(questaoId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { error } = await supabase
      .from('alternativas_eliminadas')
      .delete()
      .eq('questao_id', questaoId)
      .eq('usuario_id', user.id)

    if (error) {
      console.error('Erro ao limpar alternativas eliminadas:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro inesperado ao limpar alternativas eliminadas:', error)
    return false
  }
}