const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'registros.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}));
}

function leerRegistros() {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function guardarRegistros(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/registros', (req, res) => {
    res.json(leerRegistros());
});

app.post('/api/registros/:num', (req, res) => {
    const num = parseInt(req.params.num);
    const registros = leerRegistros();
    
    if (registros[num]) {
        return res.status(409).json({ error: 'Número ya tomado' });
    }
    
    registros[num] = {
        nombre: req.body.nombre,
        telefono: req.body.telefono,
        email: req.body.email || '',
        pagado: false,
        comprobante: null,
        fecha: new Date().toISOString()
    };
    
    guardarRegistros(registros);
    res.json({ success: true });
});

app.post('/api/registros/:num/comprobante', (req, res) => {
    const num = parseInt(req.params.num);
    const registros = leerRegistros();
    
    if (!registros[num]) {
        return res.status(404).json({ error: 'Número no encontrado' });
    }
    
    registros[num].comprobante = req.body.comprobante;
    guardarRegistros(registros);
    res.json({ success: true });
});

app.post('/api/registros/:num/aprobar', (req, res) => {
    const num = parseInt(req.params.num);
    const registros = leerRegistros();
    
    if (!registros[num]) {
        return res.status(404).json({ error: 'Número no encontrado' });
    }
    
    registros[num].pagado = true;
    guardarRegistros(registros);
    res.json({ success: true });
});

app.delete('/api/registros/:num', (req, res) => {
    const num = parseInt(req.params.num);
    const registros = leerRegistros();
    
    delete registros[num];
    guardarRegistros(registros);
    res.json({ success: true });
});

app.post('/api/reiniciar', (req, res) => {
    guardarRegistros({});
    res.json({ success: true });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`️ Servidor corriendo en puerto ${PORT}`);
});