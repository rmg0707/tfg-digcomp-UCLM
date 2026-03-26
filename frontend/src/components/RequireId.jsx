import { useState, useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import NotFound from '../pages/NotFound';

import { CuestionarioService } from '../services/dataService'; 

const RequireId = ({ children, validarResultados = false }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const id = searchParams.get('id');

  const [cargando, setCargando] = useState(true);
  const [esValido, setEsValido] = useState(false);

  useEffect(() => {
    let estaMontado = true; // Evita fugas de memoria si el usuario navega muy rápido

    const verificarId = async () => {
      setCargando(true);

      // validar formato
      if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
        console.warn(`Intento de acceso con formato de ID inválido: ${id}`);
        if (estaMontado) { setEsValido(false); setCargando(false); }
        return;
      }

      // Validar contexto
      if (validarResultados) {
        const tieneResultados = location.state && location.state.resultados;
        if (estaMontado) { setEsValido(!!tieneResultados); setCargando(false); }
        return;
      }

      //Validar existencia real en BBDD
      try {
        const cuestionarioEnBBDD = await CuestionarioService.obtenerPorId(id); 
        const esRutaCuestionario = location.pathname.includes('/cuestionario');

        if (cuestionarioEnBBDD && cuestionarioEnBBDD.id === id) {
          
          // BLINDAJE DE SEGURIDAD EXCLUSIVO PARA EL CUESTIONARIO:
          if (esRutaCuestionario) {
              // A) Si el test ya está terminado (tiene fechaFin), no se puede volver a entrar a hacerlo.
              if (cuestionarioEnBBDD.fechaFin) {
                  console.warn("Intento de acceso a un test ya finalizado.");
                  if (estaMontado) setEsValido(false);
                  return;
              }

              // B) Si el test tiene progreso en la BBDD, exigimos que este navegador tenga la "llave" local.
              // Si no la tiene, significa que han copiado/adivinado la URL de otro ordenador. ¡Bloqueado!
              const tieneProgresoBBDD = cuestionarioEnBBDD.progresoPreguntas && cuestionarioEnBBDD.progresoPreguntas.length > 0;
              const tieneProgresoLocal = localStorage.getItem(`digcomp_progreso_${id}`) !== null;

              if (tieneProgresoBBDD && !tieneProgresoLocal) {
                  console.warn("Intento de secuestro de URL. Bloqueando acceso para proteger la BBDD.");
                  if (estaMontado) setEsValido(false);
                  return;
              }
          }

          if (estaMontado) setEsValido(true);

        } else {
          // El ID devuelto no coincide o es nulo
          if (estaMontado) setEsValido(false);
        }
      } catch (error) {
        console.error("Error de verificación en BBDD:", error);
        if (estaMontado) setEsValido(false);
      } finally {
        if (estaMontado) setCargando(false);
      }
    };

    verificarId();

    return () => { estaMontado = false; };
  }, [id, validarResultados, location.state, location.pathname]);

  // Pantalla de carga mientras comprobamos las medidas de seguridad
  if (cargando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader2 className="animate-spin" size={48} color="#f56a6a" />
      </div>
    );
  }

  // Si después de todo NO es válido, lo mandamos al error 404
  if (!esValido) {
    if (validarResultados) { return <Navigate to="/" replace />; }
    return <NotFound />;
  }

  return children;
};

export default RequireId;