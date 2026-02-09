'use client'

import { useState, useRef } from 'react'
import { Upload, X, Image, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface UploadImagemProps {
  questaoId: string
  imagemAtual?: string
  onImagemUpload: (url: string, nome: string) => void
  onImagemRemover: () => void
}

export function UploadImagem({ 
  questaoId, 
  imagemAtual, 
  onImagemUpload, 
  onImagemRemover 
}: UploadImagemProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
  
    console.log('📁 Arquivo selecionado:', {
      name: file.name,
      size: file.size,
      type: file.type
    })
  
    // Validações
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione apenas arquivos de imagem.')
      return
    }
  
    if (file.size > 5 * 1024 * 1024) { // 5MB
      setError('A imagem deve ter no máximo 5MB.')
      return
    }
  
    setError(null)
    setUploading(true)
  
    try {
      // Verificar se o usuário está autenticado
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Usuário não autenticado. Faça login novamente.')
      }
  
      console.log('👤 Usuário autenticado:', user.email)
  
      // Gerar nome único para o arquivo
      const timestamp = Date.now()
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `questao_${questaoId}_${timestamp}.${extension}`
  
      console.log('📤 Iniciando upload:', fileName)
  
      // Upload para o Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('questoes-imagens')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })
  
      console.log('📤 Resultado do upload:', { data, uploadError })
  
      if (uploadError) {
        console.error('❌ Erro detalhado do upload:', uploadError)
        throw new Error(`Erro no upload: ${uploadError.message}`)
      }
  
      if (!data) {
        throw new Error('Upload realizado mas sem dados retornados')
      }
  
      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('questoes-imagens')
        .getPublicUrl(fileName)
  
      console.log('🔗 URL pública gerada:', publicUrl)
  
      // Se questaoId não é temporário, atualizar questão no banco
      if (questaoId !== 'temp-new-questao') {
        const { error: updateError } = await supabase
          .from('questoes')
          .update({
            imagem_url: publicUrl,
            imagem_nome: fileName
          })
          .eq('id', questaoId)
  
        if (updateError) {
          console.error('❌ Erro ao atualizar questão:', updateError)
          throw new Error(`Erro ao salvar referência: ${updateError.message}`)
        }
      }
  
      onImagemUpload(publicUrl, fileName)
      console.log('✅ Upload concluído com sucesso!')
  
    } catch (error: any) {
      console.error('❌ Erro completo no upload:', error)
      setError(error.message || 'Erro desconhecido ao enviar imagem.')
    } finally {
      setUploading(false)
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoverImagem = async () => {
    if (!imagemAtual) return

    setUploading(true)
    try {
      // Extrair nome do arquivo da URL
      const urlParts = imagemAtual.split('/')
      const fileName = urlParts[urlParts.length - 1]

      // Remover do storage
      const { error: deleteError } = await supabase.storage
        .from('questoes-imagens')
        .remove([fileName])

      if (deleteError) {
        console.warn('Aviso ao deletar arquivo:', deleteError)
        // Continuar mesmo se der erro no storage
      }

      // Remover referência do banco
      const { error: updateError } = await supabase
        .from('questoes')
        .update({
          imagem_url: null,
          imagem_nome: null
        })
        .eq('id', questaoId)

      if (updateError) {
        throw updateError
      }

      onImagemRemover()
      console.log('✅ Imagem removida com sucesso')

    } catch (error: any) {
      console.error('❌ Erro ao remover imagem:', error)
      setError(error.message || 'Erro ao remover imagem. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Imagem da Questão (opcional)
        </label>
        {imagemAtual && (
          <button
            type="button"
            onClick={handleRemoverImagem}
            disabled={uploading}
            className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            <X className="h-3 w-3" />
            Remover
          </button>
        )}
      </div>

      {/* Área de upload ou imagem atual */}
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
        {imagemAtual ? (
          <div className="space-y-3">
            <div className="relative">
              <img
                src={imagemAtual}
                alt="Imagem da questão"
                className="max-w-full h-auto max-h-64 mx-auto rounded-lg shadow-sm"
                onError={(e) => {
                  console.error('Erro ao carregar imagem:', imagemAtual)
                  e.currentTarget.src = '/placeholder-image.png' // Fallback
                }}
              />
            </div>
            <div className="text-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Substituir Imagem
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Clique para adicionar uma imagem à questão
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? 'Enviando...' : 'Selecionar Imagem'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input de arquivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Mensagem de erro */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Dicas */}
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>• Formatos aceitos: JPG, PNG, GIF, WebP</p>
        <p>• Tamanho máximo: 5MB</p>
        <p>• A imagem será exibida junto com o enunciado da questão</p>
      </div>
    </div>
  )
}