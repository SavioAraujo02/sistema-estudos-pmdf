import { supabase } from './supabase'

export interface Notificacao {
  id: string
  usuario_id: string
  tipo: 'comentario_questao' | 'like_comentario'
  titulo: string
  mensagem: string
  lida: boolean
  data_leitura?: string
  questao_id?: string
  comentario_id?: string
  usuario_origem_id: string
  dados_extras: any
  created_at: string
  usuario_origem?: { nome: string; email: string }
}

// Criar notificação
export async function criarNotificacao({
  usuarioId,
  tipo,
  titulo,
  mensagem,
  questaoId,
  comentarioId,
  usuarioOrigemId,
  dadosExtras = {}
}: {
  usuarioId: string
  tipo: Notificacao['tipo']
  titulo: string
  mensagem: string
  questaoId?: string
  comentarioId?: string
  usuarioOrigemId: string
  dadosExtras?: any
}) {
  try {
    // Não notificar o próprio usuário
    if (usuarioId === usuarioOrigemId) return null

    // Verificar se já existe notificação similar recente (evitar spam)
    const { data: existente } = await supabase
      .from('notificacoes')
      .select('id')
      .eq('usuario_id', usuarioId)
      .eq('tipo', tipo)
      .eq('questao_id', questaoId)
      .eq('comentario_id', comentarioId)
      .eq('usuario_origem_id', usuarioOrigemId)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // última hora
      .limit(1)

    if (existente && existente.length > 0) {
      console.log('Notificação similar já existe, ignorando')
      return null
    }

    const { data, error } = await supabase
      .from('notificacoes')
      .insert({
        usuario_id: usuarioId,
        tipo,
        titulo,
        mensagem,
        questao_id: questaoId,
        comentario_id: comentarioId,
        usuario_origem_id: usuarioOrigemId,
        dados_extras: dadosExtras
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar notificação:', error)
      return null
    }

    console.log('✅ Notificação criada:', data.id)
    return data
  } catch (error) {
    console.error('Erro inesperado ao criar notificação:', error)
    return null
  }
}

// Buscar notificações do usuário
export async function getNotificacoes(usuarioId: string, limite: number = 20): Promise<Notificacao[]> {
  try {
    const { data, error } = await supabase
      .from('notificacoes')
      .select(`
        *,
        usuario_origem:usuarios!notificacoes_usuario_origem_id_fkey(nome, email)
      `)
      .eq('usuario_id', usuarioId)
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
    console.error('Erro inesperado ao marcar notificação:', error)
    return false
  }
}

// Contar notificações não lidas
export async function contarNaoLidas(usuarioId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('notificacoes')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', usuarioId)
      .eq('lida', false)

    if (error) {
      console.error('Erro ao contar notificações não lidas:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('Erro inesperado ao contar notificações:', error)
    return 0
  }
}

// FUNÇÕES DE DISPARO DE NOTIFICAÇÕES

// Notificar quando alguém comenta em questão que você interagiu
export async function notificarNovoComentario(questaoId: string, autorComentarioId: string) {
  try {
    // Buscar usuários que comentaram nesta questão (exceto o autor atual)
    const { data: comentariosAnteriores } = await supabase
      .from('comentarios')
      .select('usuario_id, usuarios(nome)')
      .eq('questao_id', questaoId)
      .neq('usuario_id', autorComentarioId)

    if (!comentariosAnteriores) return

    // Pegar usuários únicos
    const usuariosUnicos = [...new Set(comentariosAnteriores.map(c => c.usuario_id))]

    // Buscar nome do autor do novo comentário
    const { data: autorData } = await supabase
      .from('usuarios')
      .select('nome')
      .eq('id', autorComentarioId)
      .single()

    const nomeAutor = autorData?.nome || 'Alguém'

    // Criar notificações para cada usuário
    for (const usuarioId of usuariosUnicos) {
      await criarNotificacao({
        usuarioId,
        tipo: 'comentario_questao',
        titulo: 'Novo comentário',
        mensagem: `${nomeAutor} comentou em uma questão que você também comentou`,
        questaoId,
        usuarioOrigemId: autorComentarioId,
        dadosExtras: {
          nome_autor: nomeAutor
        }
      })
    }

    console.log(`✅ Notificações enviadas para ${usuariosUnicos.length} usuários`)
  } catch (error) {
    console.error('Erro ao notificar novo comentário:', error)
  }
}

// Notificar quando alguém curte seu comentário
export async function notificarLikeComentario(comentarioId: string, usuarioQueCurtiuId: string) {
  try {
    // Buscar dados do comentário
    const { data: comentario } = await supabase
      .from('comentarios')
      .select(`
        usuario_id,
        questao_id,
        texto,
        usuarios(nome)
      `)
      .eq('id', comentarioId)
      .single()

    if (!comentario) return

    // Buscar nome de quem curtiu
    const { data: usuarioQueCurtiu } = await supabase
      .from('usuarios')
      .select('nome')
      .eq('id', usuarioQueCurtiuId)
      .single()

    const nomeQuemCurtiu = usuarioQueCurtiu?.nome || 'Alguém'

    await criarNotificacao({
      usuarioId: comentario.usuario_id,
      tipo: 'like_comentario',
      titulo: 'Comentário curtido',
      mensagem: `${nomeQuemCurtiu} curtiu seu comentário`,
      questaoId: comentario.questao_id,
      comentarioId,
      usuarioOrigemId: usuarioQueCurtiuId,
      dadosExtras: {
        nome_quem_curtiu: nomeQuemCurtiu,
        texto_comentario: comentario.texto.substring(0, 100)
      }
    })

    console.log('✅ Notificação de like enviada')
  } catch (error) {
    console.error('Erro ao notificar like:', error)
  }
}