import React, { useState } from 'react';

export default function Login({ onLogin }) {
  // 1. LOGIN COMPLETAMENTE VACÍO DESDE EL INICIO
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      // Apuntamos a la IP directa para evitar bloqueos de red
      const response = await fetch('/api/usuarios/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Login exitoso, pasamos el usuario verificado con su rol al App.jsx
        onLogin(data.usuario);
      } else {
        setError(data.error || 'Credenciales incorrectas');
      }
    } catch (err) {
      setError('❌ No se pudo conectar con el servidor backend. ¿Está encendido?');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121214] flex items-center justify-center p-4 w-full">
      <div className="bg-[#1e1e24] p-8 rounded-2xl border border-gray-800 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#d4af37] tracking-wider">DON TEOBALDO</h1>
          <p className="text-gray-400 text-xs mt-1">Ingreso al Sistema POS del Restaurante</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Correo Electrónico:</label>
            <input 
              type="email" 
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="w-full p-3 bg-[#121214] border border-gray-800 rounded-xl text-white focus:border-[#d4af37] outline-none text-sm transition"
              placeholder="correo@ejemplo.com"
              required 
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Contraseña:</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-[#121214] border border-gray-800 rounded-xl text-white focus:border-[#d4af37] outline-none text-sm transition"
              placeholder="••••••••"
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={cargando}
            className="w-full bg-[#d4af37] hover:bg-[#b8952e] disabled:bg-gray-800 text-black font-bold p-3 rounded-xl transition text-sm uppercase tracking-wider mt-2"
          >
            {cargando ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}