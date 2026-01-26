'use client'

import { Home, BookOpen, Target, BarChart3, LogOut, Menu, X, TrendingUp, Tag as TagIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const menuItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: BookOpen, label: 'Matérias', href: '/materias' },
  { icon: Target, label: 'Questões', href: '/questoes' },
  { icon: BarChart3, label: 'Estudar', href: '/estudar' },
  { icon: TrendingUp, label: 'Relatórios', href: '/relatorios' },
  { icon: TagIcon, label: 'Tags', href: '/tags' },
]

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()

  // Fechar sidebar automaticamente quando a rota mudar (desktop e mobile)
  useEffect(() => {
    if (isOpen) {
      onToggle()
    }
  }, [pathname]) // Removido isOpen e onToggle das dependências para evitar loop

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 
        h-screen flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${!isOpen ? 'lg:w-16' : 'lg:w-64'}
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className={`transition-opacity duration-300 ${!isOpen ? 'lg:opacity-0 lg:hidden' : 'opacity-100'}`}>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              📚 Estudos PMDF
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">CFP - Curso de Formação</p>
          </div>
          
          {/* Botão de toggle - aparece quando aberto */}
          <button
            onClick={onToggle}
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${!isOpen ? 'hidden' : 'block'}`}
          >
            <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    title={!isOpen ? item.label : undefined}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className={`transition-opacity duration-300 ${!isOpen ? 'lg:opacity-0 lg:hidden' : 'opacity-100'}`}>
                      {item.label}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors w-full"
            title={!isOpen ? 'Início' : undefined}
          >
            <Home className="h-5 w-5 flex-shrink-0" />
            <span className={`transition-opacity duration-300 ${!isOpen ? 'lg:opacity-0 lg:hidden' : 'opacity-100'}`}>
              Início
            </span>
          </Link>
        </div>
      </div>
    </>
  )
}