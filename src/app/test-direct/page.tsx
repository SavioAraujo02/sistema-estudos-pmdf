export default function TestDirect() {
    return (
      <div className="min-h-screen bg-blue-500 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">✅ FUNCIONOU!</h1>
          <p>Se você está vendo isso, o roteamento está OK</p>
          <a href="/dashboard" className="block mt-4 px-4 py-2 bg-white text-blue-500 rounded">
            Ir para Dashboard
          </a>
        </div>
      </div>
    )
  }