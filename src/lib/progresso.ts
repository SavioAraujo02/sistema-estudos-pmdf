import { supabase } from './supabase'

export interface ProgressoSessao {
  id: string
  usuario_id: string
  configuracao: any
  questoes_ids: string[]
  questao_atual: number
  respostas: any[]
  tempo_inicio: string
  ultima_atividade: string
  finalizada: boolean
}

export interface RespostaSalva {
  questao_id: string
  resposta_usuario: any
  tempo_resposta: number
  acertou?: boolean
  timestamp: string
}

// Salvar progresso da sessão
export async function salvarProgressoSessao(
  configuracao: any,
  questoesIds: string[],
  questaoAtual: number = 0,
  respostas: RespostaSalva[] = []
): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Verificar se já existe uma sessão ativa
    const { data: sessaoExistente } = await supabase
      .from('progresso_sessao')
      .select('id')
      .eq('usuario_id', user.id)
      .eq('finalizada', false)
      .single()

    if (sessaoExistente) {
      // Atualizar sessão existente
      const { data, error } = await supabase
        .from('progresso_sessao')
        .update({
          configuracao,
          questoes_ids: questoesIds,
          questao_atual: questaoAtual,
          respostas,
          ultima_atividade: new Date().toISOString()
        })
        .eq('id', sessaoExistente.id)
        .select()
        .single()

      if (error) {
        console.error('Erro ao atualizar progresso:', error)
        return null
      }

      console.log('✅ Progresso atualizado:', data.id)
      return data.id
    } else {
      // Criar nova sessão
      const { data, error } = await supabase
        .from('progresso_sessao')
        .insert({
          usuario_id: user.id,
          configuracao,
          questoes_ids: questoesIds,
          questao_atual: questaoAtual,
          respostas
        })
        .select()
        .single()

      if (error) {
        console.error('Erro ao criar progresso:', error)
        return null
      }

      console.log('✅ Nova sessão de progresso criada:', data.id)
      return data.id
    }
  } catch (error) {
    console.error('Erro inesperado ao salvar progresso:', error)
    return null
  }
}

// Buscar progresso da sessão ativa
export async function buscarProgressoSessao(): Promise<ProgressoSessao | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('progresso_sessao')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('finalizada', false)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Nenhuma sessão ativa encontrada
        return null
      }
      console.error('Erro ao buscar progresso:', error)
      return null
    }

    console.log('📖 Progresso encontrado:', data)
    return data
  } catch (error) {
    console.error('Erro inesperado ao buscar progresso:', error)
    return null
  }
}

// Atualizar questão atual
export async function atualizarQuestaoAtual(questaoAtual: number): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
      .from('progresso_sessao')
      .update({ 
        questao_atual: questaoAtual,
        ultima_atividade: new Date().toISOString()
      })
      .eq('usuario_id', user.id)
      .eq('finalizada', false)

    if (error) {
      console.error('Erro ao atualizar questão atual:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro inesperado ao atualizar questão:', error)
    return false
  }
}

// Adicionar resposta ao progresso
export async function adicionarRespostaProgresso(resposta: RespostaSalva): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    // Buscar sessão atual
    const sessao = await buscarProgressoSessao()
    if (!sessao) return false

    // Adicionar nova resposta
    const novasRespostas = [...sessao.respostas, resposta]

    const { error } = await supabase
      .from('progresso_sessao')
      .update({ 
        respostas: novasRespostas,
        ultima_atividade: new Date().toISOString()
      })
      .eq('id', sessao.id)

    if (error) {
      console.error('Erro ao adicionar resposta:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro inesperado ao adicionar resposta:', error)
    return false
  }
}

// Finalizar sessão
export async function finalizarSessao(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
      .from('progresso_sessao')
      .update({ 
        finalizada: true,
        ultima_atividade: new Date().toISOString()
      })
      .eq('usuario_id', user.id)
      .eq('finalizada', false)

    if (error) {
      console.error('Erro ao finalizar sessão:', error)
      return false
    }

    console.log('✅ Sessão finalizada')
    return true
  } catch (error) {
    console.error('Erro inesperado ao finalizar sessão:', error)
    return false
  }
}

// Abandonar sessão (limpar progresso)
export async function abandonarSessao(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
      .from('progresso_sessao')
      .delete()
      .eq('usuario_id', user.id)
      .eq('finalizada', false)

    if (error) {
      console.error('Erro ao abandonar sessão:', error)
      return false
    }

    console.log('🗑️ Sessão abandonada')
    return true
  } catch (error) {
    console.error('Erro inesperado ao abandonar sessão:', error)
    return false
  }
}

// Limpar sessões antigas finalizadas (limpeza)
export async function limparSessoesAntigas(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    // Remover sessões finalizadas há mais de 7 dias
    const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { error } = await supabase
      .from('progresso_sessao')
      .delete()
      .eq('usuario_id', user.id)
      .eq('finalizada', true)
      .lt('ultima_atividade', seteDiasAtras)

    if (error) {
      console.error('Erro ao limpar sessões antigas:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro inesperado ao limpar sessões:', error)
    return false
  }
}

// Verificar se há sessão em andamento
export async function temSessaoEmAndamento(): Promise<boolean> {
  try {
    const progresso = await buscarProgressoSessao()
    return progresso !== null
  } catch (error) {
    console.error('Erro ao verificar sessão em andamento:', error)
    return false
  }
}

// Obter resumo da sessão em andamento
export async function getResumoSessao(): Promise<{
  questoesTotais: number
  questaoAtual: number
  respostasFeitas: number
  tempoDecorrido: string
  configuracao: any
} | null> {
  try {
    const progresso = await buscarProgressoSessao()
    if (!progresso) return null

    const agora = new Date()
    const inicio = new Date(progresso.tempo_inicio)
    const diffMs = agora.getTime() - inicio.getTime()
    
    const horas = Math.floor(diffMs / (1000 * 60 * 60))
    const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    let tempoDecorrido = ''
    if (horas > 0) tempoDecorrido += `${horas}h `
    tempoDecorrido += `${minutos}min`

    return {
      questoesTotais: progresso.questoes_ids.length,
      questaoAtual: progresso.questao_atual + 1, // +1 para mostrar baseado em 1
      respostasFeitas: progresso.respostas.length,
      tempoDecorrido,
      configuracao: progresso.configuracao
    }
  } catch (error) {
    console.error('Erro ao obter resumo da sessão:', error)
    return null
  }
}