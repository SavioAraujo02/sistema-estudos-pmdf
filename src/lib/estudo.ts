import { supabase } from './supabase'

export interface QuestaoEstudo {
  id: string
  enunciado: string
  tipo: 'certo_errado' | 'multipla_escolha'
  explicacao?: string
  resposta_certo_errado?: boolean | null
  imagem_url?: string
  imagem_nome?: string
  created_at?: string
  materia: { nome: string }
  assunto?: { id: string; nome: string; cor: string }
  alternativas?: { id: string; texto: string; correta: boolean }[]
}

// ✅ INTERFACE EXPANDIDA PARA ESTATÍSTICAS COMPLETAS
export interface EstatisticasCompletas {
  totalRespostas: number
  acertos: number
  percentualAcertos: number
  porMateria: Record<string, { total: number; acertos: number; percentual: number }>
  sequenciaAtual: number
  melhorSequencia: number
  tempoMedioResposta: number
  // ✅ NOVOS CAMPOS — DADOS REAIS DO SUPABASE
  questoesHoje: number
  tempoEstudoHoje: number
  diasConsecutivos: number
  ultimaAtividade: string
}

// ✅ INTERFACE PARA ATIVIDADE RECENTE (dados reais)
export interface AtividadeRecenteDB {
  id: string
  tipo: 'questao' | 'sessao' | 'meta'
  descricao: string
  timestamp: string
  resultado: 'acerto' | 'erro'
  materia: string
}

export async function getQuestoesParaEstudo(
  materiaId?: string | string[],
  limite?: number,
  questaoIds?: string[],
  filtros?: {
    assuntoIds?: string[]
    dificuldade?: string
    anoProva?: number
    banca?: string
    apenasNaoRespondidas?: boolean
    apenasErradas?: boolean
    revisaoQuestoesDificeis?: boolean
    embaralhar?: boolean
  }
): Promise<QuestaoEstudo[]> {
  try {
    console.log('Buscando questões com parâmetros:', { materiaId, limite, questaoIds, filtros })
    
    const BATCH_SIZE = 1000
    let todasQuestoes: any[] = []
    let offset = 0
    let hasMore = true

    while (hasMore) {
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
        .range(offset, offset + BATCH_SIZE - 1)

      if (materiaId) {
        if (Array.isArray(materiaId)) {
          if (materiaId.length > 0) {
            query = query.in('materia_id', materiaId)
          }
        } else {
          query = query.eq('materia_id', materiaId)
        }
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

      const { data, error } = await query

      if (error) {
        console.error('Erro ao buscar questões:', error)
        break
      }

      if (!data || data.length === 0) {
        hasMore = false
        break
      }

      todasQuestoes = [...todasQuestoes, ...data]
      
      if (data.length < BATCH_SIZE) {
        hasMore = false
      }

      if (limite && todasQuestoes.length >= limite) {
        hasMore = false
      }

      offset += BATCH_SIZE
      console.log(`📦 Lote ${Math.floor(offset/BATCH_SIZE)}: ${data.length} questões (Total: ${todasQuestoes.length})`)
    }

    console.log(`✅ Total de questões carregadas: ${todasQuestoes.length}`)

    let questoesFormatadas: QuestaoEstudo[] = todasQuestoes.map((item: any) => ({
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
        const historicoCompleto: any[] = []
        const allQuestaoIds = questoesFormatadas.map(q => q.id)
        
        for (let i = 0; i < allQuestaoIds.length; i += 1000) {
          const loteIds = allQuestaoIds.slice(i, i + 1000)
          
          const { data: historico } = await supabase
            .from('historico_respostas_detalhado')
            .select('questao_id, acertou')
            .eq('usuario_id', user.id)
            .in('questao_id', loteIds)

          if (historico) {
            historicoCompleto.push(...historico)
          }
        }

        const historicoMap = new Map()
        historicoCompleto.forEach(h => {
          if (!historicoMap.has(h.questao_id)) {
            historicoMap.set(h.questao_id, { respostas: [], acertos: 0, erros: 0 })
          }
          const stats = historicoMap.get(h.questao_id)
          stats.respostas.push(h.acertou)
          if (h.acertou) stats.acertos++
          else stats.erros++
        })

        questoesFormatadas = questoesFormatadas.filter(questao => {
          const stats = historicoMap.get(questao.id)
          
          if (filtros.apenasNaoRespondidas) {
            return !stats
          }
          
          if (filtros.apenasErradas) {
            return stats && stats.erros > 0
          }
          
          if (filtros.revisaoQuestoesDificeis) {
            if (!stats) return false
            const percentual = (stats.acertos / stats.respostas.length) * 100
            return percentual < 70
          }
          
          return true
        })
      }
    }

    let questoesFinais = questoesFormatadas

    if (filtros?.embaralhar) {
      questoesFinais = questoesFormatadas.sort(() => Math.random() - 0.5)
      console.log('🎲 Questões embaralhadas')
    } else {
      questoesFinais = questoesFormatadas.sort((a, b) => 
        new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      )
      console.log('📚 Questões em ordem cronológica')
    }

    let resultado = questoesFinais
    if (limite && !isNaN(limite) && limite > 0 && limite < questoesFinais.length) {
      resultado = questoesFinais.slice(0, limite)
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

export async function salvarTempoResposta(questaoId: string, tempoSegundos: number) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('Usuário não autenticado')
      return false
    }

    const { error } = await supabase
      .from('tempo_respostas')
      .insert([{
        questao_id: questaoId,
        usuario_id: user.id,
        tempo_segundos: tempoSegundos
      }])

    if (error) {
      console.error('Erro ao salvar tempo de resposta:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro inesperado ao salvar tempo:', error)
    return false
  }
}

export async function salvarRespostaCompleta(
  questaoId: string,
  acertou: boolean,
  tempoSegundos?: number
) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('Usuário não autenticado')
      return false
    }

    const { error: historicoError } = await supabase
      .from('historico_estudos')
      .insert([{
        questao_id: questaoId,
        usuario_id: user.id,
        acertou
      }])

    if (historicoError) {
      console.error('Erro ao salvar resposta:', historicoError)
      return false
    }

    if (tempoSegundos && tempoSegundos > 0) {
      await salvarTempoResposta(questaoId, tempoSegundos)
    }

    return true
  } catch (error) {
    console.error('Erro inesperado ao salvar resposta completa:', error)
    return false
  }
}

// ✅ FUNÇÃO EXPANDIDA — AGORA COM questoesHoje, diasConsecutivos, ultimaAtividade DO SUPABASE
export async function getEstatisticasEstudo(): Promise<EstatisticasCompletas> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return {
        totalRespostas: 0, acertos: 0, percentualAcertos: 0, porMateria: {},
        sequenciaAtual: 0, melhorSequencia: 0, tempoMedioResposta: 0,
        questoesHoje: 0, tempoEstudoHoje: 0, diasConsecutivos: 0,
        ultimaAtividade: new Date().toISOString()
      }
    }

    console.log('📊 Buscando estatísticas completas para usuário:', user.id)

    // Início do dia atual (UTC-3 para Brasília)
    const agora = new Date()
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
    const inicioHojeISO = inicioHoje.toISOString()

    const [historicoData, tempoData, tempoHojeData] = await Promise.all([
      // Histórico completo com datas
      supabase
        .from('historico_estudos')
        .select(`
          acertou,
          data_resposta,
          questoes!inner(
            materias!inner(nome)
          )
        `)
        .eq('usuario_id', user.id)
        .order('data_resposta', { ascending: true }),
      
      // Tempos de resposta (todos)
      supabase
        .from('tempo_respostas')
        .select('tempo_segundos')
        .eq('usuario_id', user.id),

      // Tempos de resposta de HOJE
      supabase
        .from('tempo_respostas')
        .select('tempo_segundos')
        .eq('usuario_id', user.id)
        .gte('created_at', inicioHojeISO)
    ])

    const { data: historico } = historicoData
    const { data: tempos } = tempoData
    const { data: temposHoje } = tempoHojeData

    const totalRespostas = historico?.length || 0
    const acertos = historico?.filter(r => r.acertou).length || 0
    const percentualAcertos = totalRespostas > 0 ? Math.round((acertos / totalRespostas) * 100) : 0

    // ✅ CALCULAR SEQUÊNCIAS
    let sequenciaAtual = 0
    let melhorSequencia = 0
    let sequenciaTemp = 0

    if (historico && historico.length > 0) {
      for (let i = historico.length - 1; i >= 0; i--) {
        if (historico[i].acertou) {
          sequenciaAtual++
        } else {
          break
        }
      }

      for (const resposta of historico) {
        if (resposta.acertou) {
          sequenciaTemp++
          melhorSequencia = Math.max(melhorSequencia, sequenciaTemp)
        } else {
          sequenciaTemp = 0
        }
      }
    }

    // ✅ CALCULAR TEMPO MÉDIO
    let tempoMedioResposta = 0
    if (tempos && tempos.length > 0) {
      const tempoTotal = tempos.reduce((sum, t) => sum + (t.tempo_segundos || 0), 0)
      tempoMedioResposta = Math.round(tempoTotal / tempos.length)
    }

    // ✅ NOVO: QUESTÕES RESPONDIDAS HOJE (do Supabase!)
    let questoesHoje = 0
    if (historico) {
      questoesHoje = historico.filter(r => {
        const dataResp = new Date(r.data_resposta)
        return dataResp >= inicioHoje
      }).length
    }

    // ✅ NOVO: TEMPO DE ESTUDO HOJE (do Supabase!)
    let tempoEstudoHoje = 0
    if (temposHoje && temposHoje.length > 0) {
      tempoEstudoHoje = temposHoje.reduce((sum, t) => sum + (t.tempo_segundos || 0), 0)
    }

    // ✅ NOVO: ÚLTIMA ATIVIDADE (do Supabase!)
    let ultimaAtividade = new Date().toISOString()
    if (historico && historico.length > 0) {
      ultimaAtividade = historico[historico.length - 1].data_resposta
    }

    // ✅ NOVO: DIAS CONSECUTIVOS (do Supabase!)
    let diasConsecutivos = 0
    if (historico && historico.length > 0) {
      // Pegar datas únicas de estudo (só o dia, sem hora)
      const datasUnicas = [...new Set(
        historico.map(r => {
          const d = new Date(r.data_resposta)
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        })
      )].sort().reverse() // Ordenar do mais recente ao mais antigo

      if (datasUnicas.length > 0) {
        const hoje = new Date()
        const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
        
        const ontem = new Date(hoje)
        ontem.setDate(ontem.getDate() - 1)
        const ontemStr = `${ontem.getFullYear()}-${String(ontem.getMonth() + 1).padStart(2, '0')}-${String(ontem.getDate()).padStart(2, '0')}`

        // A sequência só conta se estudou hoje ou ontem
        if (datasUnicas[0] === hojeStr || datasUnicas[0] === ontemStr) {
          diasConsecutivos = 1
          
          for (let i = 1; i < datasUnicas.length; i++) {
            const dataAtual = new Date(datasUnicas[i - 1])
            const dataAnterior = new Date(datasUnicas[i])
            const diffDias = Math.round((dataAtual.getTime() - dataAnterior.getTime()) / (1000 * 60 * 60 * 24))
            
            if (diffDias === 1) {
              diasConsecutivos++
            } else {
              break
            }
          }
        }
      }
    }

    // ✅ AGRUPAR POR MATÉRIA
    const porMateria: Record<string, { total: number; acertos: number; percentual: number }> = {}
    
    historico?.forEach((resposta: any) => {
      const nomeMateria = resposta.questoes?.materias?.nome || 'Sem matéria'
      
      if (!porMateria[nomeMateria]) {
        porMateria[nomeMateria] = { total: 0, acertos: 0, percentual: 0 }
      }
      
      porMateria[nomeMateria].total++
      if (resposta.acertou) {
        porMateria[nomeMateria].acertos++
      }
    })

    Object.keys(porMateria).forEach(materia => {
      const stats = porMateria[materia]
      stats.percentual = Math.round((stats.acertos / stats.total) * 100)
    })

    const resultado = {
      totalRespostas, acertos, percentualAcertos, porMateria,
      sequenciaAtual, melhorSequencia, tempoMedioResposta,
      questoesHoje, tempoEstudoHoje, diasConsecutivos, ultimaAtividade
    }

    console.log('✅ Estatísticas completas:', resultado)
    return resultado

  } catch (error) {
    console.error('Erro inesperado ao buscar estatísticas:', error)
    return {
      totalRespostas: 0, acertos: 0, percentualAcertos: 0, porMateria: {},
      sequenciaAtual: 0, melhorSequencia: 0, tempoMedioResposta: 0,
      questoesHoje: 0, tempoEstudoHoje: 0, diasConsecutivos: 0,
      ultimaAtividade: new Date().toISOString()
    }
  }
}

// ✅ NOVA FUNÇÃO: Buscar atividade recente DO SUPABASE
export async function getAtividadeRecente(): Promise<AtividadeRecenteDB[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('historico_estudos')
      .select(`
        id,
        acertou,
        data_resposta,
        questoes!inner(
          enunciado,
          materias!inner(nome)
        )
      `)
      .eq('usuario_id', user.id)
      .order('data_resposta', { ascending: false })
      .limit(8)

    if (error || !data) {
      console.error('Erro ao buscar atividade recente:', error)
      return []
    }

    return data.map((item: any) => ({
      id: item.id,
      tipo: 'questao' as const,
      descricao: item.questoes?.enunciado 
        ? (item.questoes.enunciado.length > 60 
            ? item.questoes.enunciado.substring(0, 60) + '...' 
            : item.questoes.enunciado)
        : 'Questão respondida',
      timestamp: item.data_resposta,
      resultado: item.acertou ? 'acerto' as const : 'erro' as const,
      materia: item.questoes?.materias?.nome || 'Sem matéria'
    }))
  } catch (error) {
    console.error('Erro ao buscar atividade recente:', error)
    return []
  }
}

export async function zerarEstatisticasUsuario() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('Usuário não autenticado')
      return false
    }

    console.log('🗑️ Iniciando limpeza de estatísticas para usuário:', user.id)

    const promises = [
      supabase
        .from('historico_estudos')
        .delete()
        .eq('usuario_id', user.id),
      
      supabase
        .from('tempo_respostas')
        .delete()
        .eq('usuario_id', user.id),
      
      supabase
        .from('alternativas_eliminadas')
        .delete()
        .eq('usuario_id', user.id),
      
      supabase
        .from('historico_respostas_detalhado')
        .delete()
        .eq('usuario_id', user.id)
    ]

    const resultados = await Promise.allSettled(promises)
    
    const erros = resultados.filter(r => r.status === 'rejected')
    if (erros.length > 0) {
      console.error('Alguns erros ao zerar estatísticas:', erros)
      return false
    }

    console.log(`✅ Tabelas limpas com sucesso!`)
    return true
  } catch (error) {
    console.error('Erro inesperado ao zerar estatísticas:', error)
    return false
  }
}

export async function getEstatisticasFiltros(materiaIds?: string | string[]): Promise<{
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

    let queryTotal = supabase
      .from('questoes')
      .select('id', { count: 'exact' })

    if (materiaIds) {
      if (Array.isArray(materiaIds)) {
        if (materiaIds.length > 0) {
          queryTotal = queryTotal.in('materia_id', materiaIds)
        }
      } else {
        queryTotal = queryTotal.eq('materia_id', materiaIds)
      }
    }

    const { count: totalQuestoes } = await queryTotal

    let queryHistorico = supabase
      .from('historico_respostas_detalhado')
      .select(`
        questao_id,
        acertou,
        questoes!inner(materia_id)
      `)
      .eq('usuario_id', user.id)

    if (materiaIds) {
      if (Array.isArray(materiaIds)) {
        if (materiaIds.length > 0) {
          queryHistorico = queryHistorico.in('questoes.materia_id', materiaIds)
        }
      } else {
        queryHistorico = queryHistorico.eq('questoes.materia_id', materiaIds)
      }
    }

    const { data: historico } = await queryHistorico

    const questoesRespondidas = new Set()
    const questoesComErros = new Set()
    const estatisticasPorQuestao = new Map()

    historico?.forEach((resposta: any) => {
      const questaoId = resposta.questao_id
      questoesRespondidas.add(questaoId)

      if (!resposta.acertou) {
        questoesComErros.add(questaoId)
      }

      if (!estatisticasPorQuestao.has(questaoId)) {
        estatisticasPorQuestao.set(questaoId, { acertos: 0, total: 0 })
      }
      const stats = estatisticasPorQuestao.get(questaoId)
      stats.total++
      if (resposta.acertou) stats.acertos++
    })

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

// ✅ Manter funções de gamificação local (usadas pelo ModoEstudo)
export async function atualizarSequenciaAtual(acertou: boolean) {
  try {
    const sequenciaAtual = parseInt(localStorage.getItem('sequencia_atual') || '0')
    const melhorSequencia = parseInt(localStorage.getItem('melhor_sequencia') || '0')
    
    if (acertou) {
      const novaSequencia = sequenciaAtual + 1
      localStorage.setItem('sequencia_atual', novaSequencia.toString())
      
      if (novaSequencia > melhorSequencia) {
        localStorage.setItem('melhor_sequencia', novaSequencia.toString())
      }
    } else {
      localStorage.setItem('sequencia_atual', '0')
    }
    
    return true
  } catch (error) {
    console.error('Erro ao atualizar sequência:', error)
    return false
  }
}

export async function adicionarAtividadeRecente(atividade: {
  tipo: 'questao' | 'sessao' | 'meta'
  descricao: string
  resultado?: 'acerto' | 'erro'
  materia?: string
}) {
  try {
    const atividadesExistentes = JSON.parse(localStorage.getItem('atividade_recente') || '[]')
    
    const novaAtividade = {
      id: Date.now().toString(),
      ...atividade,
      timestamp: new Date().toISOString()
    }
    
    const atividadesAtualizadas = [novaAtividade, ...atividadesExistentes].slice(0, 10)
    
    localStorage.setItem('atividade_recente', JSON.stringify(atividadesAtualizadas))
    localStorage.setItem('ultima_atividade', new Date().toISOString())
    
    return true
  } catch (error) {
    console.error('Erro ao adicionar atividade recente:', error)
    return false
  }
}

export async function atualizarContadorDiario() {
  try {
    const hoje = new Date().toDateString()
    const questoesHoje = parseInt(localStorage.getItem(`questoes_hoje_${hoje}`) || '0')
    
    localStorage.setItem(`questoes_hoje_${hoje}`, (questoesHoje + 1).toString())
    
    const ontem = new Date()
    ontem.setDate(ontem.getDate() - 1)
    const questoesOntem = parseInt(localStorage.getItem(`questoes_hoje_${ontem.toDateString()}`) || '0')
    
    let diasConsecutivos = parseInt(localStorage.getItem('dias_consecutivos') || '0')
    
    if (questoesHoje === 0) {
      if (questoesOntem > 0) {
        diasConsecutivos += 1
      } else {
        diasConsecutivos = 1
      }
      localStorage.setItem('dias_consecutivos', diasConsecutivos.toString())
    }
    
    return true
  } catch (error) {
    console.error('Erro ao atualizar contador diário:', error)
    return false
  }
}

export async function salvarRespostaComGamificacao(
  questaoId: string,
  acertou: boolean,
  tempoSegundos?: number,
  materiaId?: string,
  nomeMateria?: string
) {
  try {
    console.log('🎮 Salvando resposta com gamificação:', { questaoId, acertou, tempoSegundos })
    
    const sucessoBanco = await salvarRespostaCompleta(questaoId, acertou, tempoSegundos)
    
    if (!sucessoBanco) {
      console.error('Falha ao salvar no banco')
      return false
    }
    
    await Promise.all([
      atualizarSequenciaAtual(acertou),
      atualizarContadorDiario(),
      adicionarAtividadeRecente({
        tipo: 'questao',
        descricao: `Respondeu questão${nomeMateria ? ` de ${nomeMateria}` : ''}`,
        resultado: acertou ? 'acerto' : 'erro',
        materia: nomeMateria
      })
    ])
    
    console.log('✅ Resposta salva com gamificação completa')
    return true
    
  } catch (error) {
    console.error('Erro ao salvar resposta com gamificação:', error)
    return false
  }
}

export async function verificarConquistasDesbloqueadas() {
  try {
    const stats = await getEstatisticasEstudo()
    const conquistasDesbloqueadas = []
    
    if (stats.totalRespostas === 1) {
      conquistasDesbloqueadas.push({ id: 'primeira_questao', nome: 'Primeiro Passo', icone: '🎯' })
    }
    if (stats.totalRespostas === 10) {
      conquistasDesbloqueadas.push({ id: 'dez_questoes', nome: 'Iniciante', icone: '📚' })
    }
    if (stats.totalRespostas === 50) {
      conquistasDesbloqueadas.push({ id: 'cinquenta_questoes', nome: 'Estudioso', icone: '📖' })
    }
    if (stats.totalRespostas === 100) {
      conquistasDesbloqueadas.push({ id: 'cem_questoes', nome: 'Centurião', icone: '💯' })
    }
    if (stats.sequenciaAtual === 5) {
      conquistasDesbloqueadas.push({ id: 'sequencia_cinco', nome: 'Aquecendo', icone: '🔥' })
    }
    if (stats.melhorSequencia === 10) {
      conquistasDesbloqueadas.push({ id: 'sequencia_dez', nome: 'Em Chamas', icone: '🔥' })
    }
    
    if (conquistasDesbloqueadas.length > 0) {
      const conquistasExistentes = JSON.parse(localStorage.getItem('conquistas_desbloqueadas') || '[]')
      const novasConquistas = conquistasDesbloqueadas.filter(nova => 
        !conquistasExistentes.some((existente: any) => existente.id === nova.id)
      )
      
      if (novasConquistas.length > 0) {
        localStorage.setItem('conquistas_desbloqueadas', 
          JSON.stringify([...conquistasExistentes, ...novasConquistas])
        )
        return novasConquistas
      }
    }
    
    return []
  } catch (error) {
    console.error('Erro ao verificar conquistas:', error)
    return []
  }
}