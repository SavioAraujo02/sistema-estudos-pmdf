export interface Usuario {
    id: string
    email: string
    nome: string
    foto?: string
    turma?: string
    created_at: string
  }
  
  export interface Materia {
    id: string
    nome: string
    descricao?: string
    created_at: string
  }
  
  export interface Questao {
    id: string
    materia_id: string
    enunciado: string
    tipo: 'certo_errado' | 'multipla_escolha'
    explicacao?: string
    created_at: string
    materia?: Materia
  }
  
  export interface Alternativa {
    id: string
    questao_id: string
    texto: string
    correta: boolean
  }
  
  export interface HistoricoEstudo {
    id: string
    questao_id: string
    usuario_id: string
    acertou: boolean
    data_resposta: string
  }