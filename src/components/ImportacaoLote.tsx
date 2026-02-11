'use client'

import { useState, useEffect } from 'react'
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Download, X, Tag } from 'lucide-react'
import { parseQuestao } from '@/lib/questaoParser'
import { createQuestao } from '@/lib/questoes'
import { getAssuntosByMateria } from '@/lib/materias'
import { notificarImportacaoLote } from '@/lib/notificacoes'
import { supabase } from '@/lib/supabase'

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

interface Assunto {
  id: string
  nome: string
  descricao?: string
  cor: string
}

export function ImportacaoLote({ materiaId, materiaNome, onClose, onSuccess }: ImportacaoLoteProps) {
  const [texto, setTexto] = useState('')
  const [questoes, setQuestoes] = useState<QuestaoImportada[]>([])
  const [processando, setProcessando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [etapa, setEtapa] = useState<'entrada' | 'assunto' | 'revisao' | 'importacao'>('entrada')
  
  // Estados para assuntos
  const [assuntos, setAssuntos] = useState<Assunto[]>([])
  const [assuntoSelecionado, setAssuntoSelecionado] = useState<string>('')
  const [carregandoAssuntos, setCarregandoAssuntos] = useState(false)

  // Carregar assuntos quando chegar na etapa de seleção
  useEffect(() => {
    if (etapa === 'assunto') {
      carregarAssuntos()
    }
  }, [etapa])

  const carregarAssuntos = async () => {
    setCarregandoAssuntos(true)
    try {
      const dadosAssuntos = await getAssuntosByMateria(materiaId)
      setAssuntos(dadosAssuntos)
    } catch (error) {
      console.error('Erro ao carregar assuntos:', error)
    } finally {
      setCarregandoAssuntos(false)
    }
  }

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
    setEtapa('assunto') // Ir para seleção de assunto
    setProcessando(false)
  }

  const prosseguirParaRevisao = () => {
    setEtapa('revisao')
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
  
        // NOVA DETECÇÃO INTELIGENTE DE RESPOSTA
        let respostaCertoErrado = null
        if (questaoItem.questao!.tipo === 'certo_errado') {
          // Primeiro, tentar usar a resposta detectada pelo parser
          if (questaoItem.questao!.respostaCertoErrado !== undefined) {
            respostaCertoErrado = questaoItem.questao!.respostaCertoErrado
            console.log('🎯 Usando resposta detectada pelo parser:', respostaCertoErrado ? 'CERTO' : 'ERRADO')
          } else {
            // Fallback: tentar detectar pela explicação (para compatibilidade)
            const explicacao = questaoItem.questao!.explicacao?.toLowerCase() || ''
            if (explicacao.includes('certo') || explicacao.includes('correto') || explicacao.includes('verdadeiro')) {
              respostaCertoErrado = true
              console.log('🔍 Fallback: detectado CERTO na explicação')
            } else if (explicacao.includes('errado') || explicacao.includes('incorreto') || explicacao.includes('falso')) {
              respostaCertoErrado = false
              console.log('🔍 Fallback: detectado ERRADO na explicação')
            } else {
              console.log('⚠️ Não foi possível detectar resposta - será importada sem gabarito')
            }
          }
        }
  
        const dadosQuestao = {
          materia_id: materiaId,
          enunciado: questaoItem.questao!.enunciado,
          tipo: questaoItem.questao!.tipo,
          explicacao: questaoItem.questao!.explicacao,
          alternativas: questaoItem.questao!.alternativas,
          resposta_certo_errado: respostaCertoErrado,
          assunto_id: assuntoSelecionado || undefined // Incluir assunto selecionado
        }
  
        const resultado = await createQuestao(dadosQuestao)
        
        if (resultado) {
          questaoItem.status = 'sucesso'
          console.log('✅ Questão importada com sucesso:', questaoItem.questao!.enunciado.substring(0, 50) + '...')
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
    
    // NOVO: Enviar notificação sobre importação em lote
    if (sucessos > 0) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await notificarImportacaoLote(materiaId, sucessos, user.id)
          console.log('🔔 Notificação de importação em lote enviada')
        }
      } catch (error) {
        console.error('Erro ao enviar notificação de importação:', error)
        // Não falhar a importação por causa da notificação
      }
      
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

  // ETAPA 1: ENTRADA DE TEXTO
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
                <li>• Você poderá escolher um assunto para todas as questões</li>
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

  {/* ETAPA 2: SELEÇÃO DE ASSUNTO */}
if (etapa === 'assunto') {
  const sucessos = questoes.filter(q => q.status !== 'erro').length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Selecionar Assunto
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {sucessos} questões processadas • {materiaNome}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-6 pb-4 flex-shrink-0">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-5 w-5 text-yellow-600" />
                <h3 className="font-medium text-yellow-900 dark:text-yellow-300">
                  Associar a um Assunto (Opcional)
                </h3>
              </div>
              <p className="text-sm text-yellow-800 dark:text-yellow-400">
                Você pode associar todas as questões a um assunto específico da matéria ou deixar sem assunto.
              </p>
            </div>
          </div>

          {/* Seletor de assunto com scroll */}
          <div className="flex-1 px-6 overflow-hidden">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Escolha um assunto:
            </label>
            
            {carregandoAssuntos ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando assuntos...</span>
              </div>
            ) : (
              <div className="h-80 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-3 space-y-3 bg-gray-50 dark:bg-gray-900">
                {/* Opção "Sem assunto" */}
                <label className="flex items-center p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-gray-300 dark:hover:border-gray-500 cursor-pointer transition-colors bg-white dark:bg-gray-800">
                  <input
                    type="radio"
                    name="assunto"
                    value=""
                    checked={assuntoSelecionado === ''}
                    onChange={(e) => setAssuntoSelecionado(e.target.value)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      📝 Sem assunto específico
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      As questões ficarão apenas na matéria
                    </div>
                  </div>
                </label>

                {/* Lista de assuntos */}
                {assuntos.map((assunto) => (
                  <label
                    key={assunto.id}
                    className="flex items-center p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-gray-300 dark:hover:border-gray-500 cursor-pointer transition-colors bg-white dark:bg-gray-800"
                  >
                    <input
                      type="radio"
                      name="assunto"
                      value={assunto.id}
                      checked={assuntoSelecionado === assunto.id}
                      onChange={(e) => setAssuntoSelecionado(e.target.value)}
                      className="mr-3"
                    />
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: assunto.cor }}
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {assunto.nome}
                        </div>
                        {assunto.descricao && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {assunto.descricao}
                          </div>
                        )}
                      </div>
                    </div>
                  </label>
                ))}

                {assuntos.length === 0 && (
                  <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                    <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum assunto cadastrado para esta matéria</p>
                    <p className="text-sm mt-1">As questões ficarão apenas na matéria</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Botões fixos no bottom */}
          <div className="flex gap-3 p-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <button
              onClick={() => setEtapa('entrada')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Voltar
            </button>
            
            <button
              onClick={prosseguirParaRevisao}
              className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Continuar para Revisão
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

  // ETAPA 3: REVISÃO
  if (etapa === 'revisao') {
    const sucessos = questoes.filter(q => q.status !== 'erro').length
    const erros = questoes.filter(q => q.status === 'erro').length
    const assuntoEscolhido = assuntos.find(a => a.id === assuntoSelecionado)

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Revisão das Questões
              </h2>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>{sucessos} questões válidas, {erros} com erro</p>
                {assuntoEscolhido ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: assuntoEscolhido.cor }}
                    />
                    <span>Assunto: {assuntoEscolhido.nome}</span>
                  </div>
                ) : (
                  <p>Sem assunto específico</p>
                )}
              </div>
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
                        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                          <span>
                            <strong>Tipo:</strong> {questao.questao.tipo === 'certo_errado' ? 'Certo/Errado' : 'Múltipla Escolha'}
                          </span>
                          {questao.questao.alternativas && (
                            <span>
                              <strong>Alternativas:</strong> {questao.questao.alternativas.length}
                            </span>
                          )}
                        </div>
                        
                        {/* ADICIONAR TODO ESTE BLOCO */}
                        {questao.questao.tipo === 'certo_errado' ? (
                          <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
                            questao.questao.respostaCertoErrado !== undefined
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                              : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                          }`}>
                            {questao.questao.respostaCertoErrado !== undefined ? (
                              <>
                                <span>✅</span>
                                <span>Gabarito detectado: {questao.questao.respostaCertoErrado ? 'CERTO' : 'ERRADO'}</span>
                              </>
                            ) : (
                              <>
                                <span>⚠️</span>
                                <span>Gabarito não detectado - será importada sem resposta</span>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
                            questao.questao.alternativas?.some((alt: any) => alt.correta)
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                              : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                          }`}>
                            {questao.questao.alternativas?.some((alt: any) => alt.correta) ? (
                              <>
                                <span>✅</span>
                                <span>Gabarito detectado automaticamente</span>
                              </>
                            ) : (
                              <>
                                <span>⚠️</span>
                                <span>Gabarito não detectado - marque manualmente após importar</span>
                              </>
                            )}
                          </div>
                        )}
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
              onClick={() => setEtapa('assunto')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Voltar
            </button>
            
            <button
              onClick={importarQuestoes}
              disabled={sucessos === 0}
              className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Importar {sucessos} Questões
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ETAPA 4: IMPORTAÇÃO (mantém o código existente)
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