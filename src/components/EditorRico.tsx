'use client'

import { useState } from 'react'
import { Bold, Italic, Underline, List, Link2, Code, Highlighter, Quote, Type } from 'lucide-react'

interface EditorRicoProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function EditorRico({ value, onChange, placeholder, className }: EditorRicoProps) {
  const [isPreview, setIsPreview] = useState(false)

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end)
    onChange(newText)
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length)
    }, 0)
  }

  const renderPreview = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/==(.*?)==/g, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>')
      .replace(/~~(.*?)~~/g, '<del class="line-through text-gray-500 dark:text-gray-400">$1</del>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1 rounded text-sm font-mono text-black dark:text-white">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300" target="_blank">$1</a>')
      .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400 my-2">$1</blockquote>')
      .replace(/\n/g, '<br>')
  }

  return (
    <div className={`border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 flex-wrap">
        <button
          type="button"
          onClick={() => insertMarkdown('**', '**')}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors text-black dark:text-white"
          title="Negrito (**texto**)"
        >
          <Bold className="h-4 w-4" />
        </button>
        
        <button
          type="button"
          onClick={() => insertMarkdown('*', '*')}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors text-black dark:text-white"
          title="Itálico (*texto*)"
        >
          <Italic className="h-4 w-4" />
        </button>
        
        <button
          type="button"
          onClick={() => insertMarkdown('__', '__')}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors text-black dark:text-white"
          title="Sublinhado (__texto__)"
        >
          <Underline className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => insertMarkdown('==', '==')}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
          title="Marcar texto (==texto==)"
        >
          <Highlighter className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => insertMarkdown('~~', '~~')}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors text-black dark:text-white"
          title="Riscar texto (~~texto~~)"
        >
          <Type className="h-4 w-4" />
        </button>
        
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
        
        <button
          type="button"
          onClick={() => insertMarkdown('`', '`')}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors text-black dark:text-white"
          title="Código (`código`)"
        >
          <Code className="h-4 w-4" />
        </button>
        
        <button
          type="button"
          onClick={() => insertMarkdown('[texto](', ')')}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors text-black dark:text-white"
          title="Link ([texto](url))"
        >
          <Link2 className="h-4 w-4" />
        </button>
        
        <button
          type="button"
          onClick={() => insertMarkdown('- ', '')}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors text-black dark:text-white"
          title="Lista (- item)"
        >
          <List className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => insertMarkdown('> ', '')}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors text-black dark:text-white"
          title="Citação (> texto)"
        >
          <Quote className="h-4 w-4" />
        </button>
        
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            onClick={() => setIsPreview(false)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              !isPreview 
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-black dark:text-white'
            }`}
          >
            ✏️ Editar
          </button>
          <button
            type="button"
            onClick={() => setIsPreview(true)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              isPreview 
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-black dark:text-white'
            }`}
          >
            👁️ Preview
          </button>
        </div>
      </div>

      {/* Editor/Preview */}
      <div className="min-h-[120px]">
        {isPreview ? (
          <div 
            className="p-3 prose prose-sm max-w-none text-black dark:text-white"
            dangerouslySetInnerHTML={{ __html: renderPreview(value) }}
          />
        ) : (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-32 p-3 resize-none border-none outline-none focus:ring-0 bg-white dark:bg-gray-800 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            style={{ fontFamily: 'inherit' }}
          />
        )}
      </div>

      {/* Dicas */}
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border-t border-gray-300 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-400">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          <div>
            <strong>Formatação:</strong> **negrito** | *itálico* | __sublinhado__
          </div>
          <div>
            <strong>Destaque:</strong> ==marcado== | ~~riscado~~ | `código`
          </div>
        </div>
      </div>
    </div>
  )
}