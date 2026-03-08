import jsPDF from 'jspdf'

interface DadosPessoais {
  nome: string
  cpf?: string
  pelotao?: string
  email?: string
}

interface PerformanceMateria {
  nome: string
  totalRespostas: number
  acertos: number
  percentual: number
}

interface DadosRelatorio {
  usuario: DadosPessoais
  resumo: {
    totalRespostas: number
    acertos: number
    percentualAcertos: number
    tempoMedioSegundos: number
    questoesHoje: number
    diasConsecutivos: number
    melhorSequencia: number
  }
  materias: PerformanceMateria[]
  ranking: {
    posicao: number
    totalParticipantes: number
  }
  conquistas: {
    nome: string
    desbloqueada: boolean
    icone: string
  }[]
  diasEstudados: string[] // array de datas 'YYYY-MM-DD'
}

const CORES = {
  azulEscuro: [30, 58, 138] as [number, number, number],
  azulMedio: [59, 130, 246] as [number, number, number],
  verde: [34, 197, 94] as [number, number, number],
  vermelho: [239, 68, 68] as [number, number, number],
  amarelo: [245, 158, 11] as [number, number, number],
  cinzaEscuro: [55, 65, 81] as [number, number, number],
  cinzaMedio: [107, 114, 128] as [number, number, number],
  cinzaClaro: [243, 244, 246] as [number, number, number],
  branco: [255, 255, 255] as [number, number, number],
}

function limparTexto(texto: string): string {
  return texto.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim()
}

export function gerarPdfRelatorio(dados: DadosRelatorio) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const ml = 15
  const mr = 15
  const cw = pw - ml - mr
  let y = 0

  const verificarPagina = (alt: number) => {
    if (y + alt > ph - 20) {
      doc.addPage()
      y = 15
    }
  }

  // ==========================================
  // CAPA
  // ==========================================
  doc.setFillColor(...CORES.azulEscuro)
  doc.rect(0, 0, pw, 55, 'F')

  doc.setTextColor(...CORES.branco)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('Relatório de Desempenho', pw / 2, 20, { align: 'center' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('Sistema de Estudos CFP - PMDF', pw / 2, 30, { align: 'center' })

  doc.setFontSize(10)
  const dataHoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
  doc.text(dataHoje, pw / 2, 40, { align: 'center' })

  y = 65

  // ==========================================
  // DADOS PESSOAIS
  // ==========================================
  doc.setFillColor(...CORES.cinzaClaro)
  doc.roundedRect(ml, y, cw, 22, 3, 3, 'F')

  doc.setTextColor(...CORES.cinzaEscuro)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Aluno:', ml + 5, y + 8)
  doc.setFont('helvetica', 'normal')
  doc.text(dados.usuario.nome, ml + 22, y + 8)

  if (dados.usuario.cpf) {
    doc.setFont('helvetica', 'bold')
    doc.text('CPF:', ml + 5, y + 15)
    doc.setFont('helvetica', 'normal')
    doc.text(dados.usuario.cpf, ml + 18, y + 15)
  }

  if (dados.usuario.pelotao) {
    doc.setFont('helvetica', 'bold')
    doc.text('Pelotão:', ml + 70, y + 15)
    doc.setFont('helvetica', 'normal')
    doc.text(dados.usuario.pelotao, ml + 90, y + 15)
  }

  y += 30

  // ==========================================
  // RESUMO GERAL
  // ==========================================
  doc.setTextColor(...CORES.azulEscuro)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumo Geral', ml, y)
  y += 3

  doc.setDrawColor(...CORES.azulMedio)
  doc.setLineWidth(0.5)
  doc.line(ml, y, pw - mr, y)
  y += 8

  // Grid 2x3
  const boxW = cw / 3
  const boxH = 20
  const boxes = [
    { label: 'Respondidas', valor: String(dados.resumo.totalRespostas), cor: CORES.azulMedio },
    { label: 'Acertos', valor: String(dados.resumo.acertos), cor: CORES.verde },
    { label: 'Taxa de Acertos', valor: `${dados.resumo.percentualAcertos}%`, cor: dados.resumo.percentualAcertos >= 70 ? CORES.verde : dados.resumo.percentualAcertos >= 50 ? CORES.amarelo : CORES.vermelho },
    { label: 'Tempo Médio', valor: `${dados.resumo.tempoMedioSegundos}s`, cor: CORES.azulMedio },
    { label: 'Dias Consecutivos', valor: String(dados.resumo.diasConsecutivos), cor: CORES.amarelo },
    { label: 'Melhor Sequência', valor: String(dados.resumo.melhorSequencia), cor: CORES.verde },
  ]

  boxes.forEach((box, idx) => {
    const col = idx % 3
    const row = Math.floor(idx / 3)
    const x = ml + col * boxW
    const bY = y + row * (boxH + 3)

    doc.setFillColor(245, 247, 250)
    doc.roundedRect(x + 1, bY, boxW - 2, boxH, 2, 2, 'F')

    doc.setTextColor(...box.cor)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(box.valor, x + boxW / 2, bY + 10, { align: 'center' })

    doc.setTextColor(...CORES.cinzaMedio)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(box.label, x + boxW / 2, bY + 17, { align: 'center' })
  })

  y += 2 * (boxH + 3) + 10

  // ==========================================
  // RANKING
  // ==========================================
  doc.setFillColor(255, 251, 235)
  doc.roundedRect(ml, y, cw, 16, 3, 3, 'F')

  doc.setTextColor(...CORES.cinzaEscuro)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  const medalha = dados.ranking.posicao <= 3
    ? ['', '1o lugar!', '2o lugar!', '3o lugar!'][dados.ranking.posicao]
    : `${dados.ranking.posicao}o lugar`
  doc.text(
    `Ranking: ${medalha} de ${dados.ranking.totalParticipantes} estudantes`,
    pw / 2, y + 10, { align: 'center' }
  )

  y += 24

  // ==========================================
  // PERFORMANCE POR MATÉRIA
  // ==========================================
  verificarPagina(20)
  doc.setTextColor(...CORES.azulEscuro)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Performance por Matéria', ml, y)
  y += 3
  doc.setDrawColor(...CORES.azulMedio)
  doc.line(ml, y, pw - mr, y)
  y += 8

  // Cabeçalho
  doc.setFillColor(...CORES.cinzaClaro)
  doc.rect(ml, y - 4, cw, 8, 'F')
  doc.setTextColor(...CORES.cinzaEscuro)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Matéria', ml + 3, y)
  doc.text('Resp.', ml + 95, y)
  doc.text('Acertos', ml + 115, y)
  doc.text('Taxa', ml + 140, y)
  doc.text('Progresso', ml + 158, y)
  y += 6

  const materiasOrdenadas = [...dados.materias].sort((a, b) => b.totalRespostas - a.totalRespostas)

  materiasOrdenadas.forEach(mat => {
    verificarPagina(10)

    doc.setTextColor(...CORES.cinzaEscuro)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')

    const nomeTruncado = mat.nome.length > 30 ? mat.nome.substring(0, 28) + '..' : mat.nome
    doc.text(nomeTruncado, ml + 3, y)
    doc.text(String(mat.totalRespostas), ml + 97, y)
    doc.text(String(mat.acertos), ml + 120, y)

    // Taxa com cor
    const cor = mat.percentual >= 70 ? CORES.verde : mat.percentual >= 50 ? CORES.amarelo : CORES.vermelho
    doc.setTextColor(...cor)
    doc.setFont('helvetica', 'bold')
    doc.text(mat.totalRespostas > 0 ? `${mat.percentual}%` : '-', ml + 142, y)

    // Barra de progresso
    const barX = ml + 155
    const barW = cw - 155 + ml - 5
    doc.setFillColor(230, 230, 230)
    doc.roundedRect(barX, y - 3, barW, 4, 1, 1, 'F')

    if (mat.totalRespostas > 0) {
      doc.setFillColor(...cor)
      doc.roundedRect(barX, y - 3, Math.max((mat.percentual / 100) * barW, 2), 4, 1, 1, 'F')
    }

    y += 7
  })

  y += 5

  // ==========================================
  // TOP 5 MATÉRIAS MAIS FRACAS
  // ==========================================
  const fracas = materiasOrdenadas
    .filter(m => m.totalRespostas >= 3 && m.percentual < 70)
    .sort((a, b) => a.percentual - b.percentual)
    .slice(0, 5)

  if (fracas.length > 0) {
    verificarPagina(30)

    doc.setTextColor(...CORES.vermelho)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Pontos a Melhorar', ml, y)
    y += 3
    doc.setDrawColor(...CORES.vermelho)
    doc.line(ml, y, pw - mr, y)
    y += 8

    fracas.forEach((mat, idx) => {
      verificarPagina(8)
      doc.setTextColor(...CORES.cinzaEscuro)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`${idx + 1}. ${mat.nome}`, ml + 3, y)
      doc.setTextColor(...CORES.vermelho)
      doc.setFont('helvetica', 'bold')
      doc.text(`${mat.percentual}% acertos (${mat.totalRespostas} questões)`, ml + 100, y)
      y += 7
    })

    y += 5
  }

  // ==========================================
  // CALENDÁRIO DE DIAS ESTUDADOS
  // ==========================================
  verificarPagina(50)

  doc.setTextColor(...CORES.azulEscuro)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Histórico de Estudos (Últimos 30 dias)', ml, y)
  y += 3
  doc.setDrawColor(...CORES.azulMedio)
  doc.line(ml, y, pw - mr, y)
  y += 8

  // Grid de 30 dias
  const hoje = new Date()
  const cellSize = 7
  const cellGap = 1.5
  const cols = 10
  const diasSet = new Set(dados.diasEstudados)

  for (let i = 29; i >= 0; i--) {
    const data = new Date(hoje)
    data.setDate(data.getDate() - i)
    const dataStr = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
    const idx = 29 - i
    const col = idx % cols
    const row = Math.floor(idx / cols)
    const cx = ml + col * (cellSize + cellGap)
    const cy = y + row * (cellSize + cellGap)

    if (diasSet.has(dataStr)) {
      doc.setFillColor(...CORES.verde)
    } else {
      doc.setFillColor(230, 230, 230)
    }
    doc.roundedRect(cx, cy, cellSize, cellSize, 1, 1, 'F')

    // Número do dia
    doc.setTextColor(diasSet.has(dataStr) ? 255 : 150, diasSet.has(dataStr) ? 255 : 150, diasSet.has(dataStr) ? 255 : 150)
    doc.setFontSize(5)
    doc.setFont('helvetica', 'bold')
    doc.text(String(data.getDate()), cx + cellSize / 2, cy + cellSize / 2 + 1.5, { align: 'center' })
  }

  // Legenda
  const legendaY = y + 3 * (cellSize + cellGap) + 3
  doc.setFillColor(...CORES.verde)
  doc.roundedRect(ml, legendaY, 4, 4, 1, 1, 'F')
  doc.setTextColor(...CORES.cinzaMedio)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('Estudou', ml + 6, legendaY + 3)

  doc.setFillColor(230, 230, 230)
  doc.roundedRect(ml + 25, legendaY, 4, 4, 1, 1, 'F')
  doc.text('Não estudou', ml + 31, legendaY + 3)

  doc.text(`Total: ${dados.diasEstudados.length} dias nos últimos 30`, ml + 60, legendaY + 3)

  y = legendaY + 12

  // ==========================================
  // CONQUISTAS
  // ==========================================
  verificarPagina(30)

  doc.setTextColor(...CORES.azulEscuro)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Conquistas', ml, y)
  y += 3
  doc.setDrawColor(...CORES.azulMedio)
  doc.line(ml, y, pw - mr, y)
  y += 8

  const conquistasDesbloqueadas = dados.conquistas.filter(c => c.desbloqueada)
  const conquistasBloqueadas = dados.conquistas.filter(c => !c.desbloqueada)

  doc.setFontSize(9)
  doc.setTextColor(...CORES.cinzaEscuro)
  doc.setFont('helvetica', 'normal')
  doc.text(`${conquistasDesbloqueadas.length} de ${dados.conquistas.length} desbloqueadas`, ml + 3, y)
  y += 7

  // Desbloqueadas
  conquistasDesbloqueadas.forEach(c => {
    verificarPagina(7)
    doc.setTextColor(...CORES.verde)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(`✓ ${c.nome}`, ml + 3, y)
    y += 6
  })

  // Bloqueadas
  if (conquistasBloqueadas.length > 0) {
    y += 2
    conquistasBloqueadas.forEach(c => {
      verificarPagina(7)
      doc.setTextColor(...CORES.cinzaMedio)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(`○ ${c.nome}`, ml + 3, y)
      y += 6
    })
  }

  // ==========================================
  // RODAPÉS
  // ==========================================
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(...CORES.cinzaMedio)
    doc.text(`Página ${i} de ${totalPages}`, pw / 2, ph - 8, { align: 'center' })
    doc.text('Sistema de Estudos CFP - PMDF', ml, ph - 8)
    doc.text(new Date().toLocaleDateString('pt-BR'), pw - mr, ph - 8, { align: 'right' })
  }

  // Salvar
  const nomeArquivo = `relatorio-${dados.usuario.nome.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(nomeArquivo)
  return nomeArquivo
}