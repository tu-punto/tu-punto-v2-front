import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Cambia a true para activar mantenimiento
const maintenanceMode = true

const MaintenancePage = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-light-blue text-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-lg w-full animate-fade-in">
            {/* Icono de reloj */}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-20 w-20 text-blue mx-auto mb-6"
                viewBox="0 0 20 20"
                fill="currentColor"
            >
                <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-8V6a.75.75 0 00-1.5 0v4a.75.75 0 00.22.53l2.5 2.5a.75.75 0 101.06-1.06l-2.28-2.28z"
                    clipRule="evenodd"
                />
            </svg>

            <h1 className="text-3xl font-bold text-gray-800 mb-4">
                🚧 En mantenimiento 🚧
            </h1>
            <p className="text-lg text-gray-600 mb-6">
                Estamos trabajando para mejorar tu experiencia.<br />
                Volvemos a las <strong>10:00 AM</strong>.
            </p>
            <div className="text-base text-gray-400">
                Gracias por tu paciencia 💙
            </div>
        </div>
    </div>
)

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        {maintenanceMode ? <MaintenancePage /> : <App />}
    </React.StrictMode>,
)
