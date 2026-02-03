const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();

const controller = require('../controllers/dataController');

// --- RUTAS DE USUARIOS ---
router.post('/usuarios', controller.crearUsuario);       // Crear uno nuevo
router.get('/usuarios', controller.obtenerTodosLosUsuarios); // Obtener lista completa
router.get('/usuarios/:id', controller.obtenerUsuario);  // Obtener uno específico

// --- RUTAS DE CUESTIONARIOS ---
router.get('/cuestionarios', controller.obtenerCuestionarios); // Obtener lista completa
router.post('/cuestionarios', controller.crearCuestionario);     // Iniciar
router.get('/cuestionarios/:id', controller.obtenerCuestionario); // Leer datos
router.put('/cuestionarios/:id', controller.actualizarProgreso); // Guardar paso a paso o final
router.delete('/cuestionarios', controller.eliminarTodosCuestionarios); // Borrar TODOS
router.delete('/cuestionarios/:id', controller.eliminarCuestionario);   // Borrar UNO

// --- RUTAS DE PREGUNTAS ---
router.get('/preguntas', controller.obtenerPreguntas); // Leer banco de preguntas
router.get('/preguntas/:dato', controller.buscarPregunta);

// --- RUTAS DE RECURSOS ---
router.get('/recursos/:codigoPregunta', controller.obtenerRecursosPregunta); // Lee recursos con codigo pregunta

// --- RUTAS DE CORREO ---
router.post('/enviar-resultados', upload.single('pdf'), controller.enviarResultadosPDF); //Envia pdf por correo

module.exports = router;