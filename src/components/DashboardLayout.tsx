'use client'

import { useState, useEffect } from 'react'
import { Menu, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Sidebar } from './Sidebar'
import { ThemeToggle } from './ThemeToggle'
import Link from 'next/link'
import { usePathname } from 'next/navigation'


interface DashboardLayoutProps {
  children: React.ReactNode
  title: string
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const [mounted, setMounted] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Controlar hidratação
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fechar sidebar quando clicar fora (desktop)
  useEffect(() => {
    if (!mounted) return

    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('sidebar')
      const menuButton = document.getElementById('menu-button')
      
      if (sidebarOpen && sidebar && menuButton) {
        if (!sidebar.contains(event.target as Node) && !menuButton.contains(event.target as Node)) {
          setSidebarOpen(false)
        }
      }
    }

    if (sidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [sidebarOpen, mounted])

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <div id="sidebar">
        {mounted ? (
          <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        ) : (
          <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 h-screen" />
        )}
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                id="menu-button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                disabled={!mounted}
              >
                <Menu className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                {title}
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <ThemeToggle />
              
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  window.location.href = '/login'
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:block">Sair</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}