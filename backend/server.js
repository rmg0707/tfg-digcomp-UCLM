require('dotenv').config();
const express = require('express');
const cors = require('cors');
// Importamos las rutas nuevas
const apiRoutes = require('./routes/api.routes'); 

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Usamos las rutas con el prefijo '/api'
app.use('/api', apiRoutes);

// Ruta base de prueba (opcional, para saber que vive)
app.get('/', (req, res) => {
  res.send('API DigComp Funcionando correctamente');
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});