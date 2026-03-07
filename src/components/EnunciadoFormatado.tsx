'use client'

interface EnunciadoFormatadoProps {
  texto: string
  className?: string
  preview?: boolean
  maxLength?: number
}

export function EnunciadoFormatado({ texto, className = '', preview = false, maxLength }: EnunciadoFormatadoProps) {
  const formatarTexto = (texto: string) => {
    let textoFormatado = texto

    if (preview && maxLength && textoFormatado.length > maxLength) {
      textoFormatado = textoFormatado.substring(0, maxLength) + '...'
      // No modo preview, retornar texto simples sem formatação pesada
      return [
        <span key={0} className="leading-relaxed">
          {textoFormatado}
        </span>
      ]
    }

    // PRÉ-PROCESSAMENTO: Inserir quebras de linha antes de itens numerados
    // Padrão: I —, II —, III —, IV —, V — (com travessão ou hífen)
    textoFormatado = textoFormatado.replace(
      /\s+(I{1,3}|IV|V|VI{0,3}|IX|X{0,3})\s*[—–-]\s*/g,
      '\n$1 — '
    )

    // Padrão: I., II., III., IV. seguido de texto
    textoFormatado = textoFormatado.replace(
      /\s+(I{1,3}|IV|V|VI{0,3}|IX|X{0,3})\.\s+/g,
      '\n$1. '
    )

    // Padrão: I), II), III) seguido de texto  
    textoFormatado = textoFormatado.replace(
      /\s+(I{1,3}|IV|V|VI{0,3}|IX|X{0,3})\)\s+/g,
      '\n$1) '
    )

    // Padrão: a), b), c), d), e) no meio do texto
    textoFormatado = textoFormatado.replace(
      /\s+([a-e])\)\s+/g,
      '\n$1) '
    )

    // Quebrar antes de "Estão corretas", "Assinale", "Marque", "Indique", "Quantas"
    textoFormatado = textoFormatado.replace(
      /\.\s+(Estão corretas?|Assinale|Marque|Indique quantas|Indique|Quantas)/g,
      '.\n\n$1'
    )

    // Quebrar em parágrafos
    const paragrafos = textoFormatado.split('\n').filter(p => p.trim())

    return paragrafos.map((paragrafo, index) => {
      let conteudo = paragrafo.trim()

      // Detectar se é um item de lista (I —, II —, a), b), etc.)
      const isItem = /^(I{1,3}|IV|V|VI{0,3}|IX|X{0,3})\s*[—–.\-)]/.test(conteudo) ||
                     /^[a-e]\)\s/.test(conteudo)

      // 1. Artigos de lei (ex: "art. 5º", "Art. 123")
      conteudo = conteudo.replace(
        /(art\.?\s*\d+[º°]?)/gi,
        '<span class="font-semibold text-blue-600 dark:text-blue-400">$1</span>'
      )

      // 2. Incisos (ex: "inciso I", "inciso XII")
      conteudo = conteudo.replace(
        /(inciso\s+[IVX]+)/gi,
        '<span class="font-medium text-purple-600 dark:text-purple-400">$1</span>'
      )

      // 3. Parágrafos legais (ex: "§ 1º", "§ 2°")
      conteudo = conteudo.replace(
        /(§\s*\d+[º°]?)/gi,
        '<span class="font-medium text-green-600 dark:text-green-400">$1</span>'
      )

      // 4. Palavras importantes
      const palavrasImportantes = [
        'EXCETO', 'INCORRETO', 'INCORRETA', 'CORRETO', 'CORRETA',
        'VERDADEIRO', 'VERDADEIRA', 'FALSO', 'FALSA',
        'NÃO', 'SEMPRE', 'NUNCA', 'TODOS', 'NENHUM', 'APENAS'
      ]
      
      palavrasImportantes.forEach(palavra => {
        const regex = new RegExp(`\\b${palavra}\\b`, 'g')
        conteudo = conteudo.replace(
          regex,
          `<span class="font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1 rounded">${palavra}</span>`
        )
      })

      // 5. Percentuais
      conteudo = conteudo.replace(
        /(\d+%|\d+\.\d+%)/g,
        '<span class="font-semibold text-orange-600 dark:text-orange-400">$1</span>'
      )

      // 6. Anos
      conteudo = conteudo.replace(
        /\b(19\d{2}|20\d{2})\b/g,
        '<span class="font-medium text-indigo-600 dark:text-indigo-400">$1</span>'
      )

      // 7. Destacar o marcador de item (I —, II —, a), etc.)
      if (isItem) {
        // Romanos com travessão
        conteudo = conteudo.replace(
          /^(I{1,3}|IV|V|VI{0,3}|IX|X{0,3})\s*([—–\-.)]+)/,
          '<span class="font-bold text-indigo-600 dark:text-indigo-400">$1$2</span>'
        )
        // Letras com parêntese
        conteudo = conteudo.replace(
          /^([a-e])\)/,
          '<span class="font-bold text-gray-700 dark:text-gray-300">$1)</span>'
        )
      }

      // 8. Frases finais tipo "Estão corretas", "Assinale"
      conteudo = conteudo.replace(
        /^(Estão corretas?|Assinale|Marque|Indique quantas|Indique|Quantas)/,
        '<span class="font-semibold text-blue-600 dark:text-blue-400">$1</span>'
      )

      return (
        <p
          key={index}
          className={`${isItem ? 'mt-1.5 pl-2' : index > 0 ? 'mt-3' : ''} leading-relaxed text-justify`}
          dangerouslySetInnerHTML={{ __html: conteudo }}
        />
      )
    })
  }

  return (
    <div className={`text-gray-900 dark:text-gray-100 ${className}`}>
      {formatarTexto(texto)}
    </div>
  )
}