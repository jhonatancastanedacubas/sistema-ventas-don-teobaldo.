const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Conexión usando las variables del archivo .env
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('❌ Error conectando a la base de datos:', err.message);
        return;
    }
    console.log('🚀 ¡Conexión exitosa a MySQL Workbench de Don Teobaldo!');
});

app.get('/', (req, res) => {
    res.send('El servidor de Don Teobaldo está activo.');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`💻 Servidor backend corriendo en http://localhost:${PORT}`);
});