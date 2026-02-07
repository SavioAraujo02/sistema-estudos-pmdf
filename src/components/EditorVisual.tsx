'use client'

import { useState, useRef, useEffect } from 'react'
import { Bold, Italic, Underline, Code, Link, Eye, EyeOff, Highlighter } from 'lucide-react'

interface EditorVisualProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
}

export function EditorVisual({ 
  value, 
  onChange, 
  placeholder = "Digite seu comentário...", 
  className = "",
  minHeight = "100px"
}: EditorVisualProps) {
  const [showPreview, setShowPreview] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Função para inserir formatação
  const insertFormatting = (before: string, after: string = before) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    
    let newText
    if (selectedText) {
      // Se há texto selecionado, aplicar formatação
      newText = value.substring(0, start) + before + selectedText + after + value.substring(end)
    } else {
      // Se não há seleção, inserir marcadores
      newText = value.substring(0, start) + before + after + value.substring(end)
    }
    
    onChange(newText)
    
    // Reposicionar cursor
    setTimeout(() => {
      if (selectedText) {
        textarea.setSelectionRange(start + before.length, end + before.length)
      } else {
        textarea.setSelectionRange(start + before.length, start + before.length)
      }
      textarea.focus()
    }, 0)
  }

  // Função para inserir link
  const insertLink = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    
    const url = prompt('Digite a URL do link:')
    if (!url) return
    
    const linkText = selectedText || prompt('Digite o texto do link:') || 'link'
    const linkMarkdown = `[${linkText}](${url})`
    
    const newText = value.substring(0, start) + linkMarkdown + value.substring(end)
    onChange(newText)
    
    setTimeout(() => {
      textarea.setSelectionRange(start + linkMarkdown.length, start + linkMarkdown.length)
      textarea.focus()
    }, 0)
  }

  // Renderizar preview
  const renderPreview = (texto: string) => {
    return texto
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/__(.*?)__/g, '<u class="underline">$1</u>')
      .replace(/==(.*?)==/g, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>')
      .replace(/~~(.*?)~~/g, '<del class="line-through text-gray-500 dark:text-gray-400">$1</del>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1 rounded text-sm font-mono text-black dark:text-white">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300" target="_blank">$1</a>')
      .replace(/\n/g, '<br>')
  }

  return (
    <div className={`border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
        <button
          type="button"
          onClick={() => insertFormatting('**')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Negrito (Ctrl+B)"
        >
          <Bold className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
        
        <button
          type="button"
          onClick={() => insertFormatting('*')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Itálico (Ctrl+I)"
        >
          <Italic className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
        
        <button
          type="button"
          onClick={() => insertFormatting('__')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Sublinhado"
        >
          <Underline className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
        
        <button
          type="button"
          onClick={() => insertFormatting('==')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Destacar"
        >
          <Highlighter className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
        
        <button
          type="button"
          onClick={() => insertFormatting('`')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Código"
        >
          <Code className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
        
        <button
          type="button"
          onClick={insertLink}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Inserir Link"
        >
          <Link className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
        
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
        
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors ${
            showPreview ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''
          }`}
          title={showPreview ? 'Ocultar Preview' : 'Mostrar Preview'}
        >
          {showPreview ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4 text-gray-700 dark:text-gray-300" />
          )}
        </button>
      </div>

      {/* Editor/Preview */}
      <div className="relative">
        {showPreview ? (
          <div 
            className="p-3 prose prose-sm max-w-none text-black dark:text-white leading-relaxed bg-white dark:bg-gray-900"
            style={{ minHeight }}
            dangerouslySetInnerHTML={{ 
              __html: value ? renderPreview(value) : `<span class="text-gray-400">${placeholder}</span>`
            }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full p-3 bg-white dark:bg-gray-900 text-black dark:text-white resize-none focus:outline-none"
            style={{ minHeight }}
            onKeyDown={(e) => {
              // Atalhos de teclado
              if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                  case 'b':
                    e.preventDefault()
                    insertFormatting('**')
                    break
                  case 'i':
                    e.preventDefault()
                    insertFormatting('*')
                    break
                  case 'k':
                    e.preventDefault()
                    insertLink()
                    break
                }
              }
            }}
          />
        )}
      </div>

      {/* Dicas */}
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-600">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span>💡 Use os botões acima ou:</span>
            <span>Ctrl+B = <strong>negrito</strong></span>
            <span>Ctrl+I = <em>itálico</em></span>
            <span>Ctrl+K = link</span>
          </div>
          <span>{value.length} caracteres</span>
        </div>
      </div>
    </div>
  )
}