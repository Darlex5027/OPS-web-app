/**
 * @jest-environment jsdom
 *
 * Archivo      : reporte_estadistico.test.js
 * Módulo       : CU_09 Reporte estadístico (Pruebas unitarias)
 * Archivos bajo prueba (en la carpeta de app/ que empieza con "CU_09"):
 *   reporte_estadistico.js, revision_tipo_usuario.js, generar_resumen.js,
 *   generar_tabla_entregados.js, generar_tabla_pendientes.js,
 *   mostrar_respuesta_individual.js, generar_excel.js, generar_pdf.js,
 *   generar_pdf_encabezado.js
 * Herramienta  : Jest + jsdom
 *
 * Cómo correrlo (desde OPS-web-app):
 *   npx jest Pruebas_Unitarias/CU_09 --verbose
 *
 * Descripción  : Se usa el HTML real (reporte_estadistico.html) y se simulan las
 *                respuestas de los PHP con un mock de fetch. También se simulan
 *                jsPDF + autoTable y SheetJS (en la página llegan de un CDN) y la
 *                carga de imágenes (logo y banner). Los JS son módulos; la prueba
 *                los conecta en memoria y sustituye lanzar_toast.js y menu.js de
 *                ../js/ por simuladores. El código original NO se modifica.
 *
 * Cada prueba indica:
 *   - Función   : archivo › función que se prueba.
 *   - Comprueba : qué comportamiento se verifica.
 */
const fs = require('fs');
const path = require('path');

const RUTA_APPS = path.resolve(__dirname, '../../app');
const CARPETA = fs.readdirSync(RUTA_APPS).find((d) => d.startsWith('CU_09'));
if (!CARPETA) throw new Error(`No se encontró ninguna carpeta que empiece con "CU_09" dentro de ${RUTA_APPS}`);
const RUTA_APP = path.join(RUTA_APPS, CARPETA);
const HTML = fs.readFileSync(path.join(RUTA_APP, 'reporte_estadistico.html'), 'utf8');
const BODY = HTML.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1].replace(/<script[\s\S]*?<\/script>/gi, '');

// Orden en que perfil.html carga los módulos
const MODULOS = ['reporte_estadistico.js', 'generar_resumen.js', 'generar_tabla_entregados.js', 'generar_tabla_pendientes.js',
  'mostrar_respuesta_individual.js', 'revision_tipo_usuario.js', 'generar_excel.js', 'generar_pdf.js'];

// =====================================================================
// CARGADOR DE MÓDULOS (no es una prueba)
// =====================================================================
function transformar(codigo) {
  const exportados = [];
  let js = codigo.replace(
    /import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"];?/g,
    (_, nombres, ruta) => `const { ${nombres.trim()} } = __importar(${JSON.stringify(ruta)});`
  );
  js = js.replace(/export\s+((?:async\s+)?function|const|let)\s+([A-Za-z_$][\w$]*)/g, (_, tipo, nombre) => {
    exportados.push(nombre);
    return `${tipo} ${nombre}`;
  });
  return `"use strict";\n${js}\nreturn { ${exportados.join(', ')} };`;
}

let externos;
let modulos;

function importar(ruta) {
  const archivo = path.basename(ruta.split('?')[0]);
  if (ruta.startsWith('../js/')) return externos[archivo];
  if (!modulos[archivo]) {
    modulos[archivo] = {};
    const codigo = fs.readFileSync(path.join(RUTA_APP, archivo), 'utf8');
    // eslint-disable-next-line no-new-func
    Object.assign(modulos[archivo], new Function('__importar', transformar(codigo))(importar));
  }
  return modulos[archivo];
}

// =====================================================================
// DATOS SIMULADOS
// =====================================================================
const ENCUESTAS = [{ Id_encuesta: 4, Nombre: 'Satisfacción del alumno' }, { Id_encuesta: 7, Nombre: 'Evaluación del coordinador' }];
const PERIODOS = { tipo: [{ Periodo_tipo: 'primavera' }, { Periodo_tipo: 'otoño' }], anio: [{ Periodo_anio: 2025 }, { Periodo_anio: 2026 }] };
const RESUMEN = [
  { Seccion: 'General', Pregunta: 'Trato recibido', Deficiente: '0', Suficiente: '1', Bien: '0', 'Muy bien': '2', Excelente: '3' },
  { Seccion: 'General', Pregunta: 'Instalaciones', Deficiente: '1', Suficiente: '0', Bien: '2', 'Muy bien': '0', Excelente: '1' }
];
const ENTREGADOS = [
  { Matricula: '20232389', 'Nombre del Alumno': 'Ana López Ruiz', 'Nombre encuesta': 'Satisfacción del alumno', Periodo: 'primavera 2026', Servicio: 'Servicio social' },
  { Matricula: '20231111', 'Nombre del Alumno': 'Luis Pérez Gómez', 'Nombre encuesta': 'Satisfacción del alumno', Periodo: 'primavera 2026', Servicio: 'Servicio social' }
];
const PENDIENTES = [
  { 'Nombre del Alumno': 'Rosa Díaz Mora', 'Nombre encuesta': 'Satisfacción del alumno', Periodo: 'primavera 2026', Servicio: 'Servicio social' }
];
const RESPUESTA_INDIVIDUAL = {
  nombre_alumno: 'Ana López Ruiz', nombre_encuesta: 'Satisfacción del alumno',
  encuesta_codigo: '108g-RG-14', encuesta_revision: '9001:2015', encuesta_fecha: 'Noviembre 2025', encuesta_version: '03',
  respuesta_individual: [
    { seccion: 'General', pregunta: 'Trato recibido', Deficiente: '', Suficiente: '', Bien: '', 'Muy bien': 'Muy bien', Excelente: '' },
    { seccion: 'General', pregunta: '¿Qué mejorarías?', Deficiente: 'Más horarios', Suficiente: '', Bien: '', 'Muy bien': '', Excelente: '' },
    { seccion: 'General', pregunta: 'Instalaciones', Deficiente: 'Deficiente', Suficiente: '', Bien: '', 'Muy bien': '', Excelente: '' }
  ]
};
const ENCABEZADO = { nombre_completo: 'María Soto Ríos', carrera: 'Ing. en Computación', facultad: 'FCBIyT' };

// =====================================================================
// SIMULADORES DE LIBRERÍAS DEL NAVEGADOR (no son pruebas)
// =====================================================================
let pdf;

/** jsPDF simulado: anota textos, imágenes, la tabla y el nombre con que se guarda. */
class JsPDFSimulado {
  constructor(opciones) {
    this.opciones = opciones;
    this.textos = [];
    this.imagenes = [];
    this.tabla = null;
    this.guardado = null;
    this.internal = { pageSize: { getWidth: () => (opciones && opciones.orientation === 'portrait' ? 210 : 297) } };
    pdf = this;
  }
  setDrawColor() {}
  setLineWidth() {}
  rect() {}
  line() {}
  setFont() {}
  setFontSize() {}
  setTextColor() {}
  addImage(...args) { this.imagenes.push(args); }
  text(t) { this.textos.push(t); }
  getTextWidth(t) { return t.length * 1.5; }
  autoTable(opciones) { this.tabla = opciones; }
  save(nombre) { this.guardado = nombre; }
}

let imagenesQueCargan; // nombres de archivo que sí cargan (ej. ['logo.png', 'banner.png'])

/** Image simulada: carga (onload) solo las imágenes indicadas; 1000 x 200 px. */
class ImagenSimulada {
  constructor() { this.naturalWidth = 1000; this.naturalHeight = 200; this.width = 1000; this.height = 200; }
  set src(url) {
    this._src = url;
    const carga = url.startsWith('data:') || imagenesQueCargan.includes(path.basename(url));
    Promise.resolve().then(() => (carga ? this.onload && this.onload() : this.onerror && this.onerror()));
  }
  get src() { return this._src; }
}

// =====================================================================
// FUNCIONES DE APOYO (no son pruebas)
// =====================================================================
let lanzarToast;
let renderMenu;
let rutas;
let listeners;

/**
 * Los archivos usan Promise.reject() sin .catch(); en Node eso detiene Jest.
 * Esta promesa marca como "atendido" cada rechazo de la cadena (solo en la prueba).
 */
class PromesaSilenciosa extends Promise {
  then(ok, error) {
    const p = super.then(ok, error);
    Promise.prototype.then.call(p, undefined, () => {});
    return p;
  }
}

function respuesta(json, status = 200) {
  return PromesaSilenciosa.resolve({ status, ok: status >= 200 && status < 300, json: () => Promise.resolve(JSON.parse(JSON.stringify(json))) });
}

async function esperarPromesas() {
  for (let i = 0; i < 80; i++) await Promise.resolve();
}

function borrarCookies() {
  document.cookie.split('; ').filter(Boolean).forEach((c) => {
    document.cookie = `${c.split('=')[0]}=; max-age=0; path=/`;
  });
}

/** Carga reporte_estadistico.html y sus 8 módulos en el orden del HTML. */
async function cargarPagina(cambios = {}, tipo = '3') {
  borrarCookies();
  if (tipo) document.cookie = `Id_tipo_usuario=${tipo}; path=/`;
  document.body.innerHTML = BODY;

  rutas = {
    './obtener_encuestas.php': () => respuesta(ENCUESTAS),
    './obtener_periodos.php': () => respuesta(PERIODOS),
    './generar_tabla_resumen.php': () => respuesta(RESUMEN),
    './generar_promedio_resumen.php': () => respuesta('86.00'),
    './generar_tabla_entregados.php': () => respuesta(ENTREGADOS),
    './generar_tabla_pendientes.php': () => respuesta(PENDIENTES),
    './obtener_respuesta_individual.php': () => respuesta(RESPUESTA_INDIVIDUAL),
    './obtener_datos_encabezado.php': () => respuesta(ENCABEZADO),
    ...cambios
  };
  global.fetch = jest.fn((url, opciones) => rutas[url](opciones));

  modulos = {};
  MODULOS.forEach((m) => importar(`./${m}`));

  document.dispatchEvent(new Event('DOMContentLoaded'));
  await esperarPromesas();
}

const $ = (id) => document.getElementById(id);
const opciones = (id) => [...$(id).options].map((o) => [o.value, o.text]);
const llamadasA = (archivo) => fetch.mock.calls.filter((c) => c[0] === archivo);
const cuerpo = (archivo) => JSON.parse(llamadasA(archivo)[0][1].body);
const titulos = () => [...$('Titulos').querySelectorAll('th')].map((th) => th.textContent.trim());
const filas = (id = 'Tabla') => [...$(id).querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent.trim()));
const visible = (id) => $(id).style.display !== 'none';
const avisosNavegacion = () => console.error.mock.calls
  .map((a) => String((a[0] && a[0].message) || a[0])).filter((t) => t.includes('navigation'));

/** Elige una encuesta (carga los periodos) y un periodo. */
async function elegirFiltros(encuesta = '4', tipo = 'primavera', anio = '2026') {
  $('slctEncuestas').value = encuesta;
  $('slctEncuestas').dispatchEvent(new Event('change'));
  await esperarPromesas();
  $('slctPeriodoTipo').value = tipo;
  $('slctPeriodoAnio').value = anio;
}

async function clic(id) {
  $(id).click();
  await esperarPromesas();
}

// =====================================================================
// PREPARACIÓN DE CADA PRUEBA
// =====================================================================
beforeEach(() => {
  lanzarToast = jest.fn();
  renderMenu = jest.fn();
  externos = { 'lanzar_toast.js': { lanzarToast }, 'menu.js': { renderMenu } };
  pdf = null;
  imagenesQueCargan = ['logo.png', 'banner.png'];
  window.jspdf = { jsPDF: JsPDFSimulado };
  window.XLSX = { utils: { table_to_book: jest.fn(() => ({ libro: true })) }, writeFile: jest.fn() };
  global.Image = ImagenSimulada;
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({ drawImage: jest.fn() }));
  jest.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => 'data:image/png;base64,IMG');
  jest.spyOn(console, 'error').mockImplementation(() => {});

  listeners = [];
  const original = EventTarget.prototype.addEventListener;
  jest.spyOn(document, 'addEventListener').mockImplementation(function (tipo, fn, op) {
    listeners.push([tipo, fn, op]);
    return original.call(document, tipo, fn, op);
  });
});

afterEach(() => {
  listeners.forEach(([tipo, fn, op]) => document.removeEventListener(tipo, fn, op));
  jest.restoreAllMocks();
  delete global.fetch;
  borrarCookies();
});

// =====================================================================
// reporte_estadistico.js
// =====================================================================
describe('reporte_estadistico.js', () => {
  /**
   * Función   : reporte_estadistico.js › listener "DOMContentLoaded" y cargarEncuestas().
   * Comprueba : que al cargar se dibuja el menú, se llenan las encuestas y se avisa.
   */
  test('[cargarEncuestas] Comprueba que dibuja el menú y llena las encuestas', async () => {
    await cargarPagina();

    expect(renderMenu).toHaveBeenCalled();
    expect(opciones('slctEncuestas')).toEqual([
      ['NINGUNA', '-- Seleccionar una encuesta--'], ['4', 'Satisfacción del alumno'], ['7', 'Evaluación del coordinador']
    ]);
    expect(lanzarToast).toHaveBeenCalledWith('Encuestas cargadas. Seleccione una encuesta para cargar los periodos disponibles', 'exito');
  });

  /**
   * Función   : reporte_estadistico.js › cargarEncuestas() (errores).
   * Comprueba : que si el servidor responde un error HTTP o un mensaje de error, se avisa.
   */
  test.each([
    ['un error HTTP', () => respuesta({}, 500), 'Fallo en la solicitud del catalogo de encuestas'],
    ['un mensaje de error', () => respuesta({ error: 'No hay encuestas disponibles.' }), 'No hay encuestas disponibles.'],
  ])('[cargarEncuestas] Comprueba el aviso cuando el servidor responde %s', async (_d, ruta, mensaje) => {
    await cargarPagina({ './obtener_encuestas.php': ruta });

    expect(lanzarToast).toHaveBeenCalledWith(mensaje, 'error');
    expect($('slctEncuestas').options).toHaveLength(1);
  });
});

// =====================================================================
// revision_tipo_usuario.js
// =====================================================================
describe('revision_tipo_usuario.js', () => {
  /**
   * Función   : revision_tipo_usuario.js › revisión del tipo de usuario.
   * Comprueba : que un alumno (tipo 2) es enviado a su perfil y un coordinador no.
   */
  test.each([['2', true], ['3', false], ['1', false]])(
    '[revision_tipo_usuario] Comprueba que con Id_tipo_usuario=%s redirige=%s', async (tipo, redirige) => {
      await cargarPagina({}, tipo);

      expect(avisosNavegacion().length > 0).toBe(redirige);
    });

  /**
   * Función   : revision_tipo_usuario.js › lectura de la cookie.
   * Comprueba : que sin la cookie Id_tipo_usuario el archivo lanza un error
   *             (no maneja el caso de no tener sesión).
   */
  test('[revision_tipo_usuario] Comprueba que sin cookie de tipo de usuario lanza un error', async () => {
    borrarCookies();
    document.body.innerHTML = BODY;
    modulos = {};

    expect(() => importar('./revision_tipo_usuario.js')).toThrow(TypeError);
  });
});

// =====================================================================
// generar_resumen.js
// =====================================================================
describe('generar_resumen.js', () => {

  describe('Función: listener "change" de #slctEncuestas (periodos)', () => {
    /**
     * Función   : generar_resumen.js › estado inicial.
     * Comprueba : que al cargar la página los filtros de periodo y año están ocultos.
     */
    test('[inicio] Comprueba que los filtros de periodo empiezan ocultos', async () => {
      await cargarPagina();

      expect(visible('slctPeriodoTipo')).toBe(false);
      expect(visible('slctPeriodoAnio')).toBe(false);
    });

    /**
     * Función   : generar_resumen.js › listener "change" de #slctEncuestas.
     * Comprueba : que al elegir una encuesta se muestran y se llenan los
     *             periodos, y al regresar a "ninguna" se ocultan.
     */
    test('[change slctEncuestas] Comprueba que al elegir encuesta se cargan los periodos', async () => {
      await cargarPagina();

      await elegirFiltros();
      expect(visible('slctPeriodoTipo')).toBe(true);
      expect(opciones('slctPeriodoTipo')).toEqual([['NINGUNO', '-- Seleccionar una periodo--'], ['primavera', 'primavera'], ['otoño', 'otoño']]);
      expect(opciones('slctPeriodoAnio')).toEqual([['NINGUNO', '-- Seleccionar una año--'], ['2025', '2025'], ['2026', '2026']]);

      $('slctEncuestas').value = 'NINGUNA';
      $('slctEncuestas').dispatchEvent(new Event('change'));
      expect(visible('slctPeriodoTipo')).toBe(false);
      expect($('slctPeriodoTipo').options).toHaveLength(1);
    });

    /**
     * Función   : generar_resumen.js › listener "change" (errores).
     * Comprueba : que si fallan los periodos se avisa.
     */
    test.each([
      ['un error HTTP', () => respuesta({}, 500), 'Fallo en la solicitud de periodos'],
      ['un mensaje de error', () => respuesta({ error: 'No se encontraron períodos' }), 'No se encontraron períodos'],
    ])('[change slctEncuestas] Comprueba el aviso cuando los periodos responden %s', async (_d, ruta, mensaje) => {
      await cargarPagina({ './obtener_periodos.php': ruta });

      await elegirFiltros();

      expect(lanzarToast).toHaveBeenCalledWith(mensaje, 'error');
    });
  });

  describe('Función: handleCargarResumen() y sus validaciones', () => {
    /**
     * Función   : handleCargarResumen() / handleCargarEntregados() / handleCargarPendientes() (validaciones).
     * Comprueba : que los 3 botones exigen encuesta, periodo y año antes de consultar.
     */
    test.each([
      ['btnCargarResumen', './generar_tabla_resumen.php'],
      ['btnCargarEntregados', './generar_tabla_entregados.php'],
      ['btnCargarPendientes', './generar_tabla_pendientes.php'],
    ])('[validaciones] Comprueba que %s exige encuesta, periodo y año', async (boton, archivo) => {
      await cargarPagina();

      await clic(boton);
      expect(lanzarToast).toHaveBeenCalledWith('Debe seleccionar una encuesta para generar el reporte', 'error');

      await elegirFiltros('4', 'NINGUNO', '2026');
      await clic(boton);
      expect(lanzarToast).toHaveBeenCalledWith('El periodo y el año deben rellenarse', 'error');
      expect(llamadasA(archivo)).toHaveLength(0);
    });
  });

  describe('Función: buildTabla(), renderTabla() y fetchPromedio()', () => {
    /**
     * Función   : generar_resumen.js › fetchResumen() y renderTabla().
     * Comprueba : que envía encuesta y periodo, y dibuja una fila por pregunta
     *             con el conteo de cada calificación; aparecen Excel y PDF.
     */
    test('[renderTabla] Comprueba la tabla resumen y los filtros enviados', async () => {
      await cargarPagina();
      await elegirFiltros();

      await clic('btnCargarResumen');

      expect(cuerpo('./generar_tabla_resumen.php')).toEqual({ Id_encuesta: '4', Periodo_tipo: 'primavera', Periodo_anio: '2026' });
      expect(titulos()).toEqual(['Seccion', 'Pregunta', 'Deficiente', 'Suficiente', 'Bien', 'Muy bien', 'Excelente']);
      expect(filas().slice(0, 2)).toEqual([
        ['General', 'Trato recibido', '0', '1', '0', '2', '3'],
        ['General', 'Instalaciones', '1', '0', '2', '0', '1']
      ]);
      expect(visible('btnGenerarExcel')).toBe(true);
      expect(visible('btnGenerarPDF')).toBe(true);
    });

    /**
     * Función   : generar_resumen.js › fetchPromedio().
     * Comprueba : que después de la tabla se agrega el promedio que regresa
     *             generar_promedio_resumen.php y se avisa.
     */
    test('[fetchPromedio] Comprueba que muestra el promedio debajo de la tabla', async () => {
      await cargarPagina();
      await elegirFiltros();

      await clic('btnCargarResumen');

      expect(cuerpo('./generar_promedio_resumen.php')).toEqual({ Id_encuesta: '4', Periodo_tipo: 'primavera', Periodo_anio: '2026' });
      expect($('lblPromedio').textContent).toBe('86.00');
      expect(lanzarToast).toHaveBeenCalledWith('Resultados cargados correctamente', 'exito');
    });

    /**
     * Función   : generar_resumen.js › fetchPromedio() (error).
     * Comprueba : que si falla el promedio se avisa y el promedio queda vacío.
     */
    test('[fetchPromedio] Comprueba el aviso cuando falla el promedio', async () => {
      await cargarPagina({ './generar_promedio_resumen.php': () => respuesta({ error: 'No hay resultados para el promedio.' }, 404) });
      await elegirFiltros();

      await clic('btnCargarResumen');

      expect(lanzarToast).toHaveBeenCalledWith('Fallo en la solicitud del promedio', 'error');
      expect($('lblPromedio').textContent).toBe('');
    });

    /**
     * Función   : generar_resumen.js › buildTabla() (error del servidor).
     * Comprueba : que si el servidor responde un error se muestra y se ocultan
     *             los botones de Excel y PDF.
     */
    test('[buildTabla] Comprueba el aviso cuando no hay resultados', async () => {
      await cargarPagina({ './generar_tabla_resumen.php': () => respuesta({ error: 'No hay resultados disponibles para los filtros seleccionados.' }, 404) });
      await elegirFiltros();

      await clic('btnCargarResumen');

      expect(lanzarToast).toHaveBeenCalledWith('No hay resultados disponibles para los filtros seleccionados.', 'error');
      expect(visible('btnGenerarPDF')).toBe(false);
      expect(llamadasA('./generar_promedio_resumen.php')).toHaveLength(0);
    });
  });
});

// =====================================================================
// generar_tabla_entregados.js y generar_tabla_pendientes.js
// =====================================================================
describe('generar_tabla_entregados.js', () => {
  /**
   * Función   : generar_tabla_entregados.js › fetchRenderTabla().
   * Comprueba : que muestra el título, los alumnos que contestaron, una columna
   *             "Acción" con el botón "Ver respuesta" y los botones de exportar.
   */
  test('[fetchRenderTabla] Comprueba la tabla de alumnos que contestaron', async () => {
    await cargarPagina();
    await elegirFiltros();

    await clic('btnCargarEntregados');

    expect(cuerpo('./generar_tabla_entregados.php')).toEqual({ Id_encuesta: '4', Periodo_tipo: 'primavera', Periodo_anio: '2026' });
    expect($('titulo-tabla').textContent).toBe('Alumnos que han contestado la encuesta');
    expect(titulos()).toEqual(['Matricula', 'Nombre del Alumno', 'Nombre encuesta', 'Periodo', 'Servicio', 'Acción']);
    expect(filas()[0]).toEqual(['20232389', 'Ana López Ruiz', 'Satisfacción del alumno', 'primavera 2026', 'Servicio social', 'Ver respuesta']);
    expect(visible('btnGenerarExcel')).toBe(true);
  });

  /**
   * Función   : generar_tabla_entregados.js › fetchRenderTabla() (sin resultados).
   * Comprueba : que si el servidor responde "No hay resultados" se avisa y se
   *             ocultan los botones.
   */
  test('[fetchRenderTabla] Comprueba el aviso cuando nadie ha contestado', async () => {
    await cargarPagina({ './generar_tabla_entregados.php': () => respuesta({ error: 'No hay resultados disponibles.' }, 404) });
    await elegirFiltros();

    await clic('btnCargarEntregados');

    expect(lanzarToast).toHaveBeenCalledWith('No hay resultados disponibles.', 'error');
    expect(visible('btnGenerarPDF')).toBe(false);
  });
});

describe('generar_tabla_pendientes.js', () => {
  /**
   * Función   : generar_tabla_pendientes.js › fetchRenderTabla().
   * Comprueba : que muestra el título y los alumnos que no han contestado (sin columna "Acción").
   */
  test('[fetchRenderTabla] Comprueba la tabla de alumnos pendientes', async () => {
    await cargarPagina();
    await elegirFiltros();

    await clic('btnCargarPendientes');

    expect($('titulo-tabla').textContent).toBe('Alumnos que están pendientes de contestar el formulario');
    expect(titulos()).toEqual(['Nombre del Alumno', 'Nombre encuesta', 'Periodo', 'Servicio']);
    expect(filas()).toEqual([['Rosa Díaz Mora', 'Satisfacción del alumno', 'primavera 2026', 'Servicio social']]);
    expect(visible('btnGenerarPDF')).toBe(true);
  });

  /**
   * Función   : generar_tabla_pendientes.js › fetchRenderTabla() (error HTTP).
   * Comprueba : que si el servidor responde con error (por ejemplo 404 cuando
   *             no hay pendientes) se avisa "Fallo en la solicitud...".
   */
  test('[fetchRenderTabla] Comprueba el aviso cuando el servidor responde error', async () => {
    await cargarPagina({ './generar_tabla_pendientes.php': () => respuesta({ error: 'No hay resultados disponibles.' }, 404) });
    await elegirFiltros();

    await clic('btnCargarPendientes');

    expect(lanzarToast).toHaveBeenCalledWith('Fallo en la solicitud de la tabla solicitada', 'error');
    expect(filas()).toHaveLength(0);
  });
});

// =====================================================================
// mostrar_respuesta_individual.js
// =====================================================================
describe('mostrar_respuesta_individual.js', () => {
  async function verRespuesta(fila = 0) {
    await cargarPagina();
    await elegirFiltros();
    await clic('btnCargarEntregados');
    $('Tabla').querySelectorAll('button')[fila].click();
    await esperarPromesas();
  }

  /**
   * Función   : mostrar_respuesta_individual.js › handleRespuestaIndividual() y renderTabla().
   * Comprueba : que "Ver respuesta" pide las respuestas de ese alumno y las
   *             muestra: calificaciones en su columna y respuestas de texto en
   *             una sola celda que abarca las 5 columnas.
   */
  test('[handleRespuestaIndividual] Comprueba la tabla de respuestas del alumno', async () => {
    await verRespuesta(1);

    expect(cuerpo('./obtener_respuesta_individual.php')).toEqual({ Id_encuesta: '4', Matricula_alumno: '20231111' });
    expect(visible('div-respuesta-individual')).toBe(true);
    expect($('Titulo-respuesta-individual').textContent)
      .toBe('Nombre de la encuesta: Satisfacción del alumnoRespuesta individual del alumno: Ana López Ruiz');
    expect(filas('Cuerpo-respuesta-individual')).toEqual([
      ['General', 'Trato recibido', '', '', '', 'Muy bien', ''],
      ['General', '¿Qué mejorarías?', 'Más horarios'],
      ['General', 'Instalaciones', 'Deficiente', '', '', '', '']
    ]);
    expect($('Cuerpo-respuesta-individual').querySelectorAll('tr')[1].querySelectorAll('td')[2].colSpan).toBe(5);
    expect(visible('btnGenerarPDFIndividual')).toBe(true);
  });

  /**
   * Función   : mostrar_respuesta_individual.js › handleRespuestaIndividual() (errores).
   * Comprueba : que si el servidor responde un error, o no hay respuestas, se avisa
   *             y se ocultan los botones individuales.
   */
  test.each([
    ['un error', () => respuesta({ error: 'Hubo un error obteniendo la respuesta individual.' }), 'Hubo un error obteniendo la respuesta individual.'],
    ['una lista vacía', () => respuesta({ ...RESPUESTA_INDIVIDUAL, respuesta_individual: [] }), 'No se encontraron Resultados'],
  ])('[handleRespuestaIndividual] Comprueba el aviso cuando el servidor responde %s', async (_d, ruta, mensaje) => {
    await cargarPagina({ './obtener_respuesta_individual.php': ruta });
    await elegirFiltros();
    await clic('btnCargarEntregados');

    $('Tabla').querySelector('button').click();
    await esperarPromesas();

    expect(lanzarToast).toHaveBeenCalledWith(mensaje, 'error');
    expect(visible('btnGenerarPDFIndividual')).toBe(false);
  });

  /**
   * Función   : mostrar_respuesta_individual.js › listeners que ocultan la respuesta individual.
   * Comprueba : que al cambiar de encuesta o dar clic en Resumen, Entregados o
   *             Pendientes se oculta y se limpia la respuesta individual.
   */
  test.each(['btnCargarResumen', 'btnCargarEntregados', 'btnCargarPendientes', 'slctEncuestas'])(
    '[limpiarTablaRespuestaIndividual] Comprueba que %s oculta la respuesta individual', async (id) => {
      await verRespuesta();

      if (id === 'slctEncuestas') $(id).dispatchEvent(new Event('change'));
      else $(id).click();

      expect(visible('div-respuesta-individual')).toBe(false);
      expect(filas('Cuerpo-respuesta-individual')).toHaveLength(0);
    });

  /**
   * Función   : mostrar_respuesta_individual.js › imprimirPDF() y obtenerDatosEncabezado().
   * Comprueba : que el PDF individual usa los datos de la encuesta (nombre,
   *             código, revisión, fecha y versión), del administrador y el
   *             periodo elegido, y se guarda como "<encuesta>_<periodo>.pdf".
   */
  test('[imprimirPDF] Comprueba el PDF de la respuesta individual', async () => {
    await verRespuesta();

    $('btnGenerarPDFIndividual').click();
    await esperarPromesas();

    expect(pdf.opciones.orientation).toBe('portrait');
    expect(pdf.textos).toEqual([
      'Universidad Autónoma de Tlaxcala', 'Satisfacción del alumno',
      'Código:', '108g-RG-14', 'Revisión:', '9001:2015', 'Fecha:', 'Noviembre 2025', 'Rev. 03',
      'Facultad o U.A.M.: ', 'FCBIyT', 'Licenciatura: ', 'Ing. en Computación',
      'Periodo: ', 'primavera 2026', 'Docente: ', 'María Soto Ríos', '\n'
    ]);
    expect(pdf.tabla.head).toEqual([['seccion', 'pregunta', 'Deficiente', 'Suficiente', 'Bien', 'Muy bien', 'Excelente']]);
    expect(pdf.tabla.body).toHaveLength(3);
    expect(pdf.guardado).toBe('Satisfacción del alumno_primavera 2026.pdf');
  });

  /**
   * Función   : mostrar_respuesta_individual.js › obtenerDatosEncabezado() (error).
   * Comprueba : que si no se obtienen los datos del administrador se avisa.
   */
  test('[obtenerDatosEncabezado] Comprueba el aviso si no se obtienen los datos del encabezado', async () => {
    await verRespuesta();
    rutas['./obtener_datos_encabezado.php'] = () => respuesta({ error: 'Administrador no encontrado' }, 404);

    $('btnGenerarPDFIndividual').click();
    await esperarPromesas();

    expect(lanzarToast).toHaveBeenCalledWith('No se pudo obtener la información del encabezado', 'error');
  });
});

// =====================================================================
// generar_pdf_encabezado.js
// =====================================================================
describe('generar_pdf_encabezado.js', () => {
  let handleImprimirPDF;
  beforeEach(async () => {
    await cargarPagina();
    handleImprimirPDF = modulos['generar_pdf_encabezado.js'].handleImprimirPDF;
  });

  /**
   * Función   : generar_pdf_encabezado.js › handleImprimirPDF() (índice inválido).
   * Comprueba : que con un índice de encabezado que no existe se avisa y no se genera el PDF.
   */
  test('[handleImprimirPDF] Comprueba el aviso con un índice inexistente', async () => {
    await handleImprimirPDF('Tabla-respuesta-individual', 3);

    expect(lanzarToast).toHaveBeenCalledWith('Encabezado con índice 3 no existe', 'error');
    expect(pdf).toBeNull();
  });

  /**
   * Función   : generar_pdf_encabezado.js › dibujarEncabezado() (logo y banner).
   * Comprueba : que si cargan el logo y el banner de la escala se agregan al
   *             PDF (el banner a lo ancho, conservando su proporción) y la tabla
   *             empieza debajo; si no cargan, el PDF se genera sin ellos.
   */
  test.each([
    ['logo y banner', ['logo.png', 'banner.png'], 2, 120],
    ['solo el logo', ['logo.png'], 1, 74],
    ['ninguna imagen', [], 0, 74],
  ])('[dibujarEncabezado] Comprueba el PDF cuando cargan: %s', async (_d, cargan, imagenes, inicioTabla) => {
    imagenesQueCargan = cargan;

    await handleImprimirPDF('Tabla-respuesta-individual', 0, 'Encuesta', null, null, null, null, null, null, 'otoño 2025');

    expect(pdf.imagenes).toHaveLength(imagenes);
    if (imagenes === 2) expect(pdf.imagenes[1].slice(1)).toEqual(['PNG', 10, 66, 190, 38]);
    expect(pdf.tabla.startY).toBe(inicioTabla);
    expect(pdf.guardado).toBe('Encuesta_otoño 2025.pdf');
  });
});

// =====================================================================
// generar_excel.js y generar_pdf.js (tabla principal)
// =====================================================================
describe('generar_excel.js y generar_pdf.js', () => {
  async function tablaEntregados() {
    await cargarPagina();
    await elegirFiltros();
    await clic('btnCargarEntregados');
  }

  /**
   * Función   : generar_excel.js › handleExportarExcel().
   * Comprueba : que el Excel se genera a partir de una copia de la tabla SIN la
   *             columna "Acción", se descarga como reporte_alumnos.xlsx y se avisa;
   *             la tabla en pantalla no cambia.
   */
  test('[handleExportarExcel] Comprueba el Excel sin la columna "Acción"', async () => {
    await tablaEntregados();

    $('btnGenerarExcel').click();

    const tablaExcel = window.XLSX.utils.table_to_book.mock.calls[0][0];
    expect([...tablaExcel.querySelectorAll('thead th')].map((th) => th.textContent.trim()))
      .toEqual(['Matricula', 'Nombre del Alumno', 'Nombre encuesta', 'Periodo', 'Servicio']);
    expect(tablaExcel.querySelector('tbody tr').querySelectorAll('td')).toHaveLength(5);
    expect(window.XLSX.writeFile).toHaveBeenCalledWith({ libro: true }, 'reporte_alumnos.xlsx');
    expect(lanzarToast).toHaveBeenCalledWith('Excel generado correctamente', 'exito');
    expect(titulos()).toContain('Acción');
  });

  /**
   * Función   : generar_pdf.js › handleImprimirPDF() (tabla principal).
   * Comprueba : que el PDF lleva el título "Reporte de Alumnos", la tabla sin
   *             la columna "Acción" y se descarga como reporte_alumnos.pdf.
   */
  test('[handleImprimirPDF] Comprueba el PDF de la tabla principal sin la columna "Acción"', async () => {
    await tablaEntregados();

    $('btnGenerarPDF').click();

    expect(pdf.opciones.orientation).toBe('landscape');
    expect(pdf.textos).toEqual(['Reporte de Alumnos']);
    expect(pdf.tabla.head).toEqual([['Matricula', 'Nombre del Alumno', 'Nombre encuesta', 'Periodo', 'Servicio']]);
    expect(pdf.tabla.body[0]).toEqual(['20232389', 'Ana López Ruiz', 'Satisfacción del alumno', 'primavera 2026', 'Servicio social']);
    expect(pdf.guardado).toBe('reporte_alumnos.pdf');
    expect(lanzarToast).toHaveBeenCalledWith('PDF generado correctamente', 'exito');
  });
});