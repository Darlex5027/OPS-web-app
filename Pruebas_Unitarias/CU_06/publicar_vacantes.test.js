/**
 * @jest-environment jsdom
 *
 * Archivo      : publicar_vacantes.test.js
 * Módulo       : CU_06 PublicarVacantes (Pruebas unitarias)
 * Archivos bajo prueba (en la carpeta de app/ que empieza con "CU_06"):
 *   mostrar_contenido.js
 *   enviar_vacantes.js
 * Herramienta  : Jest + jsdom
 *
 * Cómo correrlo (desde OPS-web-app):
 *   npx jest Pruebas_Unitarias/CU_06 --verbose
 *
 * Descripción  : Se usa el HTML real (admin_vacantes.html) y se simulan las
 *                respuestas de los PHP con un mock de fetch. Los JS son módulos
 *                que se importan entre sí y que importan lanzar_toast.js,
 *                cookie.js y menu.js de ../js/; la prueba los conecta en memoria
 *                y sustituye los de ../js/ por simuladores.
 *                El código original NO se modifica.
 *
 * Cada prueba indica:
 *   - Función   : archivo › función que se prueba.
 *   - Comprueba : qué comportamiento se verifica.
 */
const fs = require('fs');
const path = require('path');

const RUTA_APPS = path.resolve(__dirname, '../../app');
const CARPETA = fs.readdirSync(RUTA_APPS).find((d) => d.startsWith('CU_06'));
if (!CARPETA) throw new Error(`No se encontró ninguna carpeta que empiece con "CU_06" dentro de ${RUTA_APPS}`);
const RUTA_APP = path.join(RUTA_APPS, CARPETA);
const HTML = fs.readFileSync(path.join(RUTA_APP, 'admin_vacantes.html'), 'utf8');
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
    const codigo = fs.readFileSync(path.join(RUTA_APP, archivo), 'utf8');
    modulos[archivo] = {};
    // eslint-disable-next-line no-new-func
    modulos[archivo] = new Function('__importar', transformar(codigo))(importar);
  }
  return modulos[archivo];
}

// =====================================================================
// DATOS SIMULADOS
// =====================================================================
const EMPRESAS = [{ Id_empresa: 5, Nombre: 'Acme' }, { Id_empresa: 6, Nombre: 'Beta' }];
const SERVICIOS = [{ Id_servicio: 1, Servicio: 'Prácticas profesionales' }, { Id_servicio: 2, Servicio: 'Servicio social' }];

/** Fecha de hoy en la Ciudad de México (igual que la calcula el JS). */
const HOY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const FUTURA = '2099-12-31';

// =====================================================================
// FUNCIONES DE APOYO (no son pruebas)
// =====================================================================
let lanzarToast;
let renderMenu;
let rutas;
let listeners;

function respuesta(cuerpo, status = 200) {
  const texto = typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo);
  return Promise.resolve({
    status, ok: status >= 200 && status < 300,
    json: () => Promise.resolve(JSON.parse(texto)),
    text: () => Promise.resolve(texto)
  });
}

async function esperarPromesas() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

function borrarCookies() {
  document.cookie.split('; ').filter(Boolean).forEach((c) => {
    document.cookie = `${c.split('=')[0]}=; max-age=0; path=/`;
  });
}

/** Carga admin_vacantes.html y sus JS como lo haría el navegador. */
async function cargarPagina(tipo = '3', cambios = {}) {
  borrarCookies();
  document.cookie = `Id_tipo_usuario=${tipo}; path=/`;
  document.body.innerHTML = BODY;

  rutas = {
    'obtener_empresas.php': () => respuesta(EMPRESAS),
    'obtener_servicios.php': () => respuesta(SERVICIOS),
    'guardar_vacante.php': () => respuesta({ success: true }),
    ...cambios
  };
  global.fetch = jest.fn((url, opciones) => rutas[url](opciones));

  modulos = {};
  importar('./mostrar_contenido.js');
  importar('./enviar_vacantes.js');

  document.dispatchEvent(new Event('DOMContentLoaded'));
  await esperarPromesas();
}

const $ = (id) => document.getElementById(id);
const visible = (id) => $(id).style.display !== 'none';
const opciones = (id) => [...$(id).options].map((o) => [o.value, o.text]);
const llamadasA = (archivo) => fetch.mock.calls.filter((c) => c[0] === archivo);
const formEnviado = () => llamadasA('guardar_vacante.php')[0][1].body;

function elegirModo(modo) {
  $('opciones').value = modo;
  $('opciones').dispatchEvent(new Event('change'));
}

function elegirArchivo(archivo) {
  Object.defineProperty($('flayer'), 'files', { value: archivo ? [archivo] : [], configurable: true });
}

/** Llena el registro manual con datos válidos (se pueden cambiar campos). */
function llenarManual(cambios = {}) {
  const d = {
    titulo_manual: 'Desarrollador web', empresa_manual: '5', servicio_manual: '2',
    nombre_contacto: 'María Soto', email: 'maria@acme.mx', telefono: '2461234567',
    descripcion: 'Apoyo en sitio web', requisitos: 'HTML y CSS', expiracion_manual: FUTURA, ...cambios
  };
  Object.entries(d).forEach(([id, v]) => { $(id).value = v; });
}

/** Cambia a registro con flyer y lo llena con datos válidos. */
function llenarFlyer(cambios = {}, archivo = new File(['x'], 'flyer.png', { type: 'image/png' })) {
  elegirModo('flayer');
  const d = { titulo_flayer: 'Vacante con flyer', empresa_flayer: '6', servicio_flayer: '1', expiracion_flayer: FUTURA, ...cambios };
  Object.entries(d).forEach(([id, v]) => { $(id).value = v; });
  elegirArchivo(archivo);
}

function llenarNuevaEmpresa() {
  const d = {
    nombre_empresa: 'Nueva SA', descripcion_empresa: 'Software', razon_empresa: 'Nueva Sociedad Anónima',
    rfc_empresa: 'NUE123456AB1', direccion_empresa: 'Calle 1', web_empresa: 'nueva.mx'
  };
  Object.entries(d).forEach(([id, v]) => { $(id).value = v; });
}

async function enviar() {
  $('miFormulario').dispatchEvent(new Event('submit', { cancelable: true }));
  await esperarPromesas();
}

const avisosNavegacion = () => console.error.mock.calls
  .map((a) => String((a[0] && a[0].message) || a[0])).filter((t) => t.includes('navigation'));

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

  // Se anotan los listeners de document y window para quitarlos al terminar
  listeners = [];
  const original = EventTarget.prototype.addEventListener;
  [document, window].forEach((objetivo) => {
    jest.spyOn(objetivo, 'addEventListener').mockImplementation(function (tipo, fn, op) {
      listeners.push([objetivo, tipo, fn, op]);
      return original.call(objetivo, tipo, fn, op);
    });
  });
});

afterEach(() => {
  listeners.forEach(([objetivo, tipo, fn, op]) => objetivo.removeEventListener(tipo, fn, op));
  jest.useRealTimers();
  jest.restoreAllMocks();
  delete global.fetch;
  borrarCookies();
});

// =====================================================================
// mostrar_contenido.js
// =====================================================================
describe('mostrar_contenido.js', () => {

  describe('Función: inicialización (DOMContentLoaded)', () => {
    /**
     * Función   : mostrar_contenido.js › listener "DOMContentLoaded".
     * Comprueba : que dibuja el menú, empieza en "Registro manual", oculta la
     *             nueva empresa y carga empresas y servicios.
     */
    test('[DOMContentLoaded] Comprueba el estado inicial de la página', async () => {
      await cargarPagina('3');

      expect(renderMenu).toHaveBeenCalled();
      expect(visible('registro_manual')).toBe(true);
      expect(visible('registro_flayer')).toBe(false);
      expect(visible('nueva_empresa')).toBe(false);
      expect(llamadasA('obtener_empresas.php').length).toBeGreaterThan(0);
      expect(llamadasA('obtener_servicios.php').length).toBeGreaterThan(0);
    });

    /**
     * Función   : mostrar_contenido.js › listener "DOMContentLoaded" (tipo 2).
     * Comprueba : que un alumno no puede publicar: se le manda a su perfil y no
     *             se cargan datos.
     */
    test('[DOMContentLoaded] Comprueba que un alumno es enviado a su perfil', async () => {
      await cargarPagina('2');

      expect(avisosNavegacion().length).toBeGreaterThan(0);
      expect(fetch).not.toHaveBeenCalled();
    });

    /**
     * Función   : mostrar_contenido.js › listener "load" de window.
     * Comprueba : que al terminar de cargar la página se limpia el formulario.
     */
    test('[load] Comprueba que al terminar de cargar se limpia el formulario', async () => {
      await cargarPagina('3');
      $('titulo_manual').value = 'Escrito antes';

      window.dispatchEvent(new Event('load'));

      expect($('titulo_manual').value).toBe('');
    });
  });

  describe('Función: renderFecha()', () => {
    /**
     * Función   : mostrar_contenido.js › renderFecha().
     * Comprueba : que en ambos registros se muestra la fecha de hoy (Ciudad de
     *             México) como fecha de registro.
     */
    test('[renderFecha] Comprueba que muestra la fecha de hoy en ambos registros', async () => {
      await cargarPagina('3');

      expect($('fecha_Manual').textContent).toBe(`Fecha de registro:  ${HOY}`);
      expect($('fecha_flayer').textContent).toBe(`Fecha de registro:  ${HOY}`);
    });
  });

  describe('Función: fetchEmpresas() y fetchServicios()', () => {
    /**
     * Función   : mostrar_contenido.js › fetchEmpresas() y fetchServicios().
     * Comprueba : que llenan los selects de empresa y servicio de ambos registros.
     */
    test('[fetchEmpresas / fetchServicios] Comprueba que llenan los selects de ambos registros', async () => {
      await cargarPagina('3');

      const empresas = [['', '-- Selecciona una empresa --'], ['5', 'Acme'], ['6', 'Beta']];
      const servicios = [['', '-- Selecciona un Servicio --'], ['1', 'Prácticas profesionales'], ['2', 'Servicio social']];
      expect(opciones('empresa_manual')).toEqual(empresas);
      expect(opciones('empresa_flayer')).toEqual(empresas);
      expect(opciones('servicio_manual')).toEqual(servicios);
      expect(opciones('servicio_flayer')).toEqual(servicios);
    });

    /**
     * Función   : mostrar_contenido.js › fetchEmpresas() y fetchServicios() (bloque catch).
     * Comprueba : que si falla la carga se avisa con su mensaje.
     */
    test.each([
      ['obtener_empresas.php', 'La empresa no se pudo cargar'],
      ['obtener_servicios.php', 'El servicio no se pudo cargar'],
    ])('[fetchEmpresas / fetchServicios] Comprueba el aviso si falla %s', async (archivo, mensaje) => {
      await cargarPagina('3', { [archivo]: () => Promise.reject(new Error('sin red')) });

      expect(lanzarToast).toHaveBeenCalledWith(mensaje, 'error');
    });
  });

  describe('Función: handleCambioContenido()', () => {
    /**
     * Función   : mostrar_contenido.js › handleCambioContenido().
     * Comprueba : que al elegir "Registro con flyer" se muestra ese formulario y
     *             se oculta el manual (y al revés).
     */
    test('[handleCambioContenido] Comprueba el cambio entre registro manual y con flyer', async () => {
      await cargarPagina('3');

      elegirModo('flayer');
      expect(visible('registro_flayer')).toBe(true);
      expect(visible('registro_manual')).toBe(false);

      elegirModo('manual');
      expect(visible('registro_manual')).toBe(true);
      expect(visible('registro_flayer')).toBe(false);
    });

    /**
     * Función   : mostrar_contenido.js › handleCambioContenido() (reinicio de empresa).
     * Comprueba : que al cambiar de modo se cierra el formulario de nueva
     *             empresa y se vuelven a habilitar los selects.
     */
    test('[handleCambioContenido] Comprueba que al cambiar de modo se cierra la nueva empresa', async () => {
      await cargarPagina('3');
      $('btn-activar-nueva-manual').click();

      elegirModo('flayer');

      expect(visible('nueva_empresa')).toBe(false);
      expect($('empresa_manual').disabled).toBe(false);
      expect($('btn-activar-nueva-manual').style.display).toBe('inline-block');
    });
  });

  describe('Función: handleMostrarFormularioNuevaEmpresa() y handleCancelarRegistro()', () => {
    /**
     * Función   : mostrar_contenido.js › handleMostrarFormularioNuevaEmpresa().
     * Comprueba : que "+ Crear Nueva" muestra el formulario de empresa, bloquea
     *             y vacía el select de empresa y oculta el botón (en cada modo).
     */
    test.each([
      ['manual', 'empresa_manual', 'btn-activar-nueva-manual'],
      ['flayer', 'empresa_flayer', 'btn-activar-nueva-flayer'],
    ])('[handleMostrarFormularioNuevaEmpresa] Comprueba "+ Crear Nueva" en modo %s', async (modo, idSelect, idBoton) => {
      await cargarPagina('3');
      elegirModo(modo);
      $(idSelect).value = '5';

      $(idBoton).click();

      expect(visible('nueva_empresa')).toBe(true);
      expect($(idSelect).disabled).toBe(true);
      expect($(idSelect).value).toBe('');
      expect($(idBoton).style.display).toBe('none');
    });

    /**
     * Función   : mostrar_contenido.js › handleCancelarRegistro().
     * Comprueba : que "Cancelar y elegir existente" oculta el formulario de
     *             empresa y vuelve a habilitar el select y el botón.
     */
    test('[handleCancelarRegistro] Comprueba que cancela la nueva empresa', async () => {
      await cargarPagina('3');
      $('btn-activar-nueva-manual').click();

      document.querySelector('#nueva_empresa button').click();

      expect(visible('nueva_empresa')).toBe(false);
      expect($('empresa_manual').disabled).toBe(false);
      expect($('btn-activar-nueva-manual').style.display).toBe('inline-block');
    });
  });

  describe('Función: validación del tamaño del flyer (onchange)', () => {
    /**
     * Función   : mostrar_contenido.js › elInputFlayer.onchange.
     * Comprueba : que un archivo de más de 20 MB se rechaza y se quita, y uno
     *             de 20 MB o menos se acepta.
     */
    test('[flayer.onchange] Comprueba el límite de 20 MB del flyer', async () => {
      await cargarPagina('3');
      const limpiar = jest.spyOn($('flayer'), 'value', 'set');

      elegirArchivo({ size: 20971520, type: 'image/png' });
      $('flayer').onchange();
      expect(lanzarToast).not.toHaveBeenCalled();

      elegirArchivo({ size: 20971521, type: 'image/png' });
      $('flayer').onchange();
      expect(lanzarToast).toHaveBeenCalledWith('El archivo no puede ser mayor a 20 MB', 'error');
      expect(limpiar).toHaveBeenCalledWith('');
    });
  });

  describe('Función: validarFormulario() (registro manual)', () => {
    beforeEach(async () => { await cargarPagina('3'); });

    /**
     * Función   : mostrar_contenido.js › validarFormulario() (campos del modo manual).
     * Comprueba : que cada campo obligatorio vacío muestra "<campo> no puede
     *             estar vacío" y no se envía nada.
     */
    test.each([
      ['titulo_manual', 'Título'], ['servicio_manual', 'Servicio'], ['nombre_contacto', 'Nombre del contacto'],
      ['email', 'Email'], ['telefono', 'Teléfono'], ['descripcion', 'Descripción'],
      ['requisitos', 'Requisitos'], ['expiracion_manual', 'Fecha de expiración'],
    ])('[validarFormulario] Comprueba que exige el campo %s', async (id, nombre) => {
      llenarManual({ [id]: '' });

      await enviar();

      expect(lanzarToast).toHaveBeenCalledWith(`${nombre} no puede estar vacío`, 'error');
      expect(llamadasA('guardar_vacante.php')).toHaveLength(0);
    });

    /**
     * Función   : mostrar_contenido.js › validarFormulario() (empresa).
     * Comprueba : que hay que elegir una empresa, o escribir el nombre de la
     *             nueva empresa si se está creando una.
     */
    test('[validarFormulario] Comprueba que exige empresa (existente o nueva con nombre)', async () => {
      llenarManual({ empresa_manual: '' });
      await enviar();
      expect(lanzarToast).toHaveBeenCalledWith('Empresa no puede estar vacío', 'error');

      $('btn-activar-nueva-manual').click();
      await enviar();
      expect(lanzarToast).toHaveBeenCalledWith('Nombre de la empresa no puede estar vacío', 'error');
      expect(llamadasA('guardar_vacante.php')).toHaveLength(0);
    });

    /**
     * Función   : mostrar_contenido.js › validarFormulario() (espacios).
     * Comprueba : que un campo con solo espacios cuenta como vacío.
     */
    test('[validarFormulario] Comprueba que un campo con solo espacios cuenta como vacío', async () => {
      llenarManual({ titulo_manual: '    ' });

      await enviar();

      expect(lanzarToast).toHaveBeenCalledWith('Título no puede estar vacío', 'error');
    });
  });

  describe('Función: validarFormulario() (registro con flyer)', () => {
    beforeEach(async () => { await cargarPagina('3'); });

    /**
     * Función   : mostrar_contenido.js › validarFormulario() (archivo del flyer).
     * Comprueba : que hay que elegir un flyer y que solo se aceptan JPG, PNG o PDF.
     */
    test.each([
      ['sin archivo', null, 'Flyer no puede estar vacío'],
      ['un GIF', new File(['x'], 'a.gif', { type: 'image/gif' }), 'Solo se permiten archivos JPG, PNG o PDF'],
      ['un Word', new File(['x'], 'a.docx', { type: 'application/msword' }), 'Solo se permiten archivos JPG, PNG o PDF'],
    ])('[validarFormulario] Comprueba que rechaza el flyer: %s', async (_d, archivo, mensaje) => {
      llenarFlyer({}, archivo);

      await enviar();

      expect(lanzarToast).toHaveBeenCalledWith(mensaje, 'error');
      expect(llamadasA('guardar_vacante.php')).toHaveLength(0);
    });

    /**
     * Función   : mostrar_contenido.js › validarFormulario() (campos del modo flyer).
     * Comprueba : que título, servicio, fecha y empresa son obligatorios.
     */
    test.each([
      ['titulo_flayer', 'Título no puede estar vacío'],
      ['servicio_flayer', 'Servicio no puede estar vacío'],
      ['expiracion_flayer', 'Fecha de expiración no puede estar vacío'],
      ['empresa_flayer', 'Empresa no puede estar vacío'],
    ])('[validarFormulario] Comprueba que en modo flyer exige %s', async (id, mensaje) => {
      llenarFlyer({ [id]: '' });

      await enviar();

      expect(lanzarToast).toHaveBeenCalledWith(mensaje, 'error');
      expect(llamadasA('guardar_vacante.php')).toHaveLength(0);
    });

    /**
     * Función   : mostrar_contenido.js › validarFormulario() (tipos permitidos).
     * Comprueba : que JPG, PNG y PDF sí se aceptan.
     */
    test.each(['image/jpeg', 'image/png', 'application/pdf'])('[validarFormulario] Comprueba que acepta un flyer %s', async (tipo) => {
      llenarFlyer({}, new File(['x'], 'flyer', { type: tipo }));

      await enviar();

      expect(llamadasA('guardar_vacante.php')).toHaveLength(1);
    });
  });
});

// =====================================================================
// enviar_vacantes.js
// =====================================================================
describe('enviar_vacantes.js', () => {
  beforeEach(async () => { await cargarPagina('3'); });

  describe('Función: listener "submit" de #miFormulario (fecha de expiración)', () => {
    /**
     * Función   : enviar_vacantes.js › listener "submit" (fecha de expiración).
     * Comprueba : que la fecha de expiración debe ser POSTERIOR a hoy (hoy o
     *             una fecha pasada se rechazan) en ambos modos.
     */
    test.each([
      ['manual', 'hoy', () => llenarManual({ expiracion_manual: HOY })],
      ['manual', 'una fecha pasada', () => llenarManual({ expiracion_manual: '2020-01-01' })],
      ['flyer', 'hoy', () => llenarFlyer({ expiracion_flayer: HOY })],
      ['flyer', 'una fecha pasada', () => llenarFlyer({ expiracion_flayer: '2020-01-01' })],
    ])('[submit] Comprueba que en modo %s rechaza como expiración %s', async (_m, _d, llenar) => {
      llenar();

      await enviar();

      expect(lanzarToast).toHaveBeenCalledWith('La fecha de expiracion debe de ser mayor que la actual', 'error');
      expect(llamadasA('guardar_vacante.php')).toHaveLength(0);
    });
  });

  describe('Función: listener "submit" (armado del FormData)', () => {
    /**
     * Función   : enviar_vacantes.js › listener "submit" (registro manual, empresa existente).
     * Comprueba : que se envían a guardar_vacante.php todos los datos de la
     *             vacante, la fecha de hoy como publicación y el Id de la empresa.
     */
    test('[submit] Comprueba los datos del registro manual con empresa existente', async () => {
      llenarManual();

      await enviar();

      expect(llamadasA('guardar_vacante.php')[0][1].method).toBe('POST');
      expect(Object.fromEntries(formEnviado().entries())).toEqual({
        tipo_registro: 'manual', titulo: 'Desarrollador web', Id_servicio: '2', nombre_contacto: 'María Soto',
        email: 'maria@acme.mx', telefono: '2461234567', descripcion: 'Apoyo en sitio web', requisitos: 'HTML y CSS',
        publicacion: HOY, expiracion: FUTURA, nueva_empresa: 'false', Id_empresa: '5'
      });
    });

    /**
     * Función   : enviar_vacantes.js › listener "submit" (registro manual, nueva empresa).
     * Comprueba : que con nueva empresa se envían sus datos y NO un Id_empresa.
     */
    test('[submit] Comprueba los datos del registro manual con nueva empresa', async () => {
      llenarManual();
      $('btn-activar-nueva-manual').click();
      llenarNuevaEmpresa();

      await enviar();

      const datos = Object.fromEntries(formEnviado().entries());
      expect(datos).toMatchObject({
        nueva_empresa: 'true', nombre_empresa: 'Nueva SA', descripcion_empresa: 'Software',
        razon_empresa: 'Nueva Sociedad Anónima', rfc_empresa: 'NUE123456AB1', direccion_empresa: 'Calle 1', web_empresa: 'nueva.mx'
      });
      expect(datos).not.toHaveProperty('Id_empresa');
    });

    /**
     * Función   : enviar_vacantes.js › listener "submit" (registro con flyer).
     * Comprueba : que se envía el archivo del flyer con título, servicio,
     *             fechas y empresa, sin los datos de contacto del modo manual.
     */
    test('[submit] Comprueba los datos del registro con flyer', async () => {
      const archivo = new File(['x'], 'flyer.pdf', { type: 'application/pdf' });
      llenarFlyer({}, archivo);

      await enviar();

      const form = formEnviado();
      expect(form.get('archivo_flayer').name).toBe('flyer.pdf');
      const datos = Object.fromEntries([...form.entries()].filter(([k]) => k !== 'archivo_flayer'));
      expect(datos).toEqual({
        tipo_registro: 'flayer', titulo: 'Vacante con flyer', Id_servicio: '1',
        publicacion: HOY, expiracion: FUTURA, nueva_empresa: 'false', Id_empresa: '6'
      });
    });
  });

  describe('Función: fetchGuardarVacante()', () => {
    /**
     * Función   : enviar_vacantes.js › fetchGuardarVacante() (éxito).
     * Comprueba : que al publicar se avisa, se limpia el formulario conservando
     *             el modo, se recargan empresas y servicios y se habilita el botón.
     */
    test('[fetchGuardarVacante] Comprueba que al publicar limpia el formulario y conserva el modo', async () => {
      llenarFlyer();
      fetch.mockClear();

      await enviar();

      expect(lanzarToast).toHaveBeenCalledWith('Publicacion exitosa', 'exito');
      expect($('opciones').value).toBe('flayer');
      expect(visible('registro_flayer')).toBe(true);
      expect($('titulo_flayer').value).toBe('');
      expect(llamadasA('obtener_empresas.php').length).toBeGreaterThan(0);
      expect(llamadasA('obtener_servicios.php').length).toBeGreaterThan(0);
      expect($('btnEnviar').disabled).toBe(false);
    });

    /**
     * Función   : enviar_vacantes.js › fetchGuardarVacante() (botón deshabilitado).
     * Comprueba : que el botón "Enviar" se bloquea mientras se guarda (evita doble envío).
     */
    test('[fetchGuardarVacante] Comprueba que bloquea el botón mientras guarda', async () => {
      rutas['guardar_vacante.php'] = () => new Promise(() => {});
      llenarManual();

      await enviar();

      expect($('btnEnviar').disabled).toBe(true);
    });

    /**
     * Función   : enviar_vacantes.js › fetchGuardarVacante() (nueva empresa).
     * Comprueba : que con nueva empresa se avisa "Empresa creada exitosamente"
     *             y 3.5 s después "Publicacion exitosa".
     */
    test('[fetchGuardarVacante] Comprueba los dos avisos cuando se crea una empresa', async () => {
      jest.useFakeTimers();
      llenarManual();
      $('btn-activar-nueva-manual').click();
      llenarNuevaEmpresa();

      await enviar();
      expect(lanzarToast).toHaveBeenCalledWith('Empresa creada exitosamente', 'exito');
      expect(lanzarToast).not.toHaveBeenCalledWith('Publicacion exitosa', 'exito');

      jest.advanceTimersByTime(3500);
      expect(lanzarToast).toHaveBeenCalledWith('Publicacion exitosa', 'exito');
    });

    /**
     * Función   : enviar_vacantes.js › fetchGuardarVacante() (respuesta 401).
     * Comprueba : que si la sesión expiró se avisa y a los 3 s se manda al login.
     */
    test('[fetchGuardarVacante] Comprueba que con sesión expirada (401) redirige al login', async () => {
      jest.useFakeTimers();
      rutas['guardar_vacante.php'] = () => respuesta({ success: false }, 401);
      llenarManual();

      await enviar();
      expect(lanzarToast).toHaveBeenCalledWith('La sesión expiró', 'error');

      console.error.mockClear();
      jest.advanceTimersByTime(3000);
      expect(avisosNavegacion().length).toBeGreaterThan(0);
    });

    /**
     * Función   : enviar_vacantes.js › fetchGuardarVacante() (error HTTP y de red).
     * Comprueba : que ante un error se muestra el texto recibido y se vuelve a
     *             habilitar el botón.
     */
    test.each([
      ['un error 500', () => respuesta('{"success":false,"error":"Error de conexión: x"}', 500), '{"success":false,"error":"Error de conexión: x"}'],
      ['un fallo de red', () => Promise.reject(new Error('Failed to fetch')), 'Failed to fetch'],
    ])('[fetchGuardarVacante] Comprueba el aviso ante %s', async (_d, ruta, mensaje) => {
      rutas['guardar_vacante.php'] = ruta;
      llenarManual();

      await enviar();

      expect(lanzarToast).toHaveBeenCalledWith(mensaje, 'error');
      expect($('btnEnviar').disabled).toBe(false);
    });
  });
});