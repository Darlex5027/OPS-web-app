/**
 * @jest-environment jsdom
 *
 * Archivo      : administrar_usuarios.test.js
 * Módulo       : CU_07 Administrar usuarios (Pruebas unitarias)
 * Archivos bajo prueba (en la carpeta de app/ que empieza con "CU_07"):
 *   admin_usuarios.js
 *   aceptar_usuarios.js
 *   rechazar_usuarios.js
 * Herramienta  : Jest + jsdom
 *
 * Cómo correrlo (desde OPS-web-app):
 *   npx jest Pruebas_Unitarias/CU_07 --verbose
 *
 * Descripción  : Se usa el HTML real (admin_usuarios.html) y se simulan las
 *                respuestas de los PHP con un mock de fetch. Los 3 JS son
 *                módulos que se importan entre sí (en círculo); la prueba trae
 *                un cargador que los conecta en memoria igual que el navegador,
 *                y sustituye lanzar_toast.js, cookie.js y menu.js de ../js/ por
 *                simuladores. El código original NO se modifica.
 *
 * Cada prueba indica:
 *   - Función   : archivo › función que se prueba.
 *   - Comprueba : qué comportamiento se verifica.
 */
const fs = require('fs');
const path = require('path');

const RUTA_APPS = path.resolve(__dirname, '../../app');
const CARPETA = fs.readdirSync(RUTA_APPS).find((d) => d.startsWith('CU_07'));
if (!CARPETA) throw new Error(`No se encontró ninguna carpeta que empiece con "CU_07" dentro de ${RUTA_APPS}`);
const RUTA_APP = path.join(RUTA_APPS, CARPETA);
const HTML = fs.readFileSync(path.join(RUTA_APP, 'admin_usuarios.html'), 'utf8');
const BODY = HTML.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1].replace(/<script[\s\S]*?<\/script>/gi, '');

// =====================================================================
// CARGADOR DE MÓDULOS (no es una prueba)
// Como los módulos se importan en círculo, cada función importada se busca
// en su módulo al momento de llamarla (igual que hace el navegador).
// =====================================================================
function transformar(codigo) {
  const exportados = [];
  let n = 0;
  let js = codigo.replace(
    /import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"];?/g,
    (_, nombres, ruta) => {
      const modulo = `__m${n++}`;
      const lineas = nombres.split(',').map((x) => x.trim()).filter(Boolean).map((x) => {
        const [original, local = original] = x.split(/\s+as\s+/);
        return `const ${local} = (...a) => ${modulo}.${original}(...a);`;
      });
      return `const ${modulo} = __importar(${JSON.stringify(ruta)}); ${lineas.join(' ')}`;
    }
  );
  js = js.replace(/export\s*\{([^}]*)\};?/g, (_, nombres) => {
    nombres.split(',').map((x) => x.trim()).filter(Boolean).forEach((x) => exportados.push(x));
    return '';
  });
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
    modulos[archivo] = {}; // se llena al terminar de cargar (permite importaciones en círculo)
    const codigo = fs.readFileSync(path.join(RUTA_APP, archivo), 'utf8');
    // eslint-disable-next-line no-new-func
    Object.assign(modulos[archivo], new Function('__importar', transformar(codigo))(importar));
  }
  return modulos[archivo];
}

// =====================================================================
// DATOS SIMULADOS
// =====================================================================
const ALUMNOS = [
  { Nombre_Completo: 'Ana López Ruiz', Matricula: '20232389', Nombre_Carrera: 'Ing. en Computación', Fecha_registro: '2026-11-01 10:00:00', Servicio: 'Servicio social' },
  { Nombre_Completo: 'Luis Pérez Gómez', Matricula: '20231111', Nombre_Carrera: 'Ing. en Computación', Fecha_registro: '2026-11-02 11:00:00', Servicio: 'Prácticas profesionales' }
];
const COORDINADORES = [
  { Nombre_Completo: 'María Soto Ríos', Matricula: '1234', Nombre_Carrera: 'Ing. Química', Fecha_registro: '2026-10-20 09:00:00', Telefono: '2461112233', Correo: 'maria@uatx.mx' }
];

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
  for (let i = 0; i < 30; i++) await Promise.resolve();
}

function borrarCookies() {
  document.cookie.split('; ').filter(Boolean).forEach((c) => {
    document.cookie = `${c.split('=')[0]}=; max-age=0; path=/`;
  });
}

/** Carga admin_usuarios.html y sus JS en el mismo orden que el HTML. */
async function cargarPagina(tipo = '1', cambios = {}) {
  borrarCookies();
  if (tipo) document.cookie = `Id_tipo_usuario=${tipo}; path=/`;
  document.body.innerHTML = BODY;

  rutas = {
    'obtener_usuarios_pendientes.php': () => respuesta({ alumnos: ALUMNOS, coordinadores: tipo === '1' ? COORDINADORES : [] }),
    'cargar_expediente.php': () => respuesta({ success: true }),
    'procesar_validacion.php': () => respuesta({ success: true }),
    ...cambios
  };
  global.fetch = jest.fn((url, opciones) => rutas[url](opciones));

  modulos = {};
  importar('./aceptar_usuarios.js');
  importar('./rechazar_usuarios.js');
  importar('./admin_usuarios.js');

  document.dispatchEvent(new Event('DOMContentLoaded'));
  await esperarPromesas();
}

const $ = (id) => document.getElementById(id);
const filas = (id) => [...$(id).querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent.trim()));
const llamadasA = (archivo) => fetch.mock.calls.filter((c) => c[0] === archivo);
const cuerpo = (archivo, i = 0) => JSON.parse(llamadasA(archivo)[i][1].body);
const modal = () => $('modal-confirmacion');
const botonModal = (texto) => [...modal().querySelectorAll('button')].find((b) => b.textContent === texto);
const botonFila = (tabla, fila, texto) => [...$(tabla).querySelectorAll('tr')[fila].querySelectorAll('button')].find((b) => b.textContent === texto);
const avisosNavegacion = () => console.error.mock.calls
  .map((a) => String((a[0] && a[0].message) || a[0])).filter((t) => t.includes('navigation'));

/** Da clic en "Aceptar" de un alumno, escribe el expediente y da "Enviar". */
async function aceptarAlumnoConExpediente(fila = 0, expediente = 'EXP-2026-01') {
  botonFila('tabla-alumnos', fila, 'Aceptar').click();
  $('intput_expediente').value = expediente;
  botonModal('Enviar').click();
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
// admin_usuarios.js
// =====================================================================
describe('admin_usuarios.js', () => {

  describe('Función: listener "DOMContentLoaded" (tablas según el tipo de usuario)', () => {
    /**
     * Función   : admin_usuarios.js › listener "DOMContentLoaded" y cargarInformacion().
     * Comprueba : que el administrador (1) ve las dos tablas: coordinadores y alumnos pendientes.
     */
    test('[DOMContentLoaded] Comprueba que el administrador ve coordinadores y alumnos', async () => {
      await cargarPagina('1');

      expect(renderMenu).toHaveBeenCalled();
      expect($('div-coordinadores').style.display).toBe('block');
      expect($('div-alumnos').style.display).toBe('block');
      expect(filas('tabla-coordinadores')).toHaveLength(1);
      expect(filas('tabla-alumnos')).toHaveLength(2);
    });

    /**
     * Función   : admin_usuarios.js › listener "DOMContentLoaded" y cargarInformacion().
     * Comprueba : que el coordinador (3) solo ve la tabla de alumnos.
     */
    test('[DOMContentLoaded] Comprueba que el coordinador solo ve la tabla de alumnos', async () => {
      await cargarPagina('3');

      expect($('div-coordinadores').style.display).toBe('none');
      expect($('div-alumnos').style.display).toBe('block');
      expect(filas('tabla-alumnos')).toHaveLength(2);
      expect(filas('tabla-coordinadores')).toHaveLength(0);
    });

    /**
     * Función   : admin_usuarios.js › listener "DOMContentLoaded" y cargarInformacion() (alumno).
     * Comprueba : que un alumno (2) no ve ninguna tabla y es enviado a su perfil.
     */
    test('[DOMContentLoaded] Comprueba que un alumno no ve tablas y es enviado a su perfil', async () => {
      await cargarPagina('2', { 'obtener_usuarios_pendientes.php': () => respuesta({ tipo_usuario: '2' }) });

      expect($('div-coordinadores').style.display).toBe('none');
      expect($('div-alumnos').style.display).toBe('none');
      expect(avisosNavegacion().length).toBeGreaterThan(0);
    });

    /**
     * Función   : admin_usuarios.js › listener "DOMContentLoaded" (sin sesión).
     * Comprueba : que sin cookie de tipo de usuario no se piden datos.
     */
    test('[DOMContentLoaded] Comprueba que sin sesión no se piden datos', async () => {
      await cargarPagina(null);

      expect(fetch).not.toHaveBeenCalled();
    });

    /**
     * Función   : admin_usuarios.js › exposición en window.
     * Comprueba : que las funciones de aceptar y rechazar quedan disponibles para
     *             los botones de la tabla (onclick).
     */
    test('[window] Comprueba que las funciones de los botones están disponibles', async () => {
      await cargarPagina('1');

      ['aceptarAlumno', 'rechazarAlumno', 'aceptarCoordinador', 'rechazarCoordinador']
        .forEach((f) => expect(typeof window[f]).toBe('function'));
    });
  });

  describe('Función: renderTablaAlumnos() y renderTablaCoordinadores()', () => {
    /**
     * Función   : admin_usuarios.js › renderTablaAlumnos().
     * Comprueba : que cada alumno muestra nombre, matrícula, carrera, fecha,
     *             servicio y los botones Aceptar y Rechazar.
     */
    test('[renderTablaAlumnos] Comprueba las columnas de cada alumno', async () => {
      await cargarPagina('1');

      expect(filas('tabla-alumnos')[0].slice(0, 5))
        .toEqual(['Ana López Ruiz', '20232389', 'Ing. en Computación', '2026-11-01 10:00:00', 'Servicio social']);
      expect(botonFila('tabla-alumnos', 0, 'Aceptar')).toBeDefined();
      expect(botonFila('tabla-alumnos', 0, 'Rechazar')).toBeDefined();
    });

    /**
     * Función   : admin_usuarios.js › renderTablaCoordinadores().
     * Comprueba : que cada coordinador muestra nombre, matrícula, carrera,
     *             fecha, teléfono, correo y sus botones.
     */
    test('[renderTablaCoordinadores] Comprueba las columnas de cada coordinador', async () => {
      await cargarPagina('1');

      expect(filas('tabla-coordinadores')[0].slice(0, 6))
        .toEqual(['María Soto Ríos', '1234', 'Ing. Química', '2026-10-20 09:00:00', '2461112233', 'maria@uatx.mx']);
      expect(botonFila('tabla-coordinadores', 0, 'Aceptar')).toBeDefined();
    });

    /**
     * Función   : admin_usuarios.js › renderTablaAlumnos() (sin alumnos).
     * Comprueba : que sin alumnos pendientes la tabla queda vacía y a los 3 s
     *             se avisa "¡No hay alumnos pendientes!".
     */
    test('[renderTablaAlumnos] Comprueba el aviso cuando no hay alumnos pendientes', async () => {
      jest.useFakeTimers();
      await cargarPagina('3', { 'obtener_usuarios_pendientes.php': () => respuesta({ alumnos: [], coordinadores: [] }) });

      expect(filas('tabla-alumnos')).toHaveLength(0);
      expect(lanzarToast).not.toHaveBeenCalled();
      jest.advanceTimersByTime(3000);
      expect(lanzarToast).toHaveBeenCalledWith('¡No hay alumnos pendientes!    ', 'error');
    });

    /**
     * Función   : admin_usuarios.js › renderTablaCoordinadores() (sin coordinadores).
     * Comprueba : que sin coordinadores pendientes se avisa de inmediato.
     */
    test('[renderTablaCoordinadores] Comprueba el aviso cuando no hay coordinadores pendientes', async () => {
      await cargarPagina('1', { 'obtener_usuarios_pendientes.php': () => respuesta({ alumnos: ALUMNOS, coordinadores: [] }) });

      expect(lanzarToast).toHaveBeenCalledWith('No hay coordinadores pendientes', 'error');
    });
  });

  describe('Función: cargarInformacion() (errores)', () => {
    /**
     * Función   : admin_usuarios.js › cargarInformacion() (datos.error y catch).
     * Comprueba : que si el servidor responde un error se muestra, y si falla
     *             la conexión se avisa "No se pudieron cargar".
     */
    test.each([
      ['el servidor responde un error', () => respuesta({ error: 'Error al acceder a la base de datos' }, 500), 'Error al acceder a la base de datos'],
      ['falla la conexión', () => Promise.reject(new Error('Failed to fetch')), 'No se pudieron cargar'],
    ])('[cargarInformacion] Comprueba el aviso cuando %s', async (_d, ruta, mensaje) => {
      await cargarPagina('1', { 'obtener_usuarios_pendientes.php': ruta });

      expect(lanzarToast).toHaveBeenCalledWith(mensaje, 'error');
      expect(filas('tabla-alumnos')).toHaveLength(0);
    });
  });
});

// =====================================================================
// aceptar_usuarios.js
// =====================================================================
describe('aceptar_usuarios.js', () => {

  describe('Función: aceptarAlumno() y renderModalExpediente()', () => {
    beforeEach(async () => { await cargarPagina('3'); });

    /**
     * Función   : aceptar_usuarios.js › aceptarAlumno() y renderModalExpediente().
     * Comprueba : que "Aceptar" abre un modal que pide el No. de expediente del alumno.
     */
    test('[renderModalExpediente] Comprueba que "Aceptar" pide el No. de expediente', () => {
      botonFila('tabla-alumnos', 0, 'Aceptar').click();

      expect(modal().querySelector('p').textContent).toBe('Añadir No. de expediente al alumno con matrícula 20232389?');
      expect($('intput_expediente')).not.toBeNull();
      expect(fetch.mock.calls.filter((c) => c[0] !== 'obtener_usuarios_pendientes.php')).toHaveLength(0);
    });

    /**
     * Función   : aceptar_usuarios.js › renderModalExpediente() (Enviar vacío y Cancelar).
     * Comprueba : que "Enviar" sin expediente no hace nada y "Cancelar" cierra sin aceptar.
     */
    test('[renderModalExpediente] Comprueba que no envía sin expediente y que "Cancelar" cierra', async () => {
      botonFila('tabla-alumnos', 0, 'Aceptar').click();

      botonModal('Enviar').click();
      expect(modal()).not.toBeNull();

      botonModal('Cancelar').click();
      await esperarPromesas();
      expect(modal()).toBeNull();
      expect(llamadasA('cargar_expediente.php')).toHaveLength(0);
    });

    /**
     * Función   : aceptar_usuarios.js › aceptarAlumno() (flujo completo).
     * Comprueba : que primero guarda el expediente (cargar_expediente.php), luego
     *             acepta al alumno (procesar_validacion.php con "Aceptado"),
     *             avisa y recarga la tabla.
     */
    test('[aceptarAlumno] Comprueba que guarda el expediente, acepta al alumno y recarga la tabla', async () => {
      fetch.mockClear();

      await aceptarAlumnoConExpediente(1, 'EXP-2026-07');

      expect(cuerpo('cargar_expediente.php')).toEqual({ matricula: '20231111', no_expediente: 'EXP-2026-07' });
      expect(cuerpo('procesar_validacion.php')).toEqual({ matricula: '20231111', identificador: 'Aceptado' });
      expect(lanzarToast).toHaveBeenCalledWith('¡Expediente guardado y alumno aceptado!', 'exito');
      expect(llamadasA('obtener_usuarios_pendientes.php')).toHaveLength(1);
      expect(modal()).toBeNull();
    });

    /**
     * Función   : aceptar_usuarios.js › aceptarAlumno() (error al guardar el expediente).
     * Comprueba : que si el expediente no se guarda se muestra el error y el
     *             alumno NO se acepta.
     */
    test.each([
      ['responde un error', () => respuesta({ error: 'Error de actualizacion el numero de expediente' }, 500), 'Error de actualizacion el numero de expediente'],
      ['no responde success', () => respuesta({}), 'error al guardar el expediente'],
    ])('[aceptarAlumno] Comprueba que si cargar_expediente.php %s no se acepta al alumno', async (_d, ruta, mensaje) => {
      rutas['cargar_expediente.php'] = ruta;

      await aceptarAlumnoConExpediente();

      expect(lanzarToast).toHaveBeenCalledWith(mensaje, 'error');
      expect(llamadasA('procesar_validacion.php')).toHaveLength(0);
    });

    /**
     * Función   : aceptar_usuarios.js › aceptarAlumno() (error al aceptar).
     * Comprueba : que si procesar_validacion.php responde un error se muestra.
     */
    test('[aceptarAlumno] Comprueba el aviso si procesar_validacion.php responde error', async () => {
      rutas['procesar_validacion.php'] = () => respuesta({ error: 'No se pudo' }, 500);

      await aceptarAlumnoConExpediente();

      expect(lanzarToast).toHaveBeenCalledWith('No se pudo', 'error');
      expect(lanzarToast).not.toHaveBeenCalledWith('¡Expediente guardado y alumno aceptado!', 'exito');
    });

    /**
     * Función   : aceptar_usuarios.js › aceptarAlumno() (bloque catch).
     * Comprueba : que si falla la conexión se avisa "No se pudo aceptar al alumno".
     */
    test('[aceptarAlumno] Comprueba el aviso si falla la conexión', async () => {
      rutas['cargar_expediente.php'] = () => Promise.reject(new Error('Failed to fetch'));

      await aceptarAlumnoConExpediente();

      expect(lanzarToast).toHaveBeenCalledWith('No se pudo aceptar al alumno', 'error');
    });

    /**
     * Función   : aceptar_usuarios.js › renderModalExpediente() (reemplazo).
     * Comprueba : que nunca hay dos modales abiertos a la vez.
     */
    test('[renderModalExpediente] Comprueba que no se abren dos modales', () => {
      botonFila('tabla-alumnos', 0, 'Aceptar').click();
      botonFila('tabla-alumnos', 1, 'Aceptar').click();

      expect(document.querySelectorAll('#modal-confirmacion')).toHaveLength(1);
      expect(modal().querySelector('p').textContent).toContain('20231111');
    });
  });

  describe('Función: aceptarCoordinador()', () => {
    /**
     * Función   : aceptar_usuarios.js › aceptarCoordinador().
     * Comprueba : que "Aceptar" de un coordinador lo acepta de inmediato (sin
     *             expediente), avisa y recarga la tabla.
     */
    test('[aceptarCoordinador] Comprueba que acepta al coordinador y recarga la tabla', async () => {
      await cargarPagina('1');
      fetch.mockClear();

      botonFila('tabla-coordinadores', 0, 'Aceptar').click();
      await esperarPromesas();

      expect(cuerpo('procesar_validacion.php')).toEqual({ matricula: '1234', identificador: 'Aceptado' });
      expect(llamadasA('cargar_expediente.php')).toHaveLength(0);
      expect(lanzarToast).toHaveBeenCalledWith('¡Coordinador aceptado correctamente!    ', 'exito');
      expect(llamadasA('obtener_usuarios_pendientes.php')).toHaveLength(1);
    });

    /**
     * Función   : aceptar_usuarios.js › aceptarCoordinador() (bloque catch).
     * Comprueba : que si falla la conexión se avisa "No se pudo aceptar al coordinador".
     */
    test('[aceptarCoordinador] Comprueba el aviso si falla la conexión', async () => {
      await cargarPagina('1', { 'procesar_validacion.php': () => Promise.reject(new Error('x')) });

      botonFila('tabla-coordinadores', 0, 'Aceptar').click();
      await esperarPromesas();

      expect(lanzarToast).toHaveBeenCalledWith('No se pudo aceptar al coordinador', 'error');
    });
  });
});

// =====================================================================
// rechazar_usuarios.js
// =====================================================================
describe('rechazar_usuarios.js', () => {

  describe('Función: rechazarAlumno(), rechazarCoordinador() y renderModalConfirmacion()', () => {
    /**
     * Función   : rechazar_usuarios.js › rechazarAlumno() / rechazarCoordinador() y renderModalConfirmacion().
     * Comprueba : que "Rechazar" pide confirmación con la matrícula y "Cancelar"
     *             no rechaza a nadie.
     */
    test.each([
      ['alumno', 'tabla-alumnos', '¿Estás seguro de que deseas rechazar al alumno con matrícula 20232389?'],
      ['coordinador', 'tabla-coordinadores', '¿Estás seguro de que deseas rechazar al docente con matrícula 1234?'],
    ])('[renderModalConfirmacion] Comprueba la confirmación al rechazar un %s', async (_d, tabla, mensaje) => {
      await cargarPagina('1');

      botonFila(tabla, 0, 'Rechazar').click();
      expect(modal().querySelector('p').textContent).toBe(mensaje);

      botonModal('Cancelar').click();
      await esperarPromesas();
      expect(modal()).toBeNull();
      expect(llamadasA('procesar_validacion.php')).toHaveLength(0);
    });

    /**
     * Función   : rechazar_usuarios.js › rechazarAlumno() / rechazarCoordinador() (confirmado).
     * Comprueba : que al confirmar se envía "Rechazado", se avisa y se recarga la tabla.
     */
    test.each([
      ['alumno', 'tabla-alumnos', '20232389', 'Alumno rechazado con éxito'],
      ['coordinador', 'tabla-coordinadores', '1234', 'Coordinador rechazado con éxito'],
    ])('[rechazar] Comprueba que al confirmar se rechaza al %s', async (_d, tabla, matricula, mensaje) => {
      await cargarPagina('1');
      fetch.mockClear();

      botonFila(tabla, 0, 'Rechazar').click();
      botonModal('Rechazar').click();
      await esperarPromesas();

      expect(cuerpo('procesar_validacion.php')).toEqual({ matricula, identificador: 'Rechazado' });
      expect(lanzarToast).toHaveBeenCalledWith(mensaje, 'error');
      expect(llamadasA('obtener_usuarios_pendientes.php')).toHaveLength(1);
    });

    /**
     * Función   : rechazar_usuarios.js › rechazarAlumno() / rechazarCoordinador() (errores).
     * Comprueba : que si el servidor responde un error se muestra, y si falla la
     *             conexión se avisa que no se pudo rechazar.
     */
    test.each([
      ['alumno', 'tabla-alumnos', () => respuesta({ error: 'Error del servidor' }, 500), 'Error del servidor'],
      ['alumno', 'tabla-alumnos', () => Promise.reject(new Error('x')), 'No se pudo rechazar al alumno'],
      ['coordinador', 'tabla-coordinadores', () => respuesta({ error: 'Error del servidor' }, 500), 'Error del servidor'],
      ['coordinador', 'tabla-coordinadores', () => Promise.reject(new Error('x')), 'No se pudo rechazar al coordinador'],
    ])('[rechazar] Comprueba el aviso de error al rechazar un %s', async (_d, tabla, ruta, mensaje) => {
      await cargarPagina('1', { 'procesar_validacion.php': ruta });

      botonFila(tabla, 0, 'Rechazar').click();
      botonModal('Rechazar').click();
      await esperarPromesas();

      expect(lanzarToast).toHaveBeenCalledWith(mensaje, 'error');
    });

    /**
     * Función   : rechazar_usuarios.js › renderModalConfirmacion() (reemplazo).
     * Comprueba : que nunca hay dos confirmaciones abiertas a la vez.
     */
    test('[renderModalConfirmacion] Comprueba que no se abren dos confirmaciones', async () => {
      await cargarPagina('1');

      botonFila('tabla-alumnos', 0, 'Rechazar').click();
      botonFila('tabla-alumnos', 1, 'Rechazar').click();

      expect(document.querySelectorAll('#modal-confirmacion')).toHaveLength(1);
    });
  });
});