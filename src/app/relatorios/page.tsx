'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { getEstatisticasEstudo } from '@/lib/estudo'
import { getMateriasComEstatisticas } from '@/lib/materias'
import { BarChart3, TrendingUp, Clock, Target, Calendar, Award } from 'lucide-react'

export default function RelatoriosPage() {
  const [estatisticas, setEstatisticas] = useState<any>(null)
  const [materias, setMaterias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [periodoSelecionado, setPeriodoSelecionado] = useState('7') // dias

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setLoading(true)
    
    const [statsData, materiasData] = await Promise.all([
      getEstatisticasEstudo(),
      getMateriasComEstatisticas()
    ])
    
    setEstatisticas(statsData)
    setMaterias(materiasData)
    setLoading(false)
  }

  const getClassificacaoDesempenho = (percentual: number) => {
    if (percentual >= 90) return { texto: 'Excelente', cor: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20' }
    if (percentual >= 80) return { texto: 'Muito Bom', cor: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/20' }
    if (percentual >= 70) return { texto: 'Bom', cor: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/20' }
    if (percentual >= 60) return { texto: 'Regular', cor: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/20' }
    return { texto: 'Precisa Melhorar', cor: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/20' }
  }

  if (loading) {
    return (
      <DashboardLayout title="Relatórios">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  const classificacao = getClassificacaoDesempenho(estatisticas?.percentualAcertos || 0)

  return (
    <DashboardLayout title="Relatórios">
      <div className="space-y-6">
        {/* Header com Resumo Geral */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-6 rounded-lg text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center md:text-left">
              <h2 className="text-xl sm:text-2xl font-bold mb-2">Relatório de Desempenho</h2>
              <p className="text-purple-100">Análise completa dos seus estudos</p>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold">{estatisticas?.percentualAcertos || 0}%</div>
              <div className="text-purple-100">Taxa Geral de Acertos</div>
            </div>
            <div className="text-center">
              <div className={`inline-block px-4 py-2 rounded-full ${classificacao.bg} ${classificacao.cor} font-medium`}>
                {classificacao.texto}
              </div>
            </div>
          </div>
        </div>

        {/* Estatísticas Detalhadas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Respondidas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{estatisticas?.totalRespostas || 0}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Acertos</p>
                <p className="text-2xl font-bold text-green-600">{estatisticas?.acertos || 0}</p>
              </div>
              <Award className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Erros</p>
                <p className="text-2xl font-bold text-red-600">
                  {(estatisticas?.totalRespostas || 0) - (estatisticas?.acertos || 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Matérias</p>
                <p className="text-2xl font-bold text-purple-600">{materias.length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Desempenho por Matéria */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            📊 Desempenho Detalhado por Matéria
          </h3>
          
          <div className="space-y-4">
            {materias.map((materia) => {
              const classificacaoMateria = getClassificacaoDesempenho(materia.percentual_acertos)
              return (
                <div key={materia.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">{materia.nome}</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Questões:</span>
                          <span className="ml-1 font-medium">{materia.questoes_count}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Respondidas:</span>
                          <span className="ml-1 font-medium">{materia.total_respostas}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Acertos:</span>
                          <span className="ml-1 font-medium text-green-600">
                            {Math.round((materia.percentual_acertos / 100) * materia.total_respostas)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Taxa:</span>
                          <span className={`ml-1 font-medium ${classificacaoMateria.cor}`}>
                            {materia.total_respostas > 0 ? `${materia.percentual_acertos}%` : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:items-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${classificacaoMateria.bg} ${classificacaoMateria.cor}`}>
                        {materia.total_respostas > 0 ? classificacaoMateria.texto : 'Sem dados'}
                      </span>
                      
                      {materia.total_respostas > 0 && (
                        <div className="w-full sm:w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              materia.percentual_acertos >= 80 ? 'bg-green-500' :
                              materia.percentual_acertos >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.max(materia.percentual_acertos, 5)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {materias.length === 0 && (
            <div className="text-center py-12">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Nenhum dado disponível
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Comece estudando para ver seus relatórios aqui.
              </p>
            </div>
          )}
        </div>

        {/* Recomendações */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-4">
            💡 Recomendações de Estudo
          </h3>
          
          <div className="space-y-3">
            {estatisticas?.totalRespostas === 0 ? (
              <p className="text-blue-800 dark:text-blue-400">
                • Comece respondendo algumas questões para receber recomendações personalizadas
              </p>
            ) : (
              <>
                {estatisticas.percentualAcertos < 70 && (
                  <p className="text-blue-800 dark:text-blue-400">
                    • Foque em revisar os conceitos básicos das matérias com menor desempenho
                  </p>
                )}
                
                {materias.some(m => m.percentual_acertos < 60 && m.total_respostas > 0) && (
                  <p className="text-blue-800 dark:text-blue-400">
                    • Dedique mais tempo às matérias com taxa de acerto abaixo de 60%
                  </p>
                )}
                
                <p className="text-blue-800 dark:text-blue-400">
                  • Continue praticando regularmente para manter o ritmo de estudos
                </p>
                
                {estatisticas.percentualAcertos >= 80 && (
                  <p className="text-blue-800 dark:text-blue-400">
                    • Excelente desempenho! Continue assim e explore questões mais desafiadoras
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}