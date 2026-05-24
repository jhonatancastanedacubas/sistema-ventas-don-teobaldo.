import React, { useState, useEffect } from 'react';
import Login from './Login';
import { 
  LayoutDashboard, 
  Utensils, 
  Users, 
  ClipboardList, 
  LogOut, 
  DollarSign, 
  Package, 
  Layers 
} from 'lucide-react';

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [seccion, setSeccion] = useState('dashboard');
  
  // Modificado para que guarde objetos estructurados con { ...producto, cantidad }
  const [pedidos, setPedidos] = useState([]);
  
  // ESTADOS CONECTADOS A MYSQL WORKBENCH
  const [productos, setProductos] = useState([]); 
  const [listaEmpleados, setListaEmpleados] = useState([]);
  const [mensajeRegistro, setMensajeRegistro] = useState('');

  // Estado para el dashboard gerencial conectado a MySQL
  const [dashboard, setDashboard] = useState({
    ventas_dia: 0,
    pedidos_activos: 0,
    mesas_ocupadas: 0,
    total_mesas: 0
  });
  
  // Formulario para registro de nuevos trabajadores
  const [formData, setFormData] = useState({
    nombre: '',
    usuario: '',     
    contrasena: '',  
    rol: 'mesero'    
  });

  // Estado para el formulario de nuevos platos/productos
  const [formProducto, setFormProducto] = useState({
    nombre: '',
    precio: '',
    categoria: 'Fondos',
    stock: ''
  });
  const [mensajeProducto, setMensajeProducto] = useState('');

  // Estado del plano físico del salón (6 Mesas)
  const [mesas, setMesas] = useState([
    { id: 1, numero: 1, estado: 'libre' },
    { id: 2, numero: 2, estado: 'libre' },
    { id: 3, numero: 3, estado: 'libre' },
    { id: 4, numero: 4, estado: 'libre' },
    { id: 5, numero: 5, estado: 'libre' },
    { id: 6, numero: 6, estado: 'libre' },
  ]);

  // Redirección inicial automática dependiendo del Rol
  useEffect(() => {
    if (usuario) {
      if (usuario.rol === 'mesero') {
        setSeccion('mesas'); 
      } else {
        setSeccion('dashboard'); 
      }
    }
  }, [usuario]);

  // 🔄 CONEXIÓN 1: Obtener Platos/Productos (Ruta Corregida para Túneles)
  const obtenerProductos = async () => {
    try {
      const response = await fetch('/api/productos');
      if (response.ok) {
        const data = await response.json();
        setProductos(data);
      }
    } catch (error) {
      console.error("❌ Error cargando la carta de productos:", error);
    }
  };

  // 🔄 CONEXIÓN 2: Obtener Personal (Ruta Corregida para Túneles)
  const obtenerUsuarios = async () => {
    try {
      const response = await fetch('/api/usuarios');
      if (response.ok) {
        const data = await response.json();
        setListaEmpleados(data);
      }
    } catch (error) {
      console.error("❌ Error cargando personal:", error);
    }
  };

  // 🔄 CONEXIÓN 3: Obtener Mesas desde MySQL
  const obtenerMesas = async () => {
    try {
      const response = await fetch('/api/mesas');
      if (response.ok) {
        const data = await response.json();

        const mesasFormateadas = data.map((m) => ({
          id: m.id,
          numero: m.numero_mesa,
          capacidad: m.capacidad,
          estado: m.estado
        }));

        setMesas(mesasFormateadas);
      }
    } catch (error) {
      console.error('❌ Error cargando mesas:', error);
    }
  };

  // 🔄 CONEXIÓN 4: Obtener Dashboard desde MySQL
  const obtenerDashboard = async () => {
    try {
      const response = await fetch('/api/dashboard');
      if (response.ok) {
        const data = await response.json();
        setDashboard(data);
      }
    } catch (error) {
      console.error('❌ Error cargando dashboard:', error);
    }
  };

  // Efecto para cargar productos al iniciar sesión
  useEffect(() => {
    if (usuario) {
      obtenerProductos();
      obtenerMesas();
      obtenerDashboard();
    }
  }, [usuario]);

  // Efecto para cargar empleados si se entra a la pestaña correspondiente
  useEffect(() => {
    if (seccion === 'empleados' && usuario?.rol === 'admin') {
      obtenerUsuarios();
    }
  }, [seccion, usuario]);

  // Si no ha iniciado sesión, renderiza la pantalla de Login limpia
  if (!usuario) {
    return <Login onLogin={setUsuario} />;
  }

  // Lógica para alternar interactivamente los estados de las mesas en el Salón
  const alternarEstadoMesa = async (id) => {
    const mesaActual = mesas.find((m) => m.id === id);
    if (!mesaActual) return;

    const nuevoEstado =
      mesaActual.estado === 'libre'
        ? 'ocupada'
        : mesaActual.estado === 'ocupada'
        ? 'reservada'
        : 'libre';

    try {
      const response = await fetch(`/api/mesas/${id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
      });

      if (response.ok) {
        setMesas(mesas.map((m) =>
          m.id === id ? { ...m, estado: nuevoEstado } : m
        ));
        obtenerDashboard();
      } else {
        const data = await response.json();
        alert(`❌ Error: ${data.error || 'No se pudo actualizar la mesa'}`);
      }
    } catch (error) {
      console.error('❌ Error actualizando mesa:', error);
      alert('❌ Error conectando con el backend');
    }
  };

  // 🔥 NUEVA LÓGICA DE COMANDA: Agregar / Aumentar cantidad validando stock de MySQL
  const agregarAlPedido = (producto) => {
    setPedidos((prevPedidos) => {
      const existe = prevPedidos.find((item) => item.id === producto.id);

      if (existe) {
        if (existe.cantidad >= producto.stock) {
          alert(`⚠️ No puedes agregar más. El stock límite en MySQL para "${producto.nombre}" es de ${producto.stock} unidades.`);
          return prevPedidos;
        }
        return prevPedidos.map((item) =>
          item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prevPedidos, { ...producto, cantidad: 1 }];
    });
  };

  // 🔥 NUEVA LÓGICA DE COMANDA: Restar cantidad o eliminar si llega a 0
  const restarDelPedido = (productoId) => {
    setPedidos((prevPedidos) => {
      const itemMesa = prevPedidos.find((item) => item.id === productoId);
      if (!itemMesa) return prevPedidos;

      if (itemMesa.cantidad === 1) {
        return prevPedidos.filter((item) => item.id !== productoId);
      }
      return prevPedidos.map((item) =>
        item.id === productoId ? { ...item, cantidad: item.cantidad - 1 } : item
      );
    });
  };

  // 🔥 NUEVA LÓGICA DE COMANDA: Eliminar fila completa de forma directa
  const eliminarDelPedido = (productoId) => {
    setPedidos((prevPedidos) => prevPedidos.filter((item) => item.id !== productoId));
  };

  // Cálculo corregido considerando cantidad: Suma de (Precio * Cantidad)
  const totalPedido = pedidos.reduce((sum, item) => sum + (Number(item.precio) * item.cantidad), 0);

  // Manejo de inputs del registro de personal
  const handleRegistroChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Enviar nuevo trabajador (Ruta Corregida para Túneles)
  const handleRegistroSubmit = async (e) => {
    e.preventDefault();
    setMensajeRegistro('');
    
    try {
      const response = await fetch('/api/usuarios/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMensajeRegistro(`🎉 ¡Trabajador registrado con éxito en la base de datos!`);
        setFormData({ nombre: '', usuario: '', contrasena: '', rol: 'mesero' });
        obtenerUsuarios(); 
      } else {
        setMensajeRegistro(`❌ Error: ${data.error || 'No se pudo registrar'}`);
      }
    } catch (error) {
      setMensajeRegistro('❌ Error de red con el servidor.');
    }
  };

  // Manejar los cambios de texto en el formulario de platos
  const handleProductoChange = (e) => {
    setFormProducto({ ...formProducto, [e.target.name]: e.target.value });
  };

  // Enviar el nuevo plato a MySQL desde la Web (Ruta Corregida para Túneles)
  const handleProductoSubmit = async (e) => {
    e.preventDefault();
    setMensajeProducto('');
    
    try {
      const response = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formProducto)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMensajeProducto('🎉 ¡Plato/Bebida agregado exitosamente!');
        setFormProducto({ nombre: '', precio: '', categoria: 'Fondos', stock: '' });
        obtenerProductos(); 
      } else {
        setMensajeProducto(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMensajeProducto('❌ Error de conexión con el backend.');
    }
  };

  // Enviar comanda al backend y descontar stock en MySQL
  const enviarACocina = async () => {
    if (pedidos.length === 0) {
      alert('No hay productos en la comanda');
      return;
    }

    const datosComanda = {
      // Por ahora usamos Mesa 1 para probar.
      // Luego podemos hacer que selecciones la mesa real desde la interfaz.
      mesa_id: 1,
      usuario_id: usuario.id,
      productos: pedidos.map(item => ({
        producto_id: item.id,
        cantidad: item.cantidad,
        precio_unitario: Number(item.precio)
      }))
    };

    try {
      const response = await fetch('/api/comandas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosComanda)
      });

      const data = await response.json();

      if (response.ok) {
        alert('✅ Pedido enviado a cocina correctamente');
        setPedidos([]);
        obtenerProductos();
        obtenerMesas();
        obtenerDashboard();
      } else {
        alert(`❌ Error: ${data.error || 'No se pudo enviar la comanda'}`);
      }
    } catch (error) {
      console.error('❌ Error enviando comanda:', error);
      alert('❌ Error de conexión con el backend');
    }
  };

  return (
    <div className="min-h-screen bg-[#121214] text-white font-sans flex flex-col md:flex-row w-full">
      
      {/* 1. MENÚ LATERAL (SIDEBAR) CON FILTRADO DE ROLES */}
      <aside className="w-full md:w-64 bg-[#1e1e24] border-r border-gray-800 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-6 border-b border-gray-800">
            <h1 className="text-xl font-bold text-[#d4af37] tracking-wider">DON TEOBALDO</h1>
            <p className="text-xs text-gray-400 mt-1">User: {usuario.nombre}</p>
            <span className="inline-block bg-[#d4af37]/10 text-[#d4af37] text-[10px] px-2 py-0.5 rounded-md mt-1 font-bold uppercase tracking-widest">
              Rol: {usuario.rol}
            </span>
          </div>
          
          <nav className="p-4 space-y-2">
            {usuario.rol === 'admin' && (
              <button 
                onClick={() => setSeccion('dashboard')} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${seccion === 'dashboard' ? 'bg-[#d4af37] text-black font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
              >
                <LayoutDashboard size={20} /> Dashboard POS
              </button>
            )}

            <button 
              onClick={() => setSeccion('mesas')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${seccion === 'mesas' ? 'bg-[#d4af37] text-black font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
              <Layers size={20} /> Asignar Mesas
            </button>

            <button 
              onClick={() => setSeccion('pedidos')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${seccion === 'pedidos' ? 'bg-[#d4af37] text-black font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
              <Utensils size={20} /> Tomar Pedidos
            </button>

            {usuario.rol === 'admin' && (
              <>
                <button 
                  onClick={() => setSeccion('empleados')} 
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${seccion === 'empleados' ? 'bg-[#d4af37] text-black font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                >
                  <Users size={20} /> Empleados
                </button>
                <button 
                  onClick={() => setSeccion('inventario')} 
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${seccion === 'inventario' ? 'bg-[#d4af37] text-black font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                >
                  <Package size={20} /> Inventario
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-800">
          <button onClick={() => setUsuario(null)} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition">
            <LogOut size={20} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* 2. ÁREA DE CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        
        {/* VISTA: DASHBOARD */}
        {seccion === 'dashboard' && usuario.rol === 'admin' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold">Panel Gerencial</h2>
              <p className="text-gray-400 text-sm mt-1">Monitoreo financiero en tiempo real</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#1e1e24] p-6 rounded-2xl border border-gray-800 flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Ventas del Día</p>
                  <h3 className="text-2xl font-bold mt-1">S/. {Number(dashboard.ventas_dia).toFixed(2)}</h3>
                </div>
                <div className="p-3 bg-green-500/10 text-green-500 rounded-xl"><DollarSign /></div>
              </div>
              <div className="bg-[#1e1e24] p-6 rounded-2xl border border-gray-800 flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Pedidos Activos</p>
                  <h3 className="text-2xl font-bold mt-1">{dashboard.pedidos_activos} en Cocina</h3>
                </div>
                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><ClipboardList /></div>
              </div>
              <div className="bg-[#1e1e24] p-6 rounded-2xl border border-gray-800 flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Mesas Ocupadas</p>
                  <h3 className="text-2xl font-bold mt-1">{dashboard.mesas_ocupadas} / {dashboard.total_mesas}</h3>
                </div>
                <div className="p-3 bg-yellow-500/10 text-[#d4af37] rounded-xl"><Layers /></div>
              </div>
            </div>
          </div>
        )}

        {/* VISTA: PLANO DE MESAS */}
        {seccion === 'mesas' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Plano de Salón - Control de Mesas</h2>
              <p className="text-gray-400 text-sm mt-1">Haz clic en una mesa para cambiar el estado: Libre ➡️ Ocupada ➡️ Reservada</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {mesas.map((m) => (
                <div 
                  key={m.id} 
                  onClick={() => alternarEstadoMesa(m.id)}
                  className={`p-6 rounded-2xl border text-center cursor-pointer transition transform hover:scale-105 active:scale-95 ${m.estado === 'libre' ? 'bg-green-500/10 border-green-500 text-green-400' : m.estado === 'ocupada' ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-yellow-500/10 border-yellow-500 text-yellow-400'}`}
                >
                  <span className="block font-bold text-lg">Mesa {m.numero}</span>
                  <span className="text-xs uppercase font-medium tracking-wider mt-1 block">{m.estado}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VISTA: TOMAR PEDIDOS */}
        {seccion === 'pedidos' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Carta de Comidas (Base de Datos Real)</h2>
                <button onClick={obtenerProductos} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition">🔄 Actualizar Carta</button>
              </div>
              
              {productos.length === 0 ? (
                <div className="bg-[#1e1e24] p-8 rounded-xl border border-gray-800 text-center text-gray-500 text-sm">
                  La carta está vacía en MySQL Workbench. Agrega filas a la tabla "productos" para visualizarlas aquí.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {productos.map((prod) => (
                    <div key={prod.id} className="bg-[#1e1e24] p-5 rounded-xl border border-gray-800 flex flex-col justify-between gap-4">
                      <div>
                        <span className="text-xs text-[#d4af37] uppercase font-bold tracking-widest">{prod.categoria}</span>
                        <h4 className="font-bold text-base mt-0.5 text-white">{prod.nombre}</h4>
                        <p className="text-xs text-gray-500 mt-1">Stock disponible: {prod.stock} uds.</p>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-800/50">
                        <span className="font-extrabold text-lg text-white">S/. {Number(prod.precio).toFixed(2)}</span>
                        <button onClick={() => agregarAlPedido(prod)} className="bg-[#d4af37] text-black font-bold px-4 py-2 rounded-xl text-xs hover:bg-[#b8952e] transition uppercase tracking-wider font-semibold">
                          + Agregar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* COMANDA EN VIVO CORREGIDA (BARRA LATERAL) */}
            <div className="bg-[#1e1e24] p-6 rounded-2xl border border-gray-800 h-fit flex flex-col justify-between shadow-xl">
              <div>
                <h3 className="text-lg font-bold border-b border-gray-800 pb-3 flex justify-between items-center">
                  <span>Comanda Actual</span>
                  {pedidos.length > 0 && (
                    <span className="text-xs bg-[#d4af37]/10 text-[#d4af37] px-2 py-0.5 rounded">
                      {pedidos.reduce((acc, item) => acc + item.cantidad, 0)} platos
                    </span>
                  )}
                </h3>
                
                <div className="mt-4 space-y-3 max-h-72 overflow-y-auto pr-1">
                  {pedidos.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-8">No hay productos agregados.</p>
                  ) : (
                    pedidos.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-sm bg-[#121214] p-3 rounded-xl border border-gray-800/60 gap-2">
                        
                        {/* Información del Item */}
                        <div className="flex-1 min-w-0">
                          <span className="text-gray-300 font-medium block truncate">{item.nombre}</span>
                          <span className="font-bold text-[#d4af37] text-xs">
                            S/. {(Number(item.precio) * item.cantidad).toFixed(2)}
                          </span>
                        </div>
                        
                        {/* Botones de Control de Cantidad (Estilo Compacto) */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center bg-[#1e1e24] rounded-md overflow-hidden border border-gray-850">
                            {/* Restar unidad */}
                            <button 
                              onClick={() => restarDelPedido(item.id)}
                              className="w-6 h-6 flex items-center justify-center bg-gray-800 hover:bg-red-600 hover:text-white font-bold transition-all"
                            >
                              -
                            </button>
                            
                            {/* Cantidad actual */}
                            <span className="w-7 text-center font-bold text-white text-xs">
                              {item.cantidad}
                            </span>
                            
                            {/* Sumar unidad */}
                            <button 
                              onClick={() => agregarAlPedido(item)}
                              className="w-6 h-6 flex items-center justify-center bg-gray-800 hover:bg-green-600 hover:text-white font-bold transition-all"
                            >
                              +
                            </button>
                          </div>

                          {/* Tachito para remover fila por completo */}
                          <button 
                            onClick={() => eliminarDelPedido(item.id)}
                            className="text-gray-500 hover:text-red-400 transition-colors p-1"
                            title="Eliminar plato"
                          >
                            🗑️
                          </button>
                        </div>

                      </div>
                    ))
                  )}
                </div>
              </div>
              
              <div className="border-t border-gray-800 mt-6 pt-4 space-y-4">
                <div className="flex justify-between font-bold text-xl">
                  <span>Total:</span>
                  <span className="text-[#d4af37]">S/. {totalPedido.toFixed(2)}</span>
                </div>
                <button 
                  onClick={enviarACocina} 
                  disabled={pedidos.length === 0} 
                  className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-800 disabled:text-gray-650 text-black font-bold p-3 rounded-xl transition text-center text-sm uppercase tracking-wider active:scale-[0.99]"
                >
                  Enviar a Cocina
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VISTA: GESTIÓN DE EMPLEADOS */}
        {seccion === 'empleados' && usuario.rol === 'admin' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold">Gestión de Personal</h2>
            
            <div className="bg-[#1e1e24] p-6 rounded-2xl border border-gray-800 max-w-3xl shadow-xl">
              <h3 className="text-lg font-bold text-[#d4af37] mb-4">Registrar Nuevo Trabajador</h3>
              {mensajeRegistro && (
                <div className={`mb-4 p-3 rounded-xl border text-sm font-semibold ${mensajeRegistro.includes('❌') ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                  {mensajeRegistro}
                </div>
              )}
              <form onSubmit={handleRegistroSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Nombre Completo:</label>
                  <input type="text" name="nombre" value={formData.nombre} onChange={handleRegistroChange} className="w-full p-2.5 bg-[#121214] border border-gray-800 rounded-xl text-white focus:border-[#d4af37] outline-none text-sm" placeholder="Ej. Juan Pérez" required />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Correo Electrónico:</label>
                  <input type="email" name="usuario" value={formData.usuario} onChange={handleRegistroChange} className="w-full p-2.5 bg-[#121214] border border-gray-800 rounded-xl text-white focus:border-[#d4af37] outline-none text-sm" placeholder="juan@donteobaldo.com" required />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Contraseña:</label>
                  <input type="password" name="contrasena" value={formData.contrasena} onChange={handleRegistroChange} className="w-full p-2.5 bg-[#121214] border border-gray-800 rounded-xl text-white focus:border-[#d4af37] outline-none text-sm" placeholder="••••••••" required />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Rol en el Sistema:</label>
                  <select name="rol" value={formData.rol} onChange={handleRegistroChange} className="w-full p-2.5 bg-[#121214] border border-gray-800 rounded-xl text-white focus:border-[#d4af37] outline-none text-sm cursor-pointer">
                    <option value="mesero">Mesero</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="md:col-span-2 mt-2">
                  <button type="submit" className="bg-[#d4af37] hover:bg-[#b8952e] text-black font-bold py-2.5 px-6 rounded-xl text-sm transition uppercase tracking-wider shadow-md">
                    Guardar en Base de Datos
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Lista de Personal Real</h3>
                <button onClick={obtenerUsuarios} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition">🔄 Sincronizar Tabla</button>
              </div>
              <div className="bg-[#1e1e24] rounded-2xl border border-gray-800 overflow-hidden shadow-lg">
                <table className="w-full text-left text-sm text-gray-400">
                  <thead className="bg-gray-800/50 text-white text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Nombre</th>
                      <th className="p-4">Correo</th>
                      <th className="p-4">Rol</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {listaEmpleados.length === 0 ? (
                      <tr><td colSpan="3" className="p-4 text-center text-gray-500">No hay datos. Haz clic en Sincronizar para cargar desde MySQL Workbench.</td></tr>
                    ) : (
                      listaEmpleados.map((emp) => (
                        <tr key={emp.id} className="hover:bg-gray-800/20 transition">
                          <td className="p-4 text-white font-medium">{emp.nombre}</td>
                          <td className="p-4">{emp.correo}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${emp.rol === 'admin' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                              {emp.rol}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VISTA: INVENTARIO */}
        {seccion === 'inventario' && usuario.rol === 'admin' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold">Control de Inventario y Almacén</h2>
              <p className="text-gray-400 text-sm mt-1">Registra nuevos productos y monitorea las existencias de la cocina.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Formulario de registro */}
              <div className="bg-[#1e1e24] p-6 rounded-2xl border border-gray-800 shadow-xl h-fit">
                <h3 className="text-lg font-bold text-[#d4af37] mb-4">Añadir a la Carta / Stock</h3>
                
                {mensajeProducto && (
                  <div className={`mb-4 p-3 rounded-xl border text-sm font-semibold ${mensajeProducto.includes('❌') ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
                    {mensajeProducto}
                  </div>
                )}

                <form onSubmit={handleProductoSubmit} className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Nombre del Producto/Plato:</label>
                    <input type="text" name="nombre" value={formProducto.nombre} onChange={handleProductoChange} className="w-full p-2.5 bg-[#121214] border border-gray-800 rounded-xl text-white focus:border-[#d4af37] outline-none text-sm" placeholder="Ej. Arroz con Pollo" required />
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Precio de Venta (S/.):</label>
                    <input type="number" step="0.10" name="precio" value={formProducto.precio} onChange={handleProductoChange} className="w-full p-2.5 bg-[#121214] border border-gray-800 rounded-xl text-white focus:border-[#d4af37] outline-none text-sm" placeholder="0.00" required />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Stock Inicial:</label>
                    <input type="number" name="stock" value={formProducto.stock} onChange={handleProductoChange} className="w-full p-2.5 bg-[#121214] border border-gray-800 rounded-xl text-white focus:border-[#d4af37] outline-none text-sm" placeholder="Ej. 50" required />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Categoría:</label>
                    <select name="categoria" value={formProducto.categoria} onChange={handleProductoChange} className="w-full p-2.5 bg-[#121214] border border-gray-800 rounded-xl text-white focus:border-[#d4af37] outline-none text-sm cursor-pointer">
                      <option value="Entradas">Entradas</option>
                      <option value="Fondos">Fondos</option>
                      <option value="Bebidas">Bebidas</option>
                      <option value="Postres">Postres</option>
                    </select>
                  </div>

                  <button type="submit" className="w-full mt-2 bg-[#d4af37] hover:bg-[#b8952e] text-black font-bold py-2.5 rounded-xl text-sm transition uppercase tracking-wider shadow-md">
                    Registrar Producto
                  </button>
                </form>
              </div>

              {/* Lista del Inventario Actual */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">Existencias en Tiempo Real</h3>
                  <button onClick={obtenerProductos} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition">🔄 Sincronizar Stock</button>
                </div>
                
                <div className="bg-[#1e1e24] rounded-2xl border border-gray-800 overflow-hidden shadow-lg">
                  <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-gray-800/50 text-white text-xs uppercase tracking-wider">
                      <tr>
                        <th className="p-4">Producto</th>
                        <th className="p-4">Categoría</th>
                        <th className="p-4">Precio</th>
                        <th className="p-4">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {productos.length === 0 ? (
                        <tr><td colSpan="4" className="p-4 text-center text-gray-500">No hay productos en inventario.</td></tr>
                      ) : (
                        productos.map((prod) => (
                          <tr key={prod.id} className="hover:bg-gray-800/20 transition">
                            <td className="p-4 text-white font-medium">{prod.nombre}</td>
                            <td className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-400">{prod.categoria}</td>
                            <td className="p-4 text-white font-bold">S/. {Number(prod.precio).toFixed(2)}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${prod.stock < 10 ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                                {prod.stock} uds.
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}