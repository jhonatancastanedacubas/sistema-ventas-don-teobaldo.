import React, { useState } from 'react';

export default function RegistroTrabajador() {
  const [formData, setFormData] = useState({
    nombre: '',
    usuario: '', // Esto viajará como el correo
    contrasena: '', // Esto viajará como el password
    rol: 'mesero' // Tu base de datos usa minúsculas ('admin', 'mesero')
  });
  const [mensaje, setMensaje] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    
    try {
      const response = await fetch('http://localhost:5000/api/usuarios/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMensaje(data.mensaje);
        setFormData({ nombre: '', usuario: '', contrasena: '', rol: 'mesero' }); // Limpiar campos
      } else {
        setMensaje(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMensaje('❌ No se pudo conectar con el servidor backend. ¿Está encendido?');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
          Registrar Trabajador (Don Teobaldo)
        </h2>
        
        {mensaje && (
          <div className="mb-4 p-2 text-center rounded bg-blue-50 text-blue-700 font-semibold text-sm">
            {mensaje}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-1">Nombre Completo:</label>
            <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="w-full p-2 border rounded-md" placeholder="Ej. Juan Pérez" required />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-1">Correo Electrónico:</label>
            <input type="email" name="usuario" value={formData.usuario} onChange={handleChange} className="w-full p-2 border rounded-md" placeholder="ejemplo@correo.com" required />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-1">Contraseña:</label>
            <input type="password" name="contrasena" value={formData.contrasena} onChange={handleChange} className="w-full p-2 border rounded-md" placeholder="••••••••" required />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-1">Rol en el Sistema:</label>
            <select name="rol" value={formData.rol} onChange={handleChange} className="w-full p-2 border rounded-md bg-white">
              <option value="mesero">Mesero</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 mt-2">
            Guardar en Base de Datos
          </button>
        </form>
      </div>
    </div>
  );
}