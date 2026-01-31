'use client'

import { useState } from 'react'
import { EditorRico } from '@/components/EditorRico'

export default function TesteEditor() {
  const [conteudo, setConteudo] = useState('')

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Teste do Editor Rico</h1>
      
      <EditorRico
        value={conteudo}
        onChange={setConteudo}
        placeholder="Digite seu comentário aqui..."
        className="mb-4"
      />
      
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h3 className="font-bold">Conteúdo HTML:</h3>
        <pre className="text-sm">{conteudo}</pre>
      </div>
    </div>
  )
}