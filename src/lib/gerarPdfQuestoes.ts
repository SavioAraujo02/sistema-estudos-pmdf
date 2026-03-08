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

function limparTextoParaPdf(texto: string): string {
  let limpo = texto
  limpo = limpo.replace(/\r\n/g, ' ')
  limpo = limpo.replace(/\n/g, ' ')
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
  } = config

  const doc = new jsPDF('p', 'mm', 'a4')
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const ml = 15
  const mr = 15
  const cw = pw - ml - mr
  // Margem inferior: rodapé ocupa ~20mm
  const mbRodape = 22
  let y = 0

  const quebrar = (texto: string, maxW: number): string[] => {
    return doc.splitTextToSize(texto, maxW)
  }

  const novaPagina = (alt: number): boolean => {
    if (y + alt > ph - mbRodape) {
      doc.addPage()
      y = 12
      return true
    }
    return false
  }

  // ==========================================
  // CAPA
  // ==========================================
  doc.setFillColor(...CORES.azulEscuro)
  doc.rect(0, 0, pw, 40, 'F')

  doc.setTextColor(...CORES.branco)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(titulo, pw / 2, 16, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const dataHoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
  doc.text(dataHoje, pw / 2, 25, { align: 'center' })

  doc.setFontSize(9)
  doc.text(`${questoes.length} questões`, pw / 2, 33, { align: 'center' })

  y = 46

  // Box de informações
  const temInfoExtra = materias.length > 0 || assuntos.length > 0
  const boxH = temInfoExtra ? 22 : 14
  doc.setFillColor(...CORES.cinzaClaro)
  doc.roundedRect(ml, y, cw, boxH, 2, 2, 'F')

  doc.setTextColor(...CORES.cinzaEscuro)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  
  let infoY = y + 5

  if (materias.length > 0) {
    doc.text('Matérias:', ml + 4, infoY)
    doc.setFont('helvetica', 'normal')
    doc.text(quebrar(materias.join(', '), cw - 28)[0], ml + 26, infoY)
    infoY += 5
  }

  if (assuntos.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.text('Assuntos:', ml + 4, infoY)
    doc.setFont('helvetica', 'normal')
    doc.text(quebrar(assuntos.join(', '), cw - 28)[0], ml + 26, infoY)
    infoY += 5
  }

  doc.setFont('helvetica', 'bold')
  doc.text('Total:', ml + 4, infoY)
  doc.setFont('helvetica', 'normal')
  const totalCE = questoes.filter(q => q.tipo === 'certo_errado').length
  const totalME = questoes.filter(q => q.tipo === 'multipla_escolha').length
  let resumo = `${questoes.length} questões`
  if (totalCE > 0) resumo += ` (${totalCE} C/E`
  if (totalME > 0) resumo += `${totalCE > 0 ? ', ' : ' ('}${totalME} ME`
  if (totalCE > 0 || totalME > 0) resumo += ')'
  doc.text(resumo, ml + 20, infoY)

  y = y + boxH + 5

  // Campos: Nome, CPF, Pelotão, Data
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...CORES.cinzaEscuro)

  if (config.usuario?.nome) {
    doc.text('Nome:', ml, y)
    doc.setFont('helvetica', 'normal')
    doc.text(config.usuario.nome, ml + 16, y)
    doc.setDrawColor(180, 180, 180)
    doc.line(ml + 16, y + 1, pw - mr, y + 1)
    y += 6

    doc.setFont('helvetica', 'bold')
    doc.text('CPF:', ml, y)
    doc.setFont('helvetica', 'normal')
    doc.text(config.usuario.cpf || '_______________', ml + 13, y)

    if (config.usuario.pelotao) {
      doc.setFont('helvetica', 'bold')
      doc.text('Pelotão:', ml + 55, y)
      doc.setFont('helvetica', 'normal')
      doc.text(config.usuario.pelotao, ml + 75, y)
    }

    doc.setFont('helvetica', 'bold')
    const dataX = config.usuario.pelotao ? ml + 120 : ml + 55
    doc.text('Data:', dataX, y)
    doc.setFont('helvetica', 'normal')
    doc.text(new Date().toLocaleDateString('pt-BR'), dataX + 14, y)
  } else {
    doc.text('Nome:', ml, y)
    doc.setDrawColor(180, 180, 180)
    doc.line(ml + 16, y, pw - mr, y)
    y += 6
    doc.text('Data:', ml, y)
    doc.line(ml + 14, y, ml + 50, y)
    doc.text('Nota:', ml + 60, y)
    doc.line(ml + 74, y, ml + 110, y)
  }

  y += 7
  doc.setDrawColor(...CORES.azulMedio)
  doc.setLineWidth(0.4)
  doc.line(ml, y, pw - mr, y)
  y += 5

  // ==========================================
  // QUESTÕES
  // ==========================================
  const gabarito: { numero: number; resposta: string; explicacao?: string; materia: string }[] = []

  questoes.forEach((questao, index) => {
    const numero = index + 1
    const nomeMateria = questao.materia?.nome || ''
    const nomeAssunto = questao.assunto?.nome ? ` > ${questao.assunto.nome}` : ''

    // Texto limpo
    const textoLimpo = limparTextoParaPdf(questao.enunciado)
    const linhasEnunciado = quebrar(textoLimpo, cw - 4)

    // Estimar altura total da questão
    let altEst = 8 + (linhasEnunciado.length * 4.5)
    if (questao.tipo === 'multipla_escolha' && questao.alternativas) {
      questao.alternativas.forEach(alt => {
        altEst += quebrar(alt.texto, cw - 22).length * 4.5 + 1
      })
    } else {
      altEst += 7
    }

    novaPagina(altEst)

    // Número + Matéria (numa linha)
    doc.setFillColor(...CORES.azulEscuro)
    doc.roundedRect(ml, y, 10, 6, 1.5, 1.5, 'F')
    doc.setTextColor(...CORES.branco)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(String(numero), ml + 5, y + 4, { align: 'center' })

    doc.setTextColor(...CORES.azulMedio)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'italic')
    doc.text(`${nomeMateria}${nomeAssunto}`, ml + 13, y + 4)

    y += 8

    // Enunciado
    doc.setTextColor(...CORES.cinzaEscuro)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    linhasEnunciado.forEach((linha: string, idx: number) => {
      novaPagina(6)
      if (idx < linhasEnunciado.length - 1) {
        doc.text(linha, ml + 2, y, { align: 'justify', maxWidth: cw - 4 })
      } else {
        doc.text(linha, ml + 2, y)
      }
      y += 4.5
    })

    y += 1.5

    // Alternativas
    if (questao.tipo === 'multipla_escolha' && questao.alternativas) {
      const letras = ['A', 'B', 'C', 'D', 'E']
      let respostaCorreta = ''

      questao.alternativas.forEach((alt, altIndex) => {
        const letra = letras[altIndex] || String(altIndex + 1)
        if (alt.correta) respostaCorreta = letra

        const linhasAlt = quebrar(alt.texto, cw - 22)
        novaPagina(linhasAlt.length * 4.5 + 2)

        // Checkbox
        doc.setDrawColor(180, 180, 180)
        doc.setLineWidth(0.25)
        doc.rect(ml + 4, y - 3, 3.5, 3.5)

        // Letra
        doc.setTextColor(...CORES.cinzaEscuro)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text(`${letra})`, ml + 10, y)

        // Texto
        doc.setFont('helvetica', 'normal')
        linhasAlt.forEach((linha: string, li: number) => {
          doc.text(linha, ml + 18, y + (li * 4.5))
        })

        y += (linhasAlt.length * 4.5) + 1
      })

      gabarito.push({ numero, resposta: respostaCorreta, explicacao: questao.explicacao, materia: nomeMateria })
    } else {
      // Certo/Errado
      const resposta = questao.resposta_certo_errado === true ? 'CERTO' : 'ERRADO'

      doc.setDrawColor(180, 180, 180)
      doc.setLineWidth(0.25)

      doc.rect(ml + 4, y - 3, 3.5, 3.5)
      doc.setTextColor(...CORES.cinzaEscuro)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('CERTO', ml + 10, y)

      doc.rect(ml + 35, y - 3, 3.5, 3.5)
      doc.text('ERRADO', ml + 41, y)

      y += 4

      gabarito.push({ numero, resposta, explicacao: questao.explicacao, materia: nomeMateria })
    }

    // Separador fino
    y += 2
    doc.setDrawColor(230, 230, 230)
    doc.setLineWidth(0.15)
    doc.line(ml + 5, y, pw - mr - 5, y)
    y += 3
  })

  // ==========================================
  // GABARITO
  // ==========================================
  if (incluirGabarito && gabarito.length > 0) {
    doc.addPage()
    y = 12

    doc.setFillColor(...CORES.azulEscuro)
    doc.rect(0, 0, pw, 20, 'F')
    doc.setTextColor(...CORES.branco)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('GABARITO', pw / 2, 14, { align: 'center' })

    y = 28

    // Grid (5 colunas)
    const colW = cw / 5

    doc.setFillColor(...CORES.cinzaClaro)
    doc.rect(ml, y - 4, cw, 7, 'F')
    doc.setTextColor(...CORES.cinzaEscuro)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')

    for (let col = 0; col < 5; col++) {
      doc.text('Nº', ml + col * colW + 3, y)
      doc.text('Resp.', ml + col * colW + 13, y)
    }
    y += 4

    doc.setFontSize(8)
    const perCol = Math.ceil(gabarito.length / 5)

    gabarito.forEach((item, idx) => {
      const col = Math.floor(idx / perCol)
      const row = idx % perCol
      const x = ml + col * colW
      const iy = y + row * 5

      if (iy > ph - mbRodape) return

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...CORES.cinzaEscuro)
      doc.text(String(item.numero).padStart(2, '0'), x + 3, iy)

      doc.setTextColor(...CORES.azulEscuro)
      doc.text(item.resposta, x + 13, iy)
    })

    y += perCol * 5 + 6

    // Explicações
    if (incluirExplicacoes) {
      novaPagina(15)

      doc.setDrawColor(...CORES.azulMedio)
      doc.setLineWidth(0.4)
      doc.line(ml, y, pw - mr, y)
      y += 6

      doc.setTextColor(...CORES.azulEscuro)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Explicações', ml, y)
      y += 6

      gabarito.forEach((item) => {
        if (!item.explicacao) return

        const textoExp = limparTextoParaPdf(item.explicacao.replace(/<[^>]*>/g, ''))
        const linhas = quebrar(textoExp, cw - 12)

        novaPagina(linhas.length * 4 + 10)

        // Badge
        doc.setFillColor(...CORES.azulEscuro)
        doc.roundedRect(ml, y - 1, 9, 5, 1, 1, 'F')
        doc.setTextColor(...CORES.branco)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.text(String(item.numero), ml + 4.5, y + 2.5, { align: 'center' })

        // Resposta + Matéria
        doc.setTextColor(...CORES.verde)
        doc.setFontSize(8)
        doc.text(`Resp: ${item.resposta}`, ml + 12, y + 2.5)

        doc.setTextColor(...CORES.cinzaMedio)
        doc.setFontSize(6)
        doc.text(item.materia, pw - mr, y + 2.5, { align: 'right' })

        y += 6

        // Texto
        doc.setTextColor(...CORES.cinzaEscuro)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')

        linhas.forEach((linha: string) => {
          novaPagina(5)
          doc.text(linha, ml + 2, y)
          y += 4
        })

        y += 3

        doc.setDrawColor(235, 235, 235)
        doc.setLineWidth(0.1)
        doc.line(ml + 8, y, pw - mr - 8, y)
        y += 2
      })
    }
  }

  // ==========================================
  // RODAPÉS (com CPF + aviso)
  // ==========================================
  const totalPages = doc.getNumberOfPages()
  const cpfRodape = config.usuario?.cpf || '___.___.___-__'
  const nomeRodape = config.usuario?.nome || ''

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)

    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.15)
    doc.line(ml, ph - 18, pw - mr, ph - 18)

    doc.setFontSize(5.5)
    doc.setTextColor(200, 50, 50)
    doc.setFont('helvetica', 'bold')
    doc.text(
      'DOCUMENTO CONFIDENCIAL — PROIBIDA A REPRODUÇÃO, COMPARTILHAMENTO OU DISTRIBUIÇÃO. USO EXCLUSIVO DO ALUNO IDENTIFICADO ABAIXO.',
      pw / 2, ph - 14, { align: 'center' }
    )

    doc.setFontSize(6.5)
    doc.setTextColor(...CORES.cinzaMedio)
    doc.setFont('helvetica', 'normal')
    doc.text(`CPF: ${cpfRodape}${nomeRodape ? ' | ' + nomeRodape : ''}`, ml, ph - 9)
    doc.text(`Página ${i} de ${totalPages}`, pw / 2, ph - 9, { align: 'center' })
    doc.text(new Date().toLocaleDateString('pt-BR'), pw - mr, ph - 9, { align: 'right' })
  }

  const nomeArquivo = `simulado-cfp-pmdf-${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(nomeArquivo)
  return nomeArquivo
}