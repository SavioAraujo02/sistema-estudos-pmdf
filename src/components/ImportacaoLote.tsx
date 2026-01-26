'use client'

import { useState } from 'react'
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Download, X } from 'lucide-react'
import { parseQuestao } from '@/lib/questaoParser'
import { createQuestao } from '@/lib/questoes'

interface ImportacaoLoteProps {
  materiaId: string
  materiaNome: string
  onClose: () => void
  onSuccess: () => void
}

interface QuestaoImportada {
  id: string
  texto: string
  questao?: any
  status: 'pendente' | 'sucesso' | 'erro'
  erro?: string
}

export function ImportacaoLote({ materiaId, materiaNome, onClose, onSuccess }: ImportacaoLoteProps) {
  const [texto, setTexto] = useState('')
  const [questoes, setQuestoes] = useState<QuestaoImportada[]>([])
  const [processando, setProcessando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [etapa, setEtapa] = useState<'entrada' | 'revisao' | 'importacao'>('entrada')

  const processarTexto = () => {
    setProcessando(true)
    
    // Dividir o texto em blocos de questões
    const blocos = texto
      .split(/\n\s*\n\s*\n/) // Dividir por linhas duplas em branco
      .filter(bloco => bloco.trim())
      .map(bloco => bloco.trim())

    const questoesProcessadas: QuestaoImportada[] = blocos.map((bloco, index) => {
      const id = `questao_${index + 1}`
      
      try {
        const questaoParseada = parseQuestao(bloco)
        
        if (questaoParseada) {
          return {
            id,
            texto: bloco,
            questao: questaoParseada,
            status: 'pendente' as const
          }
        } else {
          return {
            id,
            texto: bloco,
            status: 'erro' as const,
            erro: 'Não foi possível processar esta questão'
          }
        }
      } catch (error) {
        return {
          id,
          texto: bloco,
          status: 'erro' as const,
          erro: 'Erro ao processar: ' + (error as Error).message
        }
      }
    })

    setQuestoes(questoesProcessadas)
    setEtapa('revisao')
    setProcessando(false)
  }

  const importarQuestoes = async () => {
    setImportando(true)
    setEtapa('importacao')

    const questoesValidas = questoes.filter(q => q.questao && q.status !== 'erro')
    
    for (let i = 0; i < questoesValidas.length; i++) {
      const questaoItem = questoesValidas[i]
      
      try {
        // Verificar se materiaId é válido
        if (!materiaId || materiaId.trim() === '') {
          questaoItem.status = 'erro'
          questaoItem.erro = 'Matéria não selecionada'
          continue
        }

        const dadosQuestao = {
          materia_id: materiaId,
          enunciado: questaoItem.questao!.enunciado,
          tipo: questaoItem.questao!.tipo,
          explicacao: questaoItem.questao!.explicacao,
          alternativas: questaoItem.questao!.alternativas
        }

        const resultado = await createQuestao(dadosQuestao)
        
        if (resultado) {
          questaoItem.status = 'sucesso'
        } else {
          questaoItem.status = 'erro'
          questaoItem.erro = 'Erro ao salvar no banco de dados'
        }
      } catch (error) {
        questaoItem.status = 'erro'
        questaoItem.erro = 'Erro: ' + (error as Error).message
      }

      // Atualizar estado para mostrar progresso
      setQuestoes([...questoes])
      
      // Pequena pausa para não sobrecarregar o banco
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    setImportando(false)
    
    // Verificar se todas foram importadas com sucesso
    const sucessos = questoes.filter(q => q.status === 'sucesso').length
    const erros = questoes.filter(q => q.status === 'erro').length
    
    alert(`Importação concluída!\n✅ ${sucessos} questões importadas\n❌ ${erros} erros`)
    
    if (sucessos > 0) {
      onSuccess()
    }
  }

  const getExemplo = () => {
    return `De acordo com o art. 2º da Portaria PMDF nº 1.435/2025, o Regulamento de Continências tem como finalidade, EXCETO:
a) Estabelecer honras, continências e sinais de respeito aos símbolos nacionais e autoridades
b) Regular normas de apresentação, procedimento, formas de tratamento e precedência
c) Fixar as honras que constituem o Cerimonial Militar da PMDF
d) Regulamentar procedimentos operacionais de abordagem policial
e) Aplicar-se às situações diárias da vida castrense

Comentários: O Regulamento não trata de procedimentos operacionais, mas sim de continências, honras e cerimonial (art. 2º). Gabarito: D


A Constituição Federal de 1988 estabelece que todos são iguais perante a lei.

Comentários: Correto. Artigo 5º da CF/88.


Segundo o material, a técnica policial responde à pergunta:
a) O que fazer?
b) Quando fazer?
c) Onde fazer?
d) Como fazer?
e) Por que fazer?

Comentários: O material estabelece claramente que "Técnica responde à pergunta: como fazer?" referindo-se à execução correta do procedimento. Gabarito: D`
  }

  if (etapa === 'entrada') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Importação em Lote
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {materiaNome}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="p-6 space-y-6">
            {/* Instruções */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">📋 Como usar:</h3>
              <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                <li>• Cole várias questões separadas por <strong>duas linhas em branco</strong></li>
                <li>• Use o mesmo formato das questões individuais</li>
                <li>• Inclua "Comentários:" e "Gabarito:" quando necessário</li>
                <li>• O sistema vai processar automaticamente cada questão</li>
              </ul>
            </div>

            {/* Área de texto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cole as questões aqui:
              </label>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                className="w-full h-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="Cole suas questões aqui..."
              />
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={() => setTexto(getExemplo())}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Carregar Exemplo
              </button>
              
              <button
                onClick={processarTexto}
                disabled={!texto.trim() || processando}
                className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Processar Questões
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (etapa === 'revisao') {
    const sucessos = questoes.filter(q => q.status !== 'erro').length
    const erros = questoes.filter(q => q.status === 'erro').length

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Revisão das Questões
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {sucessos} questões válidas, {erros} com erro
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Lista de questões */}
          <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
            {questoes.map((questao, index) => (
              <div
                key={questao.id}
                className={`p-4 rounded-lg border-2 ${
                  questao.status === 'erro'
                    ? 'border-red-200 bg-red-50 dark:bg-red-900/20'
                    : 'border-green-200 bg-green-50 dark:bg-green-900/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {questao.status === 'erro' ? (
                      <XCircle className="h-5 w-5 text-red-600" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Questão {index + 1}
                    </h4>
                    
                    {questao.questao ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Enunciado:</strong> {questao.questao.enunciado.substring(0, 100)}...
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          <strong>Tipo:</strong> {questao.questao.tipo === 'certo_errado' ? 'Certo/Errado' : 'Múltipla Escolha'}
                          {questao.questao.alternativas && (
                            <span> | <strong>Alternativas:</strong> {questao.questao.alternativas.length}</span>
                          )}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-red-700 dark:text-red-300">
                          <strong>Erro:</strong> {questao.erro}
                        </p>
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-600 dark:text-gray-400">Ver texto original</summary>
                          <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-x-auto">
                            {questao.texto}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Botões */}
          <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setEtapa('entrada')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Voltar
            </button>
            
            <button
              onClick={importarQuestoes}
              disabled={sucessos === 0}
              className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >              <Upload className="h-4 w-4" />
              Importar {sucessos} Questões Válidas
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (etapa === 'importacao') {
    const sucessos = questoes.filter(q => q.status === 'sucesso').length
    const erros = questoes.filter(q => q.status === 'erro').length
    const processadas = sucessos + erros
    const total = questoes.filter(q => q.questao).length

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 text-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {importando ? 'Importando Questões...' : 'Importação Concluída!'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {processadas} de {total} questões processadas
            </p>
          </div>

          {/* Progresso */}
          <div className="p-6 space-y-6">
            {/* Barra de progresso */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Progresso</span>
                <span>{Math.round((processadas / total) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(processadas / total) * 100}%` }}
                />
              </div>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{sucessos}</div>
                <div className="text-sm text-green-800 dark:text-green-300">Importadas</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{erros}</div>
                <div className="text-sm text-red-800 dark:text-red-300">Erros</div>
              </div>
            </div>

            {/* Lista de questões processadas */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {questoes
                .filter(q => q.questao)
                .map((questao, index) => (
                <div
                  key={questao.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    questao.status === 'sucesso'
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : questao.status === 'erro'
                      ? 'bg-red-50 dark:bg-red-900/20'
                      : 'bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {questao.status === 'sucesso' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : questao.status === 'erro' ? (
                      <XCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      Questão {index + 1}: {questao.questao?.enunciado.substring(0, 50)}...
                    </p>
                    {questao.erro && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {questao.erro}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Botões */}
            {!importando && (
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Concluir
                </button>
                {erros > 0 && (
                  <button
                    onClick={() => setEtapa('entrada')}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Importar Mais
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}