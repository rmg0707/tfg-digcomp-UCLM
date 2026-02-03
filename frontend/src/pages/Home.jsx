import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, CheckCircle, UserX, FileQuestion, BarChart3, BookOpen, 
  User, Briefcase, ArrowRight, Loader2, X, PenTool, AlertCircle,
  UserCheck, LogOut
} from 'lucide-react';

// Importar servicios de datos
import { UsuarioService, CuestionarioService } from '../services/dataService';
import './Home.css';

const Home = () => {
  const navegar = useNavigate();
  
  // Estados de interfaz
  const [iniciando, setIniciando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Estados de datos
  const [usuarioDetectado, setUsuarioDetectado] = useState(null);
  const [nombre, setNombre] = useState('');
  const [ocupacion, setOcupacion] = useState(''); 
  const [otraOcupacion, setOtraOcupacion] = useState(''); 

  // Consultar usuario previo
  const alIniciar = async (e) => {
    e.preventDefault();
    try {
      const ultimoUsuario = await UsuarioService.obtenerUltimo();
      if (ultimoUsuario) {
        setUsuarioDetectado(ultimoUsuario);
      } else {
        setIniciando(true);
      }
    } catch (err) {
      console.error("Error al iniciar:", err);
      setIniciando(true);
    }
  };

  // Resetear formulario
  const alCancelar = () => {
    setIniciando(false);
    setUsuarioDetectado(null);
    setNombre('');
    setOcupacion('');
    setOtraOcupacion('');
    setError('');
  };

  // Continuar sesión existente
  const alContinuarSesion = async () => {
    if (!usuarioDetectado) return;
    setCargando(true);

    const idCuestionario = crypto.randomUUID();
    
    // Preparar objeto cuestionario
    const nuevoCuestionario = { 
      id: idCuestionario, 
      usuarioId: usuarioDetectado.id,
      fechaFin: null, 
      progresoPreguntas: [], 
      resultado: null 
    };

    // Guardar cuestionario
    await CuestionarioService.crear(nuevoCuestionario);

    console.group("🚀 Nueva Sesión (Usuario Recurrente)");
    console.log("👤 Usuario:", usuarioDetectado);
    console.groupEnd();

    navegar(`/cuestionario?id=${idCuestionario}`);
  };

  // Cambiar usuario
  const alCambiarUsuario = () => {
    setUsuarioDetectado(null);
    setIniciando(true);
  };

  // Manejar cambios en inputs
  const alCambiarInput = (setter) => (e) => {
    setter(e.target.value);
    if (error) setError('');
  };

  // Validar y registrar
  const alConfirmarRegistro = async (e) => {
    e.preventDefault();
    const ocupacionFinal = ocupacion === 'Otro' ? otraOcupacion.trim() : ocupacion;

    // Validar campos
    if (!nombre.trim()) {
      setError("El nombre es obligatorio para continuar.");
      return;
    }
    if (!ocupacion || (ocupacion === 'Otro' && !ocupacionFinal)) {
      setError("Debes especificar tu ocupación.");
      return;
    }

    setError('');
    setCargando(true);

    // Generar IDs
    const idUsuario = crypto.randomUUID();
    const idCuestionario = crypto.randomUUID();

    const nuevoUsuario = { id: idUsuario, nombre, ocupacion: ocupacionFinal };
    const nuevoCuestionario = { 
      id: idCuestionario, 
      usuarioId: idUsuario, 
      fechaFin: null, 
      progresoPreguntas: [], 
      resultado: null 
    };

    // Crear registros
    await UsuarioService.crear(nuevoUsuario);
    await CuestionarioService.crear(nuevoCuestionario);

    console.group("🚀 Nueva Sesión Iniciada");
    console.log("👤 Usuario Creado:", nuevoUsuario);
    console.groupEnd();

    navegar(`/cuestionario?id=${idCuestionario}`);
  };

  return (
    <div className="home-container">
      
      {/* Modal usuario recurrente */}
      {usuarioDetectado && (
        <>
          <div className="form-overlay" onClick={() => setUsuarioDetectado(null)}></div>
          <div className="start-form-container">
            <div className="form-header">
              <div><h3>¡Hola de nuevo!</h3><p>Hemos detectado un perfil anterior.</p></div>
              <button onClick={() => setUsuarioDetectado(null)} className="btn-close"><X size={24}/></button>
            </div>
            <div className="user-card-preview">
              <div className="user-avatar-placeholder"><User size={24}/></div>
              <div className="user-info"><h4>{usuarioDetectado.nombre}</h4><p>{usuarioDetectado.ocupacion}</p></div>
            </div>
            <button onClick={alContinuarSesion} className="btn-submit" disabled={cargando}>
              {cargando ? <Loader2 className="animate-spin" /> : <><UserCheck size={20}/> Continuar como {usuarioDetectado.nombre.split(' ')[0]}</>}
            </button>
            <button onClick={alCambiarUsuario} className="btn-switch-user"><LogOut size={18}/> No soy yo, crear nuevo</button>
          </div>
        </>
      )}

      {/* Modal nuevo registro */}
      {iniciando && !usuarioDetectado && (
        <>
          <div className="form-overlay" onClick={alCancelar}></div>
          <div className="start-form-container">
            <div className="form-header">
              <div><h3>¡Casi listo!</h3><p>Completa tus datos.</p></div>
              <button onClick={alCancelar} className="btn-close"><X size={24}/></button>
            </div>
            <form onSubmit={alConfirmarRegistro}>
              
              <div className="input-wrapper">
                <label className="input-label"><User size={18} strokeWidth={2.5}/> Nombre Completo</label>
                <input 
                  type="text" 
                  className={`form-input ${error && !nombre ? 'error' : ''}`} 
                  placeholder="Ej. Ana García" 
                  value={nombre} 
                  onChange={alCambiarInput(setNombre)} 
                  autoFocus 
                  maxLength={50}
                />
              </div>

              <div className="input-wrapper">
                <label className="input-label"><Briefcase size={18} strokeWidth={2.5}/> Ocupación</label>
                <select className={`form-input ${error && !ocupacion ? 'error' : ''}`} value={ocupacion} onChange={alCambiarInput(setOcupacion)}>
                  <option value="" disabled>Selecciona una opción...</option>
                  <option value="Estudiante">Estudiante</option>
                  <option value="Docente">Docente</option>
                  <option value="Administrativo">Administrativo</option>
                  <option value="Directivo">Directivo</option>
                  <option value="Profesional IT">Profesional IT</option>
                  <option value="Desempleado">Desempleado</option>
                  <option value="Otro">Otro</option>
                </select>
                {ocupacion === 'Otro' && (
                  <div className="other-input-container">
                    <div className="input-label" style={{ fontSize: '0.8rem', color: '#334155', marginTop: '0.5rem' }}>
                      <PenTool size={14} style={{ marginRight: 6 }}/> Especifique:
                    </div>
                    <input 
                      type="text" 
                      className={`form-input ${error && !otraOcupacion ? 'error' : ''}`} 
                      placeholder="Escriba su ocupación..." 
                      value={otraOcupacion} 
                      onChange={alCambiarInput(setOtraOcupacion)} 
                      autoFocus 
                      maxLength={50}
                    />
                  </div>
                )}
              </div>

              {error && <div className="error-message"><AlertCircle size={20} />{error}</div>}
              
              <button type="submit" className="btn-submit" disabled={cargando}>
                {cargando ? <Loader2 className="animate-spin" /> : <>Comenzar Ahora <ArrowRight size={20}/></>}
              </button>
            </form>
          </div>
        </>
      )}

      {/* Contenido principal */}
      <div className="home-content">
        <div className="left-col">
          <div className="badge"><span className="dot"></span>Evaluación gratuita</div>
          <h1>Evalua tus <br/><span>Competencias Digitales</span></h1>
          <p className="description">Pon a prueba tus conocimientos con nuestra herramienta. Resuelve desafíos prácticos y teóricos y obtén un diagnóstico inmediato.</p>
          
          <div className="btn-group">
            {/* Botón iniciar */}
            <button onClick={alIniciar} className="btn btn-primary" disabled={cargando}>
               {cargando ? <Loader2 className="animate-spin" /> : <><Play size={20} fill="currentColor" /> Iniciar Cuestionario</>}
            </button>
            <a href="https://somos-digital.org/digcomp/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">Más información</a>
          </div>

          <div className="trust-signals">
            <div className="trust-item"><CheckCircle size={20} color="#22c55e" /> Sin registro</div>
            <div className="trust-item"><CheckCircle size={20} color="#22c55e" /> Resultados al instante</div>
            <div className="trust-item"><CheckCircle size={20} color="#22c55e" /> Basado en DigComp</div>
          </div>
        </div>

        <div className="right-col">
          <div className="step-card">
            <div className="step-number">1</div>
            <div className="icon-box" style={{ background: '#eff6ff', color: '#1a5fff' }}><UserX /></div>
            <div className="step-content"><h3>Acceso como invitado</h3><p>Entra directamente sin crear cuenta.</p></div>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <div className="icon-box" style={{ background: '#f3e8ff', color: '#7e22ce' }}><FileQuestion /></div>
            <div className="step-content"><h3>Realiza el cuestionario</h3><p>Responde desafíos teóricos y prácticos.</p></div>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <div className="icon-box" style={{ background: '#fff7ed', color: '#ea580c' }}><BarChart3 /></div>
            <div className="step-content"><h3>Obtén tu informe</h3><p>Recibe un informe detallado con fortalezas.</p></div>
          </div>
          <div className="step-card">
            <div className="step-number">4</div>
            <div className="icon-box" style={{ background: '#ecfdf5', color: '#059669' }}><BookOpen /></div>
            <div className="step-content"><h3>Recursos formativos</h3><p>Accede a materiales educativos.</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;