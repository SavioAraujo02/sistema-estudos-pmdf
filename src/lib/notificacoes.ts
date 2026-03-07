import { supabase } from './supabase'

export interface Notificacao {
  id: string
  usuario_id: string
  tipo: string
  titulo: string
  mensagem: string
  lida: boolean
  data_leitura: string | null
  questao_id: string | null
  comentario_id: string | null
  usuario_origem_id: string | null
  dados_extras: any
  created_at: string
}

// ==================== TIPOS IGNORADOS ====================
// Esses tipos são filtrados da listagem e da contagem
const TIPOS_IGNORADOS = ['importacao_lote']

// ==================== FUNÇÕES DE LEITURA ====================

// Buscar notificações do usuário (filtrando ruído)
export async function getNotificacoes(limite: number = 20): Promise<Notificacao[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    let query = supabase
      .from('notificacoes')
      .select(`
        *,
        usuario_origem:usuarios!notificacoes_usuario_origem_id_fkey(nome, email)
      `)
      .eq('usuario_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limite)

    // Filtrar tipos ignorados
    for (const tipo of TIPOS_IGNORADOS) {
      query = query.neq('tipo', tipo)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar notificações:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Erro inesperado ao buscar notificações:', error)
    return []
  }
}

// Contar notificações não lidas (filtrando ruído)
export async function contarNaoLidas(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    let query = supabase
      .from('notificacoes')
      .select('id', { count: 'exact' })
      .eq('usuario_id', user.id)
      .eq('lida', false)

    // Filtrar tipos ignorados
    for (const tipo of TIPOS_IGNORADOS) {
      query = query.neq('tipo', tipo)
    }

    const { count, error } = await query

    if (error) {
      console.error('Erro ao contar não lidas:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('Erro inesperado ao contar não lidas:', error)
    return 0
  }
}

// ==================== FUNÇÕES DE AÇÃO ====================

// Marcar notificação como lida
export async function marcarComoLida(notificacaoId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notificacoes')
      .update({ 
        lida: true,
        data_leitura: new Date().toISOString()
      })
      .eq('id', notificacaoId)

    if (error) {
      console.error('Erro ao marcar notificação como lida:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro inesperado ao marcar como lida:', error)
    return false
  }
}

// Marcar todas como lidas (só as visíveis, ignora importacao_lote)
export async function marcarTodasComoLidas(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    let query = supabase
      .from('notificacoes')
      .update({ 
        lida: true,
        data_leitura: new Date().toISOString()
      })
      .eq('usuario_id', user.id)
      .eq('lida', false)

    // Só marca como lidas as que o usuário realmente vê
    for (const tipo of TIPOS_IGNORADOS) {
      query = query.neq('tipo', tipo)
    }

    const { error } = await query

    if (error) {
      console.error('Erro ao marcar todas como lidas:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro inesperado ao marcar todas como lidas:', error)
    return false
  }
}

// Excluir notificação
export async function excluirNotificacao(notificacaoId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notificacoes')
      .delete()
      .eq('id', notificacaoId)

    if (error) {
      console.error('Erro ao excluir notificação:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro inesperado ao excluir notificação:', error)
    return false
  }
}

// Excluir todas as notificações lidas do usuário (limpeza)
export async function excluirTodasLidas(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
      .from('notificacoes')
      .delete()
      .eq('usuario_id', user.id)
      .eq('lida', true)

    if (error) {
      console.error('Erro ao excluir notificações lidas:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro inesperado ao excluir lidas:', error)
    return false
  }
}

// ==================== FUNÇÕES PARA CRIAR NOTIFICAÇÕES ====================

// Notificar sobre nova questão — SÓ notifica admins (evita spam em massa)
export async function notificarNovaQuestao(materiaId: string, questaoId: string, autorId: string) {
  try {
    // Buscar nome da matéria
    const { data: materia } = await supabase
      .from('materias')
      .select('nome')
      .eq('id', materiaId)
      .single()

    // Notificar só o autor (confirmação) — não spama 78 usuários
    const notificacao = {
      usuario_id: autorId,
      tipo: 'nova_questao',
      titulo: 'Questão criada com sucesso!',
      mensagem: `Nova questão adicionada em ${materia?.nome || 'uma matéria'}`,
      questao_id: questaoId,
      usuario_origem_id: autorId,
      dados_extras: { materia_id: materiaId }
    }

    const { error } = await supabase
      .from('notificacoes')
      .insert([notificacao])

    if (error) {
      console.error('Erro ao criar notificação de nova questão:', error)
    }
  } catch (error) {
    console.error('Erro inesperado ao notificar nova questão:', error)
  }
}

// Notificar sobre nova matéria
export async function notificarNovaMateria(materiaId: string, autorId: string) {
  try {
    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('id')
      .eq('status', 'ativo')
      .neq('id', autorId)

    if (!usuarios || usuarios.length === 0) return

    const { data: materia } = await supabase
      .from('materias')
      .select('nome')
      .eq('id', materiaId)
      .single()

    const notificacoes = usuarios.map(usuario => ({
      usuario_id: usuario.id,
      tipo: 'nova_materia',
      titulo: 'Nova matéria disponível!',
      mensagem: `A matéria "${materia?.nome}" foi adicionada ao sistema`,
      usuario_origem_id: autorId,
      dados_extras: { materia_id: materiaId }
    }))

    await supabase.from('notificacoes').insert(notificacoes)
  } catch (error) {
    console.error('Erro ao notificar nova matéria:', error)
  }
}

// Notificar sobre novo comentário
export async function notificarNovoComentario(questaoId: string, comentarioId: string, autorId: string) {
  try {
    const { data: comentariosAnteriores } = await supabase
      .from('comentarios')
      .select('usuario_id')
      .eq('questao_id', questaoId)
      .neq('usuario_id', autorId)

    if (!comentariosAnteriores) return

    const usuariosParaNotificar = [...new Set(comentariosAnteriores.map(c => c.usuario_id))]
    if (usuariosParaNotificar.length === 0) return

    const notificacoes = usuariosParaNotificar.map(usuarioId => ({
      usuario_id: usuarioId,
      tipo: 'novo_comentario',
      titulo: 'Novo comentário na questão',
      mensagem: 'Alguém comentou em uma questão que você também comentou',
      questao_id: questaoId,
      comentario_id: comentarioId,
      usuario_origem_id: autorId
    }))

    await supabase.from('notificacoes').insert(notificacoes)
  } catch (error) {
    console.error('Erro ao notificar novo comentário:', error)
  }
}

// Notificar sobre curtida no comentário
export async function notificarCurtidaComentario(comentarioId: string, autorCurtidaId: string) {
  try {
    const { data: comentario } = await supabase
      .from('comentarios')
      .select('usuario_id, questao_id')
      .eq('id', comentarioId)
      .single()

    if (!comentario || comentario.usuario_id === autorCurtidaId) return

    // Evitar spam: não notifica se já notificou nas últimas 24h
    const ontemMs = Date.now() - (24 * 60 * 60 * 1000)
    const { data: notificacaoExistente } = await supabase
      .from('notificacoes')
      .select('id')
      .eq('usuario_id', comentario.usuario_id)
      .eq('tipo', 'curtida_comentario')
      .eq('comentario_id', comentarioId)
      .gte('created_at', new Date(ontemMs).toISOString())
      .single()

    if (notificacaoExistente) return

    await supabase.from('notificacoes').insert([{
      usuario_id: comentario.usuario_id,
      tipo: 'curtida_comentario',
      titulo: 'Seu comentário foi curtido!',
      mensagem: 'Alguém curtiu seu comentário em uma questão',
      questao_id: comentario.questao_id,
      comentario_id: comentarioId,
      usuario_origem_id: autorCurtidaId
    }])
  } catch (error) {
    console.error('Erro ao notificar curtida:', error)
  }
}

// Importação em lote — NÃO NOTIFICA MAIS (era spam)
// Mantida como no-op para não quebrar código que chama essa função
export async function notificarImportacaoLote(
  _materiaId: string, 
  _quantidadeQuestoes: number, 
  _autorId: string
) {
  // Desativada intencionalmente — notificações de importação em lote
  // eram ruído e poluíam o sino dos usuários.
  return
}