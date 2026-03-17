import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, CheckCircle, UserX, FileQuestion, BarChart3, BookOpen, 
  User, Loader2, X, AlertCircle, Layers, Briefcase, PenTool, ShieldCheck
} from 'lucide-react';

// Importar servicios de datos
import { CuestionarioService } from '../services/dataService';
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
  const [nombre, setNombre] = useState('');
  const [ocupacion, setOcupacion] = useState(''); 
  const [otraOcupacion, setOtraOcupacion] = useState('');

  // NUEVOS ESTADOS: 'general' viene seleccionado por defecto
  const [tipoTest, setTipoTest] = useState('general');
  const [nivelSeleccionado, setNivelSeleccionado] = useState('');

  const alIniciar = (e) => {
    e.preventDefault();
    setIniciando(true);
  };

  const alCancelar = () => {
    setIniciando(false);
    setNombre('');
    setOcupacion('');
    setOtraOcupacion('');
    setTipoTest('general'); 
    setNivelSeleccionado('');
    setError('');
  };

  const alCambiarInput = (setter) => (e) => {
    setter(e.target.value);
    if (error) setError('');
  };

  const alConfirmarRegistro = async (e) => {
    e.preventDefault();
    
    // Validación de la ocupación
    const ocupacionFinal = ocupacion === 'Otro' ? otraOcupacion.trim() : ocupacion;

    // Validar campos
    if (!nombre.trim()) {
      setError("El nombre es obligatorio para personalizar tu informe.");
      return;
    }
    if (!ocupacion || (ocupacion === 'Otro' && !ocupacionFinal)) {
      setError("Debes especificar tu ocupación para continuar.");
      return;
    }
    if (tipoTest === 'nivel' && !nivelSeleccionado) {
      setError("Debes seleccionar un nivel para el test.");
      return;
    }

    setError('');
    setCargando(true);

    const idCuestionario = crypto.randomUUID();

    const nuevoCuestionario = { 
      id: idCuestionario, 
      tipo: tipoTest,
      nivel: tipoTest === 'nivel' ? nivelSeleccionado : null,
      fechaFin: null, 
      progresoPreguntas: [], 
      resultado: null,
      ocupacion: ocupacionFinal
    };

    try {
      await CuestionarioService.crear(nuevoCuestionario);
      // Pasamos el nombre por la URL (la ocupación se guarda en la BBDD, no viaja por URL)
      navegar(`/cuestionario?id=${idCuestionario}&tipo=${tipoTest}${tipoTest === 'nivel' ? `&nivel=${nivelSeleccionado}` : ''}&nombre=${encodeURIComponent(nombre.trim())}`);
    } catch (err) {
      console.error("Error:", err);
      setError("Error al conectar con el servidor. Inténtalo de nuevo.");
      setCargando(false);
    }
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
      
      {/* Modal nuevo registro */}
      {iniciando && (
        <>
          <div className="form-overlay" onClick={alCancelar}></div>
          <div className="start-form-container">
            <div className="form-header">
              <div><h3>¡Bienvenido!</h3><p>Introduce tus datos para el informe.</p></div>
              <button onClick={alCancelar} className="btn-close"><X size={24}/></button>
            </div>
            <form onSubmit={alConfirmarRegistro}>
              
              <div className="form-row">
                <div className="input-wrapper">
                  <label className="input-label"><User size={18} strokeWidth={2.5}/> Nombre</label>
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
                </div>
              </div>

              {ocupacion === 'Otro' && (
                <div className="input-wrapper other-input-container">
                  <div className="other-input-label">
                    <PenTool size={14} /> Especifique su ocupación:
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

              {renderSelectorTest()}

              {error && <div className="error-message"><AlertCircle size={20} />{error}</div>}
              
              <div className="privacy-box">
                <div className="privacy-header">
                  <ShieldCheck size={16} /> Protección de Datos
                </div>
                <p className="privacy-text">
                  Le informamos que los datos que nos facilite sobre su nombre, ocupación y correo electrónico los utilizaremos exclusivamente para la personalización y envío de su informe de autoevaluación, no los almacenaremos ni usaremos para ninguna otra finalidad.
                </p>
                <p className="privacy-text">
                  Puede ejercer los derechos recogidos en la normativa de protección de datos personales, mediante solicitud dirigida al delegado de protección de datos de la Universidad de Castilla-La Mancha en la dirección electrónica <a href="mailto:proteccion.datos@uclm.es" className="privacy-link">proteccion.datos@uclm.es</a>. Puede obtener más información en <a href="https://www.uclm.es/psi" target="_blank" rel="noopener noreferrer" className="privacy-link">www.uclm.es/psi</a>.
                </p>
              </div>
              
              {/* <button type="submit" className="btn-submit" disabled={cargando}>
                {cargando ? <Loader2 className="animate-spin" /> : <>Comenzar Ahora <ArrowRight size={20}/></>}
              </button> */}

              {/* QUITAR CUANDO ESTE EL CUESTIONARIO BIEN Y DESCOMENTAR BOTON*/}
              <br></br>
              <span style={{ textAlign: 'center', color: 'red', display: 'block' ,fontWeight: 'bold', fontSize: '1.1rem'}}>El acceso al cuestionario estará activo en breve. Disculpe las molestias.</span>


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