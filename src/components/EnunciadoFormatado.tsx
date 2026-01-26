'use client'

interface EnunciadoFormatadoProps {
  texto: string
  className?: string
  preview?: boolean
  maxLength?: number
}

export function EnunciadoFormatado({ texto, className = '', preview = false, maxLength }: EnunciadoFormatadoProps) {
  // Função para formatar o texto
  const formatarTexto = (texto: string) => {
    let textoFormatado = texto

    // Aplicar limite de caracteres se for preview
    if (preview && maxLength && textoFormatado.length > maxLength) {
      textoFormatado = textoFormatado.substring(0, maxLength) + '...'
    }

    // Quebrar em parágrafos
    const paragrafos = textoFormatado.split('\n').filter(p => p.trim())

    return paragrafos.map((paragrafo, index) => {
      let conteudo = paragrafo.trim()

      // Detectar e formatar diferentes tipos de conteúdo
      
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

      // 3. Parágrafos (ex: "§ 1º", "§ 2°")
      conteudo = conteudo.replace(
        /(§\s*\d+[º°]?)/gi,
        '<span class="font-medium text-green-600 dark:text-green-400">$1</span>'
      )

      // 4. Alternativas (a), b), c), etc.)
      conteudo = conteudo.replace(
        /^([a-e])\)\s*/i,
        '<span class="font-bold text-gray-700 dark:text-gray-300 mr-2">$1)</span>'
      )

      // 5. Destacar palavras importantes
      const palavrasImportantes = [
        'EXCETO', 'INCORRETO', 'CORRETO', 'VERDADEIRO', 'FALSO',
        'NÃO', 'SEMPRE', 'NUNCA', 'TODOS', 'NENHUM'
      ]
      
      palavrasImportantes.forEach(palavra => {
        const regex = new RegExp(`\\b${palavra}\\b`, 'gi')
        conteudo = conteudo.replace(
          regex,
          `<span class="font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1 rounded">${palavra}</span>`
        )
      })

      // 6. Destacar números e percentuais
      conteudo = conteudo.replace(
        /(\d+%|\d+\.\d+%)/g,
        '<span class="font-semibold text-orange-600 dark:text-orange-400">$1</span>'
      )

      // 7. Destacar anos
      conteudo = conteudo.replace(
        /\b(19\d{2}|20\d{2})\b/g,
        '<span class="font-medium text-indigo-600 dark:text-indigo-400">$1</span>'
      )

      // 8. Formatar itens numerados romanos (I, II, III, IV, etc.) - com ou sem ponto
      conteudo = conteudo.replace(
        /([IVX]+)\.?\s+([A-Z])/g,
        '<br><br><span class="font-semibold text-indigo-600 dark:text-indigo-400 block">$1.</span> $2'
      )

      // 9. Formatar itens com letras (a), b), c), etc. em listas
      conteudo = conteudo.replace(
        /([a-z])\)\s+([A-Z])/g,
        '<br><span class="font-medium text-gray-700 dark:text-gray-300 block mt-1">$1)</span> $2'
      )

      // 10. Quebrar linha antes de "Estão corretas:", "Assinale", etc.
      conteudo = conteudo.replace(
        /(Estão corretas?:|Assinale|Marque|Indique)/g,
        '<br><br><span class="font-semibold text-blue-600 dark:text-blue-400">$1</span>'
      )

      return (
        <p
          key={index}
          className={`${index > 0 ? 'mt-3' : ''} leading-relaxed`}
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