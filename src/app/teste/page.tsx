export default function TestePage() {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            🎉 FUNCIONOU!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            O redirecionamento está funcionando!
          </p>
          <a 
            href="/dashboard"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ir para Dashboard
          </a>
        </div>
      </div>
    )
  }