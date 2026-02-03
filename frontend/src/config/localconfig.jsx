import { 
  Search, MessageSquare, Edit, ShieldAlert, Wrench 
} from 'lucide-react';

// Constantes de puntuación y niveles
export const PUNTOS_POR_NIVEL = {
  'A1': 1, 
  'A2': 1.5, 
  'B1': 2, 
  'B2': 2.5, 
  'C1': 3, 
  'C2': 3.5
};

export const NIVELES_ORDENADOS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const MAPA_NIVELES_NUMERICOS = {
  1: 'A1', 2: 'A2', 3: 'B1', 4: 'B2', 5: 'C1', 6: 'C2'
};

// Obtiene título y código según puntaje
export const getNivelDetallado = (score) => {
  if (score <= 20) return { titulo: "Básico", codigo: "A1" };
  if (score <= 35) return { titulo: "Básico", codigo: "A2" };
  if (score <= 50) return { titulo: "Intermedio", codigo: "B1" };
  if (score <= 70) return { titulo: "Intermedio", codigo: "B2" };
  if (score <= 80) return { titulo: "Avanzado", codigo: "C1" };
  return { titulo: "Altamente Avanzado", codigo: "C2" };
};

// Define colores y textos para Web y PDF
export const getEstadoDesempeño = (score) => {
  const nivel = getNivelDetallado(score);
  const codigo = nivel.codigo;

  // Niveles iniciales rojo
  if (['A1', 'A2'].includes(codigo)) {
    return {
      texto: "MEJORAR",
      colorHex: '#ef4444',      
      colorRgb: [239, 68, 68],  
      bgHex: '#fee2e2'          
    };
  }
  // Niveles medios amarillo
  if (['B1', 'B2'].includes(codigo)) {
    return {
      texto: "COMPETENTE",
      colorHex: '#eab308',
      colorRgb: [234, 179, 8],
      bgHex: '#fef9c3'
    };
  }
  // Niveles altos verde
  return {
    texto: "ÓPTIMO",
    colorHex: '#16a34a',
    colorRgb: [22, 163, 74],
    bgHex: '#dcfce7'
  };
};

// Mantiene compatibilidad con versiones anteriores
export const getBarColor = (score) => getEstadoDesempeño(score).colorHex;

// Asigna colores temáticos por nombre de área
export const obtenerColorArea = (nombreArea) => {
  if (!nombreArea) return { fondo: '#f1f5f9', texto: '#64748b' };
  if (nombreArea.includes('Información')) return { fondo: '#ffedd5', texto: '#9a3412' }; 
  if (nombreArea.includes('Comunicación')) return { fondo: '#dbeafe', texto: '#1e40af' }; 
  if (nombreArea.includes('Creación')) return { fondo: '#fee2e2', texto: '#991b1b' }; 
  if (nombreArea.includes('Seguridad')) return { fondo: '#dcfce7', texto: '#166534' }; 
  if (nombreArea.includes('Resolución')) return { fondo: '#f3e8ff', texto: '#6b21a8' }; 
  return { fondo: '#f1f5f9', texto: '#64748b' };
};

// Genera retroalimentación textual según nota global
export const getFeedbackCualitativo = (notaGlobal) => {
  if (notaGlobal < 25) return { conocimientos: "Reconoces términos básicos pero requieres apoyo para conectarlos con la práctica.", habilidades: "Realizas tareas guiadas. Dependes de instrucciones paso a paso.", actitudes: "Curiosidad inicial, aunque con cierta inseguridad ante nuevas herramientas." };
  if (notaGlobal < 50) return { conocimientos: "Entiendes el funcionamiento general y explicas procesos simples.", habilidades: "Realizas tareas comunes con cierta autonomía y resuelves problemas sencillos.", actitudes: "Receptivo a aprender y empiezas a valorar la utilidad tecnológica." };
  if (notaGlobal < 75) return { conocimientos: "Conocimiento sólido. Evalúas qué herramienta usar en cada caso.", habilidades: "Fluidez en problemas variados y adaptación de herramientas.", actitudes: "Proactividad. Buscas optimizar tareas y colaboras eficazmente." };
  return { conocimientos: "Nivel experto. Comprendes implicaciones legales, éticas y técnicas.", habilidades: "Creas soluciones innovadoras y puedes liderar/enseñar a otros.", actitudes: "Liderazgo digital. Promueves buenas prácticas y te adaptas al cambio." };
};

// Mapa de descripciones de competencias
export const MAPA_COMPETENCIAS = {
  '1.1': 'Navegar, buscar y filtrar información y contenidos digitales',
  '1.2': 'Evaluar información y contenidos digitales',
  '1.3': 'Gestionar información y contenidos digitales',
  '2.1': 'Interactuar',
  '2.2': 'Compartir',
  '2.3': 'Participación ciudadana',
  '2.4': 'Colaborar',
  '2.5': 'Comportamiento en la Red',
  '2.6': 'Gestión de la identidad',
  '3.1': 'Desarrollo de contenidos digitales',
  '3.2': 'Integración y reelaboración de contenidos digitales',
  '3.3': 'Copyright y licencias',
  '3.4': 'Programación',
  '4.1': 'Protección de dispositivos',
  '4.2': 'Protección de datos personales y privacidad',
  '4.3': 'Protección de la salud y del bienestar',
  '4.4': 'Protección medioambiental',
  '5.1': 'Resolución de problemas técnicos',
  '5.2': 'Identificación de necesidades y sus respuestas tecnológicas',
  '5.3': 'Uso creativo de tecnologías digitales',
  '5.4': 'Identificación de brechas digitales'
};

// Formatea el código de la competencia
export const obtenerTextoCompetencia = (codigo) => {
  if (!codigo) return 'Competencia General';
  const match = codigo.match(/C(\d)(\d)/i);
  if (match) {
    const area = match[1];
    const comp = match[2];
    const clave = `${area}.${comp}`; 
    if (MAPA_COMPETENCIAS[clave]) return `${clave}. ${MAPA_COMPETENCIAS[clave]}`;
  }
  return 'Competencia General';
};

// Configuración visual de las áreas
export const CONFIG_AREAS = [
  { 
    id: 1, 
    keyword: 'Información', 
    labelLines: ['1. Información y', 'alfabetización'],
    fullTitle: '1. Información y alfabetización de datos',
    desc: 'Capacidad para navegar, buscar, filtrar y evaluar datos, así como gestionar y organizar información y contenido digital.',
    icon: <Search size={20} />,
    colorTheme: { bg: '#fef3c7', text: '#d97706' } 
  },
  { 
    id: 2, 
    keyword: 'Comunicación',
    labelLines: ['2. Comunicación', 'y colaboración'],
    fullTitle: '2. Comunicación y colaboración',
    desc: 'Habilidad para interactuar, compartir y colaborar mediante tecnologías digitales, gestionando la identidad y normas de comportamiento.',
    icon: <MessageSquare size={20} />,
    colorTheme: { bg: '#eff6ff', text: '#3b82f6' } 
  },
  { 
    id: 3, 
    keyword: 'Creación',
    labelLines: ['3. Creación de', 'contenido'],
    fullTitle: '3. Creación de contenidos digitales',
    desc: 'Creación y edición de contenidos digitales, integración de conocimientos previos, programación y gestión de derechos de autor.',
    icon: <Edit size={20} />,
    colorTheme: { bg: '#ffedd5', text: '#ea580c' } 
  },
  { 
    id: 4, 
    keyword: 'Seguridad',
    labelLines: ['4. Seguridad'],
    fullTitle: '4. Seguridad',
    desc: 'Protección de dispositivos, contenidos, datos personales, privacidad, salud, bienestar y del entorno medioambiental.',
    icon: <ShieldAlert size={20} />,
    colorTheme: { bg: '#dcfce7', text: '#16a34a' } 
  },
  { 
    id: 5, 
    keyword: 'Resolución',
    labelLines: ['5. Resolución', 'de problemas'],
    fullTitle: '5. Resolución de problemas',
    desc: 'Identificación de necesidades y recursos, toma de decisiones, resolución de problemas técnicos y uso creativo de la tecnología.',
    icon: <Wrench size={20} />,
    colorTheme: { bg: '#fce7f3', text: '#db2777' } 
  },
];

// Coordenadas del gráfico radar
export const RADAR_SETTINGS = {
  VERTICES: [
    { x: 150, y: 50 }, 
    { x: 245, y: 119 }, 
    { x: 209, y: 231 }, 
    { x: 91, y: 231 }, 
    { x: 55, y: 119 }
  ],
  CENTER: { x: 150, y: 150 }
};