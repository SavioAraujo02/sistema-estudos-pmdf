'use client'

import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import { InstallPWA } from '@/components/InstallPWA'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="text-6xl mb-4">🎖️</div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Sistema de Estudos
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            CFP XII
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/login"
            className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            🚀 ACESSAR SISTEMA
          </Link>
        </div>

        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p>Faça login para acessar o sistema</p>
          <p>Sistema de questões CFP XII</p>
        </div>
      </div>

      <InstallPWA />
    </div>
  )
}