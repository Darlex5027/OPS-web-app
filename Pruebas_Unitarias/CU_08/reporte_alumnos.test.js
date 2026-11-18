/**
 * @jest-environment jsdom
 *
 * Archivo      : reporte_alumnos.test.js
 * Módulo       : CU_08 Reporte de alumnado (Pruebas unitarias)
 * Archivos bajo prueba (en la carpeta de app/ que empieza con "CU_08"):
 *   reporte_alumnos.js
 *   generar_pdf_encabezado.js
 * Herramienta  : Jest + jsdom
 *
 * Cómo correrlo (desde OPS-web-app):
 *   npx jest Pruebas_Unitarias/CU_08 --verbose
 *
 * Descripción  : Se usa el HTML real (reporte_alumnos.html) y se simulan las
 *                respuestas de los PHP con un mock de fetch. También se simulan
 *                jsPDF + autoTable y SheetJS (en la página llegan de un CDN) y la
 *                carga del logo (Image + canvas). Los JS son módulos; la prueba
 *                los conecta en memoria y sustituye lanzar_toast.js, cookie.js y
 *                menu.js de ../js/ por simuladores. El código original NO se modifica.
 *
 * Cada prueba indica:
 *   - Función   : archivo › función que se prueba.
 *   - Comprueba : qué comportamiento se verifica.
 */
const fs = require('fs');
const path = require('path');

const RUTA_APPS = path.resolve(__dirname, '../../app');
const CARPETA = fs.readdirSync(RUTA_APPS).find((d) => d.startsWith('CU_08'));
if (!CARPETA) throw new Error(`No se encontró ninguna carpeta que empiece con "CU_08" dentro de ${RUTA_APPS}`);
const RUTA_APP = path.join(RUTA_APPS, CARPETA);
const HTML = fs.readFileSync(path.join(RUTA_APP, 'reporte_alumnos.html'), 'utf8');
const BODY = HTML.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1].replace(/<script[\s\S]*?<\/script>/gi, '');

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
const CATALOGOS = {
  servicios: [{ Id_servicio: 1, Servicio: 'Prácticas profesionales' }, { Id_servicio: 2, Servicio: 'Servicio social' }],
  estados: [{ Estado: 'EN_CURSO' }, { Estado: 'COMPLETADO' }],
  periodo_tipo: [{ periodo_tipo: 'primavera' }, { periodo_tipo: 'otoño' }],
  periodo_anio: [{ 'periodo_año': 2025 }, { 'periodo_año': 2026 }],
  grupos: [{ grupo: 'A' }, { grupo: 'B' }]
};

const REPORTE = [
  { Servicio: 'Servicio social', No_expediente: 'EXP-1', grupo: '7A', Nombre: 'Ana López Ruiz', 'Nombre Carrera': 'Ing. en Computación',
    Empresa: 'Acme', Area: 'Sistemas', Programa: 'Apoyo TI', Estado: 'EN_CURSO', periodo_tipo: 'primavera', 'periodo_año': 2026,
    Fecha_inicio: '2026-02-01', Fecha_fin: '2026-06-30' },
  { Servicio: 'Prácticas profesionales', No_expediente: null, grupo: '6B', Nombre: 'Luis Pérez Gómez', 'Nombre Carrera': 'Ing. en Computación',
    Empresa: null, Area: null, Programa: null, Estado: 'COMPLETADO', periodo_tipo: 'otoño', 'periodo_año': 2025,
    Fecha_inicio: null, Fecha_fin: null }
];

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
    this.internal = { pageSize: { getWidth: () => 297 } };
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

let logoCarga; // 'ok' o 'error'

/** Image simulada: al poner src dispara onload u onerror según logoCarga. */
class ImagenSimulada {
  constructor() { this.naturalWidth = 100; this.naturalHeight = 120; }
  set src(url) {
    this._src = url;
    Promise.resolve().then(() => (logoCarga === 'ok' ? this.onload() : this.onerror()));
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

function respuesta(json, status = 200) {
  return Promise.resolve({ status, ok: status >= 200 && status < 300, json: () => Promise.resolve(JSON.parse(JSON.stringify(json))) });
}

async function esperarPromesas() {
  for (let i = 0; i < 60; i++) await Promise.resolve();
}

function borrarCookies() {
  document.cookie.split('; ').filter(Boolean).forEach((c) => {
    document.cookie = `${c.split('=')[0]}=; max-age=0; path=/`;
  });
}

/** Carga reporte_alumnos.html y su JS como lo haría el navegador. */
async function cargarPagina(tipo = '3', cambios = {}) {
  borrarCookies();
  document.cookie = `Id_tipo_usuario=${tipo}; path=/`;
  document.cookie = 'Id_usuario=4; path=/';
  document.body.innerHTML = BODY;

  rutas = {
    './obtener_catalogos.php': () => respuesta(CATALOGOS),
    './reporte_alumnos.php': () => respuesta(REPORTE),
    './obtener_datos_encabezado.php': () => respuesta(ENCABEZADO),
    ...cambios
  };
  global.fetch = jest.fn((url, opciones) => rutas[url](opciones));

  modulos = {};
  importar('./reporte_alumnos.js');

  document.dispatchEvent(new Event('DOMContentLoaded'));
  await esperarPromesas();
}

const $ = (id) => document.getElementById(id);
const opciones = (id) => [...$(id).options].map((o) => [o.value, o.text]);
const llamadasA = (archivo) => fetch.mock.calls.filter((c) => c[0] === archivo);
const encabezados = () => [...$('titulos-tabla').querySelectorAll('th')].map((th) => th.textContent);
const filasTabla = () => [...$('Tabla').querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent));
const visible = (id) => $(id).style.display !== 'none';
const avisosNavegacion = () => console.error.mock.calls
  .map((a) => String((a[0] && a[0].message) || a[0])).filter((t) => t.includes('navigation'));

async function generarTabla() {
  $('btnGenerarTabla').click();
  await esperarPromesas();
}

async function generarPDF() {
  $('btnGenerarPDF').click();
  await esperarPromesas();
}

// =====================================================================
// PREPARACIÓN DE CADA PRUEBA
// =====================================================================
beforeEach(() => {
  lanzarToast = jest.fn();
  renderMenu = jest.fn();
  externos = {
    'lanzar_toast.js': { lanzarToast },
    'cookie.js': { obtenerCookie: (n) => document.cookie.split('; ').find((c) => c.startsWith(`${n}=`))?.split('=')[1] },
    'menu.js': { renderMenu }
  };
  pdf = null;
  logoCarga = 'ok';
  window.jspdf = { jsPDF: JsPDFSimulado };
  window.XLSX = { utils: { table_to_book: jest.fn(() => ({ libro: true })) }, writeFile: jest.fn() };
  global.Image = ImagenSimulada;
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({ drawImage: jest.fn() }));
  jest.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => 'data:image/png;base64,LOGO');
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});

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
// reporte_alumnos.js
// =====================================================================
describe('reporte_alumnos.js', () => {

  describe('Función: listener "DOMContentLoaded" y cargar_catalogos()', () => {
    /**
     * Función   : reporte_alumnos.js › listener "DOMContentLoaded".
     * Comprueba : que un alumno (tipo 2) es enviado a su perfil sin cargar nada.
     */
    test('[DOMContentLoaded] Comprueba que un alumno es enviado a su perfil', async () => {
      await cargarPagina('2');

      expect(avisosNavegacion().length).toBeGreaterThan(0);
      expect(renderMenu).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    });

    /**
     * Función   : reporte_alumnos.js › cargar_catalogos().
     * Comprueba : que al cargar se dibuja el menú y se llenan los 5 filtros
     *             (actividad, estado, periodo, año y grupo) después de "Todos".
     */
    test('[cargar_catalogos] Comprueba que llena los 5 filtros', async () => {
      await cargarPagina('3');

      expect(renderMenu).toHaveBeenCalled();
      expect(opciones('actividad')).toEqual([['TODOS', '--Todas--'], ['1', 'Prácticas profesionales'], ['2', 'Servicio social']]);
      expect(opciones('estado')).toEqual([['TODOS', '--Todas--'], ['EN_CURSO', 'EN_CURSO'], ['COMPLETADO', 'COMPLETADO']]);
      expect(opciones('periodo_tipo')).toEqual([['TODOS', '--Todos los periodos--'], ['primavera', 'primavera'], ['otoño', 'otoño']]);
      expect(opciones('periodo_anio')).toEqual([['TODOS', '--Todos los años--'], ['2025', '2025'], ['2026', '2026']]);
      expect(opciones('grupo')).toEqual([['TODOS', '--Todos los grupos--'], ['A', 'A'], ['B', 'B']]);
    });

    /**
     * Función   : reporte_alumnos.js › cargar_catalogos() (errores).
     * Comprueba : que si el servidor responde error se avisa y los filtros se
     *             quedan solo con "Todos".
     */
    test('[cargar_catalogos] Comprueba el aviso cuando fallan los catálogos', async () => {
      await cargarPagina('3', { './obtener_catalogos.php': () => respuesta({ error: 'Hubo un error consultando los catálogos' }, 500) });

      expect(lanzarToast).toHaveBeenCalledWith('Fallo en la solicitud de catálogos', 'error');
      expect(lanzarToast).toHaveBeenCalledWith('Hubo un error consultando los catálogos', 'error');
      expect(opciones('actividad')).toHaveLength(1);
    });
  });

  describe('Función: cargar_tabla() y fetchDatosTabla()', () => {
    /**
     * Función   : reporte_alumnos.js › fetchDatosTabla().
     * Comprueba : que "Generar Tabla" manda a reporte_alumnos.php los filtros elegidos.
     */
    test('[fetchDatosTabla] Comprueba que envía los filtros elegidos', async () => {
      await cargarPagina('3');
      $('actividad').value = '2';
      $('periodo_tipo').value = 'primavera';
      $('grupo').value = 'A';

      await generarTabla();

      expect(llamadasA('./reporte_alumnos.php')[0][1].method).toBe('POST');
      expect(JSON.parse(llamadasA('./reporte_alumnos.php')[0][1].body)).toEqual({
        actividad: '2', estado: 'TODOS', periodo_tipo: 'primavera', periodo_anio: 'TODOS', grupo: 'A'
      });
    });

    /**
     * Función   : reporte_alumnos.js › cargar_tabla().
     * Comprueba : que los encabezados salen de los nombres de las columnas, cada
     *             alumno es una fila, los vacíos (null) se muestran como "—" y
     *             aparecen los botones de Excel y PDF.
     */
    test('[cargar_tabla] Comprueba la tabla generada y los botones de exportar', async () => {
      await cargarPagina('3');

      await generarTabla();

      expect(encabezados()).toEqual(Object.keys(REPORTE[0]));
      expect(filasTabla()).toEqual([
        ['Servicio social', 'EXP-1', '7A', 'Ana López Ruiz', 'Ing. en Computación', 'Acme', 'Sistemas', 'Apoyo TI', 'EN_CURSO', 'primavera', '2026', '2026-02-01', '2026-06-30'],
        ['Prácticas profesionales', '—', '6B', 'Luis Pérez Gómez', 'Ing. en Computación', '—', '—', '—', 'COMPLETADO', 'otoño', '2025', '—', '—']
      ]);
      expect(visible('btnGenerarExcel')).toBe(true);
      expect(visible('btnGenerarPDF')).toBe(true);
      expect(lanzarToast).toHaveBeenCalledWith('Reporte generado correctamente', 'exito');
    });

    /**
     * Función   : reporte_alumnos.js › cargar_tabla() (sin resultados).
     * Comprueba : que sin resultados se avisa, la tabla queda vacía y se ocultan
     *             los botones de exportar (aunque antes hubiera una tabla).
     */
    test('[cargar_tabla] Comprueba que sin resultados limpia la tabla y oculta los botones', async () => {
      await cargarPagina('3');
      await generarTabla();
      rutas['./reporte_alumnos.php'] = () => respuesta([]);

      await generarTabla();

      expect(lanzarToast).toHaveBeenCalledWith('No se encontraron Resultados', 'error');
      expect(filasTabla()).toHaveLength(0);
      expect(encabezados()).toHaveLength(0);
      expect(visible('btnGenerarExcel')).toBe(false);
      expect(visible('btnGenerarPDF')).toBe(false);
    });

    /**
     * Función   : reporte_alumnos.js › cargar_tabla() (error del servidor).
     * Comprueba : que si el servidor responde un error se muestra y no se
     *             ofrecen los botones de exportar.
     */
    test('[cargar_tabla] Comprueba el aviso cuando el servidor responde error', async () => {
      await cargarPagina('3', { './reporte_alumnos.php': () => respuesta({ error: 'Hubo un error ejecutando la consulta' }, 500) });

      await generarTabla();

      expect(lanzarToast).toHaveBeenCalledWith('Fallo en la solicitud del reporte', 'error');
      expect(lanzarToast).toHaveBeenCalledWith('Hubo un error ejecutando la consulta', 'error');
      expect(visible('btnGenerarPDF')).toBe(false);
    });
  });

  describe('Función: exportarExcel()', () => {
    /**
     * Función   : reporte_alumnos.js › exportarExcel().
     * Comprueba : que "Generar Excel" convierte la tabla de resultados en un
     *             libro de Excel y lo descarga como reporte_alumnos.xlsx.
     */
    test('[exportarExcel] Comprueba que descarga la tabla como reporte_alumnos.xlsx', async () => {
      await cargarPagina('3');
      await generarTabla();

      $('btnGenerarExcel').click();

      expect(window.XLSX.utils.table_to_book).toHaveBeenCalledWith($('tabla-resultados'));
      expect(window.XLSX.writeFile).toHaveBeenCalledWith({ libro: true }, 'reporte_alumnos.xlsx');
    });

    /**
     * Función   : reporte_alumnos.js › exportarExcel() (bloque catch).
     * Comprueba : que si falla la exportación se avisa "Error al exportar a Excel".
     */
    test('[exportarExcel] Comprueba el aviso si falla la exportación', async () => {
      await cargarPagina('3');
      window.XLSX.writeFile.mockImplementation(() => { throw new Error('x'); });

      $('btnGenerarExcel').click();

      expect(lanzarToast).toHaveBeenCalledWith('Error al exportar a Excel', 'error');
    });
  });

  describe('Función: imprimirPDF() y obtenerDatosEncabezado()', () => {
    /**
     * Función   : reporte_alumnos.js › imprimirPDF() y obtenerDatosEncabezado().
     * Comprueba : que el PDF lleva la facultad, carrera y nombre del docente que
     *             regresa obtener_datos_encabezado.php, el periodo y el grupo elegidos.
     */
    test('[imprimirPDF] Comprueba que el PDF lleva los datos del encabezado y los filtros', async () => {
      await cargarPagina('3');
      $('periodo_tipo').value = 'primavera';
      $('periodo_anio').value = '2026';
      $('grupo').value = 'A';
      await generarTabla();

      await generarPDF();

      expect(llamadasA('./obtener_datos_encabezado.php')).toHaveLength(1);
      expect(pdf.textos).toEqual(expect.arrayContaining(['FCBIyT', 'Ing. en Computación', 'primavera 2026', 'A', 'María Soto Ríos']));
      expect(pdf.textos).toEqual(expect.arrayContaining([
        'INFORME DE ACTIVIDADES REALIZADAS DE', 'SERVICIO SOCIAL', 'CONTROL DE EXPEDIENTE DE SERVICIO SOCIAL', '108a-RG-08', '9001:2015'
      ]));
      expect(pdf.guardado).toBe('reporte_alumnos.pdf');
    });

    /**
     * Función   : reporte_alumnos.js › imprimirPDF() (grupo "TODOS").
     * Comprueba : que si no se filtra por grupo, en el PDF aparece la lista de
     *             todos los grupos del catálogo.
     */
    test('[imprimirPDF] Comprueba que con "Todos los grupos" se listan todos los grupos', async () => {
      await cargarPagina('3');
      await generarTabla();

      await generarPDF();

      expect(pdf.textos).toContain('A,B,');
    });

    /**
     * Función   : reporte_alumnos.js › obtenerDatosEncabezado() (error).
     * Comprueba : que si no se obtienen los datos del encabezado se avisa (el PDF
     *             se genera igual, sin facultad, carrera ni docente).
     */
    test('[obtenerDatosEncabezado] Comprueba el aviso si no se obtienen los datos del encabezado', async () => {
      await cargarPagina('3', { './obtener_datos_encabezado.php': () => respuesta({ error: 'Administrador no encontrado' }, 404) });
      await generarTabla();

      await generarPDF();

      expect(lanzarToast).toHaveBeenCalledWith('No se pudo obtener la información del encabezado', 'error');
      expect(pdf.textos).not.toContain('FCBIyT');
    });
  });
});

// =====================================================================
// generar_pdf_encabezado.js
// =====================================================================
describe('generar_pdf_encabezado.js', () => {
  let handleImprimirPDF;
  beforeEach(async () => {
    await cargarPagina('3');
    await generarTabla();
    handleImprimirPDF = modulos['generar_pdf_encabezado.js'].handleImprimirPDF;
  });

  /**
   * Función   : generar_pdf_encabezado.js › handleImprimirPDF() (índice inválido).
   * Comprueba : que si se pide un encabezado que no existe se avisa y no se genera el PDF.
   */
  test('[handleImprimirPDF] Comprueba el aviso con un índice de encabezado inexistente', async () => {
    await handleImprimirPDF('tabla-resultados', 5);

    expect(lanzarToast).toHaveBeenCalledWith('Encabezado con índice 5 no existe', 'error');
    expect(pdf).toBeNull();
  });

  /**
   * Función   : generar_pdf_encabezado.js › handleImprimirPDF() y dibujarEncabezado() (valores por defecto).
   * Comprueba : que sin datos extra el encabezado usa CONFIG_ENCABEZADO
   *             (institución, título, código, revisión, fecha y versión) y deja
   *             los campos Facultad, Licenciatura, Periodo, Grupo y Docente en blanco.
   */
  test('[dibujarEncabezado] Comprueba el encabezado con los valores por defecto', async () => {
    await handleImprimirPDF('tabla-resultados', 0);

    expect(pdf.opciones).toEqual({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    expect(pdf.textos).toEqual([
      'Universidad Autónoma de Tlaxcala',
      'INFORME DE ACTIVIDADES REALIZADAS DE SERVICIO SOCIAL', 'CONTROL DE EXPEDIENTE DE SERVICIO SOCIAL',
      'Código:', '108g-RG-08', 'Revisión:', '9001-2015', 'Fecha:', 'Noviembre 2024', 'Rev. 02',
      'Facultad o U.A.M.: ', 'Licenciatura: ', 'Periodo: ', 'Grupo: ', 'Docente: ', '\n'
    ]);
  });

  /**
   * Función   : generar_pdf_encabezado.js › handleImprimirPDF() (sobreescribir valores).
   * Comprueba : que los datos que se pasan reemplazan a los de CONFIG_ENCABEZADO
   *             y se escriben junto a su etiqueta.
   */
  test('[handleImprimirPDF] Comprueba que los datos recibidos reemplazan a los de por defecto', async () => {
    await handleImprimirPDF('tabla-resultados', 0, 'TÍTULO UNO\nTÍTULO DOS', 'COD-1', 'REV-1', 'Enero 2026', '05',
      'FCBIyT', 'Ing. Química', 'otoño 2025', '7B', 'Ana Docente');

    expect(pdf.textos).toEqual([
      'Universidad Autónoma de Tlaxcala', 'TÍTULO UNO', 'TÍTULO DOS',
      'Código:', 'COD-1', 'Revisión:', 'REV-1', 'Fecha:', 'Enero 2026', 'Rev. 05',
      'Facultad o U.A.M.: ', 'FCBIyT', 'Licenciatura: ', 'Ing. Química',
      'Periodo: ', 'otoño 2025', 'Grupo: ', '7B', 'Docente: ', 'Ana Docente', '\n'
    ]);
  });

  /**
   * Función   : generar_pdf_encabezado.js › handleImprimirPDF() (tabla del PDF).
   * Comprueba : que la tabla del PDF toma los encabezados de #titulos-tabla y
   *             las filas de #Tabla, empieza debajo del encabezado y se guarda
   *             como reporte_alumnos.pdf avisando al usuario.
   */
  test('[handleImprimirPDF] Comprueba la tabla del PDF, su posición y el nombre del archivo', async () => {
    await handleImprimirPDF('tabla-resultados', 0);

    expect(pdf.tabla.head).toEqual([Object.keys(REPORTE[0])]);
    expect(pdf.tabla.body).toEqual(filasTabla());
    expect(pdf.tabla.theme).toBe('plain');
    expect(pdf.tabla.startY).toBe(67);
    expect(pdf.guardado).toBe('reporte_alumnos.pdf');
    expect(lanzarToast).toHaveBeenCalledWith('PDF generado correctamente', 'exito');
  });

  /**
   * Función   : generar_pdf_encabezado.js › cargarImagenBase64() y dibujarEncabezado() (logo).
   * Comprueba : que si el logo carga se dibuja en el PDF, y si no carga el PDF
   *             se genera igual, sin logo.
   */
  test.each([
    ['carga', 'ok', 1],
    ['no carga', 'error', 0],
  ])('[cargarImagenBase64] Comprueba el PDF cuando el logo %s', async (_d, carga, imagenes) => {
    logoCarga = carga;

    await handleImprimirPDF('tabla-resultados', 0);

    expect(pdf.imagenes).toHaveLength(imagenes);
    if (imagenes) expect(pdf.imagenes[0].slice(0, 2)).toEqual(['data:image/png;base64,LOGO', 'PNG']);
    expect(pdf.guardado).toBe('reporte_alumnos.pdf');
  });
});