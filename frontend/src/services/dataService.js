// Define la dirección base para conectar con el servidor backend
//const API_URL = 'http://localhost:5000/api'; //VIEJA PARA LOCAL
const API_URL = 'https://tfg-digcomp-uclm.onrender.com/api';


export const UsuarioService = {
  // Solicita al servidor la lista completa de todos los usuarios registrados
  obtenerTodos: async () => {
    try {
      const respuesta = await fetch(`${API_URL}/usuarios`);
      if (!respuesta.ok) return [];
      return await respuesta.json();
    } catch (error) {
      console.error("Error obteniendo lista de usuarios:", error);
      return [];
    }
  },

  // Busca los datos de un usuario específico usando su identificador único
  obtenerPorId: async (id) => {
    try {
      const respuesta = await fetch(`${API_URL}/usuarios/${id}`);
      if (!respuesta.ok) return null;
      return await respuesta.json();
    } catch (error) {
      console.error("Error conectando con API:", error);
      return null;
    }
  },

  // Intenta recuperar la sesión del último usuario que accedió desde este navegador
  obtenerUltimo: async () => {
    const idGuardado = localStorage.getItem('ultimoUserId');
    if (idGuardado) {
      return await UsuarioService.obtenerPorId(idGuardado);
    }
    return null;
  },

  // Registra un nuevo usuario en la base de datos y guarda su referencia localmente
  crear: async (nuevoUsuario) => {
    try {
      const respuesta = await fetch(`${API_URL}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoUsuario)
      });
      
      if (!respuesta.ok) throw new Error('Error al crear usuario en servidor');
      
      const datos = await respuesta.json();
      
      // Guarda el identificador en el navegador para facilitar el próximo acceso
      localStorage.setItem('ultimoUserId', datos.id);
      
      return datos;
    } catch (error) {
      console.error("Error creando usuario:", error);
      throw error;
    }
  }
};

export const CuestionarioService = {
  // Descarga todas las preguntas disponibles en el servidor para generar los exámenes
  obtenerBancoPreguntas: async () => {
    try {
      const respuesta = await fetch(`${API_URL}/preguntas`);
      if (!respuesta.ok) return [];
      return await respuesta.json();
    } catch (error) {
      console.error("Error obteniendo banco de preguntas:", error);
      return [];
    }
  },

  // Inicializa un nuevo cuestionario en la base de datos con la configuración básica
  crear: async (nuevoCuestionario) => {
    try {
      const respuesta = await fetch(`${API_URL}/cuestionarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoCuestionario)
      });
      return await respuesta.json();
    } catch (error) {
      console.error("Error creando cuestionario:", error);
      throw error;
    }
  },

  // Recupera los detalles y resultados de un cuestionario ya existente
  obtenerPorId: async (id) => {
    try {
      const respuesta = await fetch(`${API_URL}/cuestionarios/${id}`);
      if (!respuesta.ok) return null;
      return await respuesta.json();
    } catch (error) {
      console.error("Error obteniendo cuestionario:", error);
      return null;
    }
  },

  // Guarda el progreso de las respuestas o actualiza el resultado final en el servidor
  actualizar: async (id, datosActualizados) => {
    try {
      const respuesta = await fetch(`${API_URL}/cuestionarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosActualizados)
      });
      return await respuesta.json();
    } catch (error) {
      console.error("Error guardando resultados:", error);
      throw error;
    }
  },

  // Elimina un cuestionario específico del historial
  eliminar: async (id) => {
    try {
      const respuesta = await fetch(`${API_URL}/cuestionarios/${id}`, {
        method: 'DELETE',
        keepalive: true, 
        headers: { 'Content-Type': 'application/json' }
      });
      return await respuesta.json();
    } catch (error) {
      console.error("Error eliminando cuestionario:", error);
      throw error;
    }
  },

  // Borra todo el historial de cuestionarios almacenado en la base de datos
  eliminarTodos: async () => {
    try {
      const respuesta = await fetch(`${API_URL}/cuestionarios`, {
        method: 'DELETE'
      });
      return await respuesta.json();
    } catch (error) {
      console.error("Error limpiando cuestionarios:", error);
      throw error;
    }
  },

  // Registra en la consola la estructura del examen generado para control interno
  guardarPreguntasGeneradas: async (registro) => {
    console.log("Log de auditoría (Examen generado):", registro);
  },
  
  // Envía el archivo PDF y los datos del usuario al servidor de correo
  enviarResultadosPorCorreo: async (formData) => {
    try {
      const respuesta = await fetch(`${API_URL}/enviar-resultados`, {
        method: 'POST',
        body: formData, 
      });

      if (!respuesta.ok) {
        const errorData = await respuesta.json();
        throw new Error(errorData.error || 'Error al enviar el correo');
      }

      return await respuesta.json();
    } catch (error) {
      console.error("Error en servicio de correo:", error);
      throw error;
    }
  }
};

export const RecursoService = {
  // Busca material educativo relacionado con una pregunta específica para reforzar el aprendizaje
  obtenerPorPregunta: async (codigoPregunta) => {
    try {
      const respuesta = await fetch(`${API_URL}/recursos/${codigoPregunta}`);
      
      if (!respuesta.ok) {
        console.error("Error respuesta servidor recursos");
        return [];
      }
      
      return await respuesta.json();
    } catch (error) {
      console.error("Error conectando con API de recursos:", error);
      return [];
    }
  }
};