interface QuestaoParseada {
  enunciado: string
  tipo: 'certo_errado' | 'multipla_escolha'
  alternativas?: { texto: string; correta: boolean }[]
  explicacao?: string
  respostaCertoErrado?: boolean | null // ADICIONADO
}

export function parseQuestao(texto: string): QuestaoParseada | null {
  try {
    const linhas = texto.trim().split('\n').map(linha => linha.trim()).filter(linha => linha)
    
    if (linhas.length === 0) return null

    // Detectar tipo de questão - procurar por alternativas a) até e)
    const temAlternativas = linhas.some(linha => 
      /^[a-e]\)|^[A-E]\)/.test(linha)
    )

    if (temAlternativas) {
      return parseMultiplaEscolha(linhas)
    } else {
      return parseCertoErrado(linhas)
    }
  } catch (error) {
    console.error('Erro ao fazer parse da questão:', error)
    return null
  }
}

function parseCertoErrado(linhas: string[]): QuestaoParseada {
  // Procurar por "Comentários:" ou "Explicação:"
  let indiceComentario = -1
  
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].toLowerCase()
    if (linha.startsWith('comentários:') || linha.startsWith('explicação:')) {
      indiceComentario = i
      break
    }
  }

  let enunciado: string
  let explicacao: string | undefined

  if (indiceComentario > 0) {
    enunciado = linhas.slice(0, indiceComentario).join(' ')
    explicacao = linhas.slice(indiceComentario).join(' ')
      .replace(/^(comentários:|explicação:)/i, '').trim()
  } else {
    enunciado = linhas.join(' ')
  }

  // DETECÇÃO INTELIGENTE DA RESPOSTA
  let respostaCertoErrado: boolean | null = null
  
  if (explicacao) {
    const explicacaoLower = explicacao.toLowerCase()
    
    // Palavras que indicam CERTO/VERDADEIRO
    const palavrasCerto = ['certo', 'correto', 'verdadeiro', 'correta', 'verdadeira']
    // Palavras que indicam ERRADO/FALSO
    const palavrasErrado = ['errado', 'incorreto', 'falso', 'errada', 'incorreta', 'falsa']
    
    // Verificar se alguma palavra de "certo" aparece
    const temCerto = palavrasCerto.some(palavra => explicacaoLower.includes(palavra))
    // Verificar se alguma palavra de "errado" aparece
    const temErrado = palavrasErrado.some(palavra => explicacaoLower.includes(palavra))
    
    // Se só tem uma das duas, usar ela
    if (temCerto && !temErrado) {
      respostaCertoErrado = true
      console.log('✅ Resposta detectada: CERTO')
    } else if (temErrado && !temCerto) {
      respostaCertoErrado = false
      console.log('❌ Resposta detectada: ERRADO')
    } else {
      console.log('⚠️ Resposta ambígua ou não detectada - usuário deve definir')
    }
  }

  return {
    enunciado,
    tipo: 'certo_errado',
    explicacao,
    respostaCertoErrado // NOVO CAMPO
  }
}

function parseMultiplaEscolha(linhas: string[]): QuestaoParseada {
  let enunciado = ''
  let alternativas: { texto: string; correta: boolean }[] = []
  let explicacao: string | undefined
  let modoAtual: 'enunciado' | 'alternativas' | 'comentarios' = 'enunciado'

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i]
    const linhaLower = linha.toLowerCase()

    // Verificar se é comentários
    if (linhaLower.startsWith('comentários:') || linhaLower.startsWith('explicação:')) {
      modoAtual = 'comentarios'
      explicacao = linha.replace(/^(comentários:|explicação:)/i, '').trim()
      continue
    }

    // Verificar se é alternativa (a) até e))
    const matchAlternativa = linha.match(/^([a-eA-E])\)\s*(.+)$/)
    
    if (matchAlternativa) {
      modoAtual = 'alternativas'
      const letra = matchAlternativa[1].toLowerCase()
      const texto = matchAlternativa[2].trim()
      
      alternativas.push({
        texto: texto,
        correta: false // Vamos detectar depois pelo gabarito
      })
    } else {
      // Continuar construindo o enunciado ou comentários
      if (modoAtual === 'enunciado') {
        enunciado += (enunciado ? ' ' : '') + linha
      } else if (modoAtual === 'comentarios') {
        explicacao += (explicacao ? ' ' : '') + linha
      }
    }
  }

  // Detectar gabarito nos comentários
  if (explicacao) {
    const matchGabarito = explicacao.match(/gabarito:\s*([a-eA-E])/i)
    
    if (matchGabarito) {
      const letraCorreta = matchGabarito[1].toLowerCase()
      const indiceCorreto = letraCorreta.charCodeAt(0) - 97 // a=0, b=1, etc
      
      if (indiceCorreto >= 0 && indiceCorreto < alternativas.length) {
        alternativas[indiceCorreto].correta = true
        console.log(`✅ Gabarito detectado: ${matchGabarito[1].toUpperCase()}`)
      }
    } else {
      console.log('⚠️ Gabarito não detectado - usuário deve marcar')
    }
  }

  return {
    enunciado,
    tipo: 'multipla_escolha',
    alternativas,
    explicacao
  }
}

// Função para gerar exemplos de formato
export function getExemplosFormato(): string {
  return `
EXEMPLOS DE FORMATO PMDF:

📝 MÚLTIPLA ESCOLHA:
De acordo com o art. 2º da Portaria PMDF nº 1.435/2025, o Regulamento de Continências tem como finalidade, EXCETO:
a) Estabelecer honras, continências e sinais de respeito aos símbolos nacionais e autoridades
b) Regular normas de apresentação, procedimento, formas de tratamento e precedência
c) Fixar as honras que constituem o Cerimonial Militar da PMDF
d) Regulamentar procedimentos operacionais de abordagem policial
e) Aplicar-se às situações diárias da vida castrense

Comentários: O Regulamento não trata de procedimentos operacionais, mas sim de continências, honras e cerimonial (art. 2º). Gabarito: D

📝 CERTO/ERRADO:
A Constituição Federal de 1988 estabelece que todos são iguais perante a lei.

Comentários: Correto. Artigo 5º da CF/88.

💡 DICAS:
- Use "Comentários:" para explicações
- Para certo/errado: use "Certo", "Correto", "Errado" ou "Incorreto"
- Para múltipla escolha: inclua "Gabarito: X" nos comentários
- Alternativas devem começar com a), b), c), d), e)
  `.trim()
}