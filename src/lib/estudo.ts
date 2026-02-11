import { supabase } from './supabase'

export interface QuestaoEstudo {
  id: string
  enunciado: string
  tipo: 'certo_errado' | 'multipla_escolha'
  explicacao?: string
  resposta_certo_errado?: boolean | null  // ADICIONADO
  imagem_url?: string
  imagem_nome?: string
  materia: { nome: string }
  assunto?: { id: string; nome: string; cor: string }
  alternativas?: { id: string; texto: string; correta: boolean }[]
}

export async function getQuestoesParaEstudo(
  materiaId?: string,
  limite: number = 1000,
  questaoIds?: string[],
  filtros?: {
    assuntoIds?: string[]
    dificuldade?: string
    anoProva?: number
    banca?: string
    // NOVOS FILTROS INTELIGENTES
    apenasNaoRespondidas?: boolean
    apenasErradas?: boolean
    revisaoQuestoesDificeis?: boolean
  }
): Promise<QuestaoEstudo[]> {
  try {
    console.log('Buscando questões com parâmetros:', { materiaId, limite, questaoIds, filtros })
    
    let query = supabase
    .from('questoes')
    .select(`
      id,
      enunciado,
      tipo,
      explicacao,
      resposta_certo_errado,
      imagem_url,
      imagem_nome,
      dificuldade,
      ano_prova,
      banca,
      materias!inner(nome),
      assuntos(id, nome, cor),
      alternativas(id, texto, correta)
    `)

    // Filtros básicos
    if (materiaId) {
      query = query.eq('materia_id', materiaId)
    }

    if (questaoIds && questaoIds.length > 0) {
      query = query.in('id', questaoIds)
    }

    if (filtros?.assuntoIds && filtros.assuntoIds.length > 0) {
      query = query.in('assunto_id', filtros.assuntoIds)
    }

    if (filtros?.dificuldade) {
      query = query.eq('dificuldade', filtros.dificuldade)
    }

    if (filtros?.anoProva) {
      query = query.eq('ano_prova', filtros.anoProva)
    }

    if (filtros?.banca) {
      query = query.ilike('banca', `%${filtros.banca}%`)
    }

    // Aplicar limite básico
    if (!isNaN(limite) && limite > 0 && limite < 1000) {
      query = query.limit(limite)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar questões para estudo:', error)
      return []
    }

    // Transformar os dados
    let questoesFormatadas: QuestaoEstudo[] = (data || []).map((item: any) => ({
      id: item.id,
      enunciado: item.enunciado,
      tipo: item.tipo,
      explicacao: item.explicacao,
      resposta_certo_errado: item.resposta_certo_errado,
      imagem_url: item.imagem_url,
      imagem_nome: item.imagem_nome,
      materia: { nome: item.materias?.nome || 'Sem matéria' },
      assunto: item.assuntos ? {
        id: item.assuntos.id,
        nome: item.assuntos.nome,
        cor: item.assuntos.cor
      } : undefined,
      alternativas: item.alternativas || []
    }))

    // APLICAR FILTROS INTELIGENTES
    if (filtros?.apenasNaoRespondidas || filtros?.apenasErradas || filtros?.revisaoQuestoesDificeis) {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Buscar histórico de respostas do usuário
        const { data: historico } = await supabase
          .from('historico_respostas_detalhado')
          .select('questao_id, acertou')
          .eq('usuario_id', user.id)
          .in('questao_id', questoesFormatadas.map(q => q.id))

        const historicoMap = new Map()
        historico?.forEach(h => {
          if (!historicoMap.has(h.questao_id)) {
            historicoMap.set(h.questao_id, { respostas: [], acertos: 0, erros: 0 })
          }
          const stats = historicoMap.get(h.questao_id)
          stats.respostas.push(h.acertou)
          if (h.acertou) stats.acertos++
          else stats.erros++
        })

        // Aplicar filtros
        questoesFormatadas = questoesFormatadas.filter(questao => {
          const stats = historicoMap.get(questao.id)
          
          if (filtros.apenasNaoRespondidas) {
            return !stats // Questão nunca foi respondida
          }
          
          if (filtros.apenasErradas) {
            return stats && stats.erros > 0 // Questão foi respondida e teve erros
          }
          
          if (filtros.revisaoQuestoesDificeis) {
            // Questões com baixo percentual de acerto (menos de 70%)
            if (!stats) return false
            const percentual = (stats.acertos / stats.respostas.length) * 100
            return percentual < 70
          }
          
          return true
        })
      }
    }

    // Embaralhar as questões
    const questoesEmbaralhadas = questoesFormatadas.sort(() => Math.random() - 0.5)
    
    // Aplicar limite final
    let resultado = questoesEmbaralhadas
    if (!isNaN(limite) && limite > 0 && limite < questoesEmbaralhadas.length) {
      resultado = questoesEmbaralhadas.slice(0, limite)
    }
    
    console.log('Questões finais após filtros:', resultado.length)
    return resultado
  } catch (error) {
    console.error('Erro inesperado ao buscar questões:', error)
    return []
  }
}
export async function salvarResposta(
  questaoId: string,
  acertou: boolean
) {
  try {
    // Pegar usuário atual
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('Usuário não autenticado')
      return false
    }

    const { error } = await supabase
      .from('historico_estudos')
      .insert([{
        questao_id: questaoId,
        usuario_id: user.id,
        acertou
      }])

    if (error) {
      console.error('Erro ao salvar resposta:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro inesperado ao salvar resposta:', error)
    return false
  }
}

export async function getEstatisticasEstudo() {
  try {
    // Pegar usuário atual
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return {
        totalRespostas: 0,
        acertos: 0,
        percentualAcertos: 0,
        porMateria: {}
      }
    }

    const { data, error } = await supabase
      .from('historico_estudos')
      .select(`
        acertou,
        questoes!inner(
          materias!inner(nome)
        )
      `)
      .eq('usuario_id', user.id)

    if (error) {
      console.error('Erro ao buscar estatísticas:', error)
      return {
        totalRespostas: 0,
        acertos: 0,
        percentualAcertos: 0,
        porMateria: {}
      }
    }

    const totalRespostas = data?.length || 0
    const acertos = data?.filter(r => r.acertou).length || 0
    const percentualAcertos = totalRespostas > 0 ? Math.round((acertos / totalRespostas) * 100) : 0

    // Agrupar por matéria
    const porMateria: Record<string, { total: number; acertos: number; percentual: number }> = {}
    
    data?.forEach((resposta: any) => {
      const nomeMateria = resposta.questoes?.materias?.nome || 'Sem matéria'
      
      if (!porMateria[nomeMateria]) {
        porMateria[nomeMateria] = { total: 0, acertos: 0, percentual: 0 }
      }
      
      porMateria[nomeMateria].total++
      if (resposta.acertou) {
        porMateria[nomeMateria].acertos++
      }
    })

    // Calcular percentuais por matéria
    Object.keys(porMateria).forEach(materia => {
      const stats = porMateria[materia]
      stats.percentual = Math.round((stats.acertos / stats.total) * 100)
    })

    return {
      totalRespostas,
      acertos,
      percentualAcertos,
      porMateria
    }
  } catch (error) {
    console.error('Erro inesperado ao buscar estatísticas:', error)
    return {
      totalRespostas: 0,
      acertos: 0,
      percentualAcertos: 0,
      porMateria: {}
    }
  }
}

// ==================== FUNÇÃO PARA ZERAR ESTATÍSTICAS ====================

export async function zerarEstatisticasUsuario() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('Usuário não autenticado')
      return false
    }

    // Deletar histórico de estudos
    const { error: historicoError } = await supabase
      .from('historico_estudos')
      .delete()
      .eq('usuario_id', user.id)

    if (historicoError) {
      console.error('Erro ao deletar histórico:', historicoError)
      return false
    }

    // Deletar tempos de resposta
    const { error: tempoError } = await supabase
      .from('tempo_respostas')
      .delete()
      .eq('usuario_id', user.id)

    if (tempoError) {
      console.error('Erro ao deletar tempos:', tempoError)
      return false
    }

    // Deletar alternativas eliminadas
    const { error: eliminadasError } = await supabase
      .from('alternativas_eliminadas')
      .delete()
      .eq('usuario_id', user.id)

    if (eliminadasError) {
      console.error('Erro ao deletar alternativas eliminadas:', eliminadasError)
      return false
    }

    console.log('✅ Estatísticas zeradas com sucesso!')
    return true
  } catch (error) {
    console.error('Erro inesperado ao zerar estatísticas:', error)
    return false
  }
}

// Calcular estatísticas para filtros inteligentes
export async function getEstatisticasFiltros(materiaId?: string): Promise<{
  totalQuestoes: number
  naoRespondidas: number
  comErros: number
  dificeis: number
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { totalQuestoes: 0, naoRespondidas: 0, comErros: 0, dificeis: 0 }
    }

    // Buscar total de questões da matéria
    let queryTotal = supabase
      .from('questoes')
      .select('id', { count: 'exact' })

    if (materiaId) {
      queryTotal = queryTotal.eq('materia_id', materiaId)
    }

    const { count: totalQuestoes } = await queryTotal

    // Buscar histórico de respostas do usuário
    let queryHistorico = supabase
      .from('historico_respostas_detalhado')
      .select(`
        questao_id,
        acertou,
        questoes!inner(materia_id)
      `)
      .eq('usuario_id', user.id)

    if (materiaId) {
      queryHistorico = queryHistorico.eq('questoes.materia_id', materiaId)
    }

    const { data: historico } = await queryHistorico

    // Processar estatísticas
    const questoesRespondidas = new Set()
    const questoesComErros = new Set()
    const estatisticasPorQuestao = new Map()

    historico?.forEach((resposta: any) => {
      const questaoId = resposta.questao_id
      questoesRespondidas.add(questaoId)

      if (!resposta.acertou) {
        questoesComErros.add(questaoId)
      }

      // Calcular estatísticas por questão
      if (!estatisticasPorQuestao.has(questaoId)) {
        estatisticasPorQuestao.set(questaoId, { acertos: 0, total: 0 })
      }
      const stats = estatisticasPorQuestao.get(questaoId)
      stats.total++
      if (resposta.acertou) stats.acertos++
    })

    // Contar questões difíceis (menos de 70% de acerto)
    let questoesDificeis = 0
    estatisticasPorQuestao.forEach(stats => {
      const percentual = (stats.acertos / stats.total) * 100
      if (percentual < 70) {
        questoesDificeis++
      }
    })

    return {
      totalQuestoes: totalQuestoes || 0,
      naoRespondidas: (totalQuestoes || 0) - questoesRespondidas.size,
      comErros: questoesComErros.size,
      dificeis: questoesDificeis
    }

  } catch (error) {
    console.error('Erro ao calcular estatísticas dos filtros:', error)
    return { totalQuestoes: 0, naoRespondidas: 0, comErros: 0, dificeis: 0 }
  }
}