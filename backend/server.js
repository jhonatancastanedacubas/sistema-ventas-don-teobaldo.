const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Conexión dinámica usando tu archivo .env
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('❌ Error conectando a MySQL:', err.message);
        return;
    }
    console.log('🚀 ¡Conexión exitosa a MySQL Workbench de Don Teobaldo!');
});

// ==========================================
// LOGIN
// ==========================================
app.post('/api/usuarios/login', (req, res) => {
    const { correo, password } = req.body;

    if (!correo || !password) {
        return res.status(400).json({ error: 'Ingresa correo y contraseña' });
    }

    const query = 'SELECT id, nombre, correo, password, rol FROM usuarios WHERE correo = ?';

    db.query(query, [correo], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error interno del servidor' });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: 'Correo no encontrado' });
        }

        const usuario = results[0];

        if (usuario.password !== password) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        res.json({
            mensaje: 'Ingreso exitoso',
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol
            }
        });
    });
});

// ==========================================
// REGISTRAR USUARIO
// ==========================================
app.post('/api/usuarios/registrar', (req, res) => {
    const { nombre, usuario, contrasena, rol } = req.body;

    const query = 'INSERT INTO usuarios (nombre, correo, password, rol) VALUES (?, ?, ?, ?)';

    db.query(query, [nombre, usuario, contrasena, rol], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Error registrando usuario' });
        }

        res.status(201).json({ mensaje: 'Usuario registrado correctamente' });
    });
});

// ==========================================
// OBTENER USUARIOS
// ==========================================
app.get('/api/usuarios', (req, res) => {
    db.query('SELECT id, nombre, correo, rol FROM usuarios', (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error obteniendo usuarios' });
        }

        res.json(results);
    });
});

// ==========================================
// PRODUCTOS
// ==========================================
app.get('/api/productos', (req, res) => {
    db.query(
        'SELECT id, nombre, CAST(precio AS DECIMAL(10,2)) AS precio, categoria, stock FROM productos',
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Error obteniendo productos' });
            }

            res.json(results);
        }
    );
});

app.post('/api/productos', (req, res) => {
    const { nombre, precio, categoria, stock } = req.body;

    const query = `
        INSERT INTO productos (nombre, precio, categoria, stock)
        VALUES (?, ?, ?, ?)
    `;

    db.query(query, [nombre, precio, categoria, stock], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Error registrando producto' });
        }

        res.status(201).json({ mensaje: 'Producto registrado correctamente' });
    });
});

// ==========================================
// MESAS
// ==========================================
app.get('/api/mesas', (req, res) => {
    const query = 'SELECT id, numero_mesa, capacidad, estado FROM mesas ORDER BY numero_mesa';

    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error obteniendo mesas' });
        }

        res.json(results);
    });
});

app.put('/api/mesas/:id/estado', (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    const query = 'UPDATE mesas SET estado = ? WHERE id = ?';

    db.query(query, [estado, id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error actualizando mesa' });
        }

        res.json({ mensaje: 'Mesa actualizada correctamente' });
    });
});

// ==========================================
// CREAR COMANDA
// ==========================================
app.post('/api/comandas', (req, res) => {
    const { mesa_id, usuario_id, productos } = req.body;

    const total = productos.reduce((acc, item) => {
        return acc + (Number(item.precio_unitario) * Number(item.cantidad));
    }, 0);

    db.beginTransaction((err) => {
        if (err) {
            return res.status(500).json({ error: 'Error iniciando transacción' });
        }

        const queryComanda = `
            INSERT INTO comandas (mesa_id, usuario_id, estado, total, fecha)
            VALUES (?, ?, 'pendiente', ?, NOW())
        `;

        db.query(queryComanda, [mesa_id, usuario_id, total], (err, result) => {
            if (err) {
                return db.rollback(() => {
                    return res.status(500).json({ error: 'Error creando comanda' });
                });
            }

            const comanda_id = result.insertId;

            const detalles = productos.map(item => [
                comanda_id,
                item.producto_id,
                item.cantidad,
                item.precio_unitario,
                Number(item.cantidad) * Number(item.precio_unitario)
            ]);

            const queryDetalle = `
                INSERT INTO detalle_comandas
                (comanda_id, producto_id, cantidad, precio_unitario, subtotal)
                VALUES ?
            `;

            db.query(queryDetalle, [detalles], (err) => {
                if (err) {
                    return db.rollback(() => {
                        return res.status(500).json({ error: 'Error guardando detalle' });
                    });
                }

                let pendientes = productos.length;

                productos.forEach(item => {
                    const queryStock = `
                        UPDATE productos
                        SET stock = stock - ?
                        WHERE id = ?
                    `;

                    db.query(queryStock, [item.cantidad, item.producto_id], (err) => {
                        if (err) {
                            return db.rollback(() => {
                                return res.status(500).json({ error: 'Error descontando stock' });
                            });
                        }

                        pendientes--;

                        if (pendientes === 0) {
                            const queryMesa = `
                                UPDATE mesas
                                SET estado = 'ocupada'
                                WHERE id = ?
                            `;

                            db.query(queryMesa, [mesa_id], (err) => {
                                if (err) {
                                    return db.rollback(() => {
                                        return res.status(500).json({ error: 'Error actualizando mesa' });
                                    });
                                }

                                db.commit((err) => {
                                    if (err) {
                                        return db.rollback(() => {
                                            return res.status(500).json({ error: 'Error confirmando comanda' });
                                        });
                                    }

                                    res.status(201).json({
                                        mensaje: 'Comanda enviada correctamente'
                                    });
                                });
                            });
                        }
                    });
                });
            });
        });
    });
});

// ==========================================
// DASHBOARD
// ==========================================
app.get('/api/dashboard', (req, res) => {
    const query = `
        SELECT
            (SELECT COALESCE(SUM(total), 0) FROM comandas WHERE DATE(fecha) = CURDATE()) AS ventas_dia,
            (SELECT COUNT(*) FROM comandas WHERE estado IN ('pendiente', 'preparando')) AS pedidos_activos,
            (SELECT COUNT(*) FROM mesas WHERE estado = 'ocupada') AS mesas_ocupadas,
            (SELECT COUNT(*) FROM mesas) AS total_mesas
    `;

    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error obteniendo dashboard' });
        }

        res.json(results[0]);
    });
});

// ==========================================
// SERVIDOR
// ==========================================
// ==========================================
// RUTAS: MESAS
// ==========================================
app.get('/api/mesas', (req, res) => {
    const query = 'SELECT id, numero_mesa, capacidad, estado FROM mesas ORDER BY numero_mesa';

    db.query(query, (err, results) => {
        if (err) {
            console.error('❌ Error obteniendo mesas:', err);
            return res.status(500).json({ error: 'Error obteniendo mesas' });
        }

        res.json(results);
    });
});

const PORT = 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`💻 Servidor backend ABIERTO en http://127.0.0.1:${PORT}`);
});
