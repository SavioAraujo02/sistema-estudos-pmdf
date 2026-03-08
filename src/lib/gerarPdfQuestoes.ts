import jsPDF from 'jspdf'
import { QuestaoEstudo } from './estudo'

interface ConfigPdf {
  titulo?: string
  materias?: string[]
  assuntos?: string[]
  incluirGabarito?: boolean
  incluirExplicacoes?: boolean
  incluirEspacoResposta?: boolean
  usuario?: {
    nome: string
    cpf?: string
    pelotao?: string
  }
}

const CORES = {
  azulEscuro: [30, 58, 138] as [number, number, number],
  azulMedio: [59, 130, 246] as [number, number, number],
  azulClaro: [219, 234, 254] as [number, number, number],
  verde: [34, 197, 94] as [number, number, number],
  vermelho: [239, 68, 68] as [number, number, number],
  cinzaEscuro: [55, 65, 81] as [number, number, number],
  cinzaMedio: [107, 114, 128] as [number, number, number],
  cinzaClaro: [243, 244, 246] as [number, number, number],
  branco: [255, 255, 255] as [number, number, number],
}

// Limpar texto para PDF (compacto, sem quebras desnecessárias)
function limparTextoParaPdf(texto: string): string {
  let limpo = texto
  // Remover quebras de linha no meio de frases (manter compacto)
  limpo = limpo.replace(/\r\n/g, ' ')
  limpo = limpo.replace(/\n/g, ' ')
  // Remover espaços múltiplos
  limpo = limpo.replace(/\s{2,}/g, ' ')
  return limpo.trim()
}

export function gerarPdfQuestoes(questoes: QuestaoEstudo[], config: ConfigPdf = {}) {
  const {
    titulo = 'Simulado - CFP PMDF',
    materias = [],
    assuntos = [],
    incluirGabarito = true,
    incluirExplicacoes = true,
    incluirEspacoResposta = true,
  } = config

  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginLeft = 15
  const marginRight = 15
  const contentWidth = pageWidth - marginLeft - marginRight
  let y = 0

  const quebrarTexto = (texto: string, maxWidth: number): string[] => {
    return doc.splitTextToSize(texto, maxWidth)
  }

  const verificarNovaPagina = (alturaMinima: number) => {
    if (y + alturaMinima > pageHeight - 20) {
      doc.addPage()
      y = 15
      return true
    }
    return false
  }

  // ==========================================
  // CAPA / CABEÇALHO
  // ==========================================
  
  doc.setFillColor(...CORES.azulEscuro)
  doc.rect(0, 0, pageWidth, 45, 'F')

  doc.setTextColor(...CORES.branco)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text(titulo, pageWidth / 2, 18, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  const dataHoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  doc.text(dataHoje, pageWidth / 2, 27, { align: 'center' })

  doc.setFontSize(10)
  doc.text(`${questoes.length} questões`, pageWidth / 2, 36, { align: 'center' })

  y = 52

  // Box de informações
  const temInfoExtra = materias.length > 0 || assuntos.length > 0
  doc.setFillColor(...CORES.cinzaClaro)
  doc.roundedRect(marginLeft, y, contentWidth, temInfoExtra ? 28 : 18, 3, 3, 'F')

  doc.setTextColor(...CORES.cinzaEscuro)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  
  let infoY = y + 7

  if (materias.length > 0) {
    doc.text('Matérias:', marginLeft + 5, infoY)
    doc.setFont('helvetica', 'normal')
    const materiasText = materias.join(', ')
    const materiasLinhas = quebrarTexto(materiasText, contentWidth - 30)
    doc.text(materiasLinhas[0], marginLeft + 28, infoY)
    infoY += 6
  }

  if (assuntos.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.text('Assuntos:', marginLeft + 5, infoY)
    doc.setFont('helvetica', 'normal')
    const assuntosText = assuntos.join(', ')
    const assuntosLinhas = quebrarTexto(assuntosText, contentWidth - 30)
    doc.text(assuntosLinhas[0], marginLeft + 28, infoY)
    infoY += 6
  }

  doc.setFont('helvetica', 'bold')
  doc.text('Total:', marginLeft + 5, infoY)
  doc.setFont('helvetica', 'normal')
  
  const totalCE = questoes.filter(q => q.tipo === 'certo_errado').length
  const totalME = questoes.filter(q => q.tipo === 'multipla_escolha').length
  let resumo = `${questoes.length} questões`
  if (totalCE > 0) resumo += ` (${totalCE} Certo/Errado`
  if (totalME > 0) resumo += `${totalCE > 0 ? ', ' : ' ('}${totalME} Múltipla Escolha`
  if (totalCE > 0 || totalME > 0) resumo += ')'
  doc.text(resumo, marginLeft + 22, infoY)

  y = infoY + 10

  // Campos: Nome, CPF, Pelotão, Data
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...CORES.cinzaEscuro)

  if (config.usuario?.nome) {
    // Preenchido automaticamente
    doc.text('Nome:', marginLeft, y)
    doc.setFont('helvetica', 'normal')
    doc.text(config.usuario.nome, marginLeft + 18, y)
    doc.setDrawColor(180, 180, 180)
    doc.line(marginLeft + 18, y + 1, pageWidth - marginRight, y + 1)
    y += 7

    doc.setFont('helvetica', 'bold')
    doc.text('CPF:', marginLeft, y)
    doc.setFont('helvetica', 'normal')
    doc.text(config.usuario.cpf || '_______________', marginLeft + 15, y)
    doc.line(marginLeft + 15, y + 1, marginLeft + 60, y + 1)

    if (config.usuario.pelotao) {
      doc.setFont('helvetica', 'bold')
      doc.text('Pelotão:', marginLeft + 65, y)
      doc.setFont('helvetica', 'normal')
      doc.text(config.usuario.pelotao, marginLeft + 88, y)
      doc.line(marginLeft + 88, y + 1, marginLeft + 130, y + 1)
    }

    doc.setFont('helvetica', 'bold')
    const dataX = config.usuario.pelotao ? marginLeft + 135 : marginLeft + 65
    doc.text('Data:', dataX, y)
    doc.setFont('helvetica', 'normal')
    doc.text(new Date().toLocaleDateString('pt-BR'), dataX + 16, y)
  } else {
    // Campos em branco para preencher à mão
    doc.text('Nome:', marginLeft, y)
    doc.setDrawColor(180, 180, 180)
    doc.line(marginLeft + 18, y, pageWidth - marginRight, y)
    y += 7
    doc.text('Data:', marginLeft, y)
    doc.line(marginLeft + 16, y, marginLeft + 60, y)
    doc.text('Nota:', marginLeft + 70, y)
    doc.line(marginLeft + 84, y, marginLeft + 120, y)
  }
  
  y += 10

  doc.setDrawColor(...CORES.azulMedio)
  doc.setLineWidth(0.5)
  doc.line(marginLeft, y, pageWidth - marginRight, y)
  y += 8

  // ==========================================
  // QUESTÕES
  // ==========================================

  const gabarito: { numero: number; resposta: string; explicacao?: string; materia: string }[] = []

  questoes.forEach((questao, index) => {
    const numero = index + 1
    const nomeMateria = questao.materia?.nome || ''
    const nomeAssunto = questao.assunto?.nome ? ` > ${questao.assunto.nome}` : ''

    // Estimar altura
    const textoLimpoEst = limparTextoParaPdf(questao.enunciado)
    const linhasEnunciado = quebrarTexto(textoLimpoEst, contentWidth - 6)
    let alturaEstimada = 15 + (linhasEnunciado.length * 5)
    
    if (questao.tipo === 'multipla_escolha' && questao.alternativas) {
      questao.alternativas.forEach(alt => {
        const linhasAlt = quebrarTexto(alt.texto, contentWidth - 22)
        alturaEstimada += linhasAlt.length * 5 + 2
      })
    } else {
      alturaEstimada += 12
    }

    if (incluirEspacoResposta) alturaEstimada += 5

    verificarNovaPagina(alturaEstimada)

    // Badge com número
    doc.setFillColor(...CORES.azulEscuro)
    doc.roundedRect(marginLeft, y - 1, 12, 7, 2, 2, 'F')
    doc.setTextColor(...CORES.branco)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(String(numero), marginLeft + 6, y + 4, { align: 'center' })

    // Matéria
    doc.setTextColor(...CORES.azulMedio)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.text(`${nomeMateria}${nomeAssunto}`, marginLeft + 15, y + 4)

    y += 10

    // Enunciado (justificado e compacto)
    doc.setTextColor(...CORES.cinzaEscuro)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    const textoLimpo = limparTextoParaPdf(questao.enunciado)
    const linhasLimpas = quebrarTexto(textoLimpo, contentWidth - 6)
    
    linhasLimpas.forEach((linha: string, idx: number) => {
      verificarNovaPagina(8)
      // Justificar todas as linhas exceto a última do parágrafo
      if (idx < linhasLimpas.length - 1) {
        doc.text(linha, marginLeft + 3, y, { align: 'justify', maxWidth: contentWidth - 6 })
      } else {
        doc.text(linha, marginLeft + 3, y)
      }
      y += 5
    })

    y += 3

    // Alternativas ou Certo/Errado
    if (questao.tipo === 'multipla_escolha' && questao.alternativas) {
      const letras = ['A', 'B', 'C', 'D', 'E']
      let respostaCorreta = ''

      questao.alternativas.forEach((alt, altIndex) => {
        const letra = letras[altIndex] || String(altIndex + 1)
        if (alt.correta) respostaCorreta = letra

        const linhasAlt = quebrarTexto(alt.texto, contentWidth - 22)
        verificarNovaPagina(linhasAlt.length * 5 + 4)

        // Quadradinho pra marcar
        doc.setDrawColor(180, 180, 180)
        doc.setLineWidth(0.3)
        doc.rect(marginLeft + 5, y - 3.5, 4, 4)

        // Letra
        doc.setTextColor(...CORES.cinzaEscuro)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(`${letra})`, marginLeft + 12, y)

        // Texto
        doc.setFont('helvetica', 'normal')
        linhasAlt.forEach((linha: string, linhaIdx: number) => {
          doc.text(linha, marginLeft + 20, y + (linhaIdx * 5))
        })

        y += (linhasAlt.length * 5) + 2
      })

      gabarito.push({ numero, resposta: respostaCorreta, explicacao: questao.explicacao, materia: nomeMateria })

    } else {
      // Certo/Errado
      const resposta = questao.resposta_certo_errado === true ? 'CERTO' : 'ERRADO'

      doc.setDrawColor(180, 180, 180)
      doc.setLineWidth(0.3)
      
      doc.rect(marginLeft + 5, y - 3.5, 4, 4)
      doc.setTextColor(...CORES.cinzaEscuro)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('CERTO', marginLeft + 12, y)

      doc.rect(marginLeft + 40, y - 3.5, 4, 4)
      doc.text('ERRADO', marginLeft + 47, y)

      y += 5

      gabarito.push({ numero, resposta, explicacao: questao.explicacao, materia: nomeMateria })
    }

    // Separador
    y += 5
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.2)
    doc.line(marginLeft, y, pageWidth - marginRight, y)
    y += 6
  })

  // ==========================================
  // GABARITO
  // ==========================================

  if (incluirGabarito && gabarito.length > 0) {
    doc.addPage()
    y = 15

    doc.setFillColor(...CORES.azulEscuro)
    doc.rect(0, 0, pageWidth, 25, 'F')
    doc.setTextColor(...CORES.branco)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('GABARITO', pageWidth / 2, 16, { align: 'center' })

    y = 35

    // Grid de respostas (5 colunas)
    const colWidth = contentWidth / 5

    doc.setFillColor(...CORES.cinzaClaro)
    doc.rect(marginLeft, y - 5, contentWidth, 8, 'F')
    doc.setTextColor(...CORES.cinzaEscuro)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')

    for (let col = 0; col < 5; col++) {
      doc.text('Nº', marginLeft + col * colWidth + 3, y)
      doc.text('Resp.', marginLeft + col * colWidth + 14, y)
    }
    y += 5

    doc.setFontSize(9)
    const itemsPerCol = Math.ceil(gabarito.length / 5)

    gabarito.forEach((item, idx) => {
      const col = Math.floor(idx / itemsPerCol)
      const row = idx % itemsPerCol
      const x = marginLeft + col * colWidth
      const itemY = y + row * 6

      if (itemY > pageHeight - 25) return

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...CORES.cinzaEscuro)
      doc.text(String(item.numero).padStart(2, '0'), x + 3, itemY)

      doc.setTextColor(...CORES.azulEscuro)
      doc.text(item.resposta, x + 14, itemY)
    })

    y += itemsPerCol * 6 + 10

    // ==========================================
    // EXPLICAÇÕES
    // ==========================================

    if (incluirExplicacoes) {
      verificarNovaPagina(20)

      doc.setDrawColor(...CORES.azulMedio)
      doc.setLineWidth(0.5)
      doc.line(marginLeft, y, pageWidth - marginRight, y)
      y += 8

      doc.setTextColor(...CORES.azulEscuro)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Explicações', marginLeft, y)
      y += 8

      gabarito.forEach((item) => {
        if (!item.explicacao) return

        const textoExplicacao = limparTextoParaPdf(item.explicacao.replace(/<[^>]*>/g, ''))
        const linhas = quebrarTexto(textoExplicacao, contentWidth - 15)
        
        verificarNovaPagina(linhas.length * 4.5 + 15)

        // Badge
        doc.setFillColor(...CORES.azulEscuro)
        doc.roundedRect(marginLeft, y - 1, 10, 6, 1.5, 1.5, 'F')
        doc.setTextColor(...CORES.branco)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text(String(item.numero), marginLeft + 5, y + 3, { align: 'center' })

        // Resposta
        doc.setTextColor(...CORES.verde)
        doc.setFontSize(9)
        doc.text(`Resposta: ${item.resposta}`, marginLeft + 14, y + 3)

        // Matéria
        doc.setTextColor(...CORES.cinzaMedio)
        doc.setFontSize(7)
        doc.text(item.materia, pageWidth - marginRight, y + 3, { align: 'right' })

        y += 8

        // Explicação
        doc.setTextColor(...CORES.cinzaEscuro)
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'normal')

        linhas.forEach((linha: string) => {
          verificarNovaPagina(6)
          doc.text(linha, marginLeft + 3, y)
          y += 4.5
        })

        y += 5

        doc.setDrawColor(230, 230, 230)
        doc.setLineWidth(0.1)
        doc.line(marginLeft + 10, y, pageWidth - marginRight - 10, y)
        y += 4
      })
    }
  }

  // ==========================================
  // RODAPÉS em todas as páginas (com CPF + aviso)
  // ==========================================
  const totalPages = doc.getNumberOfPages()
  const cpfRodape = config.usuario?.cpf || '___.___.___-__'
  const nomeRodape = config.usuario?.nome || ''

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)

    // Linha separadora
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.2)
    doc.line(marginLeft, pageHeight - 18, pageWidth - marginRight, pageHeight - 18)

    // Aviso de proibição
    doc.setFontSize(6)
    doc.setTextColor(200, 50, 50)
    doc.setFont('helvetica', 'bold')
    doc.text(
      'DOCUMENTO CONFIDENCIAL — PROIBIDA A REPRODUÇÃO, COMPARTILHAMENTO OU DISTRIBUIÇÃO. USO EXCLUSIVO DO ALUNO IDENTIFICADO ABAIXO.',
      pageWidth / 2, pageHeight - 14, { align: 'center' }
    )

    // Dados do aluno + página
    doc.setFontSize(7)
    doc.setTextColor(...CORES.cinzaMedio)
    doc.setFont('helvetica', 'normal')
    doc.text(`CPF: ${cpfRodape}${nomeRodape ? ' | ' + nomeRodape : ''}`, marginLeft, pageHeight - 8)
    doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' })
    doc.text(new Date().toLocaleDateString('pt-BR'), pageWidth - marginRight, pageHeight - 8, { align: 'right' })
  }

  // Salvar
  const nomeArquivo = `simulado-cfp-pmdf-${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(nomeArquivo)
  return nomeArquivo
}