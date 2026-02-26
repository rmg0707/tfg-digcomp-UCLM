import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Download, Mail, ArrowLeft, FileText, AtSign, Send, 
  CheckCircle2, HardDrive, Home, Loader2, X, AlertTriangle 
} from 'lucide-react';
import jsPDF from 'jspdf';

import { 
  CONFIG_AREAS, 
  PUNTOS_POR_NIVEL, 
  getFeedbackCualitativo,
  getNivelDetallado,
  getEstadoDesempeño
} from '../config/localconfig';

import { CuestionarioService, UsuarioService, RecursoService } from '../services/dataService';
import './DescargaEnvio.css';

const NotificationModal = ({ show, type, message, onClose }) => {
  if (!show) return null;
  const isSuccess = type === 'success';
  const Icono = isSuccess ? CheckCircle2 : AlertTriangle;
  const estiloIcono = isSuccess ? { color: '#16a34a', bg: '#dcfce7' } : { color: '#f56a6a', bg: '#ffe4e4' };

  return (
    <div className="notification-overlay">
      <div className="notification-card">
        <button onClick={onClose} className="notification-close"><X size={20} /></button>
        <div className="notification-icon-box" style={{ backgroundColor: estiloIcono.bg, color: estiloIcono.color }}>
          <Icono size={32} strokeWidth={2.5} />
        </div>
        <div className="notification-content">
          <h3 className="notification-title">{isSuccess ? 'Envío completado' : 'Error en el envío'}</h3>
          <p className="notification-message">{message}</p>
        </div>
        <div className="notification-actions">
           <button onClick={onClose} className="btn-modal-action">{isSuccess ? 'Aceptar' : 'Intentar de nuevo'}</button>
        </div>
      </div>
    </div>
  );
};

//Función auxiliar para formatear la duración
const formatearDuracion = (segundosTotales) => {
  if (!segundosTotales) return "--"; 
  const minutos = Math.floor(segundosTotales / 60);
  const segundos = Math.round(segundosTotales % 60);
  if (minutos === 0) return `${segundos} seg`;
  return `${minutos} min ${segundos} seg`;
};

const dibujarRadarPDF = (doc, puntuaciones, centroX, centroY, radio) => {
  // Define la estructura base del gráfico dividiendo el círculo en cinco ejes para las áreas
  const numPuntos = 5;
  const pasoAngulo = (2 * Math.PI) / numPuntos;
  const anguloInicio = -Math.PI / 2; 

  doc.setLineWidth(0.1);
  doc.setDrawColor(200, 200, 200); 

  // Dibuja los anillos concéntricos que sirven de escala de fondo
  for (let nivel = 1; nivel <= 4; nivel++) {
    const r = (radio / 4) * nivel;
    for (let i = 0; i < numPuntos; i++) {
      const a1 = anguloInicio + i * pasoAngulo;
      const a2 = anguloInicio + (i + 1) * pasoAngulo;
      doc.line(centroX + r * Math.cos(a1), centroY + r * Math.sin(a1), centroX + r * Math.cos(a2), centroY + r * Math.sin(a2));
    }
  }

  // Traza las líneas de los ejes y coloca los nombres de las áreas ajustando la alineación
  for (let i = 0; i < numPuntos; i++) {
    const angulo = anguloInicio + i * pasoAngulo;
    const xFin = centroX + radio * Math.cos(angulo);
    const yFin = centroY + radio * Math.sin(angulo);
    doc.line(centroX, centroY, xFin, yFin);
    
    const radioEtiqueta = radio + 8;
    const xLabel = centroX + radioEtiqueta * Math.cos(angulo);
    const yLabel = centroY + radioEtiqueta * Math.sin(angulo);
    
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "bold");
    
    let alineacion = 'center';
    if (Math.abs(xLabel - centroX) > 5) {
        alineacion = xLabel > centroX ? 'left' : 'right';
    }
    const textoArea = doc.splitTextToSize(CONFIG_AREAS[i].fullTitle, 50); 
    doc.text(textoArea, xLabel, yLabel, { align: alineacion, baseline: 'middle' });
  }

  // Si hay puntuaciones conecta los puntos para formar el polígono de desempeño del usuario
  if (puntuaciones.some(p => p > 0)) {
      doc.setDrawColor(245, 106, 106);
      doc.setLineWidth(1.5);
      
      const coordenadas = puntuaciones.map((score, i) => {
        const r = (score / 100) * radio; 
        const a = anguloInicio + i * pasoAngulo;
        return { x: centroX + r * Math.cos(a), y: centroY + r * Math.sin(a), score: score };
      });

      for (let i = 0; i < coordenadas.length; i++) {
        const p1 = coordenadas[i];
        const p2 = coordenadas[(i + 1) % coordenadas.length];
        doc.line(p1.x, p1.y, p2.x, p2.y);
      }

      // Dibuja círculos coloreados en cada vértice según el estado del desempeño
      for (let i = 0; i < coordenadas.length; i++) {
         const estadoData = getEstadoDesempeño(coordenadas[i].score);
         const colorPunto = estadoData.colorRgb; 
         
         doc.setFillColor(...colorPunto);
         doc.setDrawColor(...colorPunto); 
         doc.circle(coordenadas[i].x, coordenadas[i].y, 1, 'FD');
      }
  }
};

const crearDocumentoPDF = (historialRespuestas, perfilUsuario, bancoPreguntas, listaRecursos) => {
  // Inicializa el documento PDF y establece márgenes y posición inicial
  const doc = new jsPDF();
  const anchoPag = doc.internal.pageSize.getWidth();
  const margen = 20;
  let posY = 25;

  // Calcula el tiempo total sumando las duraciones del historial
  let duracionTotalSegundos = 0;
  historialRespuestas.forEach(p => {
    duracionTotalSegundos += p.duracion || 0;
  });
  const textoDuracion = formatearDuracion(duracionTotalSegundos);

  // Recorre el historial para calcular el porcentaje de aciertos en cada área específica
  const puntuacionesCalculadas = CONFIG_AREAS.map((config) => {
    const preguntasArea = historialRespuestas.filter(p => {
        const original = bancoPreguntas.find(b => String(b.id) === String(p.id_pregunta));
        return original && original.areaDigComp && original.areaDigComp.includes(config.keyword);
    });
    
    let puntosObtenidos = 0;
    let puntosMaximos = 0;

    preguntasArea.forEach(p => {
        let nivel = p.nivel; 
        if (!nivel) {
            const original = bancoPreguntas.find(b => String(b.id) === String(p.id_pregunta));
            nivel = original?.nivel ? String(original.nivel).replace(/Nivel\s*/i, '').trim().toUpperCase() : 'A1';
        }
        const peso = PUNTOS_POR_NIVEL[nivel] || 1;
        puntosMaximos += peso;

        if (p.puntosPonderados !== undefined) {
            puntosObtenidos += p.puntosPonderados;
        } else {
            const scoreBase = typeof p.score === 'number' ? p.score : (p.estado === 'CORRECTO' ? 1 : 0);
            puntosObtenidos += (scoreBase * peso);
        }
    });

    return puntosMaximos > 0 ? Math.round((puntosObtenidos / puntosMaximos) * 100) : 0;
  });

  // Calcula la puntuación global ponderada sumando todos los pesos de las preguntas
  let sumaPuntosUsuario = 0;
  let sumaPuntosMaximos = 0;

  historialRespuestas.forEach(p => {
      let nivel = p.nivel;
      if (!nivel) {
          const original = bancoPreguntas.find(b => String(b.id) === String(p.id_pregunta));
          nivel = original?.nivel ? String(original.nivel).replace(/Nivel\s*/i, '').trim().toUpperCase() : 'A1';
      }
      const peso = PUNTOS_POR_NIVEL[nivel] || 1;
      sumaPuntosMaximos += peso;

      if (p.puntosPonderados !== undefined) {
          sumaPuntosUsuario += p.puntosPonderados;
      } else {
          const scoreBase = typeof p.score === 'number' ? p.score : (p.estado === 'CORRECTO' ? 1 : 0);
          sumaPuntosUsuario += (scoreBase * peso);
      }
  });

  const puntuacionGlobal = sumaPuntosMaximos > 0 
      ? Math.round((sumaPuntosUsuario / sumaPuntosMaximos) * 100) 
      : 0;

  const infoNivel = getNivelDetallado(puntuacionGlobal);
  
  // Comienza el proceso de dibujo en el PDF

  // Escribe el título principal y dibuja una línea decorativa roja
  doc.setFontSize(22);
  doc.setFont("times", "bold");
  doc.setTextColor(61, 68, 73); 
  doc.text("Informe de Competencias Digitales", anchoPag / 2, posY, { align: "center" });
  
  posY += 5;
  doc.setDrawColor(245, 106, 106);
  doc.setLineWidth(1);
  doc.line(anchoPag / 2 - 30, posY, anchoPag / 2 + 30, posY);
  
  posY += 15;
  
  // Añade los datos del usuario, ocupación, fecha y DURACIÓN
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text(`USUARIO: ${perfilUsuario.nombre.toUpperCase()}`, margen, posY);
  doc.text(`OCUPACIÓN: ${perfilUsuario.ocupacion.toUpperCase()}`, margen, posY + 5);
  doc.text(`FECHA: ${new Date().toLocaleDateString()}`, anchoPag - margen, posY, { align: 'right' });
  doc.text(`DURACIÓN: ${textoDuracion.toUpperCase()}`, anchoPag - margen, posY + 5, { align: 'right' });

  posY += 15;

  // Crea un recuadro con fondo gris para resaltar la puntuación global y el nivel alcanzado
  const altoCaja = 28;
  const anchoCaja = anchoPag - (margen * 2);
  const centroIzquierda = margen + (anchoCaja / 4);
  const centroDerecha = margen + (anchoCaja * 0.75);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(margen, posY, anchoCaja, altoCaja, 3, 3, 'FD');

  doc.setDrawColor(203, 213, 225);
  doc.line(anchoPag / 2, posY + 6, anchoPag / 2, posY + altoCaja - 6);

  // Escribe la puntuación numérica en el lado izquierdo del recuadro
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.text("PUNTUACIÓN GLOBAL", centroIzquierda, posY + 10, { align: "center" });

  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0); 
  doc.text(`${puntuacionGlobal}/100`, centroIzquierda, posY + 21, { align: "center" });

  // Escribe el nivel textual en el lado derecho del recuadro
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("NIVEL ALCANZADO", centroDerecha, posY + 10, { align: "center" });

  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0); 
  const textoNivel = `${infoNivel.titulo} (${infoNivel.codigo})`;
  doc.text(textoNivel, centroDerecha, posY + 21, { align: "center" });

  posY += altoCaja + 15;

  // Itera sobre cada área para mostrar su título barra de progreso y descripción detallada
  doc.setFontSize(14);
  doc.setTextColor(61, 68, 73);
  doc.setFont("times", "bold");
  doc.text("Resultados Detallados por Área", margen, posY);
  posY += 10;

  CONFIG_AREAS.forEach((area, index) => {
      const nota = puntuacionesCalculadas[index];
      
      const estadoData = getEstadoDesempeño(nota); 
      const colorEstado = estadoData.colorRgb;
      const textoEstado = estadoData.texto;

      doc.setFontSize(11);
      doc.setFont("times", "bold");
      doc.setTextColor(61, 68, 73); 

      doc.setFont("helvetica", "bold");
      const anchoEstado = doc.getTextWidth(textoEstado);
      doc.setFont("helvetica", "normal");
      const anchoPorcentaje = doc.getTextWidth("100% "); 
      const espacioDerecha = anchoEstado + anchoPorcentaje + 5;
      const anchoTitulo = anchoPag - (margen * 2) - espacioDerecha;

      doc.setFont("times", "bold");
      const lineasTitulo = doc.splitTextToSize(area.fullTitle, anchoTitulo);
      doc.text(lineasTitulo, margen, posY);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colorEstado); 
      doc.text(textoEstado, anchoPag - margen, posY, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setTextColor(100); 
      const xPosPorcentaje = anchoPag - margen - anchoEstado - 3;
      doc.text(`${nota}%`, xPosPorcentaje, posY, { align: "right" });

      posY += (lineasTitulo.length * 5) + 1;

      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      const lineasDesc = doc.splitTextToSize(area.desc, anchoPag - (margen * 2));
      doc.text(lineasDesc, margen, posY);
      
      posY += (lineasDesc.length * 4) + 4; 

      // Dibuja la línea gris de fondo y la línea de color proporcional a la puntuación
      doc.setDrawColor(230);
      doc.setLineWidth(1.5);
      doc.line(margen, posY, anchoPag - margen, posY); 
      
      if (nota > 0) {
        doc.setDrawColor(...colorEstado);
        doc.line(margen, posY, margen + ((anchoPag - (margen * 2)) * (nota / 100)), posY); 
      }
      
      posY += 12; 
  });

  // Añade una nueva página para visualizar el gráfico de araña generado anteriormente
  doc.addPage();
  posY = 25;

  doc.setFontSize(16);
  doc.setTextColor(61, 68, 73);
  doc.setFont("times", "bold");
  doc.text("Gráfico Visual de Competencias", margen, posY);
  
  const centroYRadar = posY + 65; 
  dibujarRadarPDF(doc, puntuacionesCalculadas, anchoPag / 2, centroYRadar, 40);
  
  posY = centroYRadar + 65; 

  // Muestra tres columnas con feedback específico sobre conocimientos habilidades y actitudes
  doc.setFontSize(16);
  doc.setTextColor(61, 68, 73);
  doc.setFont("times", "bold");
  doc.text("Análisis Cualitativo", margen, posY);
  posY += 15;

  const feedback = getFeedbackCualitativo(puntuacionGlobal);
  const gap = 6;
  const anchoCajaQual = (anchoPag - (margen * 2) - (gap * 2)) / 3; 
  const altoCajaQual = 65; 
  
  const cajas = [
    { titulo: "Conocimientos", texto: feedback.conocimientos }, 
    { titulo: "Habilidades", texto: feedback.habilidades },   
    { titulo: "Actitudes", texto: feedback.actitudes }       
  ];

  cajas.forEach((caja, i) => {
    const xCaja = margen + (i * (anchoCajaQual + gap));
    doc.setFillColor(252, 252, 252);
    doc.setDrawColor(220);
    doc.roundedRect(xCaja, posY, anchoCajaQual, altoCajaQual, 2, 2, 'FD');
    doc.setFontSize(11);
    doc.setTextColor(61, 68, 73);
    doc.setFont("times", "bold");
    doc.text(caja.titulo, xCaja + 5, posY + 10);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    const lineasTexto = doc.splitTextToSize(caja.texto, anchoCajaQual - 10);
    doc.text(lineasTexto, xCaja + 5, posY + 20);
  });

  // Si existen recursos recomendados crea una sección final con enlaces directos
  if (listaRecursos && listaRecursos.length > 0) {
    doc.addPage();
    posY = 25;

    doc.setFontSize(16);
    doc.setTextColor(61, 68, 73);
    doc.setFont("times", "bold");
    doc.text("Plan de Aprendizaje Personalizado", margen, posY);
    posY += 15;

    const getAreaIndex = (areaName) => {
        if (!areaName) return 99;
        const index = CONFIG_AREAS.findIndex(c => areaName.includes(c.keyword));
        return index === -1 ? 99 : index;
    };

    const altaPrioridad = listaRecursos.filter(r => r.prioridad === 'ALTA');
    const refuerzo = listaRecursos.filter(r => r.prioridad !== 'ALTA');

    altaPrioridad.sort((a, b) => getAreaIndex(a.area_dig_comp) - getAreaIndex(b.area_dig_comp));
    refuerzo.sort((a, b) => getAreaIndex(a.area_dig_comp) - getAreaIndex(b.area_dig_comp));

    // Función auxiliar para imprimir cada bloque de recursos
    const imprimirBloqueRecursos = (titulo, colorTitulo, recursos) => {
        if (recursos.length === 0) return;
        if (posY > 250) { doc.addPage(); posY = 25; }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colorTitulo);
        doc.text(`${titulo} (${recursos.length})`, margen, posY);
        
        doc.setDrawColor(...colorTitulo);
        doc.setLineWidth(0.5);
        doc.line(margen, posY + 3, anchoPag - margen, posY + 3);
        posY += 12;

        recursos.forEach(rec => {
            if (posY > 260) { doc.addPage(); posY = 25; }
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(150);
            doc.text((rec.area_dig_comp || "General").toUpperCase(), margen, posY);
            doc.setFontSize(10);
            doc.setFont("times", "bold"); 
            doc.setTextColor(245, 106, 106);
            
            // Inserta el título del recurso como un enlace clicable dentro del PDF
            const tituloSafe = doc.splitTextToSize(`• ${rec.titulo}`, anchoPag - margen - 10);
            doc.textWithLink(tituloSafe[0] + (tituloSafe.length > 1 ? '...' : ''), margen, posY + 5, { url: rec.url_completa || rec.url_recurso });

            if (rec.descripcion) {
               doc.setFontSize(9);
               doc.setFont("helvetica", "normal");
               doc.setTextColor(80);
               const descSafe = doc.splitTextToSize(rec.descripcion, anchoPag - margen - 10);
               if (descSafe.length > 0) {
                   doc.text(descSafe[0] + (descSafe.length > 1 ? '...' : ''), margen, posY + 10);
                   posY += 5;
               }
            }
            posY += 12;
        });
        posY += 10; 
    };

    imprimirBloqueRecursos("PRIORIDAD ALTA", [220, 38, 38], altaPrioridad);
    imprimirBloqueRecursos("REFUERZO SUGERIDO", [71, 85, 105], refuerzo);
  }

  // Recorre todas las páginas generadas para añadir el número de página al pie
  const totalPaginas = doc.internal.getNumberOfPages();
  const altoFinal = doc.internal.pageSize.getHeight();
  for(let i = 1; i <= totalPaginas; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${totalPaginas} - Generado por Herramienta DigComp`, anchoPag / 2, altoFinal - 10, { align: 'center' });
  }

  const nombreLimpio = perfilUsuario.nombre.replace(/\s+/g, '_').toLowerCase();
  const nombreArchivo = `informe_digcomp_${nombreLimpio}.pdf`;

  return { doc, nombreArchivo };
};

function DescargaEnvio() {
  const [paramsBusqueda] = useSearchParams();
  const navegar = useNavigate();
  const location = useLocation();
  const idCuestionario = paramsBusqueda.get('id');
  
  // Recupera los datos pasados por navegación o inicializa estados vacíos
  const [datosInforme, setDatosInforme] = useState(() => location.state?.historial || null);
  const [bancoPreguntas, setBancoPreguntas] = useState(() => location.state?.bancoPreguntas || []); 
  const [usuario, setUsuario] = useState(() => location.state?.usuario || { nombre: 'Invitado', ocupacion: '' });
  const [recursosParaPdf, setRecursosParaPdf] = useState([]); 
  const [datosListos, setDatosListos] = useState(() => {
      return !!(location.state?.historial && location.state?.bancoPreguntas);
  });

  const [cargandoPdf, setCargandoPdf] = useState(false);
  const [emailDestino, setEmailDestino] = useState('');
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [notificacion, setNotificacion] = useState({ show: false, type: '', message: '' });

  // Si faltan datos intenta cargarlos desde el servidor usando el ID del cuestionario
  useEffect(() => {
    if (datosListos && datosInforme && bancoPreguntas.length > 0) {
        calcularRecursos(datosInforme, bancoPreguntas);
        return;
    }

    const prepararDatos = async () => {
      try {
        const todasLasPreguntas = await CuestionarioService.obtenerBancoPreguntas();
        const bancoLimpio = todasLasPreguntas.map(p => ({
           id: p.id, codigo: p.codigo, areaDigComp: p.area_dig_comp || p.areaDigComp, nivel: p.nivel 
        }));
        setBancoPreguntas(bancoLimpio);

        let historialFinal = datosInforme;
        if (!historialFinal && idCuestionario) {
            const c = await CuestionarioService.obtenerPorId(idCuestionario);
            if (c) {
                historialFinal = c.progresoPreguntas;
                setDatosInforme(historialFinal);
                if (c.usuarioId && c.usuarioId !== 'anonimo') {
                    const u = await UsuarioService.obtenerPorId(c.usuarioId);
                    if (u) setUsuario(u);
                }
            }
        } else if (historialFinal && idCuestionario) {
             const c = await CuestionarioService.obtenerPorId(idCuestionario);
             if (c && c.usuarioId && c.usuarioId !== 'anonimo') {
                 const u = await UsuarioService.obtenerPorId(c.usuarioId);
                 if (u) setUsuario(u);
             }
        }

        if (historialFinal && bancoLimpio.length > 0) {
            calcularRecursos(historialFinal, bancoLimpio);
        }
      } catch (error) { console.error("Error:", error); }
    };
    if (!datosListos) prepararDatos();
  // eslint-disable-next-line
  }, [idCuestionario]);

  // Analiza las respuestas incorrectas para buscar recursos educativos en la base de datos
  const calcularRecursos = async (historial, banco) => {
        if (historial && banco.length > 0) {
            const preguntasA_Reforzar = historial.filter(r => 
                r.estado === 'NO_SABE' || r.estado === 'INCORRECTO' || r.estado === 'PARCIAL' || (r.score !== undefined && r.score < 1)
            );
            const mapaRecursos = new Map();
            const promesas = preguntasA_Reforzar.map(async (respuesta) => {
                let codigoParaBuscar = respuesta.codigo;
                if (!codigoParaBuscar) {
                    const preguntaOriginal = banco.find(b => String(b.id) === String(respuesta.id_pregunta));
                    if (preguntaOriginal) codigoParaBuscar = preguntaOriginal.codigo;
                }
                if (codigoParaBuscar) {
                    const recursosEncontrados = await RecursoService.obtenerPorPregunta(codigoParaBuscar);
                    const areaPregunta = banco.find(b => b.codigo === codigoParaBuscar)?.areaDigComp;
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
            const listaFinal = Array.from(mapaRecursos.values()).sort((a, b) => {
                if (a.prioridad === 'ALTA' && b.prioridad === 'MEDIA') return -1;
                if (a.prioridad === 'MEDIA' && b.prioridad === 'ALTA') return 1;
                return 0;
            });
            setRecursosParaPdf(listaFinal);
            setDatosListos(true);
        }
  };

  // Genera el PDF en el navegador y fuerza la descarga del archivo
  const alDescargar = () => {
    if (!datosListos) return;
    setCargandoPdf(true);
    setTimeout(() => {
      try { 
        const { doc, nombreArchivo } = crearDocumentoPDF(datosInforme, usuario, bancoPreguntas, recursosParaPdf);
        doc.save(nombreArchivo);
      } 
      catch (error) { 
        console.error("Error PDF:", error); 
        alert("Ocurrió un error al generar la descarga.");
      } 
      finally { setCargandoPdf(false); }
    }, 50);
  };

  // Convierte el PDF a un archivo binario y lo envía al servidor para mandarlo por correo
  const alEnviarEmail = async (e) => {
    e.preventDefault();
    
    if (!emailDestino) {
      setNotificacion({ show: true, type: 'error', message: 'Por favor, escribe un correo electrónico válido.' });
      return;
    }
    
    setEnviandoEmail(true);

    try {
      const { doc } = crearDocumentoPDF(datosInforme, usuario, bancoPreguntas, recursosParaPdf);
      const pdfBlob = doc.output('blob');
      const formData = new FormData();
      formData.append('pdf', pdfBlob, 'Informe_Competencias.pdf'); 
      formData.append('email', emailDestino);
      formData.append('nombreUsuario', usuario.nombre || 'Usuario');

      await CuestionarioService.enviarResultadosPorCorreo(formData);

      setNotificacion({ show: true, type: 'success', message: `Hemos enviado el informe correctamente a ${emailDestino}. Revisa tu bandeja de entrada.` });
      setEmailDestino('');

    } catch (error) {
      console.error("Error al enviar:", error);
      setNotificacion({ show: true, type: 'error', message: error.message || "Ocurrió un problema al enviar el correo. Revisa tu conexión." });
    } finally {
      setEnviandoEmail(false);
    }
  };

  return (
    <div className="descarga-container">
      <NotificationModal 
        show={notificacion.show} 
        type={notificacion.type} 
        message={notificacion.message} 
        onClose={() => setNotificacion({ ...notificacion, show: false })}
      />

      <div className="descarga-content">
        <div className="header-section"><h1>Obtener tu informe</h1><p className="subtitle">Resultados listos. Guarda tu diagnóstico sin necesidad de registro.</p></div>
        <div className="options-grid">
          
          <div className="modern-card">
            <div className="card-header"><div className="card-icon-box"><FileText size={32} strokeWidth={2} /></div><div className="card-titles"><h2 className="card-title">Descarga directa</h2><p className="card-subtitle">Guardar en dispositivo</p></div></div>
            <div className="card-body">
              <p className="card-description">Genera un PDF detallado con gráficas, puntuaciones por área y feedback personalizado.</p>
              <div className="file-details"><div className="file-stat"><CheckCircle2 size={18} style={{color: '#16a34a'}}/><span>Formato PDF</span></div><div className="file-stat"><HardDrive size={18} style={{color: '#64748b'}}/></div></div>
              <button className="btn-full btn-primary" onClick={alDescargar} disabled={cargandoPdf || !datosListos}>{cargandoPdf ? <><Loader2 className="animate-spin" size={20} /> Generando...</> : (datosListos ? <><Download size={20} /> Descargar Informe</> : "Cargando datos...")}</button>
            </div>
          </div>
          
          <div className="modern-card">
            <div className="card-header"><div className="card-icon-box"><Mail size={32} strokeWidth={2} /></div><div className="card-titles"><h2 className="card-title">Enviar por correo</h2><p className="card-subtitle">Recibir copia digital</p></div></div>
            <div className="card-body">
              <p className="card-description">Te enviamos el informe a tu bandeja de entrada para que lo consultes luego.</p>
              <form className="email-form" onSubmit={alEnviarEmail}>
                <div className="email-input-wrapper">
                    <div className="email-icon"><AtSign size={18} /></div>
                    <input 
                        type="email" 
                        placeholder="tucorreo@ejemplo.com" 
                        className="modern-input" 
                        required 
                        value={emailDestino}
                        onChange={(e) => setEmailDestino(e.target.value)}
                        disabled={enviandoEmail}
                    />
                </div>
                <button type="submit" className="btn-full btn-primary" disabled={enviandoEmail || !datosListos}>
                    {enviandoEmail ? <><Loader2 className="animate-spin" size={20} /> Enviando...</> : <><Send size={20} /> Enviar a mi correo</>}
                </button>
              </form>
            </div>
          </div>

        </div>
        <div className="footer-links"><button onClick={() => navegar(-1)} className="back-link" type="button"><ArrowLeft size={20} /> Volver al informe</button><Link to="/" className="back-link"><Home size={20} /> Volver al inicio</Link></div>
      </div>
    </div>
  );
}

export default DescargaEnvio;