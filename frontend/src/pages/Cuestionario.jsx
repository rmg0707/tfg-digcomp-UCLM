import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Shield, Lightbulb, LogOut, HelpCircle, ArrowRight,
  Wrench, FileText, Mail, Search, Settings, X,
  Sun, Moon, Eye, Plus, ExternalLink, ZoomIn, Loader
} from 'lucide-react';

import { CuestionarioService } from '../services/dataService';

// Importar configuración local
import {
  PUNTOS_POR_NIVEL,
  NIVELES_ORDENADOS,
  MAPA_NIVELES_NUMERICOS,
  obtenerTextoCompetencia
} from '../config/localconfig';

import './Cuestionario.css';

// Cambiar enlace por directorio carpetas
const ENLACE_DIRECTORIO_RAIZ = "https://1drv.ms/f/c/2f260ce3a6e48f16/IgAkfXygyl1yTbF1cX8IscMdAWR_MXL4gz79DSDNdNnKUK8?e=v4UR6B";

// Palabras clave de áreas
const KEYWORDS_AREAS = [
  'Información', 'Comunicación', 'Creación', 'Seguridad', 'Resolución'
];

// ==========================================
// FUNCIÓN DE LIMPIEZA DE DATOS
// ==========================================

const formatearPreguntaBBDD = (preguntaEnBBDD) => {
  let nivelFinal = 'A1';
  const rawNivel = preguntaEnBBDD.nivel || preguntaEnBBDD.level;
  const nivelNumerico = parseInt(rawNivel);

  // Normalizar nivel
  if (!isNaN(nivelNumerico) && MAPA_NIVELES_NUMERICOS[nivelNumerico]) {
    nivelFinal = MAPA_NIVELES_NUMERICOS[nivelNumerico];
  } else if (rawNivel && typeof rawNivel === 'string') {
    const procesado = rawNivel.replace(/Nivel\s*/i, '').trim().toUpperCase();
    if (PUNTOS_POR_NIVEL[procesado]) nivelFinal = procesado;
  } else if (preguntaEnBBDD.codigo) {
    const prefijo = preguntaEnBBDD.codigo.substring(0, 2).toUpperCase();
    if (PUNTOS_POR_NIVEL[prefijo]) nivelFinal = prefijo;
  }

  // Estructura unificada
  return {
    id: preguntaEnBBDD.id,
    codigo: preguntaEnBBDD.codigo,
    enunciado: preguntaEnBBDD.enunciado,
    tipoPregunta: preguntaEnBBDD.tipo_pregunta || preguntaEnBBDD.tipoPregunta,
    areaDigComp: preguntaEnBBDD.area_dig_comp || preguntaEnBBDD.areaDigComp,
    competenciaDigComp: obtenerTextoCompetencia(preguntaEnBBDD.codigo),
    nivel: nivelFinal,
    puntosMaximos: PUNTOS_POR_NIVEL[nivelFinal],
    datosPregunta: preguntaEnBBDD.datos_pregunta || preguntaEnBBDD.datosPregunta,
    rutaImagen: preguntaEnBBDD.ruta_imagen || preguntaEnBBDD.rutaImagen,
    enlaceExterno: preguntaEnBBDD.enlace_externo || preguntaEnBBDD.enlaceExterno,
    textoAltImagen: preguntaEnBBDD.texto_alt_imagen || preguntaEnBBDD.textoAltImagen
  };
};

const mezclarOpciones = (preguntaOriginal) => {
  const p = { ...preguntaOriginal };

  if (Array.isArray(p.datosPregunta)) p.datosPregunta = [...p.datosPregunta];
  else if (p.datosPregunta && typeof p.datosPregunta === 'object') p.datosPregunta = { ...p.datosPregunta };

  const tipo = p.tipoPregunta ? p.tipoPregunta.toUpperCase() : '';

  // Aleatorizar según tipo
  if (tipo.includes('SELECCION') || tipo.includes('TEST')) {
    let opciones = Array.isArray(p.datosPregunta) ? p.datosPregunta : p.datosPregunta?.opciones ? [...p.datosPregunta.opciones] : null;
    if (opciones) {
      opciones.sort(() => 0.5 - Math.random());
      if (Array.isArray(p.datosPregunta)) p.datosPregunta = opciones;
      else p.datosPregunta.opciones = opciones;
    }
  } else if (tipo.includes('VERDADERO') || tipo.includes('FALSO')) {
    let items = Array.isArray(p.datosPregunta) ? [...p.datosPregunta] : p.datosPregunta?.items ? [...p.datosPregunta.items] : null;
    if (items) {
      items.sort(() => 0.5 - Math.random());
      if (Array.isArray(p.datosPregunta)) p.datosPregunta = items;
      else p.datosPregunta.items = items;
    }
  } else if (tipo.includes('CLASIFICACION')) {
    if (p.datosPregunta?.items) {
      p.datosPregunta.items = [...p.datosPregunta.items].sort(() => 0.5 - Math.random());
    }
  }
  return p;
};

const generarBateriaPreguntas = (todasLasPreguntas) => {
  if (!todasLasPreguntas || todasLasPreguntas.length === 0) return [];
  const bancoFormateado = todasLasPreguntas.map(p => formatearPreguntaBBDD(p));

  const preguntasPorNivel = { 'A1': [], 'A2': [], 'B1': [], 'B2': [], 'C1': [], 'C2': [] };
  bancoFormateado.forEach(p => {
    if (preguntasPorNivel[p.nivel]) preguntasPorNivel[p.nivel].push(p);
    else preguntasPorNivel['A1'].push(p);
  });

  let seleccionFinal = [];
  const CANTIDAD_POR_NIVEL = 7;

  // Selección equilibrada por niveles
  NIVELES_ORDENADOS.forEach(nivel => {
    const poolNivel = [...preguntasPorNivel[nivel]];
    const poolPorArea = { 0: [], 1: [], 2: [], 3: [], 4: [], 'otros': [] };

    poolNivel.forEach(p => {
      const areaTexto = p.areaDigComp || '';
      let indexFound = -1;
      KEYWORDS_AREAS.forEach((kw, idx) => {
        if (areaTexto.includes(kw)) indexFound = idx;
      });
      if (indexFound !== -1) poolPorArea[indexFound].push(p);
      else poolPorArea['otros'].push(p);
    });

    const seleccionNivel = [];
    const idsSeleccionadosNivel = new Set();

    // Intentar cubrir todas las áreas
    for (let i = 0; i < 5; i++) {
      if (poolPorArea[i].length > 0) {
        const randomIdx = Math.floor(Math.random() * poolPorArea[i].length);
        const elegida = poolPorArea[i][randomIdx];
        seleccionNivel.push(elegida);
        idsSeleccionadosNivel.add(elegida.id);
        poolPorArea[i].splice(randomIdx, 1);
      }
    }

    // Rellenar con restantes
    let sobrantesNivel = poolNivel.filter(p => !idsSeleccionadosNivel.has(p.id));
    sobrantesNivel.sort(() => 0.5 - Math.random());

    while (seleccionNivel.length < CANTIDAD_POR_NIVEL && sobrantesNivel.length > 0) {
      seleccionNivel.push(sobrantesNivel.pop());
    }
    seleccionFinal.push(...seleccionNivel);
  });

  // Completar si faltan preguntas
  if (seleccionFinal.length < 42) {
    const idsUsados = new Set(seleccionFinal.map(p => p.id));
    const sobrantesGlobales = bancoFormateado.filter(p => !idsUsados.has(p.id));
    seleccionFinal.push(...sobrantesGlobales.sort(() => 0.5 - Math.random()).slice(0, 42 - seleccionFinal.length));
  }

  return seleccionFinal.sort(() => 0.5 - Math.random()).map(p => mezclarOpciones(p));
};

// ==========================================
// COMPONENTES VISUALES
// ==========================================

const BotonTamañoLetra = ({ etiqueta, index, nivelActual, setNivel }) => (
  <button className={`text-size-btn ${nivelActual === index ? 'active' : ''}`} onClick={() => setNivel(index)}>
    <span style={{ fontSize: ['16px', '20px', '24px'][index], fontWeight: 'bold', lineHeight: 1 }}>{['A', 'A+', 'A++'][index]}</span>
    <span>{etiqueta}</span>
  </button>
);

const MenuAccesibilidad = ({ mostrar, alCerrar, alAlternar, config, setConfig }) => {
  const panelRef = useRef(null);

  // Detectar clic fuera del panel
  useEffect(() => {
    const alHacerClickFuera = (e) => {
      if (mostrar && panelRef.current && !panelRef.current.contains(e.target)) alCerrar();
    };
    document.addEventListener('mousedown', alHacerClickFuera);
    return () => document.removeEventListener('mousedown', alHacerClickFuera);
  }, [mostrar, alCerrar]);

  return (
    <div className="access-wrapper" ref={panelRef}>
      <button className={`access-btn ${mostrar ? 'active' : ''}`} onClick={alAlternar}>
        {mostrar ? <X size={24} /> : <Settings size={24} />}
      </button>
      {mostrar && (
        <div className="access-panel">
          <h3 className="access-title">Apariencia</h3>
          <div className="access-grid-simple">
            <div className="access-group">
              <span className="access-label">Tamaño</span>
              <div className="text-size-bar">
                {['Pequeño', 'Mediano', 'Grande'].map((label, i) => (
                  <BotonTamañoLetra
                    key={i}
                    etiqueta={label}
                    index={i}
                    nivelActual={config.nivelTexto}
                    setNivel={(n) => setConfig(prev => ({ ...prev, nivelTexto: n }))}
                  />
                ))}
              </div>
            </div>
            <div className="access-row-item">
              <div className="access-row-label">
                {config.modoOscuro ? <Moon size={20} /> : <Sun size={20} />}
                <span>Oscuro</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={config.modoOscuro}
                  onChange={() => setConfig(prev => ({ ...prev, modoOscuro: !prev.modoOscuro }))}
                />
                <span className="slider round"></span>
              </label>
            </div>
            <div className="access-row-item">
              <div className="access-row-label"><Eye size={20} /><span>Contraste</span></div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={config.altoContraste}
                  onChange={() => setConfig(prev => ({ ...prev, altoContraste: !prev.altoContraste }))}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const VistaOpcionMultiple = ({ pregunta, respuestaUsuario, alSeleccionar }) => {
  const opciones = Array.isArray(pregunta.datosPregunta) ? pregunta.datosPregunta : pregunta.datosPregunta?.opciones;
  if (!opciones || !Array.isArray(opciones)) return <div className="error-box">Error datos.</div>;

  return (
    <div className="options-grid">
      {opciones.map((opcion, idx) => (
        <label key={idx} className={`option-label ${respuestaUsuario === opcion.texto ? 'selected' : ''}`}>
          <input
            type="radio"
            name={`q-${pregunta.id}`}
            className="option-input"
            value={opcion.texto}
            checked={respuestaUsuario === opcion.texto}
            onChange={() => alSeleccionar(opcion.texto)}
          />
          <div className="radio-circle"><div className="radio-dot"></div></div>
          <span className="option-text">{opcion.texto}</span>
        </label>
      ))}
    </div>
  );
};

const VistaVerdaderoFalso = ({ pregunta, respuestasActuales = {}, alResponder }) => {
  const items = Array.isArray(pregunta.datosPregunta) ? pregunta.datosPregunta : pregunta.datosPregunta?.items;
  if (!items || !Array.isArray(items)) return <div className="error-box">Error datos.</div>;

  return (
    <div className="vf-container">
      {items.map((item, idx) => {
        const llave = item.id || `item-${idx}`;
        return (
          <div key={llave} className="vf-row">
            <div className="vf-statement">{item.texto}</div>
            <div className="vf-options">
              <button
                className={`vf-btn vf-true ${respuestasActuales[llave] === true ? 'selected' : ''}`}
                onClick={() => alResponder(llave, true)}
              >
                V
              </button>
              <button
                className={`vf-btn vf-false ${respuestasActuales[llave] === false ? 'selected' : ''}`}
                onClick={() => alResponder(llave, false)}
              >
                F
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const VistaClasificacion = ({ pregunta, estadoTablero, fichasDisponibles, columnaActiva, setColumnaActiva, moverFicha }) => {
  if (!pregunta.datosPregunta || !pregunta.datosPregunta.columnas) return <div className="error-box">Error datos.</div>;
  const empezarArrastre = (e, textoFicha) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', textoFicha); };

  return (
    <div className="classification-container">
      {columnaActiva !== null && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Añadir elemento</h3>
            <div className="modal-items-list">
              {fichasDisponibles.length === 0 ? <p>No quedan fichas.</p> :
                fichasDisponibles.map(ficha => (
                  <button
                    key={ficha}
                    className="modal-item-button"
                    onClick={() => { moverFicha(ficha, columnaActiva); setColumnaActiva(null); }}
                  >
                    {ficha}
                  </button>
                ))}
            </div>
            <button className="modal-cancel-button" onClick={() => setColumnaActiva(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {fichasDisponibles.length > 0 && (
        <div className="available-items">
          <h3>Fichas Disponibles</h3>
          <div className="items-pool">
            {fichasDisponibles.map(texto => (
              <div
                key={texto}
                className="classification-item available"
                draggable="true"
                onDragStart={(e) => empezarArrastre(e, texto)}
              >
                {texto}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`classification-grid columns-${pregunta.datosPregunta.columnas.length}`}>
        {pregunta.datosPregunta.columnas.map(col => (
          <div key={col.id} className="classification-column">
            <h3>{col.nombre}</h3>
            <div
              className="column-dropzone"
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
              onDrop={(e) => { e.preventDefault(); const ficha = e.dataTransfer.getData('text/plain'); if (ficha) moverFicha(ficha, parseInt(col.id)); }}
            >
              {estadoTablero[col.id]?.map(texto => (
                <div key={texto} className="classification-item assigned" draggable="true" onDragStart={(e) => empezarArrastre(e, texto)}>
                  {texto} <button className="remove-item-btn" onClick={() => moverFicha(texto, null)}>×</button>
                </div>
              ))}
              {!estadoTablero[col.id]?.length && <div className="empty-column-placeholder"><span>Suelta aquí</span></div>}
            </div>
            <button onClick={() => setColumnaActiva(col.id)} className="add-element-button">
              <Plus size={18} /> <span>Añadir</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// COMPONENTE PRINCIPAL CUESTIONARIO
// ==========================================

function Cuestionario() {
  const navegar = useNavigate();
  const [paramsBusqueda] = useSearchParams();
  const idCuestionario = paramsBusqueda.get('id');

  // Estados del cuestionario
  const [bateriaPreguntas, setBateriaPreguntas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);

  const finalizadoExitosamente = useRef(false);
  const efectoEjecutado = useRef(false);
  const puedeBorrar = useRef(false);
  const tiempoInicioPregunta = useRef(null);

  const [indiceActual, setIndiceActual] = useState(0);
  const [respuestasUsuario, setRespuestasUsuario] = useState({});
  const [historialResultados, setHistorialResultados] = useState([]);
  const [guardando, setGuardando] = useState(false);

  // Estados visuales y de interacción
  const [tablerosClasificacion, setTablerosClasificacion] = useState({});
  const [columnaActiva, setColumnaActiva] = useState(null);
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [configVisual, setConfigVisual] = useState({ nivelTexto: 0, modoOscuro: false, altoContraste: false });
  const [imagenZoom, setImagenZoom] = useState(null);

  // Aplicar temas visuales
  useEffect(() => {
    const cuerpo = document.body;
    configVisual.modoOscuro ? cuerpo.classList.add('dark-mode-body') : cuerpo.classList.remove('dark-mode-body');
    configVisual.altoContraste ? cuerpo.classList.add('high-contrast-body') : cuerpo.classList.remove('high-contrast-body');
    return () => cuerpo.classList.remove('dark-mode-body', 'high-contrast-body');
  }, [configVisual.modoOscuro, configVisual.altoContraste]);

  // Inicializar cuestionario
  useEffect(() => {
    if (efectoEjecutado.current) return;
    const iniciarCuestionario = async () => {
      efectoEjecutado.current = true;
      try {
        setCargando(true);
        const preguntasCrudas = await CuestionarioService.obtenerBancoPreguntas();
        const preguntasProcesadas = generarBateriaPreguntas(preguntasCrudas);

        if (preguntasProcesadas.length === 0) {
          setErrorCarga("No se encontraron preguntas.");
        } else {
          setBateriaPreguntas(preguntasProcesadas);
        }
      } catch {
        setErrorCarga("Error conectando con el servidor.");
      } finally {
        setCargando(false);
      }
    };
    if (idCuestionario) iniciarCuestionario();
  }, [idCuestionario]);

  // Temporizador para permitir borrado
  useEffect(() => {
    const timer = setTimeout(() => { puedeBorrar.current = true; }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (puedeBorrar.current && idCuestionario && !finalizadoExitosamente.current) {
        CuestionarioService.eliminar(idCuestionario).catch(() => { });
      }
    };
  }, [idCuestionario]);

  // Registro de incio de pregunta (para medir tiempo/duracion)
  useEffect(() => {
    if (!cargando && bateriaPreguntas.length > 0) {
      tiempoInicioPregunta.current = new Date();
    }
  }, [indiceActual, cargando, bateriaPreguntas.length]);

  const cancelarCuestionario = () => { navegar('/'); };

  const alResponderVF = (idItem, valor) => {
    const actuales = respuestasUsuario[preguntaActual.id] || {};
    setRespuestasUsuario({ ...respuestasUsuario, [preguntaActual.id]: { ...actuales, [idItem]: valor } });
  };

  const moverFichaAColumna = (textoFicha, colId) => {
    const estadoActual = tablerosClasificacion[preguntaActual.id] || {};
    const nuevoEstado = { ...estadoActual };
    Object.keys(nuevoEstado).forEach(k => { nuevoEstado[k] = nuevoEstado[k].filter(t => t !== textoFicha); });
    if (colId !== null) nuevoEstado[colId].push(textoFicha);
    setTablerosClasificacion({ ...tablerosClasificacion, [preguntaActual.id]: nuevoEstado });
  };

  // Avanzar y procesar resultados
  const irSiguientePregunta = async (resultadoPregunta) => {
    const nuevoHistorial = [...historialResultados, resultadoPregunta];
    setHistorialResultados(nuevoHistorial);
    setColumnaActiva(null);

    if (indiceActual + 1 < bateriaPreguntas.length) {
      CuestionarioService.actualizar(idCuestionario, { progresoPreguntas: nuevoHistorial, resultado: null }).catch(() => { });
      setIndiceActual(indiceActual + 1);
    } else {
      // Finalizar cuestionario
      setGuardando(true);
      finalizadoExitosamente.current = true;

      const puntosObtenidos = nuevoHistorial.reduce((acc, h) => acc + (h.puntosPonderados || 0), 0);
      const puntosMaximos = bateriaPreguntas.reduce((acc, p) => acc + p.puntosMaximos, 0);
      const porcentaje = puntosMaximos > 0 ? (puntosObtenidos / puntosMaximos) * 100 : 0;

      const notaFinal = (porcentaje / 10).toFixed(2);

      let totalSegundos = 0;
      nuevoHistorial.forEach(intento => {
        totalSegundos += intento.duracion || 0;
      });

      const reporteSimple = {
        nota: notaFinal,
        porcentaje: porcentaje.toFixed(2),
        puntosLogrados: puntosObtenidos.toFixed(2),
        total: bateriaPreguntas.length,
        estado: parseFloat(notaFinal) >= 5.0 ? 'APROBADO' : 'SUSPENSO',
        aciertos: nuevoHistorial.filter(h => h.score === 1).length,
        parciales: nuevoHistorial.filter(h => h.score > 0 && h.score < 1).length,
        fallos: nuevoHistorial.filter(h => h.score === 0 && h.estado !== 'NO_SABE').length,
        noSabe: nuevoHistorial.filter(h => h.estado === 'NO_SABE').length,
        duracionTotalSegundos: parseFloat(totalSegundos.toFixed(2))
      };

      try {
        await CuestionarioService.actualizar(idCuestionario, {
          fechaFin: new Date().toISOString(),
          progresoPreguntas: nuevoHistorial,
          resultado: reporteSimple
        });

        navegar(`/informe?id=${idCuestionario}`, {
          state: {
            cuestionarioId: idCuestionario,
            resultados: reporteSimple,
            historial: nuevoHistorial
          },
          replace: true
        });
      } catch {
        alert("Error al guardar.");
        setGuardando(false);
        finalizadoExitosamente.current = false;
      }
    }
  };

  // Evaluar respuesta actual
  const procesarIntento = (esNoSabe = false) => {
    const fechaInicio = tiempoInicioPregunta.current;
    const fechaFin = new Date();
    // Duración en segundos con 2 decimales
    const duracionSegundos = parseFloat(((fechaFin - fechaInicio) / 1000).toFixed(2)); 
    
    // Formato ISO para la base de datos (Ej: 2023-10-25T10:00:00.000Z)
    const fechaInicioIso = fechaInicio.toISOString();
    const fechaFinIso = fechaFin.toISOString();


    if (esNoSabe) return irSiguientePregunta({ id_pregunta: preguntaActual.id, codigo: preguntaActual.codigo, score: 0, puntosPonderados: 0, nivel: preguntaActual.nivel, estado: 'NO_SABE', 
                                                fechaInicio: fechaInicioIso, fechaFin: fechaFinIso, duracion: duracionSegundos });

    let porcentajeAcierto = 0;
    const datos = preguntaActual.datosPregunta;

    if (esArrastrar) {
      let aciertos = 0;
      datos.items.forEach(item => {
        const col = Object.keys(tablerosClasificacion[preguntaActual.id] || {}).find(c => tablerosClasificacion[preguntaActual.id][c].includes(item.texto));
        if (col && parseInt(col) === item.columna_correcta_id) aciertos++;
      });
      porcentajeAcierto = datos.items.length > 0 ? aciertos / datos.items.length : 0;
    } else if (esVF) {
      let aciertos = 0;
      const resp = respuestasUsuario[preguntaActual.id] || {};
      const items = Array.isArray(datos) ? datos : datos.items;
      items.forEach((item, i) => { if (resp[item.id || `item-${i}`] === item.es_verdadera) aciertos++; });
      porcentajeAcierto = aciertos / items.length;
    } else {
      const opCorrecta = (Array.isArray(datos) ? datos : datos.opciones).find(op => op.texto === respuestasUsuario[preguntaActual.id]);
      porcentajeAcierto = (opCorrecta && opCorrecta.correcta) ? 1 : 0;
    }

    irSiguientePregunta({
      id_pregunta: preguntaActual.id, codigo: preguntaActual.codigo, score: porcentajeAcierto,
      puntosPonderados: porcentajeAcierto * preguntaActual.puntosMaximos, nivel: preguntaActual.nivel,
      estado: porcentajeAcierto === 1 ? 'CORRECTO' : porcentajeAcierto > 0 ? 'PARCIAL' : 'INCORRECTO',
      fechaInicio: fechaInicioIso, fechaFin: fechaFinIso, duracion: duracionSegundos
    });
  };

  // Estados de carga y error
  if (cargando) return <div className="quiz-container loading-state"><Loader className="spin-animation" size={48} /><p>Cargando...</p></div>;
  if (errorCarga) return <div className="quiz-container error-state"><LogOut size={48} color="#ef4444" /><h2>Error</h2><p>{errorCarga}</p><button className="btn btn-primary" onClick={() => navegar('/')}>Volver</button></div>;

  const preguntaActual = bateriaPreguntas[indiceActual];
  if (!preguntaActual) return <div>Cargando pregunta...</div>;

  const tipo = preguntaActual.tipoPregunta ? preguntaActual.tipoPregunta.toUpperCase() : '';
  const esArrastrar = tipo.includes('CLASIFICACION') || tipo.includes('CLASIFICACIÓN');
  const esVF = tipo.includes('VERDADERO') || tipo.includes('FALSO');
  const estiloIcono = obtenerEstiloArea(preguntaActual.areaDigComp);

  // Inicializar tablero si es necesario
  if (esArrastrar && !tablerosClasificacion[preguntaActual.id]) {
    const inicial = {};
    if (preguntaActual.datosPregunta?.columnas) {
      preguntaActual.datosPregunta.columnas.forEach(col => { inicial[col.id] = []; });
      setTablerosClasificacion(prev => ({ ...prev, [preguntaActual.id]: inicial }));
    }
  }

  // Validación de avance
  let puedeContinuar = false;
  if (esArrastrar) {
    puedeContinuar = (preguntaActual.datosPregunta?.items || []).length === Object.values(tablerosClasificacion[preguntaActual.id] || {}).flat().length;
  } else if (esVF) {
    const items = Array.isArray(preguntaActual.datosPregunta) ? preguntaActual.datosPregunta : preguntaActual.datosPregunta?.items;
    puedeContinuar = items && items.every((i, x) => (respuestasUsuario[preguntaActual.id] || {})[i.id || `item-${x}`] !== undefined);
  } else {
    puedeContinuar = !!respuestasUsuario[preguntaActual.id];
  }

  // Validación enlace_externo
  const tieneEnlaceEspecifico = 
    typeof preguntaActual.enlaceExterno === 'string' && 
    preguntaActual.enlaceExterno.trim() !== '' && 
    preguntaActual.enlaceExterno.toLowerCase() !== 'null';

  return (
    <div className={`quiz-container text-level-${configVisual.nivelTexto} ${configVisual.modoOscuro ? 'dark-mode' : ''} ${configVisual.altoContraste ? 'high-contrast' : ''}`}>
      <div className="quiz-header">
        <div className="quiz-meta">
          <div className="quiz-title"><h1>Pregunta {indiceActual + 1}</h1>
            <div className="quiz-subtitle">
              <span>Área: {preguntaActual.areaDigComp} · Competencia: {preguntaActual.competenciaDigComp}</span>
              <span className="badge-nivel">Nivel {preguntaActual.nivel}</span>
            </div>
          </div>
          <div className="quiz-counter">{indiceActual + 1} de {bateriaPreguntas.length}</div>
        </div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${((indiceActual + 1) / bateriaPreguntas.length) * 100}%` }}></div></div>
      </div>

      <div className="quiz-card">
        <MenuAccesibilidad mostrar={mostrarMenu} alCerrar={() => setMostrarMenu(false)} alAlternar={() => setMostrarMenu(!mostrarMenu)} config={configVisual} setConfig={setConfigVisual} />
        <div className="card-content">
          <div className="tags-container">
            <span className={`tag ${estiloIcono.claseColor}`}>{estiloIcono.icono} {preguntaActual.areaDigComp}</span>
            <span className="tag tag-secondary"><Lightbulb size={16} /> {preguntaActual.tipoPregunta}</span>
          </div>

          <h2 className="question-text">{preguntaActual.enunciado}</h2>

          {preguntaActual.rutaImagen && (
            <div className="img-pregunta-container clickable" onClick={() => setImagenZoom(preguntaActual.rutaImagen)}>
              <img src={preguntaActual.rutaImagen} alt="Visual" />
              <div className="zoom-icon-overlay"><ZoomIn size={24} color="#fff" /></div>
            </div>
          )}

          <div className="links-container" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
            
            {/*ENLACE EXTERNO*/}
            {tieneEnlaceEspecifico && (
              <a href={preguntaActual.enlaceExterno} target="_blank" rel="noopener noreferrer" className="btn-external-resource" style={{ margin: 0, flex: 1, minWidth: '280px' }}>
                <div className="external-icon-box"><ExternalLink size={24} /></div>
                <div className="external-text-content">
                  <span className="external-label">Recurso Específico</span>
                  <span className="external-action">Abrir archivo o enlace</span>
                </div>
              </a>
            )}

            {/*ENLACE DIRECTORIO RECURSOS*/}
            <a href={ENLACE_DIRECTORIO_RAIZ} target="_blank" rel="noopener noreferrer" className="btn-external-resource" style={{ margin: 0, flex: 1, minWidth: '280px' }}>
              <div className="external-icon-box"><ExternalLink size={24} /></div>
              <div className="external-text-content">
                <span className="external-label">Repositorio de Archivos</span>
                <span className="external-action">Abrir directorio raíz</span>
              </div>
            </a>

          </div>

          <p className="question-instruction">
            {esArrastrar ? 'Arrastra las fichas.' : esVF ? 'Indica Verdadero o Falso.' : 'Selecciona la opción correcta.'}
          </p>

          {esArrastrar ?
            <VistaClasificacion
              pregunta={preguntaActual}
              estadoTablero={tablerosClasificacion[preguntaActual.id] || {}}
              fichasDisponibles={preguntaActual.datosPregunta.items.map(i => i.texto).filter(t => !Object.values(tablerosClasificacion[preguntaActual.id] || {}).flat().includes(t))}
              columnaActiva={columnaActiva}
              setColumnaActiva={setColumnaActiva}
              moverFicha={moverFichaAColumna}
            /> :
            esVF ?
              <VistaVerdaderoFalso
                pregunta={preguntaActual}
                respuestasActuales={respuestasUsuario[preguntaActual.id]}
                alResponder={alResponderVF}
              /> :
              <VistaOpcionMultiple
                pregunta={preguntaActual}
                respuestaUsuario={respuestasUsuario[preguntaActual.id]}
                alSeleccionar={(val) => setRespuestasUsuario({ ...respuestasUsuario, [preguntaActual.id]: val })}
              />
          }
        </div>
      </div>

      <div className="quiz-actions">
        <button className="btn btn-secondary" onClick={cancelarCuestionario} disabled={guardando}><LogOut size={18} /> Salir</button>
        <div className="actions-right">
          <button className="btn btn-secondary" onClick={() => procesarIntento(true)} disabled={guardando}><HelpCircle size={18} /> No lo sé</button>
          <button className="btn btn-primary" onClick={() => procesarIntento(false)} disabled={!puedeContinuar || guardando}>{guardando ? 'Guardando...' : <>Siguiente <ArrowRight size={18} /></>}</button>
        </div>
      </div>
      {imagenZoom && (
        <div className="image-modal-overlay" onClick={() => setImagenZoom(null)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={() => setImagenZoom(null)}><X size={32} /></button>
            <img src={imagenZoom} alt="Zoom" />
          </div>
        </div>
      )}
    </div>
  );
}

const obtenerEstiloArea = (nombreArea) => {
  if (!nombreArea) return { claseColor: '', icono: <Lightbulb size={16} /> };
  if (nombreArea.includes('Información')) return { claseColor: 'tag-area-informacion', icono: <Search size={16} /> };
  if (nombreArea.includes('Comunicación')) return { claseColor: 'tag-area-comunicacion', icono: <Mail size={16} /> };
  if (nombreArea.includes('Creación')) return { claseColor: 'tag-area-creacion', icono: <FileText size={16} /> };
  if (nombreArea.includes('Seguridad')) return { claseColor: 'tag-area-seguridad', icono: <Shield size={16} /> };
  if (nombreArea.includes('Resolución')) return { claseColor: 'tag-area-resolucion', icono: <Wrench size={16} /> };
  return { claseColor: '', icono: <Lightbulb size={16} /> };
};

export default Cuestionario;