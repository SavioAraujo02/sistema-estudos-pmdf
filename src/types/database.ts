export interface Usuario {
  id: string
  email: string
  nome: string
  foto?: string
  turma?: string
  role: 'admin' | 'user'
  status: 'pendente' | 'ativo' | 'expirado' | 'bloqueado'
  data_aprovacao?: string
  data_expiracao?: string
  aprovado_por?: string
  observacoes?: string
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
  resposta_certo_errado?: boolean
  created_at: string
  materia?: Materia
  // CAMPOS NOVOS ADICIONADOS:
  dificuldade?: 'facil' | 'medio' | 'dificil'
  ano_prova?: number
  banca?: string
  assunto_id?: string
  imagem_url?: string
  imagem_nome?: string
}

export interface Alternativa {
  id: string
  questao_id: string
  texto: string
  correta: boolean
}

export interface Tag {
  id: string
  nome: string
  cor: string
  created_at: string
}

export interface QuestaoTag {
  questao_id: string
  tag_id: string
}

export interface HistoricoEstudo {
  id: string
  questao_id: string
  usuario_id: string
  acertou: boolean
  data_resposta: string
}

export interface Comentario {
  id: string
  questao_id: string
  usuario_id: string
  texto: string
  created_at: string
  usuario?: Pick<Usuario, 'nome' | 'email'>
  likes_count?: number
  dislikes_count?: number
  user_like?: 'like' | 'dislike' | null
}

export interface ComentarioLike {
  id: string
  comentario_id: string
  usuario_id: string
  tipo: 'like' | 'dislike'
  created_at: string
}

export interface QuestaoReport {
  id: string
  questao_id: string
  usuario_id: string
  tipo: 'erro_enunciado' | 'erro_alternativa' | 'erro_resposta' | 'outro'
  descricao: string
  status: 'pendente' | 'analisando' | 'resolvido' | 'rejeitado'
  created_at: string
  usuario?: Pick<Usuario, 'nome' | 'email'>
}

export interface AlternativaEliminada {
  id: string
  questao_id: string
  usuario_id: string
  alternativa_id: string
  created_at: string
}

export interface TempoResposta {
  id: string
  questao_id: string
  usuario_id: string
  tempo_segundos: number
  created_at: string
}

export interface Assunto {
  id: string
  materia_id: string
  nome: string
  descricao?: string
  cor: string
  ativo: boolean
  ordem: number
  created_at: string
  materia?: { nome: string }
  questoes_count?: number
}