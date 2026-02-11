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

// Buscar notificações do usuário
export async function getNotificacoes(limite: number = 20): Promise<Notificacao[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('notificacoes')
      .select(`
        *,
        usuario_origem:usuarios!notificacoes_usuario_origem_id_fkey(nome, email)
      `)
      .eq('usuario_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limite)

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

// Marcar todas como lidas
export async function marcarTodasComoLidas(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
      .from('notificacoes')
      .update({ 
        lida: true,
        data_leitura: new Date().toISOString()
      })
      .eq('usuario_id', user.id)
      .eq('lida', false)

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

// Contar notificações não lidas
export async function contarNaoLidas(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    const { count, error } = await supabase
      .from('notificacoes')
      .select('id', { count: 'exact' })
      .eq('usuario_id', user.id)
      .eq('lida', false)

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

// ==================== FUNÇÕES PARA CRIAR NOTIFICAÇÕES ====================

// Notificar sobre nova questão
export async function notificarNovaQuestao(materiaId: string, questaoId: string, autorId: string) {
  try {
    console.log('🔔 Iniciando notificação de nova questão:', { materiaId, questaoId, autorId })
    
    // Buscar todos os usuários ativos (INCLUINDO o autor)
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('id, nome, email')
      .eq('status', 'ativo')
      // REMOVIDO: .neq('id', autorId) - agora inclui o autor

    console.log('👥 Usuários encontrados:', usuarios?.length || 0)

    if (usuariosError || !usuarios) {
      console.error('❌ Erro ao buscar usuários para notificação:', usuariosError)
      return
    }

    if (usuarios.length === 0) {
      console.log('⚠️ Nenhum usuário ativo encontrado')
      return
    }

    // Buscar nome da matéria
    const { data: materia } = await supabase
      .from('materias')
      .select('nome')
      .eq('id', materiaId)
      .single()

    const notificacoes = usuarios.map(usuario => ({
      usuario_id: usuario.id,
      tipo: 'nova_questao',
      titulo: usuario.id === autorId ? 'Questão criada com sucesso!' : 'Nova questão disponível!',
      mensagem: usuario.id === autorId 
        ? `Você criou uma nova questão em ${materia?.nome || 'uma matéria'}`
        : `Uma nova questão foi adicionada em ${materia?.nome || 'uma matéria'}`,
      questao_id: questaoId,
      usuario_origem_id: autorId,
      dados_extras: { materia_id: materiaId }
    }))

    const { error } = await supabase
      .from('notificacoes')
      .insert(notificacoes)

    if (error) {
      console.error('❌ Erro ao criar notificações de nova questão:', error)
    } else {
      console.log('✅ Notificações de nova questão enviadas:', notificacoes.length)
    }
  } catch (error) {
    console.error('💥 Erro inesperado ao notificar nova questão:', error)
  }
}

// Notificar sobre nova matéria
export async function notificarNovaMateria(materiaId: string, autorId: string) {
  try {
    // Buscar todos os usuários ativos (exceto o autor)
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('status', 'ativo')
      .neq('id', autorId)

    if (usuariosError || !usuarios) return

    // Buscar nome da matéria
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
    console.log('✅ Notificações de nova matéria enviadas:', notificacoes.length)
  } catch (error) {
    console.error('Erro ao notificar nova matéria:', error)
  }
}

// Notificar sobre novo comentário
export async function notificarNovoComentario(questaoId: string, comentarioId: string, autorId: string) {
  try {
    // Buscar usuários que já comentaram nesta questão (exceto o autor do novo comentário)
    const { data: comentariosAnteriores } = await supabase
      .from('comentarios')
      .select('usuario_id')
      .eq('questao_id', questaoId)
      .neq('usuario_id', autorId)

    if (!comentariosAnteriores) return

    // Pegar IDs únicos
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
    console.log('✅ Notificações de novo comentário enviadas:', notificacoes.length)
  } catch (error) {
    console.error('Erro ao notificar novo comentário:', error)
  }
}

// Notificar sobre curtida no comentário
export async function notificarCurtidaComentario(comentarioId: string, autorCurtidaId: string) {
  try {
    // Buscar o autor do comentário
    const { data: comentario } = await supabase
      .from('comentarios')
      .select('usuario_id, questao_id')
      .eq('id', comentarioId)
      .single()

    if (!comentario || comentario.usuario_id === autorCurtidaId) return

    // Verificar se já existe notificação similar recente (últimas 24h)
    const ontemMs = Date.now() - (24 * 60 * 60 * 1000)
    const { data: notificacaoExistente } = await supabase
      .from('notificacoes')
      .select('id')
      .eq('usuario_id', comentario.usuario_id)
      .eq('tipo', 'curtida_comentario')
      .eq('comentario_id', comentarioId)
      .gte('created_at', new Date(ontemMs).toISOString())
      .single()

    if (notificacaoExistente) return // Não spam de notificações

    const notificacao = {
      usuario_id: comentario.usuario_id,
      tipo: 'curtida_comentario',
      titulo: 'Seu comentário foi curtido!',
      mensagem: 'Alguém curtiu seu comentário em uma questão',
      questao_id: comentario.questao_id,
      comentario_id: comentarioId,
      usuario_origem_id: autorCurtidaId
    }

    await supabase.from('notificacoes').insert([notificacao])
    console.log('✅ Notificação de curtida enviada')
  } catch (error) {
    console.error('Erro ao notificar curtida:', error)
  }
}

// Notificar sobre importação em lote
export async function notificarImportacaoLote(materiaId: string, quantidadeQuestoes: number, autorId: string) {
  try {
    if (quantidadeQuestoes < 5) return // Só notificar importações grandes

    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('id')
      .eq('status', 'ativo')
      .neq('id', autorId)

    if (!usuarios) return

    const { data: materia } = await supabase
      .from('materias')
      .select('nome')
      .eq('id', materiaId)
      .single()

    const notificacoes = usuarios.map(usuario => ({
      usuario_id: usuario.id,
      tipo: 'importacao_lote',
      titulo: 'Muitas questões novas!',
      mensagem: `${quantidadeQuestoes} questões foram adicionadas em ${materia?.nome}`,
      usuario_origem_id: autorId,
      dados_extras: { materia_id: materiaId, quantidade: quantidadeQuestoes }
    }))

    await supabase.from('notificacoes').insert(notificacoes)
    console.log('✅ Notificações de importação em lote enviadas:', notificacoes.length)
  } catch (error) {
    console.error('Erro ao notificar importação em lote:', error)
  }
}