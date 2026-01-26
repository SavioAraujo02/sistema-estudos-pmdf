'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Tag as TagIcon } from 'lucide-react'
import { getTags, createTag, Tag } from '@/lib/tags'

interface SeletorTagsProps {
  tagsSelecionadas: string[]
  onTagsChange: (tagIds: string[]) => void
  className?: string
}

export function SeletorTags({ tagsSelecionadas, onTagsChange, className = '' }: SeletorTagsProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [showNovaTag, setShowNovaTag] = useState(false)
  const [novaTagNome, setNovaTagNome] = useState('')
  const [novaTagCor, setNovaTagCor] = useState('#3B82F6')

  const cores = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308',
    '#22C55E', '#10B981', '#06B6D4', '#3B82F6',
    '#6366F1', '#8B5CF6', '#A855F7', '#EC4899'
  ]

  useEffect(() => {
    carregarTags()
  }, [])

  const carregarTags = async () => {
    const tagsData = await getTags()
    setTags(tagsData)
  }

  const handleToggleTag = (tagId: string) => {
    if (tagsSelecionadas.includes(tagId)) {
      onTagsChange(tagsSelecionadas.filter(id => id !== tagId))
    } else {
      onTagsChange([...tagsSelecionadas, tagId])
    }
  }

  const handleCriarTag = async () => {
    if (!novaTagNome.trim()) return

    const novaTag = await createTag(novaTagNome.trim(), novaTagCor)
    if (novaTag) {
      setTags([...tags, novaTag])
      onTagsChange([...tagsSelecionadas, novaTag.id])
      setNovaTagNome('')
      setShowNovaTag(false)
    }
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Tags
      </label>
      
      {/* Tags existentes */}
      <div className="flex flex-wrap gap-2 mb-3">
        {tags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => handleToggleTag(tag.id)}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-all ${
              tagsSelecionadas.includes(tag.id)
                ? 'text-white shadow-md transform scale-105'
                : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            style={{
              backgroundColor: tagsSelecionadas.includes(tag.id) ? tag.cor : undefined
            }}
          >
            <TagIcon className="h-3 w-3" />
            {tag.nome}
            {tagsSelecionadas.includes(tag.id) && (
              <X className="h-3 w-3 ml-1" />
            )}
          </button>
        ))}
      </div>

      {/* Botão para nova tag */}
      {!showNovaTag ? (
        <button
          onClick={() => setShowNovaTag(true)}
          className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova Tag
        </button>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={novaTagNome}
              onChange={(e) => setNovaTagNome(e.target.value)}
              placeholder="Nome da tag"
              className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleCriarTag()}
            />
          </div>
          
          <div className="flex gap-1 mb-2">
            {cores.map((cor) => (
              <button
                key={cor}
                onClick={() => setNovaTagCor(cor)}
                className={`w-6 h-6 rounded-full border-2 ${
                  novaTagCor === cor ? 'border-gray-900 dark:border-white' : 'border-gray-300 dark:border-gray-600'
                }`}
                style={{ backgroundColor: cor }}
              />
            ))}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleCriarTag}
              disabled={!novaTagNome.trim()}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Criar
            </button>
            <button
              onClick={() => {
                setShowNovaTag(false)
                setNovaTagNome('')
              }}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}