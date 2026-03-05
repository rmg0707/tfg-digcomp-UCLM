import React, { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useSearchParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Save, Calendar, Trophy, Award, FileText, TrendingUp,
  CheckCircle, ShieldAlert, Home, User, BookOpen, ExternalLink, Loader, Clock,
  Eye, Minus, X
} from 'lucide-react';

import { 
  CONFIG_AREAS, RADAR_SETTINGS, 
  getNivelDetallado, 
  PUNTOS_POR_NIVEL, obtenerColorArea,
  getEstadoDesempeño,
  MAPA_NIVELES_NUMERICOS
} from '../config/localconfig';
import { CuestionarioService, UsuarioService, RecursoService } from '../services/dataService';
import './Informe.css';

const TarjetaRecurso = ({ recurso, temaArea, esAlta }) => {
  const [expandido, setExpandido] = useState(false);
  const [mostrarBoton, setMostrarBoton] = useState(false);
  const descRef = useRef(null);

  // Comprueba si el texto de la descripción excede el espacio disponible para mostrar el botón de leer más
  useLayoutEffect(() => {
    const elemento = descRef.current;
    if (elemento) {
      const hayDesbordamiento = elemento.scrollHeight > elemento.clientHeight;
      if (hayDesbordamiento !== mostrarBoton) {
        setMostrarBoton(hayDesbordamiento);
      }
    }
  }, [recurso.descripcion, mostrarBoton]);

  return (
    <div className="resource-card">
      <div className="resource-card-header">
        <div className="resource-badges-row">
          <span className="resource-priority-badge" style={{ backgroundColor: esAlta ? '#dc2626' : '#475569' }}>
            {esAlta ? 'Prioridad Alta' : 'Refuerzo Sugerido'}
          </span>
        </div>
        
        <div className="resource-area-container">
          {recurso.area_dig_comp && (
            <div className="resource-area-tag" style={{ backgroundColor: temaArea.fondo, color: temaArea.texto }}>
              {recurso.area_dig_comp}
            </div>
          )}
        </div>
      </div>

      <h4 className="resource-card-title">{recurso.titulo}</h4>

      {recurso.descripcion && (
        <div className="resource-desc-container">
          <p ref={descRef} className={`resource-desc ${!expandido ? 'clamped' : ''}`}>
            {recurso.descripcion}
          </p>
          {(mostrarBoton || expandido) && (
            <button className="btn-expand-desc" onClick={() => setExpandido(!expandido)}>
              {expandido ? 'Mostrar menos' : 'Leer más'}
            </button>
          )}
        </div>
      )}

      <a href={recurso.url_completa} target="_blank" rel="noopener noreferrer" className="resource-button">
        <span>Ir al Recurso</span> <ExternalLink size={16} />
      </a>
    </div>
  );
};

// Función auxiliar para formatear la duración
const formatearDuracion = (segundosTotales) => {
  if (!segundosTotales) return "--"; 
  
  const minutos = Math.floor(segundosTotales / 60);
  const segundos = Math.round(segundosTotales % 60);
  
  if (minutos === 0) return `${segundos} seg`;
  return `${minutos} min ${segundos} seg`;
};

const renderRespuestaCorrecta = (pregunta) => {
  if (!pregunta || !pregunta.datosPregunta) return "Respuesta no disponible.";
  const tipo = (pregunta.tipoPregunta || '').toUpperCase();
  const datos = pregunta.datosPregunta;

  if (tipo.includes('SELECCION') || tipo.includes('TEST')) {
    const opciones = Array.isArray(datos) ? datos : datos.opciones;
    const correcta = opciones?.find(op => op.correcta);
    return correcta ? correcta.texto : "No definida";
  }

  if (tipo.includes('VERDADERO') || tipo.includes('FALSO')) {
    const items = Array.isArray(datos) ? datos : datos.items;
    if (!items) return "No definida";
    return (
      <ul className="respuesta-list">
        {items.map((item, i) => (
          <li key={i}>{item.texto} ➔ <strong>{item.es_verdadera ? 'Verdadero' : 'Falso'}</strong></li>
        ))}
      </ul>
    );
  }

  if (tipo.includes('CLASIFICACION')) {
    if (!datos.columnas || !datos.items) return "No definida";
    return (
      <ul className="respuesta-list">
        {datos.items.map((item, i) => {
          const col = datos.columnas.find(c => parseInt(c.id) === item.columna_correcta_id);
          return <li key={i}>{item.texto} ➔ <strong>{col ? col.nombre : '?'}</strong></li>;
        })}
      </ul>
    );
  }

  return "Consulta el material de referencia.";
};

const renderRespuestaUsuario = (resp, pregunta) => {
  if (resp.estado === 'NO_SABE') return "Marcaste la opción: No lo sé.";
  
  if (!resp.respuestaUsuario) {
    if (resp.estado === 'CORRECTO') return "Seleccionaste la opción correcta.";
    if (resp.estado === 'INCORRECTO') return "Seleccionaste una opción incorrecta.";
    if (resp.estado === 'PARCIAL') return "Seleccionaste una opción parcialmente correcta.";
    return "Respuesta no registrada.";
  }

  if (!pregunta || !pregunta.datosPregunta) {
      if (typeof resp.respuestaUsuario === 'object') return JSON.stringify(resp.respuestaUsuario);
      return String(resp.respuestaUsuario);
  }

  const tipo = (pregunta.tipoPregunta || '').toUpperCase();
  const datos = pregunta.datosPregunta;

  if (tipo.includes('VERDADERO') || tipo.includes('FALSO')) {
    const items = Array.isArray(datos) ? datos : datos.items;
    if (items && typeof resp.respuestaUsuario === 'object') {
      return (
        <ul className="respuesta-list">
          {items.map((item, i) => {
            const llave = item.id || `item-${i}`;
            const respU = resp.respuestaUsuario[llave];
            let textoResp = "Sin responder";
            if (respU === true) textoResp = "Verdadero";
            if (respU === false) textoResp = "Falso";
            return <li key={i}>{item.texto} ➔ <strong>{textoResp}</strong></li>;
          })}
        </ul>
      );
    }
  }

  if (tipo.includes('CLASIFICACION')) {
    const columnas = datos?.columnas;
    const items = datos?.items;
    
    if (columnas && items && typeof resp.respuestaUsuario === 'object') {
      return (
        <ul className="respuesta-list">
          {items.map((item, i) => {
            let colUserIde = null;
            Object.keys(resp.respuestaUsuario).forEach(colId => {
              if (Array.isArray(resp.respuestaUsuario[colId]) && resp.respuestaUsuario[colId].includes(item.texto)) {
                colUserIde = colId;
              }
            });
            const col = colUserIde ? columnas.find(c => String(c.id) === String(colUserIde)) : null;
            const nombreCol = col ? col.nombre : 'Sin clasificar';
            
            return <li key={i}>{item.texto} ➔ <strong>{nombreCol}</strong></li>;
          })}
        </ul>
      );
    }
  }

  if (typeof resp.respuestaUsuario === 'string') {
    return resp.respuestaUsuario;
  }

  return JSON.stringify(resp.respuestaUsuario);
};

function Informe() {
  const [paramsBusqueda] = useSearchParams();
  const location = useLocation();
  const navegar = useNavigate();
  
  const [verTodosRecursos, setVerTodosRecursos] = useState(false);
  const [mostrarRevision, setMostrarRevision] = useState(false);
  const idCuestionario = paramsBusqueda.get('id');

  // Inicializa el estado recuperando datos de la navegación anterior o estableciendo valores vacíos por defecto
  const [historialRespuestas, setHistorialRespuestas] = useState(() => location.state?.historial || null);
  const [datosResultado, setDatosResultado] = useState(() => location.state?.resultados || null);
  const [bancoPreguntas, setBancoPreguntas] = useState(() => location.state?.bancoPreguntas || []); 
  const [perfilUsuario, setPerfilUsuario] = useState(() => location.state?.usuario || { nombre: 'Invitado', ocupacion: '' });
  
  // Determina si es necesario mostrar el estado de carga basándose en si faltan datos esenciales
  const [cargandoDatos, setCargandoDatos] = useState(() => {
      const tieneHistorial = !!(location.state?.historial);
      const tieneBanco = !!(location.state?.bancoPreguntas && location.state.bancoPreguntas.length > 0);
      return !(tieneHistorial && tieneBanco); 
  });

  const [cargandoRecursos, setCargandoRecursos] = useState(false);
  const [recursosRecomendados, setRecursosRecomendados] = useState([]);
  const [errorCarga, setErrorCarga] = useState(false);

  const diccionarioPreguntas = useMemo(() => {
    const diccionario = {};
    bancoPreguntas.forEach(p => {
      diccionario[p.id] = p;
    });
    return diccionario;
  }, [bancoPreguntas]);

  // Gestiona la carga inicial de datos desde el servidor si no se recibieron a través de la navegación
  useEffect(() => {
    if (historialRespuestas && bancoPreguntas.length > 0 && !cargandoDatos) return;

    const cargarDatosCompletos = async () => {
      setCargandoDatos(true);
      try {
        let bancoActual = bancoPreguntas;
        if (bancoActual.length === 0) {
            const todasLasPreguntas = await CuestionarioService.obtenerBancoPreguntas();
            
            bancoActual = todasLasPreguntas.map(p => {
               const nivelFinal = MAPA_NIVELES_NUMERICOS[p.nivel]

               return {
                 id: p.id, 
                 codigo: p.codigo, 
                 areaDigComp: p.area_dig_comp || p.areaDigComp, 
                 enunciado: p.enunciado, 
                 nivel: nivelFinal,
                 tipoPregunta: p.tipo_pregunta || p.tipoPregunta,
                 datosPregunta: p.datos_pregunta || p.datosPregunta
               };
            });
            
            setBancoPreguntas(bancoActual);
        }

        if (historialRespuestas && datosResultado) {
            if (perfilUsuario.nombre === 'Invitado' && location.state?.cuestionarioId) {
                 const c = await CuestionarioService.obtenerPorId(location.state.cuestionarioId);
                 if (c && c.usuarioId && c.usuarioId !== 'anonimo') {
                     const u = await UsuarioService.obtenerPorId(c.usuarioId);
                     if (u) setPerfilUsuario(u);
                 }
            }
        } else if (idCuestionario) {
            const cuestionario = await CuestionarioService.obtenerPorId(idCuestionario);
            if (cuestionario) {
               setHistorialRespuestas(cuestionario.progresoPreguntas);
               if (cuestionario.resultado) {
                   const res = typeof cuestionario.resultado === 'string' ? JSON.parse(cuestionario.resultado) : cuestionario.resultado;
                   setDatosResultado(res);
               }
               if (cuestionario.usuarioId && cuestionario.usuarioId !== 'anonimo') {
                   const u = await UsuarioService.obtenerPorId(cuestionario.usuarioId);
                   if (u) setPerfilUsuario(u);
               }
            } else {
               setErrorCarga(true);
            }
        }
      } catch (err) {
        console.error("Error cargando informe:", err);
        setErrorCarga(true);
      } finally {
        setCargandoDatos(false);
      }
    };
    cargarDatosCompletos();
  
  // La siguiente línea evita que el linter pida añadir dependencias que causarían un bucle infinito
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idCuestionario]); 

  // Identifica las respuestas incorrectas y busca recursos educativos relacionados en la base de datos
  useEffect(() => {
    if (!historialRespuestas || bancoPreguntas.length === 0) return;
    if (recursosRecomendados.length > 0) return;

    const obtenerRecursosDeBBDD = async () => {
      setCargandoRecursos(true);
      try {
        // Filtra las respuestas que indican falta de conocimiento o errores para enfocar el refuerzo
        const preguntasA_Reforzar = historialRespuestas.filter(r => 
          r.estado === 'NO_SABE' || r.estado === 'INCORRECTO' || r.estado === 'PARCIAL' || (r.score !== undefined && r.score < 1)
        );
        const mapaRecursos = new Map();
        const promesas = preguntasA_Reforzar.map(async (respuesta) => {
           let codigoParaBuscar = respuesta.codigo;
           if (!codigoParaBuscar) {
             const preguntaOriginal = bancoPreguntas.find(b => String(b.id) === String(respuesta.id_pregunta));
             if (preguntaOriginal) codigoParaBuscar = preguntaOriginal.codigo;
           }
           if (codigoParaBuscar) {
             const recursosEncontrados = await RecursoService.obtenerPorPregunta(codigoParaBuscar);
             const areaPregunta = bancoPreguntas.find(b => b.codigo === codigoParaBuscar)?.areaDigComp;
             const prioridad = (respuesta.estado === 'NO_SABE' || respuesta.score === 0) ? 'ALTA' : 'MEDIA';
             recursosEncontrados.forEach(rec => {
               if (!mapaRecursos.has(rec.codigo_recurso)) {
                 mapaRecursos.set(rec.codigo_recurso, { ...rec, area_dig_comp: areaPregunta, prioridad: prioridad });
               } else {
                 const existente = mapaRecursos.get(rec.codigo_recurso);
                 if (existente.prioridad === 'MEDIA' && prioridad === 'ALTA') {
                   existente.prioridad = 'ALTA';
                   mapaRecursos.set(rec.codigo_recurso, existente);
                 }
               }
             });
           }
        });
        await Promise.all(promesas);
        
        const getAreaIndex = (areaName) => {
            if (!areaName) return 99;
            const index = CONFIG_AREAS.findIndex(c => areaName.includes(c.keyword));
            return index === -1 ? 99 : index;
        };
        // Ordena los recursos encontrados dando prioridad a los marcados como alta y luego por orden de área
        const listaFinal = Array.from(mapaRecursos.values()).sort((a, b) => {
           const pA = a.prioridad === 'ALTA' ? 0 : 1;
           const pB = b.prioridad === 'ALTA' ? 0 : 1;
           if (pA !== pB) return pA - pB;
           return getAreaIndex(a.area_dig_comp) - getAreaIndex(b.area_dig_comp);
        });
        setRecursosRecomendados(listaFinal);
      } catch (error) {
        console.error("Error obteniendo recursos:", error);
      } finally {
        setCargandoRecursos(false);
      }
    };
    obtenerRecursosDeBBDD();
  }, [historialRespuestas, bancoPreguntas, recursosRecomendados.length]);

  // Calcula las puntuaciones desglosadas por área de competencia aplicando los pesos según la dificultad
  const resultadosPorArea = useMemo(() => {
    if (!historialRespuestas?.length || bancoPreguntas.length === 0) return [];
    return CONFIG_AREAS.map(config => {
      const preguntasDelArea = historialRespuestas.filter(resp => {
        const original = bancoPreguntas.find(b => String(b.id) === String(resp.id_pregunta));
        return original && original.areaDigComp && original.areaDigComp.includes(config.keyword);
      });
      let puntosObtenidosArea = 0;
      let puntosMaximosArea = 0;
      preguntasDelArea.forEach(p => {
        let nivel = p.nivel;
        if (!nivel) {
           const original = bancoPreguntas.find(b => String(b.id) === String(p.id_pregunta));
           nivel = original?.nivel;
        }
        const peso = PUNTOS_POR_NIVEL[MAPA_NIVELES_NUMERICOS[nivel]] || 1; 
        puntosMaximosArea += peso;
        if (p.puntosPonderados !== undefined) {
            puntosObtenidosArea += p.puntosPonderados;
        } else {
            const scoreBase = typeof p.score === 'number' ? p.score : (p.estado === 'CORRECTO' ? 1 : 0);
            puntosObtenidosArea += (scoreBase * peso);
        }
      });
      const porcentajeArea = puntosMaximosArea > 0 ? Math.round((puntosObtenidosArea / puntosMaximosArea) * 100) : 0;
      
      return { 
        ...config, area: config.fullTitle, competencias: config.desc, puntuacion: porcentajeArea 
      };
    });
  }, [historialRespuestas, bancoPreguntas]);

  // Transforma los resultados numéricos en coordenadas espaciales para dibujar el gráfico de radar
  const datosRadar = useMemo(() => {
    if (resultadosPorArea.length === 0) return { cadenaPoligono: "", puntos: [] };
    const puntosCalculados = resultadosPorArea.map((item, index) => {
      const valor = item.puntuacion;
      const maximo = RADAR_SETTINGS.VERTICES[index];
      const centro = RADAR_SETTINGS.CENTER;
      const x = centro.x + (maximo.x - centro.x) * (valor / 100);
      const y = centro.y + (maximo.y - centro.y) * (valor / 100);
      
      return { x, y, color: getEstadoDesempeño(valor).colorHex };
    });
    return { cadenaPoligono: puntosCalculados.map(p => `${p.x},${p.y}`).join(' '), puntos: puntosCalculados };
  }, [resultadosPorArea]);

  const puntuacionFinal = datosResultado && datosResultado.porcentaje 
      ? Math.round(parseFloat(datosResultado.porcentaje)) 
      : (resultadosPorArea.length > 0 
          ? Math.round(resultadosPorArea.reduce((acc, item) => acc + item.puntuacion, 0) / resultadosPorArea.length) 
          : 0);

  const nivelGlobal = getNivelDetallado(puntuacionFinal);
  const estadoGlobal = getEstadoDesempeño(puntuacionFinal); 

  const irADescarga = () => {
    if (idCuestionario) {
        navegar(`/descarga-envio?id=${idCuestionario}`, { 
            state: { 
                historial: historialRespuestas, 
                bancoPreguntas: bancoPreguntas,
                usuario: perfilUsuario
            } 
        });
    }
  };

  const listaRecursosVisible = verTodosRecursos ? recursosRecomendados : recursosRecomendados.slice(0, 3);
  const hayMasRecursos = recursosRecomendados.length > 3 && !verTodosRecursos;

  if (cargandoDatos) {
    return (
      <div className="informe-container loading-state">
        <div className="loading-content">
          <Loader className="spin-animation" size={48} color="#f56a6a" />
          <p className="loading-text">Generando informe personalizado...</p>
        </div>
      </div>
    );
  }

  if (errorCarga || !historialRespuestas) {
    return <div className="error-msg">Error: Informe no encontrado o no se pudieron cargar los datos.</div>;
  }

  return (
    <div className="informe-container">
      <div className="informe-content">
        {/* Renderiza la cabecera con metadatos del usuario y botón de guardado */}
        <div className="page-header">
          <div>
            <h1>Informe de Competencias</h1>
            <div className="header-meta">
              <div className="meta-item">
                <User size={20} className="meta-icon" />
                <div><span className="meta-label">Usuario:</span> <strong>{perfilUsuario.nombre}</strong></div>
              </div>
              <div className="meta-divider"></div>
              <div className="meta-item">
                <Calendar size={20} className="meta-icon" />
                <div><span className="meta-label">Fecha:</span> <strong>{new Date().toLocaleDateString('es-ES')}</strong></div>
              </div>
              <div className="meta-divider"></div>
              <div className="meta-item">
                <Clock size={20} className="meta-icon" />
                <div>
                  <span className="meta-label">Duración:</span> <strong>{formatearDuracion(datosResultado?.duracionTotalSegundos)}</strong>
                </div>
              </div>
            </div>
          </div>
          <button onClick={irADescarga} className="btn-save"><span>Guardar Informe</span><Save size={20} /></button>
        </div>

        {/* Muestra los indicadores clave de desempeño global y nivel alcanzado */}
        <div className="summary-grid">
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-label">Puntuación Global</span><div className="kpi-icon"><Trophy size={20} /></div></div>
            <p className="kpi-value">{puntuacionFinal}<span className="kpi-sub">/100</span></p>
            <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${puntuacionFinal}%`, backgroundColor: estadoGlobal.colorHex }}></div></div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-label">Nivel Alcanzado</span><div className="kpi-icon"><Award size={20} /></div></div>
            <p className="kpi-value">{nivelGlobal.titulo} {nivelGlobal.codigo}</p>
          </div>
        </div>

        {/* Genera la visualización del gráfico radial comparando las diferentes áreas */}
        <div className="main-chart-card">
          <div className="mb-4">
            <h3 className="chart-title">Perfil de Competencias (DigComp)</h3>
            <p className="chart-subtitle">Visualización radial de tus resultados por área</p>
          </div>
          <div className="chart-layout">
            <div className="radar-container">
              <svg viewBox="-130 -25 560 380" className="radar-svg">
                <g fill="none" stroke="#e2e8f0" strokeWidth="2.5">
                  <polygon points="150,130 169,144 162,166 138,166 131,144"></polygon>
                  <polygon points="150,110 188,138 174,182 126,182 112,138"></polygon>
                  <polygon points="150,90 207,131 185,199 115,199 93,131"></polygon>
                  <polygon points="150,70 226,125 197,215 103,215 74,125"></polygon>
                  <polygon points="150,50 245,119 209,231 91,231 55,119"></polygon>
                </g>
                <g stroke="#e2e8f0" strokeWidth="1.5">{RADAR_SETTINGS.VERTICES.map((v, i) => (<line key={i} x1={RADAR_SETTINGS.CENTER.x} y1={RADAR_SETTINGS.CENTER.y} x2={v.x} y2={v.y}></line>))}</g>
                <polygon fill="rgba(19, 127, 236, 0.2)" stroke="#137fec" strokeWidth="2.5" strokeLinejoin="round" points={datosRadar.cadenaPoligono}></polygon>
                <g>{datosRadar.puntos.map((pt, i) => (<circle key={i} fill={pt.color} cx={pt.x} cy={pt.y} r="5"></circle>))}</g>
                <g fontSize="13" fontWeight="bold" fill="#64748b">
                  {resultadosPorArea.map((item, index) => {
                    const coords = [{ x: 150, y: 25, anchor: 'middle' }, { x: 260, y: 119, anchor: 'start' }, { x: 215, y: 255, anchor: 'middle' }, { x: 85, y: 255, anchor: 'middle' }, { x: 40, y: 119, anchor: 'end' }];
                    const pos = coords[index];
                    return (<text key={item.id} x={pos.x} y={pos.y} textAnchor={pos.anchor}>{item.labelLines.map((line, i) => (<tspan key={i} x={pos.x} dy={i === 0 ? 0 : "1.2em"}>{line}</tspan>))}</text>);
                  })}
                </g>
              </svg>
            </div>
            <div className="stats-container">
              {resultadosPorArea.map((item) => {
                const estadoItem = getEstadoDesempeño(item.puntuacion);
                return (
                  <div className="stat-row" key={item.id}>
                    <span className="stat-label">{item.area}</span>
                    <div className="progress-bar-bg mt-0"><div className="progress-bar-fill" style={{ width: `${item.puntuacion}%`, backgroundColor: estadoItem.colorHex }}></div></div>
                    <span className="stat-val">{item.puntuacion}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        <div>
          <div className="review-button-wrapper">
            <button className="btn-review" onClick={() => setMostrarRevision(true)}>
              <Eye size={20} /> Revisar mis respuestas
            </button>
          </div>

          {mostrarRevision && (
            <div className="review-modal-overlay" onClick={() => setMostrarRevision(false)}>
              <div className="review-modal-content" onClick={(e) => e.stopPropagation()}>
                
                <div className="review-modal-header">
                  <h3 className="review-modal-title"><CheckCircle color="var(--informe-primary)" /> Historial de Preguntas</h3>
                  <button className="review-modal-close" onClick={() => setMostrarRevision(false)}>
                    <X size={24} />
                  </button>
                </div>

                <div className="review-modal-body">
                  <div className="review-info-box">
                    <p className="review-info-text">
                      <strong>💡 Sistema de Puntuación:</strong> Las preguntas tienen diferentes pesos según su nivel de dificultad. Acertar una pregunta de nivel C2 suma más puntos a tu nota final que acertar una de nivel A1.
                    </p>
                  </div>

                  {historialRespuestas.map((resp, index) => {
                    const pregunta = diccionarioPreguntas[resp.id_pregunta];
                    if (!pregunta) return null;

                    let icon, color, textoEstado;
                    if (resp.estado === 'CORRECTO') { 
                      icon = <CheckCircle size={24} />; color = '#16a34a'; textoEstado = 'Acertada';
                    } else if (resp.estado === 'INCORRECTO') { 
                      icon = <ShieldAlert size={24} />; color = '#dc2626'; textoEstado = 'Fallada';
                    } else if (resp.estado === 'PARCIAL') { 
                      icon = <TrendingUp size={24} />; color = '#eab308'; textoEstado = 'Parcialmente correcta';
                    } else { 
                      icon = <Minus size={24} />; color = '#64748b'; textoEstado = 'No lo sabía';
                    }

                    const nivelBase = pregunta.nivel || resp.nivel;
                    const nivelLimpio = MAPA_NIVELES_NUMERICOS[nivelBase] || nivelBase;

                    return (
                      <div key={index} className="review-question-card" style={{ borderColor: `${color}40`, backgroundColor: `${color}08` }}>
                        <div className="review-question-icon" style={{ color: color }}>{icon}</div>
                        
                        <div className="review-question-content">
                          <div className="review-question-meta">
                            <span className="review-question-topic">
                              Pregunta {index + 1} • {pregunta.areaDigComp || 'General'}
                            </span>
                            <span className="review-question-time">
                              <Clock size={14} /> {formatearDuracion(resp.duracion)}
                            </span>
                          </div>
                          
                          <p className="review-question-statement">
                            {pregunta.enunciado}
                          </p>

                          <div className="review-answers-container">
                            <div className="review-answer-box" style={{ borderColor: `${color}40` }}>
                              <span className="review-answer-label">Tu respuesta:</span>
                              <div className="review-answer-value">
                                {renderRespuestaUsuario(resp, pregunta)}
                              </div>
                            </div>

                            <div className="review-answer-box correct">
                              <span className="review-answer-label">Solución correcta:</span>
                              <div className="review-answer-value">
                                {renderRespuestaCorrecta(pregunta)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="review-question-footer">
                             <span className="review-status-badge" style={{ backgroundColor: color }}>
                               {textoEstado}
                             </span>
                             <span className="review-score-text">
                               (Nivel {nivelLimpio}) {resp.puntosPonderados > 0 ? `+${resp.puntosPonderados} pts` : '0 pts'}
                             </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Desglosa el detalle de cada competencia mostrando el estado y el nivel específico */}
        <div>
          <h3 className="section-title"><FileText className="text-primary" /> Detalle por Áreas</h3>
          <div className="competencies-grid">
            {resultadosPorArea.map((item) => {
              const nivel = getNivelDetallado(item.puntuacion);
              const estadoItem = getEstadoDesempeño(item.puntuacion);
              
              let Icon = CheckCircle;
              if (estadoItem.texto === 'MEJORAR') Icon = ShieldAlert;
              else if (estadoItem.texto === 'COMPETENTE') Icon = TrendingUp;

              return (
                <div className="comp-card" key={item.id}>
                  <div>
                    <div className="comp-header">
                      <div className="comp-icon" style={{ background: item.colorTheme.bg, color: item.colorTheme.text }}>{item.icon}</div>
                      <h4 className="comp-title">{item.area}</h4>
                    </div>
                    <p className="comp-desc">{item.competencias}</p>
                  </div>
                  <div className="comp-footer">
                    <span className="comp-level-title" style={{ color: item.colorTheme.text }}>
                      {nivel.titulo} <span className="comp-level-code">{nivel.codigo}</span>
                    </span>
                    <span className="comp-status" style={{ color: estadoItem.colorHex }}>
                        <Icon size={14}/> {estadoItem.texto}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Presenta la lista de recursos recomendados personalizada según los fallos detectados */}
        <div className="resources-section">
          <div className="resources-section-header">
            <h3 className="resources-main-title"><BookOpen className="text-primary" /> Recursos Personalizados</h3>
            {hayMasRecursos && <button onClick={() => setVerTodosRecursos(true)} className="resources-catalog-link">Ver todos ({recursosRecomendados.length}) →</button>}
          </div>
          {cargandoRecursos ? (
             <div className="resources-msg">
                <Loader className="spin-animation loader-inline" size={24} />
                Buscando los mejores recursos para ti...
             </div>
          ) : recursosRecomendados.length === 0 ? (
             <p className="resources-msg mt-0">¡Enhorabuena! Has obtenido un resultado excelente y no se han detectado áreas críticas que reforzar.</p>
          ) : (
            <div className="resources-grid">
              {listaRecursosVisible.map((recurso, idx) => {
                const temaArea = obtenerColorArea(recurso.area_dig_comp);
                const esAlta = recurso.prioridad === 'ALTA';
                return <TarjetaRecurso key={recurso.codigo_recurso || idx} recurso={recurso} temaArea={temaArea} esAlta={esAlta} />;
              })}
            </div>
          )}
        </div>

        <div className="informe-footer-actions">
          <Link to="/" className="btn-primary btn-home-lg" style={{ textDecoration: 'none' }}><span>Volver a Inicio</span> <Home size={24} /></Link>
        </div>
        <div className="footer-mini">© 2025/26 Proyecto TFG - DigComp</div>
      </div>
    </div>
  );
}

export default Informe;