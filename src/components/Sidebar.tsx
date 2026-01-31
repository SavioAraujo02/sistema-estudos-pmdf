'use client'

import { Home, BookOpen, Target, BarChart3, LogOut, Menu, X, TrendingUp, Tag as TagIcon, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from './AuthProvider'

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
  const { user, signOut } = useAuth()

  // Fechar sidebar automaticamente quando a rota mudar (desktop e mobile)
  useEffect(() => {
    if (isOpen) {
      onToggle()
    }
  }, [pathname])

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  // Extrair nome do usuário
  const nomeUsuario = user?.user_metadata?.full_name || 
                     user?.email?.split('@')[0] || 
                     'Usuário'

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

        {/* Informações do usuário */}
        <div className={`p-4 border-b border-gray-200 dark:border-gray-700 ${!isOpen ? 'lg:hidden' : 'block'}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {nomeUsuario}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.email}
              </p>
            </div>
          </div>
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

        {/* Botões de ação */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          {/* Botão Dashboard (Início) */}
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors w-full"
            title={!isOpen ? 'Início' : undefined}
          >
            <Home className="h-5 w-5 flex-shrink-0" />
            <span className={`transition-opacity duration-300 ${!isOpen ? 'lg:opacity-0 lg:hidden' : 'opacity-100'}`}>
              Início
            </span>
          </Link>

          {/* Botão Sair */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors w-full"
            title={!isOpen ? 'Sair' : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className={`transition-opacity duration-300 ${!isOpen ? 'lg:opacity-0 lg:hidden' : 'opacity-100'}`}>
              Sair
            </span>
          </button>
        </div>
      </div>
    </>
  )
}