/**
 * @jest-environment jsdom
 *
 * Archivo      : crear_formularios.test.js
 * Módulo       : CU_12 Crear formularios (Pruebas unitarias)
 * Archivos bajo prueba (en la carpeta de app/ que empieza con "CU_12"):
 *   encuestas_lista.js, encuesta_form.js, encuesta_editar.js,
 *   preguntas_lista.js, pregunta_form.js, pregunta_editar.js
 * Herramienta  : Jest + jsdom
 *
 * Cómo correrlo (desde OPS-web-app):
 *   npx jest Pruebas_Unitarias/CU_12 --verbose
 *
 * Descripción  : Cada página se prueba con su HTML real y se simulan las
 *                respuestas de los PHP con un mock de fetch. Los JS son módulos;
 *                la prueba los conecta en memoria y sustituye menu.js,
 *                lanzar_toast.js y cookie.js de ../js/ por simuladores.
 *                La fecha del sistema se fija en el 15/06/2026 para que las
 *                validaciones de año y fecha den siempre el mismo resultado.
 *                El código original NO se modifica.
 *
 * Cada prueba indica:
 *   - Función   : archivo › función que se prueba.
 *   - Comprueba : qué comportamiento se verifica.
 */
const fs = require('fs');
const path = require('path');

const RUTA_APPS = path.resolve(__dirname, '../../app');
const CARPETA = fs.readdirSync(RUTA_APPS).find((d) => d.startsWith('CU_12'));
if (!CARPETA) throw new Error(`No se encontró ninguna carpeta que empiece con "CU_12" dentro de ${RUTA_APPS}`);
const RUTA_APP = path.join(RUTA_APPS, CARPETA);

const HOY = new Date('2026-06-15T10:00:00');

// =====================================================================
// CARGADOR DE MÓDULOS (no es una prueba)
// =====================================================================
function transformar(codigo) {
  const js = codigo.replace(
    /import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"];?/g,
    (_, nombres, ruta) => `const { ${nombres.trim()} } = __importar(${JSON.stringify(ruta)});`
  );
  return `"use strict";\n${js}`;
}

let externos;

function importar(ruta) {
  return externos[path.basename(ruta)];
}

/** Cuerpo del HTML sin los <script>. */
function cuerpoHtml(archivo) {
  const html = fs.readFileSync(path.join(RUTA_APP, archivo), 'utf8');
  return html.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1].replace(/<script[\s\S]*?<\/script>/gi, '');
}

// =====================================================================
// DATOS SIMULADOS
// =====================================================================
const SERVICIOS = { success: true, data: [{ Id_servicio: 1, Servicio: 'Servicio social' }, { Id_servicio: 2, Servicio: 'Prácticas profesionales' }] };
const ENCUESTAS = {
  success: true,
  data: [
    { Codigo: '108g-RG-14', Version: '03', Revision: '9001:2015', Fecha: 'Noviembre 2025', Id_encuesta: 5, Nombre: 'Satisfacción',
      Activo: 1, Contestador: 0, Descripcion: 'Encuesta final', Fecha_fin: '2026-12-01', Servicio: 'Servicio social',
      periodos: [{ Periodo_tipo: 'primavera', Periodo_año: 2026 }, { Periodo_tipo: 'otoño', Periodo_año: 2026 }] },
    { Codigo: 'X-1', Version: '01', Revision: 'R1', Fecha: 'Enero 2026', Id_encuesta: 6, Nombre: 'Docentes',
      Activo: 0, Contestador: 1, Descripcion: 'Para docentes', Fecha_fin: '2026-07-01', Servicio: 'Prácticas profesionales',
      periodos: [{ Periodo_tipo: 'otoño', Periodo_año: 2026 }] }
  ]
};
const ENCUESTA = (periodos) => ({
  success: true,
  data: [{ Nombre: 'Satisfacción', Descripcion: 'Encuesta final', Id_servicio: 2, Activo: 1, Contestador: 0, Fecha_fin: '2026-12-01',
    periodos: periodos || [{ Id_periodo_encuesta: 11, Periodo_tipo: 'primavera', Periodo_año: 2026 },
      { Id_periodo_encuesta: 12, Periodo_tipo: 'otoño', Periodo_año: 2026 }] }]
});
const PREGUNTAS = (respuestas = [0, 0]) => ({
  success: true,
  data: [
    { Id_pregunta: 8, Id_encuesta: 5, Pregunta: 'Trato recibido', Tipo_respuesta: 'ESCALA_1_5', Seccion: 'A', Orden: 1, Obligatoria: 1, Activo: 1, total_respuestas: respuestas[0] },
    { Id_pregunta: 9, Id_encuesta: 5, Pregunta: 'Comentarios', Tipo_respuesta: 'TEXTO', Seccion: 'B', Orden: 2, Obligatoria: 0, Activo: 0, total_respuestas: respuestas[1] }
  ]
});
const PREGUNTA = { success: true, data: [{ Orden: 2, Pregunta: 'Comentarios', Tipo_respuesta: 'TEXTO', Seccion: 'B', Obligatoria: 0, Activo: 1 }] };

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
  for (let i = 0; i < 40; i++) await Promise.resolve();
}

function borrarCookies() {
  document.cookie.split('; ').filter(Boolean).forEach((c) => {
    document.cookie = `${c.split('=')[0]}=; max-age=0; path=/`;
  });
}

/**
 * Carga una página del módulo: su HTML, la URL (?Id_encuesta=...), la cookie del
 * tipo de usuario y su JS; luego dispara DOMContentLoaded.
 */
async function cargarPagina(pagina, { tipo = '1', url = '?Id_encuesta=5', cambios = {} } = {}) {
  // Si en la misma prueba se carga otra página, se quitan los listeners de la anterior
  listeners.forEach(([t, fn, op]) => document.removeEventListener(t, fn, op));
  listeners.length = 0;
  borrarCookies();
  if (tipo) document.cookie = `Id_tipo_usuario=${tipo}; path=/`;
  window.history.replaceState({}, '', `/${pagina}.html${url}`);
  document.body.innerHTML = cuerpoHtml(`${pagina}.html`);

  rutas = {
    'obtener_servicios.php': () => respuesta(SERVICIOS),
    'encuestas_lista.php': () => respuesta(ENCUESTAS),
    'encuesta_guardar.php': () => respuesta({ success: true, mensaje: 'Encuesta guardada correctamente' }),
    'encuesta_editar.php': (op) => respuesta(JSON.parse(op.body).nombre || JSON.parse(op.body).periodo_tipo
      ? { success: true, mensaje: 'Encuesta actualizada' } : ENCUESTA()),
    'periodo_eliminar.php': () => respuesta({ success: true, mensaje: 'Periodo eliminado' }),
    'eliminar.php': () => respuesta({ success: true }),
    'preguntas_lista.php': () => respuesta(PREGUNTAS()),
    'pregunta_form.php': () => respuesta({ success: true }),
    'pregunta_editar.php': (op) => respuesta(JSON.parse(op.body).pregunta ? { success: true } : PREGUNTA),
    ...cambios
  };
  global.fetch = jest.fn((u, op) => rutas[u.split('?')[0]](op));

  const codigo = fs.readFileSync(path.join(RUTA_APP, `${pagina}.js`), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function('__importar', transformar(codigo))(importar);

  document.dispatchEvent(new Event('DOMContentLoaded'));
  await esperarPromesas();
}

const $ = (id) => document.getElementById(id);
const llamadasA = (archivo) => fetch.mock.calls.filter((c) => c[0].split('?')[0] === archivo);
const cuerpo = (archivo, n = 0) => JSON.parse(llamadasA(archivo)[n][1].body);
const opciones = (id) => [...$(id).options].map((o) => [o.value, o.text.trim()]);
const filas = (id) => [...$(id).querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent.replace(/\s+/g, ' ').trim()));
const botones = (contenedor) => [...contenedor.querySelectorAll('button')].map((b) => b.textContent.trim());
const navegaciones = () => console.error.mock.calls
  .map((a) => String((a[0] && a[0].message) || a[0])).filter((t) => t.includes('navigation'));

/** Llena los campos indicados ({ id: valor }). */
function llenar(valores) {
  Object.entries(valores).forEach(([id, v]) => { $(id).value = v; });
}

/** Da clic en el botón con ese texto (dentro del contenedor o en toda la página). */
async function clicTexto(texto, contenedor = document) {
  [...contenedor.querySelectorAll('button')].find((b) => b.textContent.trim() === texto).click();
  await esperarPromesas();
}

// =====================================================================
// PREPARACIÓN DE CADA PRUEBA
// =====================================================================
beforeEach(() => {
  jest.useFakeTimers({ now: HOY, doNotFake: ['nextTick', 'queueMicrotask'] });
  lanzarToast = jest.fn();
  renderMenu = jest.fn();
  externos = {
    'lanzar_toast.js': { lanzarToast },
    'menu.js': { renderMenu },
    'cookie.js': { obtenerCookie: (n) => document.cookie.split('; ').find((c) => c.startsWith(`${n}=`))?.split('=')[1] }
  };
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
  jest.useRealTimers();
  jest.restoreAllMocks();
  delete global.fetch;
  borrarCookies();
});

// =====================================================================
// encuestas_lista.js
// =====================================================================
describe('encuestas_lista.js', () => {
  /**
   * Función   : encuestas_lista.js › fetchEncuestas() y renderEncuestas().
   * Comprueba : que el administrador (tipo 1) ve el botón "Nueva Encuesta" y una
   *             fila por encuesta con su encabezado, Sí/No, a quién va dirigida,
   *             sus periodos y los botones Editar, Eliminar y Ver preguntas.
   */
  test('[renderEncuestas] Comprueba la tabla de encuestas para el administrador', async () => {
    await cargarPagina('encuestas_lista');

    expect(renderMenu).toHaveBeenCalled();
    expect($('btnNuevaEncuesta').style.display).toBe('block');
    expect(filas('tbodyEncuestas')).toEqual([
      ['Código: 108g-RG-14 Fecha: Noviembre 2025 Version: 03 Revision: 9001:2015', '5', 'Satisfacción', 'Encuesta final',
        'Servicio social', 'Sí', 'Alumnos', 'primavera 2026otoño 2026', '2026-12-01', 'Editar Eliminar Ver preguntas'],
      ['Código: X-1 Fecha: Enero 2026 Version: 01 Revision: R1', '6', 'Docentes', 'Para docentes',
        'Prácticas profesionales', 'No', 'Docentes como alumnos', 'otoño 2026', '2026-07-01', 'Editar Eliminar Ver preguntas']
    ]);
    expect($('tbodyEncuestas').querySelectorAll('tr')[0].children[7].innerHTML).toBe('primavera 2026<br>otoño 2026');
  });

  /**
   * Función   : encuestas_lista.js › listener "DOMContentLoaded" (tipo de usuario).
   * Comprueba : que el coordinador (tipo 3) no ve "Nueva Encuesta", Editar ni
   *             Eliminar (solo "Ver preguntas"), y que otro tipo es redirigido.
   */
  test('[DOMContentLoaded] Comprueba los permisos del coordinador y la redirección de otros usuarios', async () => {
    await cargarPagina('encuestas_lista', { tipo: '3' });
    expect($('btnNuevaEncuesta').style.display).toBe('none');
    expect(botones($('tbodyEncuestas'))).toEqual(['Ver preguntas', 'Ver preguntas']);
    expect(navegaciones()).toHaveLength(0);

    await cargarPagina('encuestas_lista', { tipo: '2' });
    expect(navegaciones().length).toBeGreaterThan(0);
  });

  /**
   * Función   : encuestas_lista.js › botones Editar y Ver preguntas.
   * Comprueba : que llevan a encuesta_editar.html y preguntas_lista.html con el Id de la encuesta.
   */
  test('[renderEncuestas] Comprueba los enlaces de Editar y Ver preguntas', async () => {
    await cargarPagina('encuestas_lista');
    const fila = $('tbodyEncuestas').querySelector('tr');

    expect(fila.querySelectorAll('button')[0].getAttribute('onclick')).toContain("encuesta_editar.html?Id_encuesta=5'");
    expect(fila.querySelectorAll('button')[2].getAttribute('onclick')).toContain("preguntas_lista.html?Id_encuesta=5'");
  });

  /**
   * Función   : encuestas_lista.js › fetchEncuestas() (errores).
   * Comprueba : que si el servidor responde un error, o la petición falla, se avisa.
   */
  test.each([
    ['un mensaje de error', () => respuesta({ error: 'Error al mostrar las encuestas' }, 500), 'Error al mostrar las encuestas'],
    ['una falla de red', () => Promise.reject(new Error('red')), 'La encuesta no se pudo cargar'],
  ])('[fetchEncuestas] Comprueba el aviso cuando el servidor responde %s', async (_d, ruta, mensaje) => {
    await cargarPagina('encuestas_lista', { cambios: { 'encuestas_lista.php': ruta } });

    expect(lanzarToast).toHaveBeenCalledWith(mensaje, 'error');
    expect(filas('tbodyEncuestas')).toHaveLength(0);
  });

  /**
   * Función   : encuestas_lista.js › eliminarEncuesta() y renderModalConfirmacion().
   * Comprueba : que "Eliminar" abre un modal; "Cancelar" lo cierra sin borrar y
   *             "Eliminar" manda DELETE a eliminar.php?Id_encuesta=..., avisa y
   *             vuelve a cargar la tabla (sin duplicar filas).
   */
  test('[eliminarEncuesta] Comprueba el modal de confirmación y la eliminación', async () => {
    await cargarPagina('encuestas_lista');

    await clicTexto('Eliminar', $('tbodyEncuestas').querySelectorAll('tr')[1]);
    expect($('modal-confirmacion').textContent).toContain('¿Estás seguro de que deseas eliminar la encuesta');
    await clicTexto('Cancelar', $('modal-confirmacion'));
    expect($('modal-confirmacion')).toBeNull();
    expect(llamadasA('eliminar.php')).toHaveLength(0);

    await clicTexto('Eliminar', $('tbodyEncuestas').querySelectorAll('tr')[1]);
    await clicTexto('Eliminar', $('modal-confirmacion'));

    expect(fetch).toHaveBeenCalledWith('eliminar.php?Id_encuesta=6', { method: 'DELETE' });
    expect(lanzarToast).toHaveBeenCalledWith('Encuesta eliminada', 'exito');
    expect(llamadasA('encuestas_lista.php')).toHaveLength(2);
    expect(filas('tbodyEncuestas')).toHaveLength(2);
  });

  /**
   * Función   : encuestas_lista.js › eliminarEncuesta() (errores).
   * Comprueba : que si no se puede eliminar se avisa y la tabla no se recarga.
   */
  test.each([
    ['un mensaje de error', () => respuesta({ error: 'Error al eliminar la encuesta en la Base de datos' }, 500), 'Error al eliminar la encuesta en la Base de datos'],
    ['una falla de red', () => Promise.reject(new Error('red')), 'La encuesta no se pudo eliminar'],
  ])('[eliminarEncuesta] Comprueba el aviso cuando el servidor responde %s', async (_d, ruta, mensaje) => {
    await cargarPagina('encuestas_lista', { cambios: { 'eliminar.php': ruta } });

    await clicTexto('Eliminar', $('tbodyEncuestas'));
    await clicTexto('Eliminar', $('modal-confirmacion'));

    expect(lanzarToast).toHaveBeenCalledWith(mensaje, 'error');
    expect(llamadasA('encuestas_lista.php')).toHaveLength(1);
  });
});

// =====================================================================
// encuesta_form.js
// =====================================================================
describe('encuesta_form.js', () => {
  const VALIDO = {
    inputCodigo: '108g-RG-14', inputRevision: '9001:2015', inputFecha: 'Noviembre 2025', inputVersion: '03',
    inputNombre: 'Satisfacción', inputDescripcion: 'Encuesta final', selectServicio: '2', selectActivo: '1',
    selectContestador: '0', selectPeriodoTipo: 'otoño', inputPeriodoAnio: '2026', inputFechaFin: '2026-12-01'
  };

  /**
   * Función   : encuesta_form.js › fetchServicios() y renderServicios().
   * Comprueba : que al cargar se llena el select de servicios; si falla se avisa;
   *             y que un alumno (tipo 2) es redirigido.
   */
  test('[fetchServicios] Comprueba el select de servicios y la redirección del alumno', async () => {
    await cargarPagina('encuesta_form', { url: '' });
    expect(opciones('selectServicio')).toEqual([['', '-- Seleccionar... --'], ['1', 'Servicio social'], ['2', 'Prácticas profesionales']]);
    expect(navegaciones()).toHaveLength(0);

    await cargarPagina('encuesta_form', { tipo: '2', url: '', cambios: { 'obtener_servicios.php': () => Promise.reject(new Error('red')) } });
    expect(lanzarToast).toHaveBeenCalledWith('No se pudo cargar el Servicio', 'error');
    expect(navegaciones().length).toBeGreaterThan(0);
  });

  /**
   * Función   : encuesta_form.js › validarFormulario() (campos vacíos).
   * Comprueba : que cada campo obligatorio vacío detiene el guardado con su mensaje.
   */
  test.each([
    ['inputCodigo', 'Codigo'], ['inputRevision', 'Revision'], ['inputFecha', 'Fecha'], ['inputVersion', 'Version'],
    ['inputNombre', 'Nombre'], ['inputDescripcion', 'Descripcion'], ['selectServicio', 'Servicio'], ['selectActivo', 'Activo'],
    ['selectContestador', 'Contestador'], ['selectPeriodoTipo', 'Tipo de periodo'], ['inputPeriodoAnio', 'Año'],
    ['inputFechaFin', 'Fecha de expiración'],
  ])('[validarFormulario] Comprueba que %s vacío muestra "%s no puede estar vacío"', async (id, nombre) => {
    await cargarPagina('encuesta_form', { url: '' });
    llenar({ ...VALIDO, [id]: id.startsWith('input') ? '   ' : '' });

    window.guardarEncuesta();

    expect(lanzarToast).toHaveBeenCalledWith(`${nombre} no puede estar vacío`, 'error');
    expect(llamadasA('encuesta_guardar.php')).toHaveLength(0);
  });

  /**
   * Función   : encuesta_form.js › validarFormulario() (año y fecha).
   * Comprueba : que el año debe ser de 4 dígitos y no menor al actual, y que la
   *             fecha de expiración debe ser posterior a hoy.
   */
  test.each([
    [{ inputPeriodoAnio: '26' }, 'El año debe ser exactamente 4 dígitos numéricos'],
    [{ inputPeriodoAnio: '20a6' }, 'El año debe ser exactamente 4 dígitos numéricos'],
    [{ inputPeriodoAnio: '2025' }, 'El año no puede ser menor a 2026'],
    [{ inputFechaFin: '2026-06-15' }, 'La fecha de expiración debe ser mayor a hoy'],
    [{ inputFechaFin: '2026-01-10' }, 'La fecha de expiración debe ser mayor a hoy'],
  ])('[validarFormulario] Comprueba que %j muestra "%s"', async (cambio, mensaje) => {
    await cargarPagina('encuesta_form', { url: '' });
    llenar({ ...VALIDO, ...cambio });

    expect(window.validarFormulario()).toBe(false);
    expect(lanzarToast).toHaveBeenCalledWith(mensaje, 'error');
  });

  /**
   * Función   : encuesta_form.js › guardarEncuesta().
   * Comprueba : que con datos válidos manda todos los campos a encuesta_guardar.php,
   *             avisa y a los 2 segundos regresa a la lista de encuestas.
   */
  test('[guardarEncuesta] Comprueba el envío de la encuesta y el regreso a la lista', async () => {
    await cargarPagina('encuesta_form', { url: '' });
    llenar(VALIDO);

    window.guardarEncuesta();
    await esperarPromesas();

    expect(cuerpo('encuesta_guardar.php')).toEqual({
      codigo: '108g-RG-14', revision: '9001:2015', fecha: 'Noviembre 2025', version: '03', nombre: 'Satisfacción',
      descripcion: 'Encuesta final', servicio: '2', activo: '1', contestador: '0', periodo_tipo: 'otoño', periodo_anio: '2026', fecha_fin: '2026-12-01'
    });
    expect(lanzarToast).toHaveBeenCalledWith('Encuesta guardada correctamente', 'exito');
    expect(navegaciones()).toHaveLength(0);
    jest.advanceTimersByTime(2000);
    expect(navegaciones().length).toBeGreaterThan(0);
  });

  /**
   * Función   : encuesta_form.js › guardarEncuesta() (errores).
   * Comprueba : que si el servidor responde un error, o la petición falla, se
   *             avisa y no se regresa a la lista.
   */
  test.each([
    ['un mensaje de error', () => respuesta({ error: 'Error al guardar la encuesta' }, 500), 'Error al guardar la encuesta'],
    ['una falla de red', () => Promise.reject(new Error('red')), 'No se pudo guardar la encuesta'],
  ])('[guardarEncuesta] Comprueba el aviso cuando el servidor responde %s', async (_d, ruta, mensaje) => {
    await cargarPagina('encuesta_form', { url: '', cambios: { 'encuesta_guardar.php': ruta } });
    llenar(VALIDO);

    window.guardarEncuesta();
    await esperarPromesas();
    jest.advanceTimersByTime(3000);

    expect(lanzarToast).toHaveBeenCalledWith(mensaje, 'error');
    expect(navegaciones()).toHaveLength(0);
  });
});

// =====================================================================
// encuesta_editar.js
// =====================================================================
describe('encuesta_editar.js', () => {
  /**
   * Función   : encuesta_editar.js › fetchServicios(), fetchEncuesta() y renderEncuesta().
   * Comprueba : que primero carga los servicios y después la encuesta del Id de la
   *             URL, y llena el formulario y la lista de periodos (con botón
   *             "Eliminar" porque hay más de un periodo).
   */
  test('[renderEncuesta] Comprueba que pre-llena el formulario y los periodos', async () => {
    await cargarPagina('encuesta_editar');

    expect(fetch.mock.calls.map((c) => c[0])).toEqual(['obtener_servicios.php', 'encuesta_editar.php']);
    expect(cuerpo('encuesta_editar.php')).toEqual({ Id_encuesta: '5' });
    expect([$('inputNombre').value, $('inputDescripcion').value, $('selectServicio').value, $('selectActivo').value,
      $('selectContestador').value, $('inputFechaFin').value]).toEqual(['Satisfacción', 'Encuesta final', '2', '1', '0', '2026-12-01']);
    expect([...$('divPeriodos').children].map((d) => d.textContent.replace(/\s+/g, ' ').trim()))
      .toEqual(['primavera 2026 Eliminar', 'otoño 2026 Eliminar']);
  });

  /**
   * Función   : encuesta_editar.js › renderEncuesta() (un solo periodo).
   * Comprueba : que si la encuesta tiene un solo periodo no se muestra el botón
   *             "Eliminar" (no se puede quedar sin periodos).
   */
  test('[renderEncuesta] Comprueba que con un solo periodo no hay botón Eliminar', async () => {
    await cargarPagina('encuesta_editar', { cambios: {
      'encuesta_editar.php': () => respuesta(ENCUESTA([{ Id_periodo_encuesta: 11, Periodo_tipo: 'primavera', Periodo_año: 2026 }]))
    } });

    expect($('divPeriodos').textContent.trim()).toBe('primavera 2026');
    expect(botones($('divPeriodos'))).toEqual([]);
  });

  /**
   * Función   : encuesta_editar.js › fetchServicios() / fetchEncuesta() (errores).
   * Comprueba : que si fallan los servicios se avisa y ya no se pide la encuesta;
   *             si falla la encuesta (o viene vacía) se avisa "La encuesta no se pudo cargar".
   */
  test.each([
    ['servicios con error', { 'obtener_servicios.php': () => respuesta({ error: 'Error al mostrar los servicios' }, 500) }, 'Error al mostrar los servicios', 0],
    ['encuesta con falla de red', { 'encuesta_editar.php': () => Promise.reject(new Error('red')) }, 'La encuesta no se pudo cargar', 1],
    ['encuesta vacía (sin periodos)', { 'encuesta_editar.php': () => respuesta({ success: true, data: [] }) }, 'La encuesta no se pudo cargar', 1],
  ])('[fetchEncuesta] Comprueba el aviso con %s', async (_d, cambios, mensaje, pedidas) => {
    await cargarPagina('encuesta_editar', { cambios });

    expect(lanzarToast).toHaveBeenCalledWith(mensaje, 'error');
    expect(llamadasA('encuesta_editar.php')).toHaveLength(pedidas);
  });

  /**
   * Función   : encuesta_editar.js › listener "DOMContentLoaded" (tipo de usuario).
   * Comprueba : que un alumno (tipo 2) es redirigido a su perfil.
   */
  test('[DOMContentLoaded] Comprueba que el alumno es redirigido', async () => {
    await cargarPagina('encuesta_editar', { tipo: '2' });

    expect(navegaciones().length).toBeGreaterThan(0);
  });

  /**
   * Función   : encuesta_editar.js › agregarPeriodo() (validaciones).
   * Comprueba : que el año no puede ser menor al actual y que tipo y año son obligatorios.
   */
  test.each([
    [{ selectPeriodoTipo: 'otoño', inputPeriodoAnio: '2025' }, 'El año no puede ser menor a 2026'],
    [{ selectPeriodoTipo: '', inputPeriodoAnio: '2027' }, 'Debe de llenar Tipo de periodo y año'],
    [{ selectPeriodoTipo: 'otoño', inputPeriodoAnio: '' }, 'Debe de llenar Tipo de periodo y año'],
  ])('[agregarPeriodo] Comprueba que %j muestra "%s"', async (valores, mensaje) => {
    await cargarPagina('encuesta_editar');
    llenar(valores);

    await clicTexto('Guardar periodo');

    expect(lanzarToast).toHaveBeenCalledWith(mensaje, 'error');
    expect(llamadasA('encuesta_editar.php')).toHaveLength(1);
  });

  /**
   * Función   : encuesta_editar.js › agregarPeriodo().
   * Comprueba : que manda el periodo nuevo, avisa, limpia los campos y recarga
   *             la lista de periodos (sin duplicarla).
   */
  test('[agregarPeriodo] Comprueba que agrega el periodo y recarga la lista', async () => {
    await cargarPagina('encuesta_editar');
    llenar({ selectPeriodoTipo: 'primavera', inputPeriodoAnio: '2027' });

    await clicTexto('Guardar periodo');

    expect(cuerpo('encuesta_editar.php', 1)).toEqual({ Id_encuesta: '5', periodo_tipo: 'primavera', periodo_anio: '2027' });
    expect(lanzarToast).toHaveBeenCalledWith('Periodo añadido', 'exito');
    expect([$('selectPeriodoTipo').value, $('inputPeriodoAnio').value]).toEqual(['', '']);
    expect(llamadasA('encuesta_editar.php')).toHaveLength(3);
    expect($('divPeriodos').children).toHaveLength(2);
  });

  /**
   * Función   : encuesta_editar.js › agregarPeriodo() (respuesta de error).
   * Comprueba : qué pasa si el servidor responde error al guardar el periodo: el
   *             código no revisa la respuesta y aun así avisa "Periodo añadido".
   */
  test('[agregarPeriodo] Comprueba que avisa "Periodo añadido" aunque el servidor responda error', async () => {
    await cargarPagina('encuesta_editar');
    rutas['encuesta_editar.php'] = (op) => respuesta(JSON.parse(op.body).periodo_tipo
      ? { error: 'Error al editar la encuesta' } : ENCUESTA(), JSON.parse(op.body).periodo_tipo ? 500 : 200);
    llenar({ selectPeriodoTipo: 'primavera', inputPeriodoAnio: '2027' });

    await clicTexto('Guardar periodo');

    expect(lanzarToast).toHaveBeenCalledWith('Periodo añadido', 'exito');
    expect(lanzarToast).not.toHaveBeenCalledWith('Error al editar la encuesta', 'error');
  });

  /**
   * Función   : encuesta_editar.js › eliminarPeriodo() y renderModalConfirmacion().
   * Comprueba : que "Eliminar" de un periodo abre el modal; al confirmar manda su
   *             Id a periodo_eliminar.php, avisa y recarga los periodos.
   */
  test('[eliminarPeriodo] Comprueba la confirmación y eliminación de un periodo', async () => {
    await cargarPagina('encuesta_editar');

    await clicTexto('Eliminar', $('divPeriodos').children[1]);
    expect($('modal-confirmacion').textContent).toContain('¿Estás seguro de que deseas eliminar el periodo');
    await clicTexto('Eliminar', $('modal-confirmacion'));

    expect(cuerpo('periodo_eliminar.php')).toEqual({ Id_periodo_encuesta: 12 });
    expect(lanzarToast).toHaveBeenCalledWith('Periodo eliminado', 'exito');
    expect(llamadasA('encuesta_editar.php')).toHaveLength(2);
    expect($('divPeriodos').children).toHaveLength(2);
  });

  /**
   * Función   : encuesta_editar.js › eliminarPeriodo() (cancelar y errores).
   * Comprueba : que "Cancelar" no borra nada y que si el servidor falla se avisa.
   */
  test('[eliminarPeriodo] Comprueba Cancelar y el aviso de error', async () => {
    await cargarPagina('encuesta_editar', { cambios: { 'periodo_eliminar.php': () => respuesta({ error: 'Error al eliminar el periodo' }, 500) } });

    await clicTexto('Eliminar', $('divPeriodos'));
    await clicTexto('Cancelar', $('modal-confirmacion'));
    expect(llamadasA('periodo_eliminar.php')).toHaveLength(0);

    await clicTexto('Eliminar', $('divPeriodos'));
    await clicTexto('Eliminar', $('modal-confirmacion'));
    expect(lanzarToast).toHaveBeenCalledWith('Error al eliminar el periodo', 'error');

    rutas['periodo_eliminar.php'] = () => Promise.reject(new Error('red'));
    await clicTexto('Eliminar', $('divPeriodos'));
    await clicTexto('Eliminar', $('modal-confirmacion'));
    expect(lanzarToast).toHaveBeenCalledWith('No se pudo eliminar el periodo', 'error');
  });

  /**
   * Función   : encuesta_editar.js › validarFormulario().
   * Comprueba : los campos obligatorios, el año de 4 dígitos (si se escribió) y
   *             que con la encuesta activa la fecha de expiración sea posterior a
   *             hoy (si está inactiva, la fecha no se revisa).
   */
  test.each([
    [{ inputNombre: ' ' }, 'Nombre no puede estar vacío', false],
    [{ selectContestador: '' }, 'Contestador no puede estar vacío', false],
    [{ inputPeriodoAnio: '27' }, 'El año debe ser exactamente 4 dígitos numéricos', false],
    [{ inputFechaFin: '2026-06-01' }, 'La fecha de expiración debe ser mayor a hoy', false],
    [{ selectActivo: '0', inputFechaFin: '2026-06-01' }, null, true],
  ])('[validarFormulario] Comprueba %j', async (cambio, mensaje, valido) => {
    await cargarPagina('encuesta_editar');
    llenar(cambio);

    expect(window.validarFormulario()).toBe(valido);
    if (mensaje) expect(lanzarToast).toHaveBeenCalledWith(mensaje, 'error');
  });

  /**
   * Función   : encuesta_editar.js › validarFormulario() (fecha vacía).
   * Comprueba : qué pasa si la encuesta está activa y se borra la fecha de
   *             expiración: no está en la lista de campos obligatorios y la
   *             comparación con una fecha inválida no la detiene, así que pasa.
   */
  test('[validarFormulario] Comprueba que una encuesta activa SIN fecha de expiración pasa la validación', async () => {
    await cargarPagina('encuesta_editar');
    llenar({ selectActivo: '1', inputFechaFin: '' });

    expect(window.validarFormulario()).toBe(true);
  });

  /**
   * Función   : encuesta_editar.js › editarEncuestas().
   * Comprueba : que manda los datos generales con el Id de la URL, avisa y a los
   *             2 segundos regresa a la lista de encuestas.
   */
  test('[editarEncuestas] Comprueba el envío de los cambios y el regreso a la lista', async () => {
    await cargarPagina('encuesta_editar');
    llenar({ inputNombre: 'Satisfacción 2', selectActivo: '0' });

    await clicTexto('Guardar');

    expect(cuerpo('encuesta_editar.php', 1)).toEqual({ Id_encuesta: '5', nombre: 'Satisfacción 2', descripcion: 'Encuesta final',
      servicio: '2', activo: '0', contestador: '0', fecha_fin: '2026-12-01' });
    expect(lanzarToast).toHaveBeenCalledWith('Encuesta guardada correctamente', 'exito');
    jest.advanceTimersByTime(2000);
    expect(navegaciones().length).toBeGreaterThan(0);
  });

  /**
   * Función   : encuesta_editar.js › editarEncuestas() (respuesta de error).
   * Comprueba : qué pasa si el servidor responde error: el código no revisa la
   *             respuesta y aun así avisa "Encuesta guardada correctamente".
   *             Solo una falla de red muestra el error.
   */
  test('[editarEncuestas] Comprueba que avisa éxito aunque el servidor responda error', async () => {
    await cargarPagina('encuesta_editar');
    rutas['encuesta_editar.php'] = () => respuesta({ error: 'Error al editar la encuesta' }, 500);

    await clicTexto('Guardar');
    expect(lanzarToast).toHaveBeenCalledWith('Encuesta guardada correctamente', 'exito');

    rutas['encuesta_editar.php'] = () => Promise.reject(new Error('red'));
    await clicTexto('Guardar');
    expect(lanzarToast).toHaveBeenCalledWith('No se pudo guardar la encuesta', 'error');
  });
});

// =====================================================================
// preguntas_lista.js
// =====================================================================
describe('preguntas_lista.js', () => {
  /**
   * Función   : preguntas_lista.js › fetchPreguntas() y renderPreguntas().
   * Comprueba : que pide las preguntas de la encuesta de la URL y, para el
   *             administrador sin respuestas registradas, muestra "Nueva Pregunta",
   *             la columna Acción y los botones Editar/Eliminar en cada fila.
   */
  test('[renderPreguntas] Comprueba la tabla de preguntas para el administrador', async () => {
    await cargarPagina('preguntas_lista');

    expect(cuerpo('preguntas_lista.php')).toEqual({ Id_encuesta: '5' });
    expect(filas('tbodyPreguntas')).toEqual([
      ['A', '1', 'Trato recibido', 'ESCALA_1_5', 'Sí', 'Sí'],
      ['B', '2', 'Comentarios', 'TEXTO', 'No', 'No']
    ]);
    expect(botones($('tbodyPreguntas'))).toEqual(['Editar', 'Eliminar', 'Editar', 'Eliminar']);
    expect($('btnNuevaPregunta').style.display).toBe('block');
    expect($('elAccion').style.display).toBe('block');
    expect($('tbodyPreguntas').querySelector('button').getAttribute('onclick'))
      .toContain("pregunta_editar.html?Id_pregunta=8&Id_encuesta=5'");
  });

  /**
   * Función   : preguntas_lista.js › renderPreguntas() (con respuestas / coordinador).
   * Comprueba : que si alguna pregunta ya tiene respuestas, o el usuario es
   *             coordinador, se ocultan "Nueva Pregunta", la columna Acción y los botones.
   */
  test.each([['1', [3, 0]], ['3', [0, 0]]])(
    '[renderPreguntas] Comprueba que tipo %s con respuestas %j no puede modificar', async (tipo, respuestas) => {
      await cargarPagina('preguntas_lista', { tipo, cambios: { 'preguntas_lista.php': () => respuesta(PREGUNTAS(respuestas)) } });

      expect($('btnNuevaPregunta').style.display).toBe('none');
      expect($('elAccion').style.display).toBe('none');
      expect(botones($('tbodyPreguntas')).filter((b) => b === 'Editar' || b === 'Eliminar')).toEqual(tipo === '1' ? ['Editar', 'Eliminar'] : []);
    });

  /**
   * Función   : preguntas_lista.js › listener "DOMContentLoaded".
   * Comprueba : que "Nueva Pregunta" lleva al formulario con el Id de la encuesta y
   *             que un alumno (tipo 2) es redirigido.
   */
  test('[DOMContentLoaded] Comprueba el botón Nueva Pregunta y la redirección del alumno', async () => {
    await cargarPagina('preguntas_lista');
    $('btnNuevaPregunta').click();
    expect(navegaciones()).toHaveLength(1);

    await cargarPagina('preguntas_lista', { tipo: '2' });
    expect(navegaciones().length).toBeGreaterThan(1);
  });

  /**
   * Función   : preguntas_lista.js › fetchPreguntas() (sin preguntas y errores).
   * Comprueba : que sin preguntas avisa "No hay preguntas" y que los errores se muestran.
   */
  test.each([
    ['sin preguntas', () => respuesta({ success: true, data: [] }), 'No hay preguntas', 'exito'],
    ['un mensaje de error', () => respuesta({ error: 'Error al mostrar las preguntas' }, 500), 'Error al mostrar las preguntas', 'error'],
    ['una falla de red', () => Promise.reject(new Error('red')), 'La pregunta no se pudo cargar', 'error'],
  ])('[fetchPreguntas] Comprueba el aviso %s', async (_d, ruta, mensaje, tipo) => {
    await cargarPagina('preguntas_lista', { cambios: { 'preguntas_lista.php': ruta } });

    expect(lanzarToast).toHaveBeenCalledWith(mensaje, tipo);
    expect(filas('tbodyPreguntas')).toHaveLength(0);
  });

  /**
   * Función   : preguntas_lista.js › eliminarPregunta().
   * Comprueba : que al confirmar manda DELETE a eliminar.php con el Id de la
   *             encuesta y de la pregunta, avisa y recarga la tabla sin duplicarla.
   */
  test('[eliminarPregunta] Comprueba la confirmación y eliminación de una pregunta', async () => {
    await cargarPagina('preguntas_lista');

    await clicTexto('Eliminar', $('tbodyPreguntas').querySelectorAll('tr')[1]);
    await clicTexto('Eliminar', $('modal-confirmacion'));

    expect(fetch).toHaveBeenCalledWith('eliminar.php?Id_encuesta=5&Id_pregunta=9', { method: 'DELETE' });
    expect(lanzarToast).toHaveBeenCalledWith('Pregunta eliminada', 'exito');
    expect(filas('tbodyPreguntas')).toHaveLength(2);
  });

  /**
   * Función   : preguntas_lista.js › eliminarPregunta() (errores).
   * Comprueba : que si no se puede eliminar se avisa.
   */
  test.each([
    ['un mensaje de error', () => respuesta({ error: 'Error al eliminar la encuesta en la Base de datos' }, 500), 'Error al eliminar la encuesta en la Base de datos'],
    ['una falla de red', () => Promise.reject(new Error('red')), 'La pregunta no se pudo eliminar'],
  ])('[eliminarPregunta] Comprueba el aviso cuando el servidor responde %s', async (_d, ruta, mensaje) => {
    await cargarPagina('preguntas_lista', { cambios: { 'eliminar.php': ruta } });

    await clicTexto('Eliminar', $('tbodyPreguntas'));
    await clicTexto('Eliminar', $('modal-confirmacion'));

    expect(lanzarToast).toHaveBeenCalledWith(mensaje, 'error');
  });
});

// =====================================================================
// pregunta_form.js
// =====================================================================
describe('pregunta_form.js', () => {
  const VALIDO = { inputPregunta: '¿Te gustó?', selectTipoRespuesta: 'BOOLEANO', inputSeccion: 'C', selectObligatoria: '1', selectActivo: '1' };

  /**
   * Función   : pregunta_form.js › validarFormulario().
   * Comprueba : que cada campo vacío detiene el guardado con su mensaje.
   */
  test.each([
    ['inputPregunta', 'Pregunta'], ['selectTipoRespuesta', 'Tipo de respuesta'], ['inputSeccion', 'Seccion'],
    ['selectObligatoria', 'Obligatoria'], ['selectActivo', 'Activo'],
  ])('[validarFormulario] Comprueba que %s vacío muestra "%s no puede estar vacío"', async (id, nombre) => {
    await cargarPagina('pregunta_form');
    llenar({ ...VALIDO, [id]: '' });

    await clicTexto('Guardar');

    expect(lanzarToast).toHaveBeenCalledWith(`${nombre} no puede estar vacío`, 'error');
    expect(llamadasA('pregunta_form.php')).toHaveLength(0);
  });

  /**
   * Función   : pregunta_form.html › oninput del campo Sección.
   * Comprueba : que la sección solo acepta letras y las pasa a mayúscula.
   */
  test('[oninput inputSeccion] Comprueba que la sección queda en una letra mayúscula', async () => {
    await cargarPagina('pregunta_form');

    $('inputSeccion').value = 'b7';
    $('inputSeccion').dispatchEvent(new Event('input'));

    expect($('inputSeccion').value).toBe('B');
  });

  /**
   * Función   : pregunta_form.js › guardarPregunta().
   * Comprueba : que manda la pregunta con el Id de la encuesta de la URL, avisa y
   *             a los 2 segundos regresa a la lista de preguntas de esa encuesta.
   */
  test('[guardarPregunta] Comprueba el envío de la pregunta y el regreso a la lista', async () => {
    await cargarPagina('pregunta_form');
    llenar(VALIDO);

    await clicTexto('Guardar');

    expect(cuerpo('pregunta_form.php')).toEqual({ Id_encuesta: '5', pregunta: '¿Te gustó?', tipo_respuesta: 'BOOLEANO',
      seccion: 'C', obligatoria: '1', activo: '1' });
    expect(lanzarToast).toHaveBeenCalledWith('Pregunta guardada correctamente', 'exito');
    jest.advanceTimersByTime(1999);
    expect(navegaciones()).toHaveLength(0);
    jest.advanceTimersByTime(1);
    expect(navegaciones().length).toBeGreaterThan(0);
  });

  /**
   * Función   : pregunta_form.js › guardarPregunta() (errores).
   * Comprueba : que si el servidor responde un error, o falla la red, se avisa y no se sale.
   */
  test.each([
    ['un mensaje de error', () => respuesta({ error: 'Error al guardar la pregunta' }, 500), 'Error al guardar la pregunta'],
    ['una falla de red', () => Promise.reject(new Error('red')), 'No se pudo guardar la Pregunta'],
  ])('[guardarPregunta] Comprueba el aviso cuando el servidor responde %s', async (_d, ruta, mensaje) => {
    await cargarPagina('pregunta_form', { cambios: { 'pregunta_form.php': ruta } });
    llenar(VALIDO);

    await clicTexto('Guardar');
    jest.advanceTimersByTime(3000);

    expect(lanzarToast).toHaveBeenCalledWith(mensaje, 'error');
    expect(navegaciones()).toHaveLength(0);
  });

  /**
   * Función   : pregunta_form.js › cancelarPregunta() y DOMContentLoaded.
   * Comprueba : que "Cancelar" regresa a la lista de preguntas y que un alumno es redirigido.
   */
  test('[cancelarPregunta] Comprueba Cancelar y la redirección del alumno', async () => {
    await cargarPagina('pregunta_form');
    expect(navegaciones()).toHaveLength(0);
    await clicTexto('Cancelar');
    expect(navegaciones()).toHaveLength(1);

    await cargarPagina('pregunta_form', { tipo: '2' });
    expect(navegaciones()).toHaveLength(2);
  });
});

// =====================================================================
// pregunta_editar.js
// =====================================================================
describe('pregunta_editar.js', () => {
  const URL = '?Id_pregunta=9&Id_encuesta=5';

  /**
   * Función   : pregunta_editar.js › fetchPregunta() y renderPregunta().
   * Comprueba : que pide la pregunta del Id de la URL y pre-llena el formulario.
   */
  test('[renderPregunta] Comprueba que pre-llena la pregunta', async () => {
    await cargarPagina('pregunta_editar', { url: URL });

    expect(cuerpo('pregunta_editar.php')).toEqual({ Id_pregunta: '9' });
    expect([$('outputOrden').textContent, $('inputPregunta').value, $('selectTipoRespuesta').value, $('inputSeccion').value,
      $('selectObligatoria').value, $('selectActivo').value]).toEqual(['2', 'Comentarios', 'TEXTO', 'B', '0', '1']);
  });

  /**
   * Función   : pregunta_editar.js › fetchPregunta() (errores) y DOMContentLoaded.
   * Comprueba : que si no se carga la pregunta se avisa y que un alumno es redirigido.
   */
  test.each([
    ['un mensaje de error', () => respuesta({ error: 'Error al editar la pregunta' }, 500), 'Error al editar la pregunta'],
    ['una falla de red', () => Promise.reject(new Error('red')), 'La pregunta no se pudo cargar'],
  ])('[fetchPregunta] Comprueba el aviso cuando el servidor responde %s', async (_d, ruta, mensaje) => {
    await cargarPagina('pregunta_editar', { tipo: '2', url: URL, cambios: { 'pregunta_editar.php': ruta } });

    expect(lanzarToast).toHaveBeenCalledWith(mensaje, 'error');
    expect(navegaciones().length).toBeGreaterThan(0);
  });

  /**
   * Función   : pregunta_editar.js › validarFormulario().
   * Comprueba : que un campo vacío detiene el guardado con su mensaje.
   */
  test('[validarFormulario] Comprueba que la pregunta vacía no se guarda', async () => {
    await cargarPagina('pregunta_editar', { url: URL });
    llenar({ inputPregunta: '  ' });

    await clicTexto('Guardar');

    expect(lanzarToast).toHaveBeenCalledWith('Pregunta no puede estar vacío', 'error');
    expect(llamadasA('pregunta_editar.php')).toHaveLength(1);
  });

  /**
   * Función   : pregunta_editar.js › editarPregunta().
   * Comprueba : que manda los cambios con el Id de la pregunta, avisa y a los
   *             2 segundos regresa a la lista de preguntas.
   */
  test('[editarPregunta] Comprueba el envío de los cambios y el regreso a la lista', async () => {
    await cargarPagina('pregunta_editar', { url: URL });
    llenar({ inputPregunta: 'Comentarios finales', selectObligatoria: '1' });

    await clicTexto('Guardar');

    expect(cuerpo('pregunta_editar.php', 1)).toEqual({ Id_pregunta: '9', pregunta: 'Comentarios finales', tipo_respuesta: 'TEXTO',
      seccion: 'B', obligatoria: '1', activo: '1' });
    expect(lanzarToast).toHaveBeenCalledWith('Pregunta guardada correctamente', 'exito');
    jest.advanceTimersByTime(2000);
    expect(navegaciones().length).toBeGreaterThan(0);
  });

  /**
   * Función   : pregunta_editar.js › editarPregunta() (respuesta de error).
   * Comprueba : qué pasa si el servidor responde error: no se revisa la respuesta
   *             y aun así avisa "Pregunta guardada correctamente".
   */
  test('[editarPregunta] Comprueba que avisa éxito aunque el servidor responda error', async () => {
    await cargarPagina('pregunta_editar', { url: URL });
    rutas['pregunta_editar.php'] = () => respuesta({ error: 'Error al editar la pregunta' }, 500);

    await clicTexto('Guardar');

    expect(lanzarToast).toHaveBeenCalledWith('Pregunta guardada correctamente', 'exito');
    expect(lanzarToast).not.toHaveBeenCalledWith('Error al editar la pregunta', 'error');
  });

  /**
   * Función   : pregunta_editar.js › cancelarPregunta().
   * Comprueba : que "Cancelar" regresa a la lista de preguntas.
   */
  test('[cancelarPregunta] Comprueba que Cancelar regresa a la lista', async () => {
    await cargarPagina('pregunta_editar', { url: URL });

    await clicTexto('Cancelar');

    expect(navegaciones()).toHaveLength(1);
  });
});