import { supabase } from './supabase'

// ==========================================
// USUÁRIOS MAIS ATIVOS
// ==========================================
export interface UsuarioAtivo {
  id: string
  nome: string
  pelotao: string | null
  totalRespostas: number
  acertos: number
  percentualAcertos: number
  ultimaAtividade: string | null
}

export async function getUsuariosMaisAtivos(limite = 10): Promise<UsuarioAtivo[]> {
  try {
    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('id, nome, pelotao')
      .eq('status', 'ativo')

    if (!usuarios) return []

    // Buscar histórico paginado
    const BATCH = 1000
    let historico: any[] = []
    let offset = 0
    while (true) {
      const { data, error } = await supabase
        .from('historico_estudos')
        .select('usuario_id, acertou, data_resposta')
        .range(offset, offset + BATCH - 1)
      if (error || !data || data.length === 0) break
      historico = [...historico, ...data]
      if (data.length < BATCH) break
      offset += BATCH
    }

    const resultado = usuarios.map(usr => {
      const respostas = historico.filter(h => h.usuario_id === usr.id)
      const acertos = respostas.filter(h => h.acertou).length
      const ultima = respostas.length > 0
        ? respostas.sort((a, b) => new Date(b.data_resposta).getTime() - new Date(a.data_resposta).getTime())[0].data_resposta
        : null

      return {
        id: usr.id,
        nome: usr.nome,
        pelotao: usr.pelotao,
        totalRespostas: respostas.length,
        acertos,
        percentualAcertos: respostas.length > 0 ? Math.round((acertos / respostas.length) * 100) : 0,
        ultimaAtividade: ultima
      }
    })

    return resultado
      .filter(u => u.totalRespostas > 0)
      .sort((a, b) => b.totalRespostas - a.totalRespostas)
      .slice(0, limite)
  } catch (error) {
    console.error('Erro ao buscar usuários mais ativos:', error)
    return []
  }
}

// ==========================================
// QUESTÕES MAIS ERRADAS
// ==========================================
export interface QuestaoProblematica {
  id: string
  enunciado: string
  materia: string
  totalRespostas: number
  totalErros: number
  percentualErros: number
}

export async function getQuestoesMaisErradas(limite = 10): Promise<QuestaoProblematica[]> {
  try {
    // Buscar histórico paginado
    const BATCH = 1000
    let historico: any[] = []
    let offset = 0
    while (true) {
      const { data, error } = await supabase
        .from('historico_estudos')
        .select('questao_id, acertou')
        .range(offset, offset + BATCH - 1)
      if (error || !data || data.length === 0) break
      historico = [...historico, ...data]
      if (data.length < BATCH) break
      offset += BATCH
    }

    // Agrupar por questão
    const statsMap = new Map<string, { total: number; erros: number }>()
    historico.forEach(h => {
      const stats = statsMap.get(h.questao_id) || { total: 0, erros: 0 }
      stats.total++
      if (!h.acertou) stats.erros++
      statsMap.set(h.questao_id, stats)
    })

    // Filtrar: mínimo 5 respostas e >40% de erro
    const problematicas = Array.from(statsMap.entries())
      .filter(([_, stats]) => stats.total >= 5 && (stats.erros / stats.total) > 0.4)
      .sort((a, b) => (b[1].erros / b[1].total) - (a[1].erros / a[1].total))
      .slice(0, limite)

    if (problematicas.length === 0) return []

    // Buscar detalhes das questões
    const ids = problematicas.map(([id]) => id)
    const { data: questoes } = await supabase
      .from('questoes')
      .select('id, enunciado, materias!inner(nome)')
      .in('id', ids)

    return problematicas.map(([id, stats]) => {
      const questao = questoes?.find((q: any) => q.id === id)
      return {
        id,
        enunciado: questao?.enunciado
          ? questao.enunciado.length > 80
            ? questao.enunciado.substring(0, 80) + '...'
            : questao.enunciado
          : 'Questão não encontrada',
        materia: (questao as any)?.materias?.nome || 'Sem matéria',
        totalRespostas: stats.total,
        totalErros: stats.erros,
        percentualErros: Math.round((stats.erros / stats.total) * 100)
      }
    })
  } catch (error) {
    console.error('Erro ao buscar questões problemáticas:', error)
    return []
  }
}

// ==========================================
// ESTATÍSTICAS GERAIS DO SISTEMA
// ==========================================
export interface EstatisticasSistema {
  totalRespostasHoje: number
  totalRespostasSemana: number
  totalRespostasMes: number
  mediaRespostasDia: number
  horarioPico: string
  materiasMaisEstudadas: { nome: string; total: number }[]
}

export async function getEstatisticasSistema(): Promise<EstatisticasSistema> {
  try {
    const agora = new Date()
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString()
    const inicioSemana = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()

    const [hojeRes, semanaRes, mesRes] = await Promise.all([
      supabase.from('historico_estudos').select('id', { count: 'exact', head: true }).gte('data_resposta', inicioHoje),
      supabase.from('historico_estudos').select('id', { count: 'exact', head: true }).gte('data_resposta', inicioSemana),
      supabase.from('historico_estudos').select('id', { count: 'exact', head: true }).gte('data_resposta', inicioMes),
    ])

    const totalHoje = hojeRes.count || 0
    const totalSemana = semanaRes.count || 0
    const totalMes = mesRes.count || 0

    // Média por dia (últimos 30 dias)
    const diasNoMes = agora.getDate()
    const mediaRespostasDia = diasNoMes > 0 ? Math.round(totalMes / diasNoMes) : 0

    // Horário de pico (últimas 1000 respostas)
    const { data: ultimasRespostas } = await supabase
      .from('historico_estudos')
      .select('data_resposta')
      .order('data_resposta', { ascending: false })
      .limit(1000)

    let horarioPico = 'N/A'
    if (ultimasRespostas && ultimasRespostas.length > 0) {
      const horasContagem: Record<number, number> = {}
      ultimasRespostas.forEach(r => {
        const hora = new Date(r.data_resposta).getHours()
        horasContagem[hora] = (horasContagem[hora] || 0) + 1
      })
      const horaMaisFrequente = Object.entries(horasContagem)
        .sort(([, a], [, b]) => b - a)[0]
      if (horaMaisFrequente) {
        const h = parseInt(horaMaisFrequente[0])
        horarioPico = `${h}h - ${h + 1}h`
      }
    }

    // Matérias mais estudadas
    const { data: respostasComMateria } = await supabase
      .from('historico_estudos')
      .select('questoes!inner(materias!inner(nome))')
      .gte('data_resposta', inicioMes)
      .limit(1000)

    const materiasContagem: Record<string, number> = {}
    respostasComMateria?.forEach((r: any) => {
      const nome = r.questoes?.materias?.nome || 'Sem matéria'
      materiasContagem[nome] = (materiasContagem[nome] || 0) + 1
    })

    const materiasMaisEstudadas = Object.entries(materiasContagem)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([nome, total]) => ({ nome, total }))

    return {
      totalRespostasHoje: totalHoje,
      totalRespostasSemana: totalSemana,
      totalRespostasMes: totalMes,
      mediaRespostasDia,
      horarioPico,
      materiasMaisEstudadas
    }
  } catch (error) {
    console.error('Erro ao buscar estatísticas do sistema:', error)
    return {
      totalRespostasHoje: 0, totalRespostasSemana: 0, totalRespostasMes: 0,
      mediaRespostasDia: 0, horarioPico: 'N/A', materiasMaisEstudadas: []
    }
  }
}