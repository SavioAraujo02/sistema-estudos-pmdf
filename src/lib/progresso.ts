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
  respostas: RespostaSalva[] = [],
  sessaoId?: string
): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Se sessaoId fornecido, atualizar sessão específica
    if (sessaoId) {
      const { data, error } = await supabase
        .from('progresso_sessao')
        .update({
          configuracao,
          questoes_ids: questoesIds,
          questao_atual: questaoAtual,
          respostas,
          ultima_atividade: new Date().toISOString()
        })
        .eq('id', sessaoId)
        .select()
        .single()

      if (error) {
        console.error('Erro ao atualizar sessão específica:', error)
        return null
      }

      console.log('✅ Sessão específica atualizada:', data.id)
      return data.id
    }

    // ✅ SEMPRE criar nova sessão quando não há sessaoId
    const nomeSessao = configuracao.nomeSessao?.trim() || 
      (configuracao.materiasSelecionadas && configuracao.materiasSelecionadas.length > 0
        ? `Estudo - ${configuracao.materiasSelecionadas.length} matérias`
        : 'Sessão de Estudo')

    const { data, error } = await supabase
      .from('progresso_sessao')
      .insert({
        usuario_id: user.id,
        configuracao,
        questoes_ids: questoesIds,
        questao_atual: questaoAtual,
        respostas,
        nome_sessao: nomeSessao,
        cor_sessao: configuracao.corSessao || '#3B82F6',
        materias_ids: configuracao.materiasSelecionadas || [],
        total_questoes: questoesIds.length
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar nova sessão:', error)
      return null
    }

    console.log('✅ Nova sessão criada:', data.id)
    return data.id
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

    // Buscar a sessão mais recente não finalizada (sem .single() pra evitar erro com múltiplas)
    const { data, error } = await supabase
      .from('progresso_sessao')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('finalizada', false)
      .order('ultima_atividade', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Erro ao buscar progresso:', error)
      return null
    }

    if (!data || data.length === 0) return null

    return data[0]
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
    if (!sessao) {
      console.log('⚠️ Nenhuma sessão ativa para salvar resposta — salvando só no histórico')
      return false
    }

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

// Finalizar sessão com histórico completo
export async function finalizarSessao(resultados?: {
  totalQuestoes: number
  acertos: number
  tempo: number
  respostas: any[]
}): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('Usuário não autenticado ao finalizar sessão')
      return false
    }

    // Buscar sessão ativa (a mais recente)
    const { data: sessoesAtivas, error: erroConsulta } = await supabase
      .from('progresso_sessao')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('finalizada', false)
      .order('ultima_atividade', { ascending: false })
      .limit(1)

    if (erroConsulta || !sessoesAtivas || sessoesAtivas.length === 0) {
      console.log('ℹ️ Nenhuma sessão ativa encontrada')
      return true
    }

    const sessaoAtiva = sessoesAtivas[0]

    // Calcular estatísticas se fornecidas
    const estatisticas = resultados ? {
      total_questoes: resultados.totalQuestoes,
      total_acertos: resultados.acertos,
      tempo_total_segundos: Math.round(resultados.tempo / 1000)
    } : {
      total_questoes: sessaoAtiva.questoes_ids?.length || 0,
      total_acertos: 0,
      tempo_total_segundos: 0
    }

    // Finalizar sessão com estatísticas
    const { error: erroFinalizacao } = await supabase
      .from('progresso_sessao')
      .update({ 
        finalizada: true,
        ultima_atividade: new Date().toISOString(),
        ...estatisticas
      })
      .eq('id', sessaoAtiva.id)

    if (erroFinalizacao) {
      console.error('Erro ao finalizar sessão:', erroFinalizacao.message)
      return false
    }

    // Salvar histórico detalhado de respostas se fornecido
    if (resultados?.respostas && resultados.respostas.length > 0) {
      const respostasDetalhadas = resultados.respostas.map(resposta => ({
        usuario_id: user.id,
        questao_id: resposta.questao.id,
        sessao_id: sessaoAtiva.id,
        resposta_usuario: resposta.resposta,
        acertou: resposta.correta,
        tempo_resposta_segundos: Math.round(resposta.tempo / 1000)
      }))

      const { error: erroHistorico } = await supabase
        .from('historico_respostas_detalhado')
        .insert(respostasDetalhadas)

      if (erroHistorico) {
        console.error('Erro ao salvar histórico detalhado:', erroHistorico.message)
        // Não falhar a finalização por causa do histórico
      } else {
        console.log('✅ Histórico detalhado salvo:', respostasDetalhadas.length, 'respostas')
      }
    }

    console.log('✅ Sessão finalizada com sucesso')
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

// Buscar histórico de sessões do usuário
export async function getHistoricoSessoes(limite: number = 10): Promise<any[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('progresso_sessao')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('finalizada', true)
      .order('ultima_atividade', { ascending: false })
      .limit(limite)

    if (error) {
      console.error('Erro ao buscar histórico de sessões:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Erro inesperado ao buscar histórico:', error)
    return []
  }
}

// Buscar questões já respondidas pelo usuário
export async function getQuestoesRespondidas(materiaId?: string): Promise<{
  questao_id: string
  total_respostas: number
  ultima_resposta: boolean
  acertos: number
  erros: number
  percentual_acerto: number
}[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    let query = supabase
      .from('historico_respostas_detalhado')
      .select(`
        questao_id,
        acertou,
        questoes!inner(materia_id)
      `)
      .eq('usuario_id', user.id)

    if (materiaId) {
      query = query.eq('questoes.materia_id', materiaId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar questões respondidas:', error)
      return []
    }

    // Agrupar por questão e calcular estatísticas
    const estatisticasPorQuestao = new Map()

    data?.forEach((resposta: any) => {
      const questaoId = resposta.questao_id
      
      if (!estatisticasPorQuestao.has(questaoId)) {
        estatisticasPorQuestao.set(questaoId, {
          questao_id: questaoId,
          total_respostas: 0,
          acertos: 0,
          erros: 0,
          ultima_resposta: false
        })
      }

      const stats = estatisticasPorQuestao.get(questaoId)
      stats.total_respostas++
      stats.ultima_resposta = resposta.acertou
      
      if (resposta.acertou) {
        stats.acertos++
      } else {
        stats.erros++
      }
    })

    // Converter para array e calcular percentuais
    return Array.from(estatisticasPorQuestao.values()).map(stats => ({
      ...stats,
      percentual_acerto: Math.round((stats.acertos / stats.total_respostas) * 100)
    }))

  } catch (error) {
    console.error('Erro inesperado ao buscar questões respondidas:', error)
    return []
  }
}

// Verificar se questão específica já foi respondida
export async function questaoJaRespondida(questaoId: string): Promise<{
  respondida: boolean
  ultima_resposta?: boolean
  total_tentativas?: number
  percentual_acerto?: number
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { respondida: false }

    const { data, error } = await supabase
      .from('historico_respostas_detalhado')
      .select('acertou')
      .eq('usuario_id', user.id)
      .eq('questao_id', questaoId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao verificar questão:', error)
      return { respondida: false }
    }

    if (!data || data.length === 0) {
      return { respondida: false }
    }

    const acertos = data.filter(r => r.acertou).length
    const total = data.length

    return {
      respondida: true,
      ultima_resposta: data[0].acertou,
      total_tentativas: total,
      percentual_acerto: Math.round((acertos / total) * 100)
    }

  } catch (error) {
    console.error('Erro inesperado ao verificar questão:', error)
    return { respondida: false }
  }
  
}

// Finalizar sessões órfãs (antigas não finalizadas)
export async function finalizarSessoesOrfas(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    // Buscar todas as sessões não finalizadas
    const { data: sessoes, error } = await supabase
      .from('progresso_sessao')
      .select('id')
      .eq('usuario_id', user.id)
      .eq('finalizada', false)
      .order('ultima_atividade', { ascending: false })

    if (error || !sessoes || sessoes.length <= 1) return 0

    // Manter só a mais recente, finalizar as demais
    const sessoesParaFinalizar = sessoes.slice(1).map(s => s.id)

    const { error: errUpdate } = await supabase
      .from('progresso_sessao')
      .update({ finalizada: true, ultima_atividade: new Date().toISOString() })
      .in('id', sessoesParaFinalizar)

    if (errUpdate) {
      console.error('Erro ao finalizar sessões órfãs:', errUpdate)
      return 0
    }

    console.log(`🧹 ${sessoesParaFinalizar.length} sessões órfãs finalizadas`)
    return sessoesParaFinalizar.length
  } catch (error) {
    console.error('Erro:', error)
    return 0
  }
}