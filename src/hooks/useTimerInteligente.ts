'use client'

import { useState, useEffect, useRef } from 'react'

export const useTimerInteligente = () => {
  const [tempo, setTempo] = useState(0)
  const [pausado, setPausado] = useState(false)
  const [tempoInicio, setTempoInicio] = useState<number>(0)
  const [tempoPausado, setTempoPausado] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const ultimaAtividade = useRef<number>(Date.now())

  // Detectar quando usuário sai/volta da aba
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Usuário saiu da aba - pausar
        if (!pausado && tempoInicio > 0) {
          setPausado(true)
          ultimaAtividade.current = Date.now()
          console.log('⏸️ Timer pausado automaticamente (saiu da aba)')
        }
      } else {
        // Usuário voltou - continuar
        if (pausado && tempoInicio > 0) {
          const tempoForaDaAba = Date.now() - ultimaAtividade.current
          setTempoPausado(prev => prev + tempoForaDaAba)
          setPausado(false)
          console.log(`▶️ Timer retomado (voltou após ${Math.round(tempoForaDaAba/1000)}s)`)
        }
      }
    }

    // Detectar quando usuário sai/volta da janela
    const handleBlur = () => {
      if (!pausado && tempoInicio > 0) {
        setPausado(true)
        ultimaAtividade.current = Date.now()
        console.log('⏸️ Timer pausado automaticamente (saiu da janela)')
      }
    }

    const handleFocus = () => {
      if (pausado && tempoInicio > 0) {
        const tempoForaDaJanela = Date.now() - ultimaAtividade.current
        setTempoPausado(prev => prev + tempoForaDaJanela)
        setPausado(false)
        console.log(`▶️ Timer retomado (voltou após ${Math.round(tempoForaDaJanela/1000)}s)`)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
    }
  }, [pausado, tempoInicio])

  // Timer principal
  useEffect(() => {
    if (!pausado && tempoInicio > 0) {
      intervalRef.current = setInterval(() => {
        const agora = Date.now()
        const tempoDecorrido = agora - tempoInicio - tempoPausado
        setTempo(tempoDecorrido)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [pausado, tempoInicio, tempoPausado])

  const iniciar = (tempoInicioCustom?: number) => {
    const inicio = tempoInicioCustom || Date.now()
    setTempoInicio(inicio)
    setTempoPausado(0)
    setPausado(false)
    ultimaAtividade.current = inicio
    console.log('🚀 Timer iniciado')
  }

  const pausar = () => {
    if (!pausado) {
      setPausado(true)
      ultimaAtividade.current = Date.now()
      console.log('⏸️ Timer pausado manualmente')
    }
  }

  const continuar = () => {
    if (pausado && tempoInicio > 0) {
      const tempoEmPausa = Date.now() - ultimaAtividade.current
      setTempoPausado(prev => prev + tempoEmPausa)
      setPausado(false)
      console.log(`▶️ Timer retomado manualmente (pausado por ${Math.round(tempoEmPausa/1000)}s)`)
    }
  }

  const resetar = () => {
    setTempo(0)
    setTempoInicio(0)
    setTempoPausado(0)
    setPausado(false)
    ultimaAtividade.current = Date.now()
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    console.log('🔄 Timer resetado')
  }

  const getTempoFormatado = () => {
    const segundos = Math.floor(tempo / 1000)
    const minutos = Math.floor(segundos / 60)
    const horas = Math.floor(minutos / 60)
    
    const seg = segundos % 60
    const min = minutos % 60
    
    if (horas > 0) {
      return `${horas}:${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`
    }
    return `${min}:${seg.toString().padStart(2, '0')}`
  }

  return {
    tempo, // tempo em millisegundos
    tempoFormatado: getTempoFormatado(),
    pausado,
    iniciar,
    pausar,
    continuar,
    resetar,
    tempoInicio
  }
}