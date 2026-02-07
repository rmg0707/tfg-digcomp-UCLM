const pool = require('../config/db');
const nodemailer = require('nodemailer');


// CONTROLADORES DE USUARIOS


const crearUsuario = async (req, res) => {
  const { id, nombre, ocupacion } = req.body;
  try {
    // Inserta usuario y devuelve datos creados inmediatamente
    const query = 'INSERT INTO usuarios (id, nombre, ocupacion) VALUES ($1, $2, $3) RETURNING *';
    const result = await pool.query(query, [id, nombre, ocupacion]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear usuario:', err);
    res.status(500).json({ error: 'Error al guardar el usuario' });
  }
};

const obtenerTodosLosUsuarios = async (req, res) => {
  try {
    // Obtiene todos los usuarios ordenados alfabéticamente
    const result = await pool.query('SELECT * FROM usuarios ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    res.status(500).json({ error: 'Error al obtener la lista de usuarios' });
  }
};

const obtenerUsuario = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
    // Detiene la ejecución si no se encuentra ningún registro
    if (result.rows.length === 0) return res.status(404).json({ msg: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// CONTROLADORES DE CUESTIONARIOS


const crearCuestionario = async (req, res) => {
  const { id, usuarioId, progresoPreguntas, resultado } = req.body;
  
  try {
    const query = `
      INSERT INTO cuestionarios (id, usuario_id, progreso_preguntas, resultado) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `;
    
    //Convierte los datos complejos a texto para guardarlos en la base de datos
    const values = [
      id, 
      usuarioId, 
      JSON.stringify(progresoPreguntas), 
      JSON.stringify(resultado)
    ];
    
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creando cuestionario:', err);
    res.status(500).json({ error: 'Error al iniciar el cuestionario' });
  }
};

const obtenerCuestionarios = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cuestionarios');
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener cuestionarios:', err);
    res.status(500).json({ error: 'Error al obtener la lista de cuestionarios' });
  }
};

const obtenerCuestionario = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM cuestionarios WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ msg: 'Cuestionario no encontrado' });
    
    const data = result.rows[0];
    
    //Renombra las propiedades de la base de datos para que coincidan con el frontend
    const respuestaFrontend = {
        id: data.id,
        usuarioId: data.usuario_id,
        progresoPreguntas: data.progreso_preguntas, 
        resultado: data.resultado,
        fechaFin: data.fecha_fin
    };
    
    res.json(respuestaFrontend);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const actualizarProgreso = async (req, res) => {
  const { id } = req.params;
  const { progresoPreguntas, resultado, fechaFin } = req.body; 

  try {
    let query = '';
    let values = [];

    // Comprueba si el cuestionario ha finalizado para guardar la fecha
    if (fechaFin) {
        query = `
          UPDATE cuestionarios 
          SET progreso_preguntas = $1, resultado = $2, fecha_fin = $3 
          WHERE id = $4 
          RETURNING *
        `;
        values = [JSON.stringify(progresoPreguntas), JSON.stringify(resultado), fechaFin, id];
    } 
    else {
        //solo actualiza el progreso parcial si el cuestionario sigue abierto
        query = `
          UPDATE cuestionarios 
          SET progreso_preguntas = $1, resultado = $2 
          WHERE id = $3 
          RETURNING *
        `;
        values = [JSON.stringify(progresoPreguntas), JSON.stringify(resultado), id];
    }

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Cuestionario no encontrado para actualizar' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error actualizando:', err);
    res.status(500).json({ error: 'Error al guardar el progreso' });
  }
};

const eliminarCuestionario = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM cuestionarios WHERE id = $1 RETURNING *', [id]);
    
    //verifica si realmente se eliminó algún registro
    if (result.rowCount === 0) {
      return res.status(404).json({ msg: 'No se encontró el cuestionario para eliminar' });
    }
    
    res.json({ msg: 'Cuestionario eliminado correctamente', idEliminado: id });
  } catch (err) {
    console.error('Error eliminando cuestionario:', err);
    res.status(500).json({ error: 'Error del servidor al eliminar' });
  }
};

const eliminarTodosCuestionarios = async (req, res) => {
  try {
    // Borra todo el contenido de la tabla de cuestionarios
    const result = await pool.query('DELETE FROM cuestionarios');
    res.json({ msg: `Se han eliminado todos los cuestionarios (${result.rowCount} registros borrados)` });
  } catch (err) {
    console.error('Error vaciando tabla:', err);
    res.status(500).json({ error: 'Error del servidor al vaciar la tabla' });
  }
};


//CONTROLADORES DE PREGUNTAS


const obtenerPreguntas = async (req, res) => {
  try {
    // Devuelve todas las preguntas convirtiendo automáticamente el JSON a objetos
    const result = await pool.query('SELECT * FROM preguntas'); 
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo preguntas de la BBDD' });
  }
};

const buscarPregunta = async (req, res) => {
  const { dato } = req.params; 

  try {
    //Detecta si el parámetro recibido es un identificador técnico o un código corto
    const esUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(dato);

    let query = '';
    
    // Selecciona la consulta SQL adecuada según el tipo de dato
    if (esUUID) {
      query = 'SELECT * FROM preguntas WHERE id = $1';
    } else {
      query = 'SELECT * FROM preguntas WHERE codigo = $1';
    }

    const result = await pool.query(query, [dato]);

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'Pregunta no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error buscando pregunta:', err);
    res.status(500).json({ error: 'Error en el servidor al buscar la pregunta' });
  }
};


// CONTROLADORES RECURSOS


const obtenerRecursosPregunta = async (req, res) => {
  const { codigoPregunta } = req.params;

  try {
    // Busca los recursos en la vista que relaciona preguntas y materiales
    const query = `
      SELECT codigo_recurso, titulo, descripcion, url_completa
      FROM vista_recursos_app 
      WHERE codigo_pregunta = $1
    `;
    
    const result = await pool.query(query, [codigoPregunta]);

    res.json(result.rows);

  } catch (err) {
    console.error('Error obteniendo recursos:', err);
    res.status(500).json({ error: 'Error al obtener los recursos formativos' });
  }
};


// CONTROLADOR DE CORREO


const enviarResultadosPDF = async (req, res) => {
  const { email, nombreUsuario } = req.body;
  // recupera el archivo PDF almacenado temporalmente en la memoria
  const pdfFile = req.file; 

  if (!email || !pdfFile) {
    return res.status(400).json({ error: 'Faltan datos: email o archivo PDF.' });
  }

  try {
    // Configura el cliente SMTP para el envío de correos
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      secure: false,    //En false para el puerto cambiado
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false 
      },
      family: 4 // Esto fuerza a usar IPv4 y evita el timeout con Gmail
    });

    //Adjunta el PDF directamente desde el buffer de memoria
    const mailOptions = {
      from: `"Soporte TFG DigComp" <${process.env.MAIL_USER}>`, 
      to: email, 
      subject: 'Resultados de tu Cuestionario DigComp',
      text: `Hola ${nombreUsuario || 'Usuario'},\n\nAdjunto encontrarás el informe con tus resultados del cuestionario DigComp.\n\nUn saludo.`,
      attachments: [
        {
          filename: `informe_digcomp_${nombreUsuario || 'Usuario'}.pdf`,
          content: pdfFile.buffer, 
          contentType: 'application/pdf'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Correo enviado: %s', info.messageId);

    res.json({ msg: 'Correo enviado correctamente' });

  } catch (error) {
    console.error('Error enviando correo:', error);
    res.status(500).json({ error: 'Error al enviar el correo. Revisa la configuración del servidor.' });
  }
};


module.exports = { 
    crearUsuario, 
    obtenerTodosLosUsuarios,
    obtenerUsuario, 
    
    crearCuestionario, 
    obtenerCuestionarios,
    obtenerCuestionario,
    actualizarProgreso,
    eliminarCuestionario,       
    eliminarTodosCuestionarios,
    
    obtenerPreguntas,
    buscarPregunta,

    obtenerRecursosPregunta,

    enviarResultadosPDF
};