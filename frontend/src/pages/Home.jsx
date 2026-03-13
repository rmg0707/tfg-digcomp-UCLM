import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, CheckCircle, UserX, FileQuestion, BarChart3, BookOpen, 
  User, Briefcase, ArrowRight, Loader2, X, PenTool, AlertCircle,
  UserCheck, LogOut, Layers
} from 'lucide-react';

// Importar servicios de datos
import { UsuarioService, CuestionarioService } from '../services/dataService';
import './Home.css';

// IMPORTAR LOGO (Asegúrate de que la ruta sea correcta)
import logoUCLM from '../assets/Logo_UCLM_40.png';

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

  // NUEVOS ESTADOS: 'general' viene seleccionado por defecto
  const [tipoTest, setTipoTest] = useState('general');
  const [nivelSeleccionado, setNivelSeleccionado] = useState('');

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
    setTipoTest('general'); 
    setNivelSeleccionado('');
    setError('');
  };

  // Continuar sesión existente
  const alContinuarSesion = async () => {
    if (!usuarioDetectado) return;
    
    if (tipoTest === 'nivel' && !nivelSeleccionado) {
      setError("Debes seleccionar un nivel para continuar.");
      return;
    }

    setError('');
    setCargando(true);

    const idCuestionario = crypto.randomUUID();
    
    // Preparar objeto cuestionario
    const nuevoCuestionario = { 
      id: idCuestionario, 
      usuarioId: usuarioDetectado.id,
      tipo: tipoTest,
      nivel: tipoTest === 'nivel' ? nivelSeleccionado : null,
      fechaFin: null, 
      progresoPreguntas: [], 
      resultado: null 
    };

    // Guardar cuestionario
    await CuestionarioService.crear(nuevoCuestionario);
    navegar(`/cuestionario?id=${idCuestionario}&tipo=${tipoTest}${tipoTest === 'nivel' ? `&nivel=${nivelSeleccionado}` : ''}`);
  };

  // Cambiar usuario
  const alCambiarUsuario = () => {
    setUsuarioDetectado(null);
    setIniciando(true);
    setTipoTest('general');
    setNivelSeleccionado('');
    setError('');
  };

  // Manejar cambios en inputs
  const alCambiarInput = (setter) => (e) => {
    setter(e.target.value);
    if (error) setError('');
  };

  // Validar y registrar nuevo usuario
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
    if (tipoTest === 'nivel' && !nivelSeleccionado) {
      setError("Debes seleccionar un nivel para el test.");
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
      tipo: tipoTest,
      nivel: tipoTest === 'nivel' ? nivelSeleccionado : null,
      fechaFin: null, 
      progresoPreguntas: [], 
      resultado: null 
    };

    // Crear registros
    await UsuarioService.crear(nuevoUsuario);
    await CuestionarioService.crear(nuevoCuestionario);

    navegar(`/cuestionario?id=${idCuestionario}&tipo=${tipoTest}${tipoTest === 'nivel' ? `&nivel=${nivelSeleccionado}` : ''}`);
  };

  const niveles = [
    { id: 'A1', nombre: 'Básico' },
    { id: 'A2', nombre: 'Básico' },
    { id: 'B1', nombre: 'Intermedio' },
    { id: 'B2', nombre: 'Intermedio' },
    { id: 'C1', nombre: 'Avanzado' },
    { id: 'C2', nombre: 'Altamente Avanzado' }
  ];

  const renderSelectorTest = () => {
    const esTestGeneral = tipoTest === 'general';

    return (
      <div className="selector-test-wrapper">
        <label className="input-label">
          <Layers size={18} strokeWidth={2.5}/> Modalidad de Test
        </label>
        
        <button
          type="button"
          onClick={() => {
            setTipoTest('general');
            setNivelSeleccionado('');
            if (error) setError('');
          }}
          className={`nivel-btn btn-general ${esTestGeneral ? 'selected' : ''}`}
        >
          <span className="nivel-id">General (A1 - C2)</span>
          <span className="nivel-nombre">Evaluación completa de todas las áreas y niveles</span>
        </button>

        <div className="nivel-grid">
          {niveles.map((nivel) => {
            const estaSeleccionado = tipoTest === 'nivel' && nivelSeleccionado === nivel.id;
            
            return (
              <button
                key={nivel.id}
                type="button"
                onClick={() => {
                  setTipoTest('nivel');
                  setNivelSeleccionado(nivel.id);
                  if (error) setError('');
                }}
                className={`nivel-btn ${estaSeleccionado ? 'selected' : ''}`}
              >
                <span className="nivel-id">{nivel.id}</span>
                <span className="nivel-nombre">{nivel.nombre}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <img src={logoUCLM} alt="Universidad de Castilla-La Mancha" className="main-logo" />
      </header>
      
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

            {renderSelectorTest()}

            {error && <div className="error-message" style={{ marginBottom: '1rem' }}><AlertCircle size={20} />{error}</div>}

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
                      maxLength={50}
                    />
                  </div>
                )}
              </div>

              {renderSelectorTest()}

              {error && <div className="error-message" style={{ marginTop: '0.5rem' }}><AlertCircle size={20} />{error}</div>}
              
              <button type="submit" className="btn-submit" disabled={cargando} style={{ marginTop: '1rem' }}>
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
            <a href="https://digitall.org.es/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">Más información</a>
          </div>


          <div className="aviso-tiempo-test">
            <AlertCircle size={20} />
            <span>
              <strong>Advertencia:</strong> El tiempo de duración de la prueba oscila entre 45 y 60 minutos. 
              Si abandonas, no se puede recuperar la evaluación parcial.
            </span>
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
            <div className="step-content"><h3>Acceso como invitado</h3><p>No es necesario registrarse.</p></div>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <div className="icon-box" style={{ background: '#f3e8ff', color: '#7e22ce' }}><FileQuestion /></div>
            <div className="step-content"><h3>Realiza el cuestionario</h3><p>Responde a las preguntas para evaluar tu nivel de competencias digitales.</p></div>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <div className="icon-box" style={{ background: '#fff7ed', color: '#ea580c' }}><BarChart3 /></div>
            <div className="step-content"><h3>Obtén tu informe</h3><p>Descarga tu informe detallado. Opcionalmente te lo mandamos por email.</p></div>
          </div>
          <div className="step-card">
            <div className="step-number">4</div>
            <div className="icon-box" style={{ background: '#ecfdf5', color: '#059669' }}><BookOpen /></div>
            <div className="step-content"><h3>Recursos formativos</h3><p>En función de tu resultado te sugerimos algunos recursos formativos.</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;