import localforage from 'localforage'
import { supabase } from './supabase'

// Configurar localforage
localforage.config({
  name: 'EstudosPMDF',
  storeName: 'cache',
  description: 'Cache offline para o sistema de estudos'
})

// Chaves para o cache
const CACHE_KEYS = {
  MATERIAS: 'materias',
  QUESTOES: 'questoes',
  ESTATISTICAS: 'estatisticas',
  LAST_SYNC: 'last_sync'
}

// Interface para dados offline
interface OfflineData {
  data: any
  timestamp: number
  synced: boolean
}

// Verificar se está online
export function isOnline(): boolean {
  return navigator.onLine
}

// Salvar dados no cache
export async function saveToCache(key: string, data: any): Promise<void> {
  const offlineData: OfflineData = {
    data,
    timestamp: Date.now(),
    synced: isOnline()
  }
  await localforage.setItem(key, offlineData)
}

// Buscar dados do cache
export async function getFromCache(key: string): Promise<any> {
  const offlineData: OfflineData | null = await localforage.getItem(key)
  return offlineData?.data || null
}

// Verificar se os dados estão atualizados (menos de 1 hora)
export async function isCacheValid(key: string, maxAge: number = 3600000): Promise<boolean> {
  const offlineData: OfflineData | null = await localforage.getItem(key)
  if (!offlineData) return false
  
  const age = Date.now() - offlineData.timestamp
  return age < maxAge
}

// Buscar matérias (online/offline)
export async function getMateriasOffline() {
  try {
    // Se estiver online e cache não for válido, buscar do servidor
    if (isOnline() && !(await isCacheValid(CACHE_KEYS.MATERIAS))) {
      const { data, error } = await supabase
        .from('materias')
        .select('*')
        .order('nome')

      if (!error && data) {
        await saveToCache(CACHE_KEYS.MATERIAS, data)
        return data
      }
    }

    // Buscar do cache
    const cachedData = await getFromCache(CACHE_KEYS.MATERIAS)
    return cachedData || []
  } catch (error) {
    console.error('Erro ao buscar matérias offline:', error)
    return await getFromCache(CACHE_KEYS.MATERIAS) || []
  }
}

// Buscar questões (online/offline)
export async function getQuestoesOffline(materiaId?: string) {
  try {
    // Definir a chave do cache baseada na matéria
    const cacheKey = materiaId ? `${CACHE_KEYS.QUESTOES}_${materiaId}` : CACHE_KEYS.QUESTOES

    // Se estiver online e cache não for válido, buscar do servidor
    if (isOnline() && !(await isCacheValid(cacheKey))) {
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

      if (materiaId) {
        query = query.eq('materia_id', materiaId)
      }

      const { data, error } = await query

      if (!error && data) {
        const questoesFormatadas = data.map((item: any) => ({
          id: item.id,
          enunciado: item.enunciado,
          tipo: item.tipo,
          explicacao: item.explicacao,
          materia: { nome: item.materias?.nome || 'Sem matéria' },
          alternativas: item.alternativas || []
        }))

        await saveToCache(cacheKey, questoesFormatadas)
        return questoesFormatadas
      }
    }

    // Buscar do cache
    const cachedData = await getFromCache(cacheKey)
    return cachedData || []
  } catch (error) {
    console.error('Erro ao buscar questões offline:', error)
    const cacheKey = materiaId ? `${CACHE_KEYS.QUESTOES}_${materiaId}` : CACHE_KEYS.QUESTOES
    return await getFromCache(cacheKey) || []
  }
}

// Salvar resposta offline (para sincronizar depois)
export async function salvarRespostaOffline(questaoId: string, acertou: boolean) {
  const respostasOffline = await getFromCache('respostas_offline') || []
  
  const novaResposta = {
    id: Date.now().toString(),
    questao_id: questaoId,
    acertou,
    data_resposta: new Date().toISOString(),
    synced: false
  }

  respostasOffline.push(novaResposta)
  await saveToCache('respostas_offline', respostasOffline)

  // Se estiver online, tentar sincronizar
  if (isOnline()) {
    await sincronizarRespostas()
  }
}

// Sincronizar respostas pendentes
export async function sincronizarRespostas() {
  if (!isOnline()) return

  try {
    const respostasOffline = await getFromCache('respostas_offline') || []
    const respostasPendentes = respostasOffline.filter((r: any) => !r.synced)

    for (const resposta of respostasPendentes) {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { error } = await supabase
          .from('historico_estudos')
          .insert([{
            questao_id: resposta.questao_id,
            usuario_id: user.id,
            acertou: resposta.acertou
          }])

        if (!error) {
          resposta.synced = true
        }
      }
    }

    // Atualizar cache com respostas sincronizadas
    await saveToCache('respostas_offline', respostasOffline)
  } catch (error) {
    console.error('Erro ao sincronizar respostas:', error)
  }
}

// Limpar cache
export async function limparCache() {
  await localforage.clear()
}

// Obter status do cache
export async function getStatusCache() {
  const materias = await isCacheValid(CACHE_KEYS.MATERIAS)
  const questoes = await isCacheValid(CACHE_KEYS.QUESTOES)
  const respostasOffline = await getFromCache('respostas_offline') || []
  const respostasPendentes = respostasOffline.filter((r: any) => !r.synced).length

  return {
    online: isOnline(),
    materiasCache: materias,
    questoesCache: questoes,
    respostasPendentes
  }
}