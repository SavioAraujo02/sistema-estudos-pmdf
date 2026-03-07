import { supabase } from './supabase'
import { comCache, cacheInvalidarPrefixo } from './cache'

// ==========================================
// INTERFACES
// ==========================================

export interface DesafioSemanal {
  id: string
  titulo: string
  descricao?: string
  materia_id?: string
  materia_nome?: string
  questoes_ids: string[]
  total_questoes: number
  data_inicio: string
  data_fim: string
  ativo: boolean
  modo: 'manual' | 'automatico'
  created_at: string
  // Calculados
  participantes: number
  jaParticipou: boolean
  minhaPontuacao?: number
  status: 'futuro' | 'ativo' | 'encerrado'
}

export interface ParticipacaoDesafio {
  id: string
  desafio_id: string
  usuario_id: string
  usuario_nome?: string
  usuario_pelotao?: string
  pontuacao: number
  acertos: number
  tempo_total_segundos: number
  finalizado: boolean
  finalizado_em?: string
  posicao?: number
}

export interface ResultadoDesafio {
  pontuacao: number
  acertos: number
  erros: number
  tempoTotal: number
  posicao: number
  totalParticipantes: number
}

// ==========================================
// PONTUAÇÃO
// ==========================================

// 10 pts por acerto + bônus de velocidade
export function calcularPontuacao(acertou: boolean, tempoSegundos: number): number {
  if (!acertou) return 0

  let pontos = 10 // Base por acerto

  // Bônus de velocidade (máximo 5 pontos extras)
  if (tempoSegundos <= 10) pontos += 5       // Muito rápido
  else if (tempoSegundos <= 20) pontos += 4
  else if (tempoSegundos <= 30) pontos += 3
  else if (tempoSegundos <= 45) pontos += 2
  else if (tempoSegundos <= 60) pontos += 1
  // Mais de 60s = sem bônus

  return pontos
}

// ==========================================
// BUSCAR DESAFIOS
// ==========================================

export async function getDesafiosSemanais(): Promise<DesafioSemanal[]> {
  return comCache('desafios_semanais', async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: desafios, error } = await supabase
        .from('desafios_semanais')
        .select('*, materias(nome)')
        .eq('ativo', true)
        .order('data_inicio', { ascending: false })
        .limit(10)

      if (error || !desafios) {
        console.error('Erro ao buscar desafios:', error)
        return []
      }

      // Buscar participações
      const { data: participacoes } = await supabase
        .from('desafio_participacoes')
        .select('desafio_id, usuario_id, pontuacao, finalizado')

      const agora = new Date()

      return desafios.map((d: any) => {
        const partsDesafio = (participacoes || []).filter(p => p.desafio_id === d.id)
        const minhaPart = user ? partsDesafio.find(p => p.usuario_id === user.id) : null

        const inicio = new Date(d.data_inicio)
        const fim = new Date(d.data_fim)
        let status: 'futuro' | 'ativo' | 'encerrado' = 'ativo'
        if (agora < inicio) status = 'futuro'
        else if (agora > fim) status = 'encerrado'

        return {
          id: d.id,
          titulo: d.titulo,
          descricao: d.descricao,
          materia_id: d.materia_id,
          materia_nome: d.materias?.nome || undefined,
          questoes_ids: d.questoes_ids || [],
          total_questoes: d.total_questoes,
          data_inicio: d.data_inicio,
          data_fim: d.data_fim,
          ativo: d.ativo,
          modo: d.modo,
          created_at: d.created_at,
          participantes: partsDesafio.filter(p => p.finalizado).length,
          jaParticipou: minhaPart?.finalizado || false,
          minhaPontuacao: minhaPart?.pontuacao,
          status
        }
      })
    } catch (error) {
      console.error('Erro:', error)
      return []
    }
  }, 2 * 60 * 1000) // Cache 2 minutos
}

// Buscar desafio ativo (o mais recente que está em andamento)
export async function getDesafioAtivo(): Promise<DesafioSemanal | null> {
  const desafios = await getDesafiosSemanais()
  return desafios.find(d => d.status === 'ativo') || null
}

// ==========================================
// RANKING DO DESAFIO
// ==========================================

export async function getRankingDesafio(desafioId: string): Promise<ParticipacaoDesafio[]> {
  try {
    const { data, error } = await supabase
      .from('desafio_participacoes')
      .select('*, usuarios(nome, pelotao)')
      .eq('desafio_id', desafioId)
      .eq('finalizado', true)
      .order('pontuacao', { ascending: false })

    if (error || !data) return []

    return data.map((p: any, idx: number) => ({
      id: p.id,
      desafio_id: p.desafio_id,
      usuario_id: p.usuario_id,
      usuario_nome: p.usuarios?.nome || 'Anônimo',
      usuario_pelotao: p.usuarios?.pelotao || undefined,
      pontuacao: p.pontuacao,
      acertos: p.acertos,
      tempo_total_segundos: p.tempo_total_segundos,
      finalizado: p.finalizado,
      finalizado_em: p.finalizado_em,
      posicao: idx + 1
    }))
  } catch (error) {
    console.error('Erro ao buscar ranking:', error)
    return []
  }
}

// ==========================================
// PARTICIPAR DO DESAFIO
// ==========================================

export async function iniciarDesafio(desafioId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
      .from('desafio_participacoes')
      .upsert({
        desafio_id: desafioId,
        usuario_id: user.id,
        pontuacao: 0,
        acertos: 0,
        tempo_total_segundos: 0,
        respostas: [],
        finalizado: false,
        iniciado_em: new Date().toISOString()
      }, { onConflict: 'desafio_id,usuario_id' })

    if (error) {
      console.error('Erro ao iniciar desafio:', error)
      return false
    }
    return true
  } catch (error) {
    console.error('Erro:', error)
    return false
  }
}

export async function finalizarDesafio(
  desafioId: string,
  pontuacao: number,
  acertos: number,
  tempoTotal: number,
  respostas: any[]
): Promise<ResultadoDesafio | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { error } = await supabase
      .from('desafio_participacoes')
      .update({
        pontuacao,
        acertos,
        tempo_total_segundos: tempoTotal,
        respostas,
        finalizado: true,
        finalizado_em: new Date().toISOString()
      })
      .eq('desafio_id', desafioId)
      .eq('usuario_id', user.id)

    if (error) {
      console.error('Erro ao finalizar desafio:', error)
      return null
    }

    // Invalidar cache
    cacheInvalidarPrefixo('desafios_semanais')

    // Buscar ranking pra saber posição
    const ranking = await getRankingDesafio(desafioId)
    const minhaPosicao = ranking.find(r => r.usuario_id === user.id)

    return {
      pontuacao,
      acertos,
      erros: 20 - acertos,
      tempoTotal,
      posicao: minhaPosicao?.posicao || ranking.length,
      totalParticipantes: ranking.length
    }
  } catch (error) {
    console.error('Erro:', error)
    return null
  }
}

// ==========================================
// ADMIN: CRIAR DESAFIO
// ==========================================

export async function criarDesafio(dados: {
  titulo: string
  descricao?: string
  materiaId?: string
  dataInicio: string
  dataFim: string
}): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    // Buscar 20 questões aleatórias
    let query = supabase
      .from('questoes')
      .select('id')

    if (dados.materiaId) {
      query = query.eq('materia_id', dados.materiaId)
    }

    const { data: questoes, error: qError } = await query

    if (qError || !questoes || questoes.length === 0) {
      console.error('Erro ao buscar questões:', qError)
      return false
    }

    // Embaralhar e pegar 20
    const embaralhadas = questoes.sort(() => Math.random() - 0.5)
    const selecionadas = embaralhadas.slice(0, 20).map(q => q.id)

    const { error } = await supabase
      .from('desafios_semanais')
      .insert({
        titulo: dados.titulo,
        descricao: dados.descricao,
        materia_id: dados.materiaId || null,
        questoes_ids: selecionadas,
        total_questoes: selecionadas.length,
        data_inicio: dados.dataInicio,
        data_fim: dados.dataFim,
        criado_por: user.id,
        ativo: true,
        modo: 'manual'
      })

    if (error) {
      console.error('Erro ao criar desafio:', error)
      return false
    }

    cacheInvalidarPrefixo('desafios_semanais')
    return true
  } catch (error) {
    console.error('Erro:', error)
    return false
  }
}