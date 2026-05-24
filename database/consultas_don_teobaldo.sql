CREATE DATABASE don_teobaldo_db;
USE don_teobaldo_db;

-- 1. Tabla de Usuarios
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol ENUM('admin', 'mesero') DEFAULT 'mesero',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Mesas
CREATE TABLE mesas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_mesa INT UNIQUE NOT NULL,
    capacidad INT NOT NULL,
    estado ENUM('libre', 'ocupada', 'mantenimiento') DEFAULT 'libre'
);

-- 3. Tabla de Productos (Menú)
CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    categoria VARCHAR(50),
    stock INT DEFAULT 0
);

-- 4. Tabla de Comandas (Cabecera del pedido)
CREATE TABLE comandas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mesa_id INT,
    usuario_id INT,
    estado ENUM('pendiente', 'en_cocina', 'entregado', 'pagado') DEFAULT 'pendiente',
    total DECIMAL(10,2) DEFAULT 0.00,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mesa_id) REFERENCES mesas(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- 5. Detalle de la Comanda (Muchos productos a una comanda)
CREATE TABLE detalle_comandas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    comanda_id INT,
    producto_id INT,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (comanda_id) REFERENCES comandas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

DESCRIBE usuarios;
SELECT * FROM usuarios;
