/**
 * @jest-environment jsdom
 *
 * Archivo      : encuestas.test.js
 * Módulo       : CU_05 Encuestas (Pruebas unitarias)
 * Archivos bajo prueba :
 *   app/CU_05_.../encuestas.js
 *   app/CU_05_.../menu.js
 * Herramienta  : Jest + jsdom
 *
 * Cómo correrlo (desde OPS-web-app):
 *   npx jest Pruebas_Unitarias/CU_05 --verbose
 *
 * Descripción  : Se usa el HTML real (encuestas.html) y se simulan las
 *                respuestas de los PHP con un mock de fetch. Los JS son módulos
 *                que importan lanzar_toast.js y menu.js de ../js/; la prueba los
 *                sustituye por simuladores. La carpeta del módulo se busca sola
 *                (la primera de app/ que empieza con "CU_05").
 *                El código original NO se modifica.
 *
 * Cada prueba indica:
 *   - Función   : función de encuestas.js (o menu.js) que se prueba.
 *   - Comprueba : qué comportamiento se verifica.
 */
const fs = require('fs');
const path = require('path');

const RUTA_APPS = path.resolve(__dirname, '../../app');
const CARPETA = fs.readdirSync(RUTA_APPS).find((d) => d.startsWith('CU_05'));
if (!CARPETA) throw new Error(`No se encontró ninguna carpeta que empiece con "CU_05" dentro de ${RUTA_APPS}`);
const RUTA_APP = path.join(RUTA_APPS, CARPETA);
const HTML = fs.readFileSync(path.join(RUTA_APP, 'encuestas.html'), 'utf8');
const BODY = HTML.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1].replace(/<script[\s\S]*?<\/script>/gi, '');

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

function cargarModulo(archivo, externos) {
  const codigo = fs.readFileSync(path.join(RUTA_APP, archivo), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function('__importar', transformar(codigo))((ruta) => externos[path.basename(ruta)]);
}

// =====================================================================
// DATOS SIMULADOS
// =====================================================================
const ENCUESTAS_ALUMNO = {
  success: true, total: 2,
  pendientes: [
    { Id_encuesta: 4, Nombre: 'Satisfacción del alumno', Descripcion: 'Evalúa tu experiencia', Id_servicio: 2, NombreServicio: 'Servicio social' },
    { Id_encuesta: 9, Nombre: "Opinión de l'empresa", Descripcion: "Cómo te trató l'empresa", Id_servicio: 1, NombreServicio: 'Prácticas profesionales' }
  ]
};

const ALUMNOS_PENDIENTES = {
  success: true, total_alumnos_con_pendientes: 2,
  alumnos: [
    { Id_alumno: 15, No_Expediente: 'EXP-15', NombreCompleto: 'Ana López Ruiz', total_pendientes: 1,
      encuestas: [{ Id_encuesta: 7, Nombre: 'Evaluación del alumno', Descripcion: 'La responde el coordinador', Id_servicio: 2,
        NombreServicio: 'Servicio social', NombreEmpresa: 'Acme' }] },
    { Id_alumno: 16, No_Expediente: 'S/N', NombreCompleto: 'Luis Pérez', total_pendientes: 2,
      encuestas: [
        { Id_encuesta: 7, Nombre: 'Evaluación del alumno', Descripcion: 'x', NombreServicio: 'Servicio social', NombreEmpresa: 'Sin Empresa Asignada' },
        { Id_encuesta: 8, Nombre: 'Seguimiento', Descripcion: 'y', NombreServicio: 'Servicio social', NombreEmpresa: 'Sin Empresa Asignada' }
      ] },
    { Id_alumno: 17, No_Expediente: 'EXP-17', NombreCompleto: 'Sin pendientes', total_pendientes: 0, encuestas: [] }
  ]
};

const PREGUNTAS = {
  success: true, total: 4,
  preguntas: [
    { Id_pregunta: 103, Pregunta: '¿Recomendarías la empresa?', Tipo_respuesta: 'BOOLEANO', Obligatoria: 1, Orden: 3, Seccion: null },
    { Id_pregunta: 101, Pregunta: 'Califica el trato recibido', Tipo_respuesta: 'ESCALA_1_5', Obligatoria: 1, Orden: 1, Seccion: 'General' },
    { Id_pregunta: 104, Pregunta: 'Área donde estuviste', Tipo_respuesta: 'CORTA', Obligatoria: 0, Orden: 4, Seccion: null },
    { Id_pregunta: 102, Pregunta: 'Comentarios', Tipo_respuesta: 'TEXTO', Obligatoria: 0, Orden: 2, Seccion: 'General' }
  ]
};

// =====================================================================
// FUNCIONES DE APOYO (no son pruebas)
// =====================================================================
let lanzarToast;
let renderMenu;
let rutas;
let listeners;

/** Respuesta simulada de fetch (se entrega una copia para que una prueba no afecte a otra). */
function respuesta(json) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(JSON.stringify(json))) });
}

async function esperarPromesas() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

function borrarCookies() {
  document.cookie.split('; ').filter(Boolean).forEach((c) => {
    document.cookie = `${c.split('=')[0]}=; max-age=0; path=/`;
  });
}

const COOKIES_ALUMNO = { Id_usuario: '20', Id_tipo_usuario: '2', Id_carrera: '10', Id_alumno: '15' };
const COOKIES_COORDINADOR = { Id_usuario: '3', Id_tipo_usuario: '3', Id_carrera: '10' };

/** Carga encuestas.html, menu.js y encuestas.js como lo haría el navegador. */
async function cargarPagina(cookies = COOKIES_ALUMNO, cambios = {}) {
  borrarCookies();
  Object.entries(cookies).forEach(([k, v]) => { document.cookie = `${k}=${v}; path=/`; });
  document.body.innerHTML = BODY;

  rutas = {
    'obtener_encuestas_alumno.php': () => respuesta(ENCUESTAS_ALUMNO),
    'obtener_alumnos_pendientes.php': () => respuesta(ALUMNOS_PENDIENTES),
    'obtener_preguntas.php': () => respuesta(PREGUNTAS),
    'procesar_encuesta.php': () => respuesta({ success: true, message: 'Encuesta guardada exitosamente' }),
    ...cambios
  };
  global.fetch = jest.fn((url, opciones) => rutas[url.split('?')[0]](opciones));

  const externos = { 'lanzar_toast.js': { lanzarToast }, 'menu.js': { renderMenu } };
  cargarModulo('menu.js', externos);
  cargarModulo('encuestas.js', externos);

  document.dispatchEvent(new Event('DOMContentLoaded'));
  await esperarPromesas();
}

const $ = (id) => document.getElementById(id);
const urls = () => fetch.mock.calls.map((c) => c[0]);
const llamadaA = (archivo) => fetch.mock.calls.find((c) => c[0].startsWith(archivo));
const confirmacion = () => $('modal-confirmacion');
const botonConfirmacion = (texto) => [...confirmacion().querySelectorAll('button')].find((b) => b.textContent === texto);
const visible = (id) => $(id).style.display !== 'none';

/** Abre la primera encuesta del alumno con su botón "Responder encuesta". */
async function abrirPrimeraEncuesta() {
  document.querySelector('#lista-encuestas-alumno .btn-responder').click();
  await esperarPromesas();
}

/** Contesta las preguntas obligatorias del formulario de ejemplo. */
function contestarObligatorias() {
  document.querySelector('select[name="q_101"]').value = '4';
  document.querySelector('input[name="q_103"][value="Si"]').checked = true;
}

async function enviar() {
  $('form-encuesta').dispatchEvent(new Event('submit', { cancelable: true }));
  await esperarPromesas();
}

// =====================================================================
// PREPARACIÓN DE CADA PRUEBA
// =====================================================================
beforeEach(() => {
  lanzarToast = jest.fn();
  renderMenu = jest.fn();
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
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
describe('menu.js', () => {
  /**
   * Función   : menu.js › listener "DOMContentLoaded".
   * Comprueba : que al cargar la página se dibuja el menú.
   */
  test('[DOMContentLoaded] Comprueba que al cargar la página se dibuja el menú', async () => {
    await cargarPagina();

    expect(renderMenu).toHaveBeenCalled();
  });
});

describe('encuestas.js', () => {

  // ===================================================================
  describe('Función: inicializarModulo() (vista según el tipo de usuario)', () => {
    /**
     * Función   : inicializarModulo().
     * Comprueba : que un alumno (tipo 2) ve "Mis Encuestas Pendientes" y se piden
     *             sus encuestas con su Id_alumno de la cookie.
     */
    test('[inicializarModulo] Comprueba que el alumno ve su vista y se piden sus encuestas', async () => {
      await cargarPagina(COOKIES_ALUMNO);

      expect(visible('vista-alumno')).toBe(true);
      expect(visible('vista-coordinador')).toBe(false);
      expect(urls()).toContain('obtener_encuestas_alumno.php?alumno=15');
    });

    /**
     * Función   : inicializarModulo().
     * Comprueba : que administrador (1) y coordinador (3) ven "Alumnos con
     *             Encuestas Pendientes" y se piden los alumnos de su carrera.
     */
    test.each(['1', '3'])('[inicializarModulo] Comprueba que con Id_tipo_usuario=%s se ve la vista de coordinador', async (tipo) => {
      await cargarPagina({ ...COOKIES_COORDINADOR, Id_tipo_usuario: tipo });

      expect(visible('vista-coordinador')).toBe(true);
      expect(visible('vista-alumno')).toBe(false);
      expect(urls()).toContain('obtener_alumnos_pendientes.php?carrera=10');
    });
  });

  // ===================================================================
  describe('Función: cargarEncuestasAlumno()', () => {
    /**
     * Función   : cargarEncuestasAlumno().
     * Comprueba : que por cada encuesta se muestra el servicio, el nombre, la
     *             descripción y el botón "Responder encuesta".
     */
    test('[cargarEncuestasAlumno] Comprueba que muestra una tarjeta por encuesta', async () => {
      await cargarPagina();

      const tarjetas = [...document.querySelectorAll('#lista-encuestas-alumno .card-encuesta')];
      expect(tarjetas).toHaveLength(2);
      expect(tarjetas[0].querySelector('h4').textContent).toBe('Servicio: Servicio social');
      expect(tarjetas[0].querySelector('h5').textContent).toBe('Satisfacción del alumno');
      expect(tarjetas[0].querySelector('p').textContent).toBe('Evalúa tu experiencia');
      expect(tarjetas[0].querySelector('.btn-responder').textContent.trim()).toBe('Responder encuesta');
      expect(visible('estado-vacio-alumno')).toBe(false);
    });

    /**
     * Función   : cargarEncuestasAlumno() (lista vacía).
     * Comprueba : que sin encuestas pendientes se muestra el mensaje de estado vacío.
     */
    test('[cargarEncuestasAlumno] Comprueba que sin encuestas muestra el mensaje vacío', async () => {
      await cargarPagina(COOKIES_ALUMNO, { 'obtener_encuestas_alumno.php': () => respuesta({ success: true, pendientes: [] }) });

      expect($('lista-encuestas-alumno').innerHTML).toBe('');
      expect(visible('estado-vacio-alumno')).toBe(true);
    });

    /**
     * Función   : cargarEncuestasAlumno() (bloque catch).
     * Comprueba : que si falla la carga se avisa y se muestra "Error al cargar encuestas".
     */
    test('[cargarEncuestasAlumno] Comprueba el aviso cuando falla la carga', async () => {
      await cargarPagina(COOKIES_ALUMNO, { 'obtener_encuestas_alumno.php': () => Promise.reject(new Error('sin red')) });

      expect(lanzarToast).toHaveBeenCalledWith('Error al cargar las encuestas disponibles.', 'error');
      expect($('lista-encuestas-alumno').textContent).toBe('Error al cargar encuestas');
    });
  });

  // ===================================================================
  describe('Función: cargarAlumnosCoordinador() y toggleAcordeonAlumno()', () => {
    /**
     * Función   : cargarAlumnosCoordinador().
     * Comprueba : que se muestra una tarjeta por alumno CON pendientes (los de
     *             0 pendientes no aparecen), con nombre, expediente y contador.
     */
    test('[cargarAlumnosCoordinador] Comprueba que muestra solo alumnos con pendientes', async () => {
      await cargarPagina(COOKIES_COORDINADOR);

      const tarjetas = [...document.querySelectorAll('.tarjeta-alumno')];
      expect(tarjetas).toHaveLength(2);
      expect(tarjetas[0].querySelector('.alumno-nombre').textContent.replace(/\s+/g, ' ').trim()).toBe('Ana López Ruiz (Exp: EXP-15)');
      expect(tarjetas[1].querySelector('.alumno-contador').textContent.replace(/\s+/g, ' ').trim()).toBe('Encuestas pendientes: 2');
    });

    /**
     * Función   : toggleAcordeonAlumno().
     * Comprueba : que "Ver encuestas pendientes" despliega y vuelve a ocultar
     *             las encuestas del alumno (con servicio y empresa).
     */
    test('[toggleAcordeonAlumno] Comprueba que despliega y oculta las encuestas del alumno', async () => {
      await cargarPagina(COOKIES_COORDINADOR);
      const boton = document.querySelector('.tarjeta-alumno .btn-toggle-acordeon');

      expect($('acordeon-15').style.display).toBe('none');
      boton.click();
      expect($('acordeon-15').style.display).toBe('block');
      expect($('acordeon-15').querySelector('h6').textContent).toBe('Empresa: Acme');
      expect($('acordeon-16').style.display).toBe('none');
      boton.click();
      expect($('acordeon-15').style.display).toBe('none');
    });

    /**
     * Función   : cargarAlumnosCoordinador() (lista vacía).
     * Comprueba : que si ningún alumno tiene pendientes se muestra el mensaje vacío.
     */
    test('[cargarAlumnosCoordinador] Comprueba que sin alumnos pendientes muestra el mensaje vacío', async () => {
      await cargarPagina(COOKIES_COORDINADOR, {
        'obtener_alumnos_pendientes.php': () => respuesta({ success: true, alumnos: [ALUMNOS_PENDIENTES.alumnos[2]] })
      });

      expect(document.querySelectorAll('.tarjeta-alumno')).toHaveLength(0);
      expect(visible('estado-vacio-coordinador')).toBe(true);
    });

    /**
     * Función   : cargarAlumnosCoordinador() (bloque catch).
     * Comprueba : que si falla la carga se avisa y se muestra "Error al cargar alumnos".
     */
    test('[cargarAlumnosCoordinador] Comprueba el aviso cuando falla la carga', async () => {
      await cargarPagina(COOKIES_COORDINADOR, { 'obtener_alumnos_pendientes.php': () => Promise.reject(new Error('x')) });

      expect(lanzarToast).toHaveBeenCalledWith('Error al cargar la lista de alumnos con encuestas pendientes.', 'error');
      expect($('lista-alumnos-pendientes').textContent).toBe('Error al cargar alumnos');
    });
  });

  // ===================================================================
  describe('Función: abrirEncuesta() y renderizarPregunta()', () => {
    /**
     * Función   : abrirEncuesta().
     * Comprueba : que al dar "Responder encuesta" se piden sus preguntas, se
     *             oculta la lista y se muestra el formulario con nombre y descripción.
     */
    test('[abrirEncuesta] Comprueba que abre el formulario de la encuesta elegida', async () => {
      await cargarPagina();

      await abrirPrimeraEncuesta();

      expect(urls()).toContain('obtener_preguntas.php?encuesta=4');
      expect(visible('seccion-lista')).toBe(false);
      expect(visible('contenedor-preguntas')).toBe(true);
      expect($('titulo-encuesta').innerText).toBe('Satisfacción del alumno');
      expect($('descripcion-encuesta').innerText).toBe('Evalúa tu experiencia');
    });

    /**
     * Función   : cargarEncuestasAlumno() (nombreSanitizado) y abrirEncuesta().
     * Comprueba : que una encuesta con apóstrofo (') en el nombre se abre bien.
     */
    test("[abrirEncuesta] Comprueba que funciona con nombres que tienen apóstrofo (')", async () => {
      await cargarPagina();

      document.querySelectorAll('#lista-encuestas-alumno .btn-responder')[1].click();
      await esperarPromesas();

      expect($('titulo-encuesta').innerText).toBe("Opinión de l'empresa");
      expect($('descripcion-encuesta').innerText).toBe("Cómo te trató l'empresa");
    });

    /**
     * Función   : abrirEncuesta() (preguntas.sort) y renderizarPregunta().
     * Comprueba : que las preguntas se muestran ordenadas por "Orden", con su
     *             número, su sección y un * rojo si son obligatorias.
     */
    test('[renderizarPregunta] Comprueba el orden, número, sección y asterisco de las preguntas', async () => {
      await cargarPagina();
      await abrirPrimeraEncuesta();

      const wrappers = [...document.querySelectorAll('.pregunta-wrapper')];
      expect(wrappers.map((w) => w.id)).toEqual(['wrapper_101', 'wrapper_102', 'wrapper_103', 'wrapper_104']);
      expect(wrappers.map((w) => w.getAttribute('data-required'))).toEqual(['true', 'false', 'true', 'false']);
      expect(wrappers[0].querySelector('strong').textContent).toBe('1. Califica el trato recibido');
      expect(wrappers[0].querySelector('.badge-seccion').textContent).toBe('General');
      expect(wrappers[0].querySelector('.obligatorio').textContent).toBe('*');
      expect(wrappers[1].querySelector('.obligatorio')).toBeNull();
      expect(wrappers[2].querySelector('.badge-seccion')).toBeNull();
    });

    /**
     * Función   : renderizarPregunta() (switch Tipo_respuesta).
     * Comprueba : el control de cada tipo: ESCALA_1_5 → lista 1 a 5, TEXTO →
     *             área de texto de 2000 caracteres, BOOLEANO → Sí/No, otro → texto corto.
     */
    test('[renderizarPregunta] Comprueba el control que se dibuja para cada tipo de respuesta', async () => {
      await cargarPagina();
      await abrirPrimeraEncuesta();

      const escala = document.querySelector('select[name="q_101"]');
      expect([...escala.options].map((o) => o.value)).toEqual(['', '1', '2', '3', '4', '5']);
      expect(escala.options[5].text).toBe('5 - Excelente');
      expect(escala.required).toBe(true);
      expect(document.querySelector('textarea[name="q_102"]').maxLength).toBe(2000);
      expect(document.querySelector('textarea[name="q_102"]').required).toBe(false);
      expect([...document.querySelectorAll('input[name="q_103"]')].map((r) => [r.type, r.value])).toEqual([['radio', 'Si'], ['radio', 'No']]);
      expect(document.querySelector('input[name="q_104"]').type).toBe('text');
    });

    /**
     * Función   : actualizarContadorCaracteres().
     * Comprueba : que al escribir en una pregunta de texto baja el contador de
     *             caracteres restantes.
     */
    test('[actualizarContadorCaracteres] Comprueba que el contador de caracteres baja al escribir', async () => {
      await cargarPagina();
      await abrirPrimeraEncuesta();
      const texto = document.querySelector('textarea[name="q_102"]');

      texto.value = 'Muy buena experiencia';
      texto.dispatchEvent(new Event('input'));

      expect($('chars_q_102').innerText).toBe(2000 - 'Muy buena experiencia'.length);
    });

    /**
     * Función   : abrirEncuesta() (bloque catch).
     * Comprueba : que si fallan las preguntas se avisa y se queda en la lista.
     */
    test('[abrirEncuesta] Comprueba el aviso cuando fallan las preguntas', async () => {
      await cargarPagina(COOKIES_ALUMNO, { 'obtener_preguntas.php': () => Promise.reject(new Error('x')) });

      await abrirPrimeraEncuesta();

      expect(lanzarToast).toHaveBeenCalledWith('Error al cargar las preguntas de la encuesta.', 'error');
      expect(visible('contenedor-preguntas')).toBe(false);
    });
  });

  // ===================================================================
  describe('Función: enviarRespuestasConConfirmacion() y renderModalConfirmacion()', () => {
    beforeEach(async () => {
      await cargarPagina();
      await abrirPrimeraEncuesta();
    });

    /**
     * Función   : enviarRespuestasConConfirmacion() (preguntas obligatorias).
     * Comprueba : que si faltan obligatorias se marcan en rojo, se avisa, se
     *             hace scroll a la primera y NO se pide confirmación.
     */
    test('[enviarRespuestasConConfirmacion] Comprueba que marca las obligatorias sin contestar', async () => {
      document.querySelector('input[name="q_103"][value="No"]').checked = true;

      await enviar();

      expect(lanzarToast).toHaveBeenCalledWith('Por favor, completa las preguntas obligatorias marcadas.', 'advertencia');
      expect($('wrapper_101').classList.contains('pregunta-error')).toBe(true);
      expect($('wrapper_103').classList.contains('pregunta-error')).toBe(false);
      expect($('wrapper_101').scrollIntoView).toHaveBeenCalled();
      expect(confirmacion()).toBeNull();
    });

    /**
     * Función   : enviarRespuestasConConfirmacion() (corrección del error).
     * Comprueba : que al contestar la pregunta que tenía error se le quita la marca roja.
     */
    test('[enviarRespuestasConConfirmacion] Comprueba que se quita la marca roja al corregir', async () => {
      await enviar();
      expect($('wrapper_101').classList.contains('pregunta-error')).toBe(true);

      contestarObligatorias();
      await enviar();

      expect($('wrapper_101').classList.contains('pregunta-error')).toBe(false);
      expect(confirmacion()).not.toBeNull();
    });

    /**
     * Función   : renderModalConfirmacion() (Cancelar).
     * Comprueba : que con todo contestado se pide confirmación y "Cancelar" no envía nada.
     */
    test('[renderModalConfirmacion] Comprueba que pide confirmación y "Cancelar" no envía', async () => {
      contestarObligatorias();
      await enviar();

      expect(confirmacion().querySelector('p').textContent)
        .toBe('¿Estás seguro de que deseas enviar tus respuestas? Una vez enviadas, no podrán ser editadas.');
      botonConfirmacion('Cancelar').click();

      expect(confirmacion()).toBeNull();
      expect(llamadaA('procesar_encuesta.php')).toBeUndefined();
    });

    /**
     * Función   : enviarRespuestasConConfirmacion() (envío).
     * Comprueba : que al confirmar se envía a procesar_encuesta.php el alumno, la
     *             encuesta y todas las respuestas; las opcionales vacías van
     *             como "No contestó".
     */
    test('[enviarRespuestasConConfirmacion] Comprueba los datos que se envían a procesar_encuesta.php', async () => {
      contestarObligatorias();
      await enviar();

      botonConfirmacion('Enviar respuestas').click();
      await esperarPromesas();

      expect(JSON.parse(llamadaA('procesar_encuesta.php')[1].body)).toEqual({
        Id_alumno: 15, Id_encuesta: 4,
        respuestas: [
          { Id_pregunta: 101, Respuesta: '4' },
          { Id_pregunta: 102, Respuesta: 'No contestó' },
          { Id_pregunta: 103, Respuesta: 'Si' },
          { Id_pregunta: 104, Respuesta: 'No contestó' }
        ]
      });
    });

    /**
     * Función   : enviarRespuestasConConfirmacion() (success = true).
     * Comprueba : que al guardarse se avisa, se regresa a la lista y se vuelven
     *             a pedir las encuestas pendientes.
     */
    test('[enviarRespuestasConConfirmacion] Comprueba que al guardarse regresa a la lista actualizada', async () => {
      contestarObligatorias();
      await enviar();
      fetch.mockClear();

      botonConfirmacion('Enviar respuestas').click();
      await esperarPromesas();

      expect(lanzarToast).toHaveBeenCalledWith('¡Encuesta completada con éxito!', 'exito');
      expect(visible('contenedor-preguntas')).toBe(false);
      expect(visible('seccion-lista')).toBe(true);
      expect(urls()).toContain('obtener_encuestas_alumno.php?alumno=15');
    });

    /**
     * Función   : enviarRespuestasConConfirmacion() (success = false).
     * Comprueba : que si el servidor no guarda se muestra su mensaje y se queda
     *             en el formulario.
     */
    test('[enviarRespuestasConConfirmacion] Comprueba el aviso si el servidor no guarda', async () => {
      rutas['procesar_encuesta.php'] = () => respuesta({ success: false, message: 'Esta encuesta ya ha sido respondida previamente por el alumno.' });
      contestarObligatorias();
      await enviar();

      botonConfirmacion('Enviar respuestas').click();
      await esperarPromesas();

      expect(lanzarToast).toHaveBeenCalledWith('Error: Esta encuesta ya ha sido respondida previamente por el alumno.', 'error');
      expect(visible('contenedor-preguntas')).toBe(true);
      expect(visible('mensaje-feedback')).toBe(true);
    });

    /**
     * Función   : enviarRespuestasConConfirmacion() (bloque catch).
     * Comprueba : que si falla la conexión se avisa.
     */
    test('[enviarRespuestasConConfirmacion] Comprueba el aviso si falla la conexión', async () => {
      rutas['procesar_encuesta.php'] = () => Promise.reject(new Error('sin red'));
      contestarObligatorias();
      await enviar();

      botonConfirmacion('Enviar respuestas').click();
      await esperarPromesas();

      expect(lanzarToast).toHaveBeenCalledWith('Error al conectar con el servidor. Por favor, intenta nuevamente.', 'error');
    });

    /**
     * Función   : renderModalConfirmacion() (reemplazo).
     * Comprueba : que nunca hay dos confirmaciones abiertas al mismo tiempo.
     */
    test('[renderModalConfirmacion] Comprueba que no se abren dos confirmaciones', async () => {
      contestarObligatorias();
      await enviar();
      await enviar();

      expect(document.querySelectorAll('#modal-confirmacion')).toHaveLength(1);
    });
  });

  // ===================================================================
  describe('Función: responder como coordinador', () => {
    /**
     * Función   : cargarAlumnosCoordinador(), abrirEncuesta() y enviarRespuestasConConfirmacion().
     * Comprueba : que el coordinador responde la encuesta A NOMBRE del alumno
     *             elegido y al terminar vuelve a pedir la lista de alumnos.
     */
    test('[abrirEncuesta / enviar] Comprueba que el coordinador responde a nombre del alumno elegido', async () => {
      await cargarPagina(COOKIES_COORDINADOR, {
        'obtener_preguntas.php': () => respuesta({ success: true, preguntas: [PREGUNTAS.preguntas[1]] })
      });
      document.querySelectorAll('.btn-responder-admin')[1].click(); // alumno 16
      await esperarPromesas();
      document.querySelector('select[name="q_101"]').value = '5';
      await enviar();
      fetch.mockClear();

      botonConfirmacion('Enviar respuestas').click();
      await esperarPromesas();

      const enviado = JSON.parse(fetch.mock.calls.find((c) => c[0] === 'procesar_encuesta.php')[1].body);
      expect(enviado.Id_alumno).toBe(16);
      expect(enviado.Id_encuesta).toBe(7);
      expect(urls()).toContain('obtener_alumnos_pendientes.php?carrera=10');
    });
  });

  // ===================================================================
  describe('Función: cancelarEncuesta() y volverALista()', () => {
    beforeEach(async () => {
      await cargarPagina();
      await abrirPrimeraEncuesta();
    });

    /**
     * Función   : cancelarEncuesta().
     * Comprueba : que "Cancelar" pide confirmación con el botón "No enviar
     *             respuestas" y, al confirmar, regresa a la lista sin enviar.
     */
    test('[cancelarEncuesta] Comprueba que al confirmar regresa a la lista sin enviar', async () => {
      $('btn-cancelar').click();

      expect(confirmacion().querySelector('p').textContent).toBe('¿Seguro que deseas cancelar? Las respuestas no se guardarán como borrador.');
      botonConfirmacion('No enviar respuestas').click();
      await esperarPromesas();

      expect(visible('seccion-lista')).toBe(true);
      expect(visible('contenedor-preguntas')).toBe(false);
      expect(llamadaA('procesar_encuesta.php')).toBeUndefined();
    });

    /**
     * Función   : cancelarEncuesta() (Cancelar del modal).
     * Comprueba : que si en la confirmación se elige "Cancelar" se sigue en el formulario.
     */
    test('[cancelarEncuesta] Comprueba que "Cancelar" en la confirmación deja seguir contestando', () => {
      $('btn-cancelar').click();
      botonConfirmacion('Cancelar').click();

      expect(visible('contenedor-preguntas')).toBe(true);
      expect(confirmacion()).toBeNull();
    });

    /**
     * Función   : volverALista().
     * Comprueba : que "← Volver a la lista" pide confirmación y al aceptar regresa a la lista.
     */
    test('[volverALista] Comprueba que al confirmar regresa a la lista', async () => {
      document.querySelector('.btn-volver').click();

      expect(confirmacion().querySelector('p').textContent).toBe('¿Seguro que deseas volver? Las respuestas no se guardarán.');
      botonConfirmacion('Enviar respuestas').click();
      await esperarPromesas();

      expect(visible('seccion-lista')).toBe(true);
      expect(visible('contenedor-preguntas')).toBe(false);
    });
  });
});