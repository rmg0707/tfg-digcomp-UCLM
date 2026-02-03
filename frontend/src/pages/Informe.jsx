import React, { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useSearchParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Save, Calendar, Trophy, Award, FileText, TrendingUp,
  CheckCircle, ShieldAlert, Home, User, BookOpen, ExternalLink, Loader
} from 'lucide-react';

import { 
  CONFIG_AREAS, RADAR_SETTINGS, 
  getNivelDetallado, 
  PUNTOS_POR_NIVEL, obtenerColorArea,
  getEstadoDesempeño
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
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '6px', 
            backgroundColor: esAlta ? '#dc2626' : '#475569', 
            color: '#ffffff', padding: '4px 10px', borderRadius: '999px', 
            fontSize: '0.75rem', fontWeight: 'bold' 
          }}>
            {esAlta ? 'Prioridad Alta' : 'Refuerzo Sugerido'}
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%', marginTop: '6px' }}>
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

function Informe() {
  const [paramsBusqueda] = useSearchParams();
  const location = useLocation();
  const navegar = useNavigate();
  
  const [verTodosRecursos, setVerTodosRecursos] = useState(false);
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

  // Gestiona la carga inicial de datos desde el servidor si no se recibieron a través de la navegación
  useEffect(() => {
    if (historialRespuestas && bancoPreguntas.length > 0 && !cargandoDatos) return;

    const cargarDatosCompletos = async () => {
      setCargandoDatos(true);
      try {
        let bancoActual = bancoPreguntas;
        if (bancoActual.length === 0) {
            const todasLasPreguntas = await CuestionarioService.obtenerBancoPreguntas();
            bancoActual = todasLasPreguntas.map(p => ({
               id: p.id, codigo: p.codigo, areaDigComp: p.area_dig_comp || p.areaDigComp, enunciado: p.enunciado, nivel: p.nivel 
            }));
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
           nivel = original?.nivel ? String(original.nivel).replace(/Nivel\s*/i, '').trim().toUpperCase() : 'A1';
        }
        const peso = PUNTOS_POR_NIVEL[nivel] || 1; 
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

  if (cargandoDatos) return <div className="informe-container loading-state" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}><div style={{ textAlign: 'center' }}><Loader className="spin-animation" size={48} color="#f56a6a" /><p style={{ marginTop: '20px', color: '#64748b' }}>Generando informe personalizado...</p></div></div>;
  if (errorCarga || !historialRespuestas) return <div className="error-msg">Error: Informe no encontrado o no se pudieron cargar los datos.</div>;

  return (
    <div className="informe-container">
      <div className="informe-content">
        {/* Renderiza la cabecera con metadatos del usuario y botón de guardado */}
        <div className="page-header">
          <div>
            <h1>Informe de Competencias</h1>
            <div className="header-meta">
              <div className="meta-item"><User size={20} className="meta-icon" /><div><span className="meta-label">Usuario:</span> <strong>{perfilUsuario.nombre}</strong></div></div>
              <div style={{ width: '1px', height: '20px', background: '#e2e8f0' }}></div>
              <div className="meta-item"><Calendar size={20} className="meta-icon" /><div><span className="meta-label">Fecha:</span> <strong>{new Date().toLocaleDateString('es-ES')}</strong></div></div>
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
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>Perfil de Competencias (DigComp)</h3>
            <p style={{ color: '#64748b', marginTop: '0.25rem' }}>Visualización radial de tus resultados por área</p>
          </div>
          <div className="chart-layout">
            <div className="radar-container">
              <svg width="700" height="500" viewBox="-130 -25 560 380" style={{ maxWidth: '100%', height: 'auto' }}>
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
                    <div className="progress-bar-bg" style={{ marginTop: 0 }}><div className="progress-bar-fill" style={{ width: `${item.puntuacion}%`, backgroundColor: estadoItem.colorHex }}></div></div>
                    <span className="stat-val">{item.puntuacion}%</span>
                  </div>
                );
              })}
            </div>
          </div>
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
                    <span style={{ color: item.colorTheme.text, fontWeight: '700' }}>{nivel.titulo} <span style={{ fontWeight: '800', color: '#0f172a', marginLeft: '4px' }}>{nivel.codigo}</span></span>
                    <span style={{ color: estadoItem.colorHex, display: 'flex', alignItems: 'center', gap: '4px' }}>
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
             <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                <Loader className="spin-animation" size={24} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '10px' }}/>
                Buscando los mejores recursos para ti...
             </div>
          ) : recursosRecomendados.length === 0 ? (
             <p style={{ padding: '0 20px', color: '#64748b' }}>¡Enhorabuena! Has obtenido un resultado excelente y no se han detectado áreas críticas que reforzar.</p>
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

        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', paddingBottom: '30px' }}>
          <Link to="/" className="btn-primary btn-home-lg" style={{ textDecoration: 'none' }}><span>Volver a Inicio</span> <Home size={24} /></Link>
        </div>
        <div className="footer-mini">© 2025/26 Proyecto TFG - DigComp</div>
      </div>
    </div>
  );
}

export default Informe;