/**
 * @jest-environment jsdom
 *
 * Archivo      : visualizar_vacantes.test.js
 * Módulo       : CU_04_VisualizarVacantes (Pruebas unitarias)
 * Archivo bajo prueba : app/CU_04_VisualizarVacantes/visualizar_vacantes.js
 * Herramienta  : Jest + jsdom
 *
 * Cómo correrlo (desde OPS-web-app):
 *   npx jest Pruebas_Unitarias/CU_04 --verbose
 *
 * Descripción  : Se usa el HTML real (visualizar_vacantes.html) y se simulan las
 *                respuestas de los PHP con un mock de fetch. El JS es un módulo
 *                que importa lanzar_toast.js, cookie.js y menu.js de ../js/; la
 *                prueba los sustituye por simuladores. También se simula jsPDF,
 *                que en la página llega desde un CDN. El código original NO se
 *                modifica.
 *
 * Cada prueba indica:
 *   - Función   : función de visualizar_vacantes.js que se prueba.
 *   - Comprueba : qué comportamiento se verifica.
 */
const fs = require('fs');
const path = require('path');

const RUTA_APP = path.resolve(__dirname, '../../app/CU_04_Visualizar_Vacantes');
const HTML = fs.readFileSync(path.join(RUTA_APP, 'visualizar_vacantes.html'), 'utf8');
const BODY = HTML.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
const CODIGO = fs.readFileSync(path.join(RUTA_APP, 'visualizar_vacantes.js'), 'utf8');

// =====================================================================
// CARGADOR DEL MÓDULO (no es una prueba)
// Convierte los "import { x } from '../js/...'" en simuladores.
// =====================================================================
function transformar(codigo) {
  const js = codigo.replace(
    /import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"];?/g,
    (_, nombres, ruta) => `const { ${nombres.trim()} } = __importar(${JSON.stringify(ruta)});`
  );
  return `"use strict";\n${js}`;
}

// =====================================================================
// DATOS SIMULADOS
// =====================================================================
const VACANTE_COMPLETA = {
  Id_vacante: 1, Titulo: 'desarrollador web', Descripcion: 'Apoyo en sitio web',
  Requisitos: 'HTML, CSS y JS', Contacto_nombre: 'María Soto', Contacto_email: 'maria@acme.mx',
  Contacto_telefono: '246-123-4567', Fecha_publicacion: '2026-11-01', Fecha_expiracion: '2026-12-15',
  Flyer_Path: '/home/uploads/Flyers/vacante1.png', Id_servicio: 2, Empresa: 'Acme', Servicio: 'Servicio social'
};
const VACANTE_SIMPLE = {
  Id_vacante: 2, Titulo: 'Soporte técnico', Descripcion: null, Requisitos: null,
  Contacto_nombre: null, Contacto_email: null, Contacto_telefono: null,
  Fecha_publicacion: '2026-10-20', Fecha_expiracion: null, Flyer_Path: null,
  Id_servicio: 1, Empresa: null, Servicio: null
};
const SERVICIOS = [{ Id_servicio: 1, Servicio: 'Prácticas profesionales' }, { Id_servicio: 2, Servicio: 'Servicio social' }];

// =====================================================================
// FUNCIONES DE APOYO (no son pruebas)
// =====================================================================
let lanzarToast;
let renderMenu;
let rutas;
let listeners;
let pdf;

function respuesta(json, status = 200) {
  return Promise.resolve({ status, ok: status >= 200 && status < 300, json: () => Promise.resolve(json) });
}

async function esperarPromesas() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

function borrarCookies() {
  document.cookie.split('; ').filter(Boolean).forEach((c) => {
    document.cookie = `${c.split('=')[0]}=; max-age=0; path=/`;
  });
}

/** Simulador de jsPDF: anota todo lo que se escribe en el documento. */
class JsPDFSimulado {
  constructor() { this.textos = []; this.guardado = null; pdf = this; }
  setFontSize() {}
  setFont() {}
  setTextColor() {}
  text(t) { this.textos.push(Array.isArray(t) ? t.join(' ') : t); }
  splitTextToSize(t) { return [t]; }
  save(nombre) { this.guardado = nombre; }
}

/**
 * Carga visualizar_vacantes.html y su JS como lo haría el navegador.
 * @param {object} cookies   Cookies de la sesión (Id_usuario, Id_tipo_usuario)
 * @param {object} cambios   Respuestas simuladas distintas por archivo PHP
 */
async function cargarPagina(cookies = { Id_usuario: '7', Id_tipo_usuario: '3' }, cambios = {}) {
  borrarCookies();
  Object.entries(cookies).forEach(([k, v]) => { document.cookie = `${k}=${v}; path=/`; });
  document.body.innerHTML = BODY;

  rutas = {
    'obtener_vacantes.php': () => respuesta([VACANTE_COMPLETA, VACANTE_SIMPLE]),
    '../CU_06_PublicarVacantes/obtener_servicios.php': () => respuesta(SERVICIOS),
    'eliminar_vacante.php': () => respuesta({ success: true, mensaje: 'Vacante eliminada correctamente' }),
    ...cambios
  };
  global.fetch = jest.fn((url, opciones) => rutas[url](opciones));

  const externos = {
    'lanzar_toast.js': { lanzarToast },
    'cookie.js': {
      obtenerCookie: (nombre) => document.cookie.split('; ').find((c) => c.startsWith(`${nombre}=`))?.split('=')[1]
    },
    'menu.js': { renderMenu }
  };
  // eslint-disable-next-line no-new-func
  new Function('__importar', transformar(CODIGO))((ruta) => externos[path.basename(ruta)]);

  document.dispatchEvent(new Event('DOMContentLoaded'));
  await esperarPromesas();
}

const $ = (id) => document.getElementById(id);
const tarjetas = () => [...document.querySelectorAll('.foro-tarjeta')];
const titulos = () => tarjetas().map((t) => t.querySelector('.tarjeta-titulo').textContent);
const confirmacion = () => $('modal-confirmacion');
const caja = () => $('modal-caja');
const llamadaA = (archivo) => fetch.mock.calls.find((c) => c[0] === archivo);
const avisosNavegacion = () => console.error.mock.calls
  .map((a) => String((a[0] && a[0].message) || a[0])).filter((t) => t.includes('navigation'));

// =====================================================================
// PREPARACIÓN DE CADA PRUEBA
// =====================================================================
beforeEach(() => {
  lanzarToast = jest.fn();
  renderMenu = jest.fn();
  pdf = null;
  window.jspdf = { jsPDF: JsPDFSimulado };
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
  jest.useRealTimers();
  jest.restoreAllMocks();
  delete global.fetch;
  borrarCookies();
});

// =====================================================================
describe('visualizar_vacantes.js', () => {

  // ===================================================================
  describe('Función: inicialización (DOMContentLoaded)', () => {
    /**
     * Función   : listener "DOMContentLoaded".
     * Comprueba : que dibuja el menú y pide las vacantes y los servicios.
     */
    test('[DOMContentLoaded] Comprueba que dibuja el menú y carga vacantes y servicios', async () => {
      await cargarPagina();

      expect(renderMenu).toHaveBeenCalledTimes(1);
      expect(llamadaA('obtener_vacantes.php')).toBeDefined();
      expect(llamadaA('../CU_06_PublicarVacantes/obtener_servicios.php')).toBeDefined();
    });

    /**
     * Función   : listener "DOMContentLoaded" (sin Id_usuario).
     * Comprueba : que sin sesión redirige al login y no pide datos.
     */
    test('[DOMContentLoaded] Comprueba que sin sesión redirige al login sin pedir datos', async () => {
      await cargarPagina({});

      expect(avisosNavegacion().length).toBeGreaterThan(0);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  // ===================================================================
  describe('Función: fetchVacantes() y renderVacantes()', () => {
    /**
     * Función   : fetchVacantes() y renderVacantes().
     * Comprueba : que se dibuja una tarjeta por vacante y el contador dice cuántas hay.
     */
    test('[renderVacantes] Comprueba que dibuja las tarjetas y el contador en plural', async () => {
      await cargarPagina();

      expect(tarjetas()).toHaveLength(2);
      expect($('contador-resultados').textContent).toBe('2 vacantes encontradas');
      expect($('sin-resultados').classList.contains('oculto')).toBe(true);
    });

    /**
     * Función   : renderVacantes() (sufijo).
     * Comprueba : que con una sola vacante el contador va en singular.
     */
    test('[renderVacantes] Comprueba que con una vacante el contador va en singular', async () => {
      await cargarPagina(undefined, { 'obtener_vacantes.php': () => respuesta([VACANTE_COMPLETA]) });

      expect($('contador-resultados').textContent).toBe('1 vacante encontrada');
    });

    /**
     * Función   : renderVacantes() (lista vacía).
     * Comprueba : que sin vacantes se muestra el mensaje de "No se encontraron" y "Sin resultados".
     */
    test('[renderVacantes] Comprueba que sin vacantes muestra "Sin resultados"', async () => {
      await cargarPagina(undefined, { 'obtener_vacantes.php': () => respuesta([]) });

      expect(tarjetas()).toHaveLength(0);
      expect($('contador-resultados').textContent).toBe('Sin resultados');
      expect($('sin-resultados').classList.contains('oculto')).toBe(false);
    });

    /**
     * Función   : fetchVacantes() (respuesta 401).
     * Comprueba : que si la sesión expiró avisa y a los 3 segundos manda al login.
     */
    test('[fetchVacantes] Comprueba que con sesión expirada (401) avisa y redirige al login', async () => {
      jest.useFakeTimers();
      await cargarPagina(undefined, { 'obtener_vacantes.php': () => respuesta({ success: false }, 401) });

      expect(lanzarToast).toHaveBeenCalledWith('La sesión expiró', 'error');
      expect(tarjetas()).toHaveLength(0);
      console.error.mockClear();
      jest.advanceTimersByTime(3000);
      expect(avisosNavegacion().length).toBeGreaterThan(0);
    });

    /**
     * Función   : fetchVacantes() (bloque catch).
     * Comprueba : que si el servidor falla se avisa y el contador dice "Error al cargar."
     */
    test.each([
      ['un error 500', () => respuesta({ success: false }, 500)],
      ['un fallo de red', () => Promise.reject(new Error('Failed to fetch'))],
    ])('[fetchVacantes] Comprueba el aviso de error ante %s', async (_d, ruta) => {
      await cargarPagina(undefined, { 'obtener_vacantes.php': ruta });

      expect(lanzarToast).toHaveBeenCalledWith('No se pudieron cargar las vacantes', 'error');
      expect($('contador-resultados').textContent).toBe('Error al cargar.');
    });
  });

  // ===================================================================
  describe('Función: fetchServicios()', () => {
    /**
     * Función   : fetchServicios().
     * Comprueba : que los servicios se agregan al filtro después de "Todos los servicios".
     */
    test('[fetchServicios] Comprueba que llena el filtro de servicios', async () => {
      await cargarPagina();

      expect([...$('filtro-servicio').options].map((o) => [o.value, o.text])).toEqual([
        ['', 'Todos los servicios'], ['1', 'Prácticas profesionales'], ['2', 'Servicio social']
      ]);
    });

    /**
     * Función   : fetchServicios() (bloque catch).
     * Comprueba : que si fallan los servicios se registra el error y el filtro
     *             se queda solo con "Todos los servicios".
     */
    test('[fetchServicios] Comprueba que si fallan los servicios no se rompe la página', async () => {
      await cargarPagina(undefined, { '../CU_06_PublicarVacantes/obtener_servicios.php': () => Promise.reject(new Error('x')) });

      expect(console.error).toHaveBeenCalledWith('Error al cargar servicios');
      expect($('filtro-servicio').options).toHaveLength(1);
      expect(tarjetas()).toHaveLength(2);
    });
  });

  // ===================================================================
  describe('Función: crearTarjeta() y sus partes', () => {
    beforeEach(async () => { await cargarPagina(); });

    /**
     * Función   : crearIconoLetra(), crearCabezaTarjeta() y crearEmpresaTarjeta().
     * Comprueba : que la tarjeta muestra la inicial del título en mayúscula, el
     *             título, el servicio y la empresa.
     */
    test('[crearTarjeta] Comprueba la inicial, título, servicio y empresa de la tarjeta', () => {
      const t = tarjetas()[0];

      expect(t.querySelector('.icono-letra').textContent).toBe('D');
      expect(t.querySelector('.tarjeta-titulo').textContent).toBe('desarrollador web');
      expect(t.querySelector('.tarjeta-badge').textContent).toBe('Servicio social');
      expect(t.querySelector('.tarjeta-empresa').textContent).toBe('Empresa: Acme');
    });

    /**
     * Función   : crearCabezaTarjeta() y crearEmpresaTarjeta() (valores vacíos).
     * Comprueba : que si faltan servicio o empresa se muestran "Sin servicio" y "No especificada".
     */
    test('[crearTarjeta] Comprueba los textos por defecto cuando faltan datos', () => {
      const t = tarjetas()[1];

      expect(t.querySelector('.tarjeta-badge').textContent).toBe('Sin servicio');
      expect(t.querySelector('.tarjeta-empresa').textContent).toBe('Empresa: No especificada');
    });

    /**
     * Función   : crearSeccionDerecha() / crearDescripcionTarjeta().
     * Comprueba : que la descripción solo aparece si la vacante tiene una.
     */
    test('[crearDescripcionTarjeta] Comprueba que la descripción solo aparece si existe', () => {
      expect(tarjetas()[0].querySelector('.tarjeta-desc').textContent).toBe('Apoyo en sitio web');
      expect(tarjetas()[1].querySelector('.tarjeta-desc')).toBeNull();
    });

    /**
     * Función   : crearFooterTarjeta() y formatearFecha().
     * Comprueba : que las fechas se muestran como dd/mm/aaaa y una fecha vacía como "—".
     */
    test('[crearFooterTarjeta / formatearFecha] Comprueba el formato de las fechas', () => {
      expect(tarjetas()[0].querySelector('.tarjeta-fecha').textContent).toBe('📅 Publicado: 01/11/2026');
      expect(tarjetas()[0].querySelector('.tarjeta-expira').textContent).toBe('⏳ Expira: 15/12/2026');
      expect(tarjetas()[1].querySelector('.tarjeta-expira').textContent).toBe('⏳ Expira: —');
    });
  });

  // ===================================================================
  describe('Función: canEliminar (permisos)', () => {
    /**
     * Función   : canEliminar / crearBotonEliminarTarjeta().
     * Comprueba : que solo administradores (1) y coordinadores (3) ven el botón
     *             de eliminar en las tarjetas; los alumnos (2) no.
     */
    test.each([['1', true], ['3', true], ['2', false]])(
      '[canEliminar] Comprueba que con Id_tipo_usuario=%s el botón eliminar visible=%s', async (tipo, visible) => {
        await cargarPagina({ Id_usuario: '7', Id_tipo_usuario: tipo });

        expect(tarjetas()[0].querySelector('.btn-eliminar-tarjeta') !== null).toBe(visible);
      });
  });

  // ===================================================================
  describe('Función: onChangeFiltrarServicio()', () => {
    /**
     * Función   : onChangeFiltrarServicio().
     * Comprueba : que al elegir un servicio solo quedan sus vacantes y que
     *             "Todos los servicios" vuelve a mostrar todas.
     */
    test('[onChangeFiltrarServicio] Comprueba que filtra por servicio y luego muestra todas', async () => {
      await cargarPagina();

      $('filtro-servicio').value = '1';
      $('filtro-servicio').dispatchEvent(new Event('change'));
      expect(titulos()).toEqual(['Soporte técnico']);
      expect($('contador-resultados').textContent).toBe('1 vacante encontrada');

      $('filtro-servicio').value = '';
      $('filtro-servicio').dispatchEvent(new Event('change'));
      expect(titulos()).toEqual(['desarrollador web', 'Soporte técnico']);
    });
  });

  // ===================================================================
  describe('Función: confirmarEliminar(), mostrarConfirmacion() y eliminarVacanteEnServidor()', () => {
    beforeEach(async () => { await cargarPagina(); });

    /**
     * Función   : crearBotonEliminarTarjeta() y mostrarConfirmacion().
     * Comprueba : que el botón de basura pide confirmación y NO abre el detalle.
     */
    test('[mostrarConfirmacion] Comprueba que eliminar pide confirmación sin abrir el detalle', () => {
      tarjetas()[0].querySelector('.btn-eliminar-tarjeta').click();

      expect(confirmacion().querySelector('.confirm-texto').textContent)
        .toBe('¿Seguro que deseas eliminar esta vacante? Esta acción no se puede deshacer.');
      expect($('modal-overlay').classList.contains('oculto')).toBe(true);
    });

    /**
     * Función   : mostrarConfirmacion() (Cancelar y clic fuera).
     * Comprueba : que "Cancelar" o un clic en el fondo cierran la confirmación
     *             sin eliminar nada.
     */
    test.each([
      ['Cancelar', () => confirmacion().querySelector('.confirm-btn-cancelar').click()],
      ['un clic en el fondo', () => confirmacion().click()],
    ])('[mostrarConfirmacion] Comprueba que %s cierra sin eliminar', (_d, accion) => {
      tarjetas()[0].querySelector('.btn-eliminar-tarjeta').click();

      accion();

      expect(confirmacion()).toBeNull();
      expect(llamadaA('eliminar_vacante.php')).toBeUndefined();
    });

    /**
     * Función   : mostrarConfirmacion() (reemplazo).
     * Comprueba : que nunca hay dos confirmaciones abiertas a la vez.
     */
    test('[mostrarConfirmacion] Comprueba que no se abren dos confirmaciones', () => {
      tarjetas()[0].querySelector('.btn-eliminar-tarjeta').click();
      tarjetas()[1].querySelector('.btn-eliminar-tarjeta').click();

      expect(document.querySelectorAll('#modal-confirmacion')).toHaveLength(1);
    });

    /**
     * Función   : eliminarVacanteEnServidor() y confirmarEliminar().
     * Comprueba : que al confirmar envía el Id a eliminar_vacante.php, avisa y
     *             quita la tarjeta de la lista.
     */
    test('[eliminarVacanteEnServidor] Comprueba que al confirmar elimina la vacante y quita su tarjeta', async () => {
      tarjetas()[0].querySelector('.btn-eliminar-tarjeta').click();

      confirmacion().querySelector('.confirm-btn-aceptar').click();
      await esperarPromesas();

      expect(llamadaA('eliminar_vacante.php')[1]).toEqual({
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"Id_vacante":1}'
      });
      expect(lanzarToast).toHaveBeenCalledWith('Vacante eliminada correctamente', 'exito');
      expect(titulos()).toEqual(['Soporte técnico']);
      expect($('contador-resultados').textContent).toBe('1 vacante encontrada');
    });

    /**
     * Función   : eliminarVacanteEnServidor() (success = false).
     * Comprueba : que si el servidor no la elimina se muestra su mensaje y la
     *             tarjeta se queda.
     */
    test('[eliminarVacanteEnServidor] Comprueba que si el servidor no elimina se muestra su mensaje', async () => {
      rutas['eliminar_vacante.php'] = () => respuesta({ success: false, mensaje: 'No se pudo' });
      tarjetas()[0].querySelector('.btn-eliminar-tarjeta').click();

      confirmacion().querySelector('.confirm-btn-aceptar').click();
      await esperarPromesas();

      expect(lanzarToast).toHaveBeenCalledWith('No se pudo', 'error');
      expect(tarjetas()).toHaveLength(2);
    });

    /**
     * Función   : eliminarVacanteEnServidor() (respuesta HTTP de error).
     * Comprueba : que ante un error HTTP (403, 404, 500) se muestra
     *             "Error de conexión al eliminar" y la tarjeta se queda.
     */
    test.each([403, 404, 500])('[eliminarVacanteEnServidor] Comprueba el aviso ante un error HTTP %i', async (codigo) => {
      rutas['eliminar_vacante.php'] = () => respuesta({ success: false, mensaje: 'x' }, codigo);
      tarjetas()[0].querySelector('.btn-eliminar-tarjeta').click();

      confirmacion().querySelector('.confirm-btn-aceptar').click();
      await esperarPromesas();

      expect(lanzarToast).toHaveBeenCalledWith('Error de conexión al eliminar', 'error');
      expect(tarjetas()).toHaveLength(2);
    });
  });

  // ===================================================================
  describe('Función: abrirModal() y sus partes', () => {
    beforeEach(async () => { await cargarPagina(); });

    /**
     * Función   : crearTarjeta() (clic) y abrirModal().
     * Comprueba : que al dar clic en una tarjeta se abre el detalle de la vacante.
     */
    test('[abrirModal] Comprueba que al dar clic en la tarjeta se abre el detalle', () => {
      tarjetas()[0].click();

      expect($('modal-overlay').classList.contains('oculto')).toBe(false);
      expect(caja().querySelector('.modal-titulo').textContent).toBe('desarrollador web');
    });

    /**
     * Función   : crearHeaderModal(), crearInfoGrid() y crearSeccionModal().
     * Comprueba : que el detalle muestra servicio, empresa, descripción y requisitos.
     */
    test('[crearHeaderModal / crearInfoGrid / crearSeccionModal] Comprueba la información del detalle', () => {
      tarjetas()[0].click();

      expect(caja().querySelector('.modal-header .tarjeta-badge').textContent).toBe('📋 Servicio social');
      const tarjetasInfo = [...caja().querySelectorAll('.modal-info-card .valor')].map((v) => v.textContent);
      expect(tarjetasInfo).toEqual(['Acme', 'Servicio social']);
      const secciones = [...caja().querySelectorAll('.modal-seccion h3')].map((h) => h.textContent);
      expect(secciones).toEqual(['Descripción', 'Requisitos', 'Contacto']);
      expect(caja().querySelector('.modal-seccion p').textContent).toBe('Apoyo en sitio web');
    });

    /**
     * Función   : crearSeccionContacto() y crearFilaContacto().
     * Comprueba : que el contacto muestra nombre, correo con enlace mailto y teléfono.
     */
    test('[crearSeccionContacto] Comprueba los datos de contacto y el enlace mailto', () => {
      tarjetas()[0].click();

      const filas = [...caja().querySelectorAll('.contacto-fila')].map((f) => f.textContent.replace(/\s+/g, ' ').trim());
      expect(filas).toEqual(['👤María Soto', '✉️ maria@acme.mx', '📞246-123-4567']);
      expect(caja().querySelector('.contacto-fila a').getAttribute('href')).toBe('mailto:maria@acme.mx');
    });

    /**
     * Función   : crearContenidoModal() (vacante sin datos opcionales).
     * Comprueba : que si no hay descripción, requisitos ni contacto esas secciones no aparecen.
     */
    test('[crearContenidoModal] Comprueba que sin datos opcionales no aparecen esas secciones', () => {
      tarjetas()[1].click();

      expect(caja().querySelectorAll('.modal-seccion')).toHaveLength(0);
      expect([...caja().querySelectorAll('.fecha-chip')].map((f) => f.textContent))
        .toEqual(['📅 Publicado: 20/10/2026', '⏳ Expira: —']);
    });

    /**
     * Función   : crearPreviewFlyer() y normalizarFlyer().
     * Comprueba : que un flyer de imagen se muestra con <img> y la ruta
     *             /home/uploads/ se convierte a /uploads/.
     */
    test('[crearPreviewFlyer / normalizarFlyer] Comprueba la vista previa de un flyer de imagen', () => {
      tarjetas()[0].click();

      expect(caja().querySelector('.modal-flyer-img').getAttribute('src')).toBe('/uploads/Flyers/vacante1.png');
      expect(caja().querySelector('iframe')).toBeNull();
    });

    /**
     * Función   : crearPreviewFlyer() y esPDF().
     * Comprueba : que un flyer PDF se muestra en un <iframe> (sin barra de herramientas)
     *             y una URL http se deja igual.
     */
    test('[crearPreviewFlyer / esPDF] Comprueba la vista previa de un flyer PDF', () => {
      window.abrirModal({ ...VACANTE_COMPLETA, Flyer_Path: 'https://ops.mx/flyers/Vacante.PDF ' });

      expect(caja().querySelector('.modal-flyer-pdf').getAttribute('src'))
        .toBe('https://ops.mx/flyers/Vacante.PDF #page=1&toolbar=0&navpanes=0&scrollbar=0');
      expect(caja().querySelector('.modal-flyer-img')).toBeNull();
    });

    /**
     * Función   : crearFooterModal().
     * Comprueba : que con flyer se ofrece "Descargar flyer" y sin flyer
     *             "Descargar vacante en PDF".
     */
    test('[crearFooterModal] Comprueba el botón de descarga según haya flyer o no', () => {
      tarjetas()[0].click();
      expect(caja().querySelector('.modal-footer button').textContent).toBe('Descargar flyer');

      window.abrirModal(VACANTE_SIMPLE);
      expect(caja().querySelector('.modal-footer button').textContent).toBe('Descargar vacante en PDF');
      expect(caja().querySelector('.modal-flyer')).toBeNull();
    });

    /**
     * Función   : crearBotonCerrarModal() y cerrarModal().
     * Comprueba : que el detalle se cierra con la ✕ o con un clic en el fondo,
     *             pero no con un clic dentro.
     */
    test('[cerrarModal] Comprueba que el detalle se cierra con la ✕ o un clic en el fondo', () => {
      tarjetas()[0].click();
      caja().querySelector('.modal-titulo').click();
      expect($('modal-overlay').classList.contains('oculto')).toBe(false);

      caja().querySelector('.modal-cerrar').click();
      expect($('modal-overlay').classList.contains('oculto')).toBe(true);

      tarjetas()[0].click();
      $('modal-overlay').click();
      expect($('modal-overlay').classList.contains('oculto')).toBe(true);
    });

    /**
     * Función   : crearFooterModal() (canEliminar) y confirmarEliminarDesdeModal().
     * Comprueba : que desde el detalle se puede eliminar: al confirmar se cierra
     *             el detalle y la tarjeta desaparece.
     */
    test('[confirmarEliminarDesdeModal] Comprueba que eliminar desde el detalle cierra el modal y quita la tarjeta', async () => {
      tarjetas()[0].click();

      caja().querySelector('.btn-eliminar-modal').click();
      confirmacion().querySelector('.confirm-btn-aceptar').click();
      await esperarPromesas();

      expect($('modal-overlay').classList.contains('oculto')).toBe(true);
      expect(titulos()).toEqual(['Soporte técnico']);
    });

    /**
     * Función   : crearFooterModal() (alumno).
     * Comprueba : que un alumno no ve el botón "Eliminar vacante" en el detalle.
     */
    test('[crearFooterModal] Comprueba que el alumno no ve "Eliminar vacante" en el detalle', async () => {
      await cargarPagina({ Id_usuario: '7', Id_tipo_usuario: '2' });
      tarjetas()[0].click();

      expect(caja().querySelector('.btn-eliminar-modal')).toBeNull();
    });
  });

  // ===================================================================
  describe('Función: descargarFlyer()', () => {
    /**
     * Función   : descargarFlyer().
     * Comprueba : que descarga el flyer con el nombre del título (símbolos
     *             cambiados por "_") y la extensión original.
     */
    test('[descargarFlyer] Comprueba el enlace de descarga del flyer', async () => {
      await cargarPagina();
      const clics = [];
      jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { clics.push(this); });

      tarjetas()[0].click();
      caja().querySelector('.btn-descargar-flyer').click();

      expect(clics).toHaveLength(1);
      expect(clics[0].getAttribute('href')).toBe('/uploads/Flyers/vacante1.png');
      expect(clics[0].download).toBe('desarrollador_web.png');
      expect(clics[0].target).toBe('_blank');
      expect(document.body.contains(clics[0])).toBe(false); // se quita después
    });

    /**
     * Función   : descargarFlyer() (sin flyer).
     * Comprueba : que si la vacante no tiene flyer se avisa.
     */
    test('[descargarFlyer] Comprueba el aviso cuando la vacante no tiene flyer', async () => {
      await cargarPagina();

      window.descargarFlyer(VACANTE_SIMPLE);

      expect(lanzarToast).toHaveBeenCalledWith('Esta vacante no tiene flyer', 'error');
    });
  });

  // ===================================================================
  describe('Función: descargarVacantePDF()', () => {
    /**
     * Función   : descargarVacantePDF().
     * Comprueba : que el PDF lleva título, servicio, empresa, descripción,
     *             requisitos, contacto y fechas, y se guarda con el título como nombre.
     */
    test('[descargarVacantePDF] Comprueba el contenido y el nombre del PDF', async () => {
      await cargarPagina();

      window.descargarVacantePDF({ ...VACANTE_COMPLETA, Flyer_Path: null });

      expect(pdf.textos).toEqual([
        'desarrollador web', 'Servicio: Servicio social', 'Empresa:', 'Acme',
        'Descripción:', 'Apoyo en sitio web', 'Requisitos:', 'HTML, CSS y JS',
        'Contacto:', 'Nombre: María Soto', 'Email: maria@acme.mx', 'Teléfono: 246-123-4567',
        'Fechas:', 'Publicado: 01/11/2026', 'Expira: 15/12/2026'
      ]);
      expect(pdf.guardado).toBe('desarrollador_web.pdf');
    });

    /**
     * Función   : descargarVacantePDF() (datos vacíos) y crearFooterModal().
     * Comprueba : que con datos vacíos el PDF usa los textos por defecto y omite
     *             las secciones que no hay; se genera desde el botón del detalle.
     */
    test('[descargarVacantePDF] Comprueba el PDF de una vacante sin datos opcionales', async () => {
      await cargarPagina();
      tarjetas()[1].click();

      caja().querySelector('.btn-descargar-pdf').click();

      expect(pdf.textos).toEqual([
        'Soporte técnico', 'Servicio: Sin servicio', 'Empresa:', 'No especificada',
        'Fechas:', 'Publicado: 20/10/2026', 'Expira: —'
      ]);
      expect(pdf.guardado).toBe('Soporte_t_cnico.pdf');
    });
  });
});