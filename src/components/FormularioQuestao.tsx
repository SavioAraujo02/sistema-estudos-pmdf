'use client'

import { useState } from 'react'
import { X, Plus, Trash2, Loader2, Wand2, FileText, HelpCircle } from 'lucide-react'
import { createQuestao } from '@/lib/questoes'
import { parseQuestao, getExemplosFormato } from '@/lib/questaoParser'

interface FormularioQuestaoProps {
  materiaId: string
  materiaNome: string
  onClose: () => void
  onSuccess: () => void
}

interface Alternativa {
  texto: string
  correta: boolean
}

export function FormularioQuestao({ materiaId, materiaNome, onClose, onSuccess }: FormularioQuestaoProps) {
  const [modo, setModo] = useState<'manual' | 'automatico'>('automatico')
  const [textoCompleto, setTextoCompleto] = useState('')
  const [enunciado, setEnunciado] = useState('')
  const [tipo, setTipo] = useState<'certo_errado' | 'multipla_escolha'>('certo_errado')
  const [explicacao, setExplicacao] = useState('')
  const [alternativas, setAlternativas] = useState<Alternativa[]>([
    { texto: '', correta: true },
    { texto: '', correta: false },
    { texto: '', correta: false },
    { texto: '', correta: false }
  ])
  const [respostaCertoErrado, setRespostaCertoErrado] = useState<boolean | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [showExemplos, setShowExemplos] = useState(false)

  const processarTextoAutomatico = () => {
    const questaoParseada = parseQuestao(textoCompleto)
    
    if (questaoParseada) {
      setEnunciado(questaoParseada.enunciado)
      setTipo(questaoParseada.tipo)
      setExplicacao(questaoParseada.explicacao || '')
      
      if (questaoParseada.alternativas) {
        setAlternativas(questaoParseada.alternativas)
      }
      
      alert('Questão processada com sucesso! Verifique os dados e salve.')
    } else {
      alert('Não foi possível processar o texto. Verifique o formato.')
    }
  }

  const adicionarAlternativa = () => {
    setAlternativas([...alternativas, { texto: '', correta: false }])
  }

  const removerAlternativa = (index: number) => {
    if (alternativas.length > 2) {
      setAlternativas(alternativas.filter((_, i) => i !== index))
    }
  }

  const atualizarAlternativa = (index: number, campo: 'texto' | 'correta', valor: string | boolean) => {
    const novasAlternativas = [...alternativas]
    
    if (campo === 'correta' && valor === true) {
      // Se marcou como correta, desmarcar as outras
      novasAlternativas.forEach((alt, i) => {
        alt.correta = i === index
      })
    } else if (campo === 'texto') {
      novasAlternativas[index].texto = valor as string
    } else if (campo === 'correta') {
      novasAlternativas[index].correta = valor as boolean
    }
    
    setAlternativas(novasAlternativas)
  }

  const validarFormulario = () => {
    if (!enunciado.trim()) return 'Enunciado é obrigatório'
    
    if (tipo === 'multipla_escolha') {
      const alternativasPreenchidas = alternativas.filter(alt => alt.texto.trim())
      if (alternativasPreenchidas.length < 2) return 'Mínimo 2 alternativas'
      
      const temCorreta = alternativas.some(alt => alt.correta && alt.texto.trim())
      if (!temCorreta) return 'Marque uma alternativa como correta'
    } else if (tipo === 'certo_errado') {
      if (respostaCertoErrado === null) return 'Selecione se a resposta é Certo ou Errado'
    }
    
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const erro = validarFormulario()
    if (erro) {
      alert(erro)
      return
    }

    setSalvando(true)

    const dadosQuestao = {
      materia_id: materiaId,
      enunciado: enunciado.trim(),
      tipo,
      explicacao: explicacao.trim() || undefined,
      resposta_certo_errado: tipo === 'certo_errado' ? respostaCertoErrado : null,
      alternativas: tipo === 'multipla_escolha' 
        ? alternativas.filter(alt => alt.texto.trim())
        : undefined
    }

    const resultado = await createQuestao(dadosQuestao)
    
    if (resultado) {
      onSuccess()
      onClose()
    } else {
      alert('Erro ao salvar questão. Tente novamente.')
    }
    
    setSalvando(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Nova Questão
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

        {/* Seletor de modo */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-4">
            <button
              onClick={() => setModo('automatico')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                modo === 'automatico'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Wand2 className="h-4 w-4" />
              Modo Automático
            </button>
            <button
              onClick={() => setModo('manual')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                modo === 'manual'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <FileText className="h-4 w-4" />
              Modo Manual
            </button>
            <button
              onClick={() => setShowExemplos(!showExemplos)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
              Exemplos
            </button>
          </div>
        </div>

                {/* Exemplos */}
                {showExemplos && (
          <div className="p-6 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {getExemplosFormato()}
            </pre>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {modo === 'automatico' ? (
            /* Modo Automático */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cole a questão completa aqui:
                </label>
                <textarea
                  value={textoCompleto}
                  onChange={(e) => setTextoCompleto(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={8}
                  placeholder="Cole aqui o texto completo da questão com alternativas e explicação..."
                />
              </div>
              
              <button
                type="button"
                onClick={processarTextoAutomatico}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Wand2 className="h-4 w-4" />
                Processar Questão
              </button>
            </div>
          ) : null}

          {/* Campos processados/manuais */}
          {(modo === 'manual' || enunciado) && (
            <>
              {/* Enunciado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Enunciado da Questão *
                </label>
                <textarea
                  value={enunciado}
                  onChange={(e) => setEnunciado(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Digite o enunciado da questão..."
                  required
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de Questão
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="certo_errado"
                      checked={tipo === 'certo_errado'}
                      onChange={(e) => setTipo(e.target.value as any)}
                      className="mr-2"
                    />
                    Certo/Errado
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="multipla_escolha"
                      checked={tipo === 'multipla_escolha'}
                      onChange={(e) => setTipo(e.target.value as any)}
                      className="mr-2"
                    />
                    Múltipla Escolha
                  </label>
                </div>
              </div>
              {/* Resposta para Certo/Errado */}
              {tipo === 'certo_errado' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Resposta Correta *
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setRespostaCertoErrado(true)}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        respostaCertoErrado === true
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-2xl">✅</span>
                        <span className="font-medium">CERTO</span>
                      </div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setRespostaCertoErrado(false)}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        respostaCertoErrado === false
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-2xl">❌</span>
                        <span className="font-medium">ERRADO</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Alternativas (só para múltipla escolha) */}
              {tipo === 'multipla_escolha' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Alternativas
                    </label>
                    <button
                      type="button"
                      onClick={adicionarAlternativa}
                      className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {alternativas.map((alternativa, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500 w-6">
                          {String.fromCharCode(65 + index)})
                        </span>
                        <input
                          type="text"
                          value={alternativa.texto}
                          onChange={(e) => atualizarAlternativa(index, 'texto', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Alternativa ${String.fromCharCode(65 + index)}`}
                        />
                        <label className="flex items-center gap-1">
                          <input
                            type="radio"
                            name="alternativa_correta"
                            checked={alternativa.correta}
                            onChange={() => atualizarAlternativa(index, 'correta', true)}
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-400">Correta</span>
                        </label>
                        {alternativas.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removerAlternativa(index)}
                            className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Explicação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Explicação/Comentário (opcional)
                </label>
                <textarea
                  value={explicacao}
                  onChange={(e) => setExplicacao(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Explique a resposta correta, cite jurisprudência, dicas..."
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  disabled={salvando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar Questão
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}