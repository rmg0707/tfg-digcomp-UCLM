import { useLocation, Navigate } from 'react-router-dom';
import NotFound from '../pages/NotFound';

const RequireId = ({ children, validarResultados = false }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const id = searchParams.get('id');

  if (!id) {
    return <NotFound />;
  }

  // validar formato
  const isUUID = /^[0-9a-fA-F-]{36}$/.test(id);
  
  if (!isUUID) {
    console.warn(`Intento de acceso con ID inválido: ${id}`);
    return <NotFound />;
  }

  // Validar contexto
  // Si esta prop es true, verificamos que realmente traiga datos del cuestionario.
  // Esto evita que alguien copie la URL de un UUID válido y la pegue en otra pestaña
  if (validarResultados) {
    const tieneResultados = location.state && location.state.resultados;
    
    if (!tieneResultados) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default RequireId;