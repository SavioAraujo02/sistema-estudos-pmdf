import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useRedirect(path: string, delay: number = 0) {
  const router = useRouter()
  
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = path // Força redirecionamento
    }, delay)
    
    return () => clearTimeout(timer)
  }, [path, delay])
}