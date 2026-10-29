const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Conexión a PostgreSQL (Railway)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Crear tabla al iniciar (sin bloquear el servidor)
async function inicializarDB() {
    try {
        console.log('🔌 Conectando a la base de datos...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS registros (
                numero INTEGER PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                telefono VARCHAR(20) NOT NULL,
                email VARCHAR(100) DEFAULT '',
                pagado BOOLEAN DEFAULT FALSE,
                comprobante TEXT,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Base de datos inicializada correctamente');
    } catch (err) {
        console.error('❌ Error al inicializar DB:', err.message);
    }
}

// Inicializar DB en segundo plano para no bloquear la carga de la web
inicializarDB().catch(err => console.error('Error DB:', err));

// API: Obtener todos los registros
app.get('/api/registros', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM registros ORDER BY numero');
        const registros = {};
        result.rows.forEach(row => {
            registros[row.numero] = {
                nombre: row.nombre,
                telefono: row.telefono,
                email: row.email,
                pagado: row.pagado,
                comprobante: row.comprobante,
                fecha: row.fecha
            };
        });
        res.json(registros);
    } catch (err) {
        console.error('Error GET /api/registros:', err.message);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// API: Apartar número
app.post('/api/registros/:num', async (req, res) => {
    try {
        const num = parseInt(req.params.num);
        const { nombre, telefono, email } = req.body;
        
        const existe = await pool.query('SELECT * FROM registros WHERE numero = $1', [num]);
        if (existe.rows.length > 0) {
            return res.status(409).json({ error: 'Número ya tomado' });
        }
        
        await pool.query(
            'INSERT INTO registros (numero, nombre, telefono, email) VALUES ($1, $2, $3, $4)',
            [num, nombre, telefono, email || '']
        );
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error POST /api/registros:', err.message);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// API: Subir comprobante
app.post('/api/registros/:num/comprobante', async (req, res) => {
    try {
        const num = parseInt(req.params.num);
        const { comprobante } = req.body;
        
        await pool.query(
            'UPDATE registros SET comprobante = $1 WHERE numero = $2',
            [comprobante, num]
        );
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error POST comprobante:', err.message);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// API: Aprobar pago
app.post('/api/registros/:num/aprobar', async (req, res) => {
    try {
        const num = parseInt(req.params.num);
        
        await pool.query(
            'UPDATE registros SET pagado = TRUE WHERE numero = $1',
            [num]
        );
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error POST aprobar:', err.message);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// API: Eliminar registro
app.delete('/api/registros/:num', async (req, res) => {
    try {
        const num = parseInt(req.params.num);
        
        await pool.query('DELETE FROM registros WHERE numero = $1', [num]);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error DELETE:', err.message);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// API: Reiniciar rifa
app.post('/api/reiniciar', async (req, res) => {
    try {
        await pool.query('DELETE FROM registros');
        res.json({ success: true });
    } catch (err) {
        console.error('Error POST reiniciar:', err.message);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Servir el frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🏝️ Servidor corriendo en puerto ${PORT}`);
});