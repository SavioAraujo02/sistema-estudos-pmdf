export interface QuestaoCompleta {
    id: string
    materia_id: string
    enunciado: string
    tipo: 'certo_errado' | 'multipla_escolha'
    explicacao?: string
    resposta_certo_errado?: boolean | null
    dificuldade?: string
    ano_prova?: number
    banca?: string
    assunto_id?: string
    imagem_url?: string
    imagem_nome?: string
    created_at: string
    alternativas?: Array<{
      id: string
      questao_id: string
      texto: string
      correta: boolean
    }>
    materia?: { nome: string }
    assunto?: { id: string; nome: string; cor: string }
  }