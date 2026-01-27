import { supabase } from './supabase'

export interface QuestaoEstudo {
  id: string
  enunciado: string
  tipo: 'certo_errado' | 'multipla_escolha'
  explicacao?: string
  materia: { nome: string }
  alternativas?: { id: string; texto: string; correta: boolean }[]
}

export async function getQuestoesParaEstudo(
  materiaId?: string,
  limite: number = 1000,
  questaoIds?: string[]
): Promise<QuestaoEstudo[]> {
  try {
    console.log('Buscando questões com parâmetros:', { materiaId, limite, questaoIds })
    
    let query = supabase
      .from('questoes')
      .select(`
        id,
        enunciado,
        tipo,
        explicacao,
        materias!inner(nome),
        alternativas(id, texto, correta)
      `)

    // Filtrar por matéria se especificada
    if (materiaId) {
      query = query.eq('materia_id', materiaId)
    }

    // Filtrar por IDs específicos se fornecidos (para tags)
    if (questaoIds && questaoIds.length > 0) {
      query = query.in('id', questaoIds)
    }

    // Aplicar limite apenas se for um número válido e menor que 1000
    if (!isNaN(limite) && limite > 0 && limite < 1000) {
      query = query.limit(limite)
    }

    const { data, error } = await query

    console.log('Resultado da query:', { data, error })

    if (error) {
      console.error('Erro ao buscar questões para estudo:', error)
      return []
    }

    // Transformar os dados para o formato correto
    const questoesFormatadas: QuestaoEstudo[] = (data || []).map((item: any) => ({
      id: item.id,
      enunciado: item.enunciado,
      tipo: item.tipo,
      explicacao: item.explicacao,
      materia: { nome: item.materias?.nome || 'Sem matéria' },
      alternativas: item.alternativas || []
    }))

    console.log('Questões formatadas:', questoesFormatadas)

    // Embaralhar as questões
    const questoesEmbaralhadas = questoesFormatadas.sort(() => Math.random() - 0.5)
    
    // Aplicar limite após embaralhar se necessário
    let resultado = questoesEmbaralhadas
    if (!isNaN(limite) && limite > 0 && limite < questoesEmbaralhadas.length) {
      resultado = questoesEmbaralhadas.slice(0, limite)
    }
    
    console.log('Questões finais:', resultado)
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