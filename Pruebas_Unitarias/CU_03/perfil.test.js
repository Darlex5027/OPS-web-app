/**
 * @jest-environment jsdom
 *
 * Archivo      : perfil.test.js
 * Módulo       : CU_03_PerfilGestionable (Pruebas unitarias)
 * Archivos bajo prueba :
 *   app/CU_03_PerfilGestionable/mostrar_contenido.js
 *   app/CU_03_PerfilGestionable/editar_guardar_perfil.js
 *   app/CU_03_PerfilGestionable/editar_guardar_act_alum.js
 *   app/CU_03_PerfilGestionable/modal_dinamico.js
 *   app/CU_03_PerfilGestionable/menu.js
 * Herramienta  : Jest + jsdom
 *
 * Cómo correrlo (desde OPS-web-app):
 *   npx jest Pruebas_Unitarias/CU_03 --verbose
 *
 * Descripción  : Se usa el HTML real (perfil.html) y se simulan las respuestas de
 *                los PHP con un mock de fetch, así no se necesita servidor.
 *                Los JS son módulos que se importan entre sí; la prueba trae un
 *                pequeño cargador que los conecta en memoria y sustituye los
 *                módulos externos (../js/lanzar_toast.js y ../js/menu.js) por
 *                simuladores. El código original NO se modifica.
 *
 * Cada prueba indica:
 *   - Función   : archivo › función que se está probando.
 *   - Comprueba : qué comportamiento se verifica.
 */
const fs = require('fs');
const path = require('path');

const RUTA_APP = path.resolve(__dirname, '../../app/CU_03_PerfilGestionable');
const HTML = fs.readFileSync(path.join(RUTA_APP, 'perfil.html'), 'utf8');
const BODY = HTML.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];

// =====================================================================
// CARGADOR DE MÓDULOS (no es una prueba)
// Convierte "import { a } from 'x'" y "export function f" en código que se
// puede ejecutar con new Function, conectando los módulos entre sí.
// =====================================================================
function transformar(codigo) {
  const exportados = [];
  let js = codigo.replace(
    /import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"];?/g,
    (_, nombres, ruta) => {
      const lista = nombres.split(',').map((n) => n.trim()).filter(Boolean)
        .map((n) => n.replace(/\s+as\s+/, ': '));
      return `const { ${lista.join(', ')} } = __importar(${JSON.stringify(ruta)});`;
    }
  );
  js = js.replace(/export\s+((?:async\s+)?function|const|let)\s+([A-Za-z_$][\w$]*)/g, (_, tipo, nombre) => {
    exportados.push(nombre);
    return `${tipo} ${nombre}`;
  });
  return `"use strict";\n${js}\nreturn { ${exportados.join(', ')} };`;
}

let externos;   // módulos de ../js/ simulados
let modulos;    // caché de módulos ya cargados

function importar(ruta) {
  const archivo = path.basename(ruta.split('?')[0]);
  if (ruta.startsWith('../js/')) return externos[archivo];
  if (!modulos[archivo]) {
    const codigo = fs.readFileSync(path.join(RUTA_APP, archivo), 'utf8');
    modulos[archivo] = {}; // evita ciclos
    // eslint-disable-next-line no-new-func
    modulos[archivo] = new Function('__importar', transformar(codigo))(importar);
  }
  return modulos[archivo];
}

// =====================================================================
// DATOS SIMULADOS
// =====================================================================
const CATALOGOS = {
  empresas: [{ Id_empresa: 5, Nombre: 'Acme' }, { Id_empresa: 6, Nombre: 'Beta' }],
  servicios: [{ Id_servicio: 1, Servicio: 'Prácticas profesionales' }, { Id_servicio: 2, Servicio: 'Servicio social' }],
  periodos: ['primavera', 'otoño']
};

const DATOS_ALUMNO = {
  Nombre: 'Ana', Apellido_P: 'López', Apellido_M: 'Ruiz', Nombre_Carrera: 'Ing. en Computación',
  Grupo: '7A', Horario: '8:00 - 14:00:00', Fecha_registro: '2026-01-15', Profile_picture_path: null,
  Tiene_actividad: true, No_expediente: 'EXP-001', Id_empresa: 5, Nombre_empresa: 'Acme',
  Area: 'Sistemas', Programa: 'Apoyo TI', Estado: 'PENDIENTE', periodo_tipo: 'primavera',
  'periodo_año': 2026, Fecha_inicio: '2026-02-01', Fecha_fin: '2026-06-30',
  Fecha_registro_act: '2026-01-20', Fecha_modificacion: null, Nombre_servicio: 'Servicio social'
};

const DATOS_ADMIN = {
  Nombre: 'Luis', Apellido_P: 'Pérez', Apellido_M: 'Gómez', Nombre_Carrera: 'Ing. Química',
  Telefono: '246-5444-885', Correo: 'luis@uatx.mx', Fecha_registro: '2025-08-01',
  Profile_picture_path: '../uploads/Perfil/3-4.jpg'
};

// =====================================================================
// FUNCIONES DE APOYO (no son pruebas)
// =====================================================================
let lanzarToast;
let renderMenu;
let rutas;
let listeners;

/** Copia independiente de un objeto (para que una prueba no afecte a otra). */
const copiar = (obj) => JSON.parse(JSON.stringify(obj));

function respuesta(json, status = 200) {
  return Promise.resolve({ status, json: () => Promise.resolve(json) });
}

async function esperarPromesas() {
  for (let i = 0; i < 30; i++) await Promise.resolve();
}

function borrarCookies() {
  document.cookie.split('; ').filter(Boolean).forEach((c) => {
    document.cookie = `${c.split('=')[0]}=; max-age=0; path=/`;
  });
}

/**
 * Carga perfil.html y sus JS como lo haría el navegador.
 * @param {string} tipo      Id_tipo_usuario de la cookie ('1', '2', '3' o null)
 * @param {object} perfil    Respuesta de obtener_datos.php
 * @param {object} cambios   Otras respuestas simuladas por archivo PHP
 */
async function cargarPerfil(tipo = '2', perfil = null, cambios = {}) {
  borrarCookies();
  if (tipo) document.cookie = `Id_tipo_usuario=${tipo}; path=/`;
  document.body.innerHTML = BODY;

  const respuestaPerfil = perfil ?? (tipo === '2'
    ? { success: true, datos: { ...DATOS_ALUMNO }, catalogos: copiar(CATALOGOS) }
    : { success: true, datos: { ...DATOS_ADMIN }, catalogos: null });

  rutas = {
    'obtener_datos.php': () => respuesta(respuestaPerfil),
    'crear.php': () => respuesta({ success: true }),
    'guardar_datos.php': () => respuesta({ success: true, url: null }),
    ...cambios
  };
  global.fetch = jest.fn((url, opciones) => rutas[url](opciones));

  modulos = {};
  importar('./mostrar_contenido.js');
  importar('./editar_guardar_perfil.js');
  importar('./menu.js');

  document.dispatchEvent(new Event('DOMContentLoaded'));
  await esperarPromesas();
}

const $ = (id) => document.getElementById(id);
const boton = (clase) => document.querySelector(`.form-actions .${clase}`);
const llamadaA = (archivo) => fetch.mock.calls.find((c) => c[0] === archivo);
const datosGuardados = () => JSON.parse(llamadaA('guardar_datos.php')[1].body.get('datos'));
const cuerpoJSON = (archivo) => JSON.parse(llamadaA(archivo)[1].body);
const modal = () => document.getElementById('modal-confirmacion');
const botonModal = (texto) => [...modal().querySelectorAll('button')].find((b) => b.textContent === texto);

function escribir(id, valor, evento = 'input') {
  $(id).value = valor;
  $(id).dispatchEvent(new Event(evento));
}

async function editar() {
  boton('editar').click();
  await esperarPromesas();
}

async function guardar() {
  boton('guardar').click();
  await esperarPromesas();
}

/** Simula que el usuario eligió un archivo en #foto_perfil_input. */
function elegirFoto(archivo) {
  Object.defineProperty($('foto_perfil_input'), 'files', { value: archivo ? [archivo] : [], configurable: true });
  $('foto_perfil_input').dispatchEvent(new Event('change'));
}

function avisosNavegacion() {
  return console.error.mock.calls.map((a) => String((a[0] && a[0].message) || a[0]))
    .filter((t) => t.includes('navigation'));
}

// =====================================================================
// PREPARACIÓN DE CADA PRUEBA
// =====================================================================
beforeEach(() => {
  lanzarToast = jest.fn();
  renderMenu = jest.fn();
  externos = { 'lanzar_toast.js': { lanzarToast }, 'menu.js': { renderMenu } };
  global.URL.createObjectURL = jest.fn(() => 'blob:foto-nueva');
  jest.spyOn(console, 'error').mockImplementation(() => {});

  // Se anotan los listeners de document para quitarlos al terminar cada prueba
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
// mostrar_contenido.js
// =====================================================================
describe('mostrar_contenido.js', () => {

  describe('Función: ES_ADMIN / ES_ALUMNO (lectura de la cookie)', () => {
    /**
     * Función   : mostrar_contenido.js › leerCookie() / ES_ADMIN / ES_ALUMNO.
     * Comprueba : que el tipo de usuario se toma de la cookie Id_tipo_usuario
     *             (1 y 3 son administradores, 2 es alumno).
     */
    test.each([
      ['1', true, false],
      ['3', true, false],
      ['2', false, true],
      [null, false, false],
    ])('[ES_ADMIN / ES_ALUMNO] Comprueba que con Id_tipo_usuario=%s → admin=%s, alumno=%s', async (tipo, admin, alumno) => {
      await cargarPerfil(tipo, { success: true, datos: {}, catalogos: null });

      expect(modulos['mostrar_contenido.js'].ES_ADMIN).toBe(admin);
      expect(modulos['mostrar_contenido.js'].ES_ALUMNO).toBe(alumno);
    });
  });

  describe('Función: utilidades (valor, setVal, mostrar, habilitar, capitalizar)', () => {
    beforeEach(async () => { await cargarPerfil('2'); });

    /**
     * Función   : mostrar_contenido.js › valor() y setVal().
     * Comprueba : que valor() quita espacios y setVal() pone "" si recibe null.
     */
    test('[valor / setVal] Comprueba que valor() quita espacios y setVal(null) deja vacío', () => {
      const m = modulos['mostrar_contenido.js'];
      m.setVal('area', '  Sistemas  ');
      expect(m.valor('area')).toBe('Sistemas');
      m.setVal('area', null);
      expect($('area').value).toBe('');
    });

    /**
     * Función   : mostrar_contenido.js › mostrar() y habilitar().
     * Comprueba : que mostrar() quita/pone la clase "oculto" y habilitar()
     *             quita disabled a varios campos.
     */
    test('[mostrar / habilitar] Comprueba que muestran/ocultan y habilitan elementos', () => {
      const m = modulos['mostrar_contenido.js'];
      m.mostrar('btn_crear_empresa', true);
      expect($('btn_crear_empresa').classList.contains('oculto')).toBe(false);
      m.mostrar('btn_crear_empresa', false);
      expect($('btn_crear_empresa').classList.contains('oculto')).toBe(true);
      m.habilitar(['area', 'programa']);
      expect($('area').disabled).toBe(false);
      expect($('programa').disabled).toBe(false);
    });

    /**
     * Función   : mostrar_contenido.js › capitalizar() y convertirAMayusculas().
     * Comprueba : que capitalizar pone la primera letra en mayúscula y
     *             convertirAMayusculas convierte todo el campo.
     */
    test('[capitalizar / convertirAMayusculas] Comprueba las conversiones de texto', () => {
      const m = modulos['mostrar_contenido.js'];
      expect(m.capitalizar('otoño')).toBe('Otoño');
      const evento = { target: { value: '7b' } };
      m.convertirAMayusculas(evento);
      expect(evento.target.value).toBe('7B');
    });

    /**
     * Función   : mostrar_contenido.js › errorCampo().
     * Comprueba : que muestra el error, enfoca el campo indicado y regresa null.
     */
    test('[errorCampo] Comprueba que muestra el error, enfoca el campo y regresa null', () => {
      const enfocar = jest.spyOn($('area'), 'focus');

      const resultado = modulos['mostrar_contenido.js'].errorCampo('Correo inválido', 'area');

      expect(resultado).toBeNull();
      expect(lanzarToast).toHaveBeenCalledWith('Correo inválido', 'error');
      expect(enfocar).toHaveBeenCalled();
    });

    /**
     * Función   : mostrar_contenido.js › terminarConExito().
     * Comprueba : que muestra el mensaje de éxito y recarga la página a los 1.5 s.
     */
    test('[terminarConExito] Comprueba que avisa y recarga la página a los 1.5 segundos', () => {
      jest.useFakeTimers();
      modulos['mostrar_contenido.js'].terminarConExito('Listo');

      expect(lanzarToast).toHaveBeenCalledWith('Listo', 'exito');
      console.error.mockClear();
      jest.advanceTimersByTime(1500);
      expect(avisosNavegacion().length).toBeGreaterThan(0); // jsdom no recarga: avisa "navigation"
    });
  });

  describe('Función: enviarJSON() / enviarFormulario() / peticion()', () => {
    beforeEach(async () => { await cargarPerfil('2'); });

    /**
     * Función   : mostrar_contenido.js › enviarJSON().
     * Comprueba : que hace un POST con JSON y regresa la respuesta del servidor.
     */
    test('[enviarJSON] Comprueba que envía un POST en JSON y regresa la respuesta', async () => {
      rutas['crear.php'] = () => respuesta({ success: true, id_empresa: 9 });

      const r = await modulos['mostrar_contenido.js'].enviarJSON('crear.php', { accion: 'empresa' });

      expect(r).toEqual({ success: true, id_empresa: 9 });
      expect(llamadaA('crear.php')[1]).toEqual({
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"accion":"empresa"}'
      });
    });

    /**
     * Función   : mostrar_contenido.js › enviarFormulario().
     * Comprueba : que hace un POST con el FormData tal cual (sin cabecera JSON).
     */
    test('[enviarFormulario] Comprueba que envía el FormData por POST', async () => {
      const formData = new FormData();
      await modulos['mostrar_contenido.js'].enviarFormulario('guardar_datos.php', formData);

      expect(llamadaA('guardar_datos.php')[1]).toEqual({ method: 'POST', body: formData });
    });

    /**
     * Función   : mostrar_contenido.js › peticion() (bloque catch).
     * Comprueba : que si falla la conexión o la respuesta no es JSON regresa
     *             { success: false, error: "Error de conexión con el servidor" }.
     */
    test.each([
      ['falla la red', () => Promise.reject(new Error('Failed to fetch'))],
      ['la respuesta no es JSON', () => Promise.resolve({ json: () => Promise.reject(new SyntaxError('<')) })],
    ])('[peticion] Comprueba la respuesta de error cuando %s', async (_desc, ruta) => {
      rutas['crear.php'] = ruta;

      const r = await modulos['mostrar_contenido.js'].enviarJSON('crear.php', {});

      expect(r).toEqual({ success: false, error: 'Error de conexión con el servidor' });
    });
  });

  describe('Función: obtenerCatalogos() / agregarEmpresaACatalogo()', () => {
    /**
     * Función   : mostrar_contenido.js › obtenerCatalogos() y agregarEmpresaACatalogo().
     * Comprueba : que los catálogos llegan con los datos del alumno y que una
     *             empresa nueva se agrega una sola vez.
     */
    test('[agregarEmpresaACatalogo] Comprueba que agrega la empresa nueva sin duplicarla', async () => {
      await cargarPerfil('2');
      const m = modulos['mostrar_contenido.js'];

      m.agregarEmpresaACatalogo(7, 'Nueva');
      m.agregarEmpresaACatalogo('7', 'Nueva');
      m.agregarEmpresaACatalogo(5, 'Acme');

      expect(m.obtenerCatalogos().empresas).toEqual([
        { Id_empresa: 5, Nombre: 'Acme' }, { Id_empresa: 6, Nombre: 'Beta' }, { Id_empresa: 7, Nombre: 'Nueva' }
      ]);
      expect(m.obtenerCatalogos().servicios).toHaveLength(2);
    });
  });

  describe('Función: cargarDatos() / mostrarAdmin()', () => {
    /**
     * Función   : mostrar_contenido.js › cargarDatos() y mostrarAdmin().
     * Comprueba : que un administrador ve su sección con sus datos, la fecha
     *             en formato dd/mm/aaaa y su foto.
     */
    test('[mostrarAdmin] Comprueba que muestra los datos del administrador', async () => {
      await cargarPerfil('1');

      expect(llamadaA('obtener_datos.php')).toBeDefined();
      expect($('perfil_administrador').classList.contains('oculto')).toBe(false);
      expect(document.querySelector('.contenedor-alumno').classList.contains('oculto')).toBe(true);
      expect($('titulo_administrador').textContent).toBe('Perfil Administrador');
      expect($('nombre_administrador').value).toBe('Luis');
      expect($('apellido_paterno_administrador').value).toBe('Pérez');
      expect($('apellido_materno_administrador').value).toBe('Gómez');
      expect($('id_carrera_administrador').value).toBe('Ing. Química');
      expect($('telefono_administrador').value).toBe('246-5444-885');
      expect($('correo_administrador').value).toBe('luis@uatx.mx');
      expect($('fecha_registro_administrador').value).toBe('01/08/2025');
      expect($('foto_perfil_preview').getAttribute('src')).toBe('../uploads/Perfil/3-4.jpg');
    });

    /**
     * Función   : mostrar_contenido.js › mostrarAdmin() (título).
     * Comprueba : que un coordinador (tipo 3) ve el título "Perfil Coordinador".
     */
    test('[mostrarAdmin] Comprueba que el coordinador ve el título "Perfil Coordinador"', async () => {
      await cargarPerfil('3');

      expect($('titulo_administrador').textContent).toBe('Perfil Coordinador');
    });
  });

  describe('Función: cargarDatos() / mostrarAlumno()', () => {
    /**
     * Función   : mostrar_contenido.js › mostrarAlumno() y mostrarDatosPersonales().
     * Comprueba : que un alumno ve su sección con sus datos personales y que el
     *             horario "8:00 - 14:00:00" se separa en 08:00 y 14:00.
     */
    test('[mostrarAlumno] Comprueba que muestra los datos personales y separa el horario', async () => {
      await cargarPerfil('2');

      expect(document.querySelector('.contenedor-alumno').classList.contains('oculto')).toBe(false);
      expect($('perfil_administrador').classList.contains('oculto')).toBe(true);
      expect($('nombre_alumno').value).toBe('Ana');
      expect($('apellido_paterno_alumno').value).toBe('López');
      expect($('id_carrera_alumno').value).toBe('Ing. en Computación');
      expect($('grupo_alumno').value).toBe('7A');
      expect($('horario_entrada').value).toBe('08:00');
      expect($('horario_salida').value).toBe('14:00');
      expect($('fecha_registro_alumno').value).toBe('15/01/2026');
    });

    /**
     * Función   : mostrar_contenido.js › mostrarActividad().
     * Comprueba : que se muestran los datos de la actividad, las fechas vacías
     *             como "—" y que se guarda el Id de la empresa en data-id-empresa.
     */
    test('[mostrarActividad] Comprueba que muestra la actividad y guarda el Id de la empresa', async () => {
      await cargarPerfil('2');

      expect($('no_expediente').value).toBe('EXP-001');
      expect($('servicio').value).toBe('Servicio social');
      expect($('empresa_texto').value).toBe('Acme');
      expect($('empresa_texto').dataset.idEmpresa).toBe('5');
      expect($('area').value).toBe('Sistemas');
      expect($('programa').value).toBe('Apoyo TI');
      expect($('estado').value).toBe('PENDIENTE');
      expect($('periodo_tipo').value).toBe('primavera');
      expect($('periodo_año').value).toBe('2026');
      expect($('fecha_inicio').value).toBe('2026-02-01');
      expect($('fecha_fin').value).toBe('2026-06-30');
      expect($('fecha_registro').value).toBe('20/01/2026');
      expect($('fecha_modificacion').value).toBe('—');
    });

    /**
     * Función   : mostrar_contenido.js › mostrarHorario().
     * Comprueba : que si el alumno no tiene horario los campos quedan vacíos.
     */
    test('[mostrarHorario] Comprueba que sin horario los campos quedan vacíos', async () => {
      await cargarPerfil('2', { success: true, datos: { ...DATOS_ALUMNO, Horario: null }, catalogos: CATALOGOS });

      expect($('horario_entrada').value).toBe('');
      expect($('horario_salida').value).toBe('');
    });

    /**
     * Función   : mostrar_contenido.js › avisarDatosCargados().
     * Comprueba : que al terminar avisa a los demás JS con el evento
     *             "datosCargados", enviando los datos.
     */
    test('[avisarDatosCargados] Comprueba que lanza el evento "datosCargados" con los datos', async () => {
      const recibido = jest.fn();
      document.addEventListener('datosCargados', (e) => recibido(e.detail.datos));

      await cargarPerfil('2');

      expect(recibido).toHaveBeenCalledWith(expect.objectContaining({ Nombre: 'Ana', Estado: 'PENDIENTE' }));
    });

    /**
     * Función   : mostrar_contenido.js › cargarDatos() (bloque catch).
     * Comprueba : que si obtener_datos.php responde error se muestra
     *             "No se pudieron cargar los datos del perfil: ...".
     */
    test('[cargarDatos] Comprueba que si el servidor responde error se avisa al usuario', async () => {
      await cargarPerfil('2', { success: false, error: 'No hay sesión activa' });

      expect(lanzarToast).toHaveBeenCalledWith('No se pudieron cargar los datos del perfil: No hay sesión activa', 'error');
    });
  });
});

// =====================================================================
// editar_guardar_perfil.js
// =====================================================================
describe('editar_guardar_perfil.js', () => {

  describe('Función: modoEditar()', () => {
    /**
     * Función   : editar_guardar_perfil.js › modoEditar() (datosListos = false).
     * Comprueba : que si los datos aún no cargan no deja editar.
     */
    test('[modoEditar] Comprueba que no deja editar antes de que carguen los datos', async () => {
      await cargarPerfil('2', { success: false, error: 'x' });
      lanzarToast.mockClear();

      await editar();

      expect(lanzarToast).toHaveBeenCalledWith('Espera a que terminen de cargar tus datos', 'error');
      expect(boton('guardar').classList.contains('oculto')).toBe(true);
    });

    /**
     * Función   : editar_guardar_perfil.js › modoEditar(), mostrarBotonesEdicion() y habilitarFoto().
     * Comprueba : que al dar Editar se ocultan "Editar", aparecen "Guardar" y
     *             "Cancelar" y se habilita el cambio de foto.
     */
    test('[modoEditar] Comprueba que cambia los botones y habilita la foto', async () => {
      await cargarPerfil('2');
      await editar();

      expect(boton('editar').classList.contains('oculto')).toBe(true);
      expect(boton('guardar').classList.contains('oculto')).toBe(false);
      expect(boton('cancelar').classList.contains('oculto')).toBe(false);
      expect($('btn_cambiar_foto').classList.contains('oculto')).toBe(false);
      expect($('foto_perfil_input').disabled).toBe(false);
    });

    /**
     * Función   : editar_guardar_perfil.js › modoEditar() (ES_ADMIN).
     * Comprueba : que un administrador solo puede editar teléfono y correo.
     */
    test('[modoEditar] Comprueba que el administrador solo puede editar teléfono y correo', async () => {
      await cargarPerfil('1');
      await editar();

      expect($('telefono_administrador').disabled).toBe(false);
      expect($('correo_administrador').disabled).toBe(false);
      expect($('nombre_administrador').disabled).toBe(true);
    });
  });

  describe('Función: formatearTelefono()', () => {
    /**
     * Función   : editar_guardar_perfil.js › formatearTelefono().
     * Comprueba : que mientras se escribe el teléfono se acomoda como
     *             ###-####-###, quitando letras y limitando a 10 dígitos.
     */
    test.each([
      ['2465444885', '246-5444-885'],
      ['246', '246'],
      ['24654', '246-54'],
      ['24a6-54x44885', '246-5444-885'],
      ['246544488599', '246-5444-885'],
    ])('[formatearTelefono] Comprueba que "%s" se muestra como "%s"', async (escrito, esperado) => {
      await cargarPerfil('1');

      escribir('telefono_administrador', escrito);

      expect($('telefono_administrador').value).toBe(esperado);
    });
  });

  describe('Función: modoGuardar() / validarAdmin()', () => {
    beforeEach(async () => {
      await cargarPerfil('1');
      await editar();
    });

    /**
     * Función   : editar_guardar_perfil.js › validarAdmin() (REGEX.correo).
     * Comprueba : que un correo que no termina en .com, .mx o .edu se rechaza.
     */
    test.each(['luis@uatx', 'luis.uatx.mx', 'luis@uatx.org'])(
      '[validarAdmin] Comprueba que rechaza el correo "%s"', async (correo) => {
        escribir('correo_administrador', correo);

        await guardar();

        expect(lanzarToast).toHaveBeenCalledWith('Correo inválido', 'error');
        expect(llamadaA('guardar_datos.php')).toBeUndefined();
      });

    /**
     * Función   : editar_guardar_perfil.js › validarAdmin() (REGEX.telefono).
     * Comprueba : que un teléfono incompleto se rechaza.
     */
    test('[validarAdmin] Comprueba que rechaza un teléfono incompleto', async () => {
      $('telefono_administrador').value = '246-5444';

      await guardar();

      expect(lanzarToast).toHaveBeenCalledWith('Formato de teléfono: 246-5444-885', 'error');
      expect(llamadaA('guardar_datos.php')).toBeUndefined();
    });

    /**
     * Función   : editar_guardar_perfil.js › modoGuardar() y armarFormulario().
     * Comprueba : que con datos válidos se envía un FormData con "datos" en JSON
     *             a guardar_datos.php y se avisa del éxito.
     */
    test('[modoGuardar] Comprueba que envía teléfono y correo en un FormData y avisa del éxito', async () => {
      escribir('correo_administrador', 'nuevo@uatx.edu');

      await guardar();

      expect(llamadaA('guardar_datos.php')[1].body).toBeInstanceOf(FormData);
      expect(datosGuardados()).toEqual({ telefono_administrador: '246-5444-885', correo_administrador: 'nuevo@uatx.edu' });
      expect(llamadaA('guardar_datos.php')[1].body.get('foto_perfil')).toBeNull();
      expect(lanzarToast).toHaveBeenCalledWith('Datos guardados correctamente', 'exito');
      expect(boton('guardar').disabled).toBe(true); // se queda bloqueado mientras recarga
    });

    /**
     * Función   : editar_guardar_perfil.js › modoGuardar() (respuesta con error).
     * Comprueba : que si el servidor rechaza los datos se muestra su error y el
     *             botón Guardar se vuelve a habilitar.
     */
    test('[modoGuardar] Comprueba que si el servidor rechaza se muestra el error y se habilita Guardar', async () => {
      rutas['guardar_datos.php'] = () => respuesta({ success: false, error: 'Correo inválido' }, 422);

      await guardar();

      expect(lanzarToast).toHaveBeenCalledWith('Correo inválido', 'error');
      expect(boton('guardar').disabled).toBe(false);
    });

    /**
     * Función   : editar_guardar_perfil.js › modoGuardar() (if (btnGuardar.disabled) return).
     * Comprueba : que mientras se está guardando no se manda una segunda petición.
     */
    test('[modoGuardar] Comprueba que no envía dos veces si se da doble clic', async () => {
      rutas['guardar_datos.php'] = () => new Promise(() => {}); // nunca responde

      boton('guardar').click();
      await esperarPromesas();
      boton('guardar').click();
      await esperarPromesas();

      expect(fetch.mock.calls.filter((c) => c[0] === 'guardar_datos.php')).toHaveLength(1);
    });
  });

  describe('Función: modoGuardar() (alumno sin cambios)', () => {
    /**
     * Función   : editar_guardar_perfil.js › modoGuardar() ("No hay cambios").
     * Comprueba : que si el alumno no tiene nada que guardar (sin grupo, sin
     *             horario, sin actividad abierta y sin foto) se avisa y no se envía.
     */
    test('[modoGuardar] Comprueba que sin cambios avisa "No hay cambios para guardar"', async () => {
      await cargarPerfil('2', {
        success: true,
        datos: { ...DATOS_ALUMNO, Grupo: '', Horario: null, Estado: 'COMPLETADO' },
        catalogos: CATALOGOS
      });
      await editar();

      await guardar();

      expect(lanzarToast).toHaveBeenCalledWith('No hay cambios para guardar', 'error');
      expect(llamadaA('guardar_datos.php')).toBeUndefined();
    });
  });

  describe('Función: foto de perfil (abrirSelectorFoto, previsualizarFoto, validarFoto)', () => {
    beforeEach(async () => {
      await cargarPerfil('1');
      await editar();
    });

    /**
     * Función   : editar_guardar_perfil.js › abrirSelectorFoto().
     * Comprueba : que "Cambiar foto" abre el selector de archivos.
     */
    test('[abrirSelectorFoto] Comprueba que el botón abre el selector de archivos', () => {
      const clic = jest.spyOn($('foto_perfil_input'), 'click');

      $('btn_cambiar_foto').click();

      expect(clic).toHaveBeenCalled();
    });

    /**
     * Función   : editar_guardar_perfil.js › previsualizarFoto().
     * Comprueba : que una imagen válida se muestra como vista previa.
     */
    test('[previsualizarFoto] Comprueba que una imagen válida se muestra como vista previa', () => {
      elegirFoto(new File(['x'], 'foto.png', { type: 'image/png' }));

      expect($('foto_perfil_preview').getAttribute('src')).toBe('blob:foto-nueva');
      expect(lanzarToast).not.toHaveBeenCalled();
    });

    /**
     * Función   : editar_guardar_perfil.js › validarFoto().
     * Comprueba : que se rechazan archivos que no son JPG/PNG/WEBP o que pesan
     *             más de 2 MB, y que se limpia el selector.
     */
    test.each([
      ['un PDF', new File(['x'], 'doc.pdf', { type: 'application/pdf' }), 'Solo se permiten imágenes JPG, PNG o WEBP'],
      ['un GIF', new File(['x'], 'a.gif', { type: 'image/gif' }), 'Solo se permiten imágenes JPG, PNG o WEBP'],
      ['una imagen de más de 2 MB', new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'grande.jpg', { type: 'image/jpeg' }),
        'La imagen no debe superar los 2MB'],
    ])('[validarFoto] Comprueba que rechaza %s', (_desc, archivo, mensaje) => {
      const src = $('foto_perfil_preview').getAttribute('src');

      elegirFoto(archivo);

      expect(lanzarToast).toHaveBeenCalledWith(mensaje, 'error');
      expect($('foto_perfil_preview').getAttribute('src')).toBe(src);
    });

    /**
     * Función   : editar_guardar_perfil.js › modoGuardar() y armarFormulario() (con foto).
     * Comprueba : que la foto elegida viaja en el mismo FormData como "foto_perfil".
     */
    test('[armarFormulario] Comprueba que la foto se envía junto con los datos', async () => {
      const foto = new File(['x'], 'foto.webp', { type: 'image/webp' });
      elegirFoto(foto);

      await guardar();

      expect(llamadaA('guardar_datos.php')[1].body.get('foto_perfil').name).toBe('foto.webp');
    });
  });

  describe('Función: Cancelar', () => {
    /**
     * Función   : editar_guardar_perfil.js › conectarEventos() (botón Cancelar).
     * Comprueba : que Cancelar recarga la página para descartar los cambios.
     */
    test('[cancelar] Comprueba que Cancelar recarga la página', async () => {
      await cargarPerfil('1');
      console.error.mockClear();

      boton('cancelar').click();

      expect(avisosNavegacion().length).toBeGreaterThan(0);
    });
  });
});

// =====================================================================
// editar_guardar_act_alum.js
// =====================================================================
describe('editar_guardar_act_alum.js', () => {

  const conEstado = (cambios) => ({
    success: true, datos: { ...DATOS_ALUMNO, ...cambios }, catalogos: copiar(CATALOGOS)
  });

  describe('Función: aplicarReglasActividad() / mostrarAvisoActividad()', () => {
    /**
     * Función   : editar_guardar_act_alum.js › aplicarReglasActividad() y textoAvisoActividad().
     * Comprueba : el aviso y el botón "+ Nueva Actividad" según el estado de la actividad.
     */
    test.each([
      ['sin actividad', { Tiene_actividad: false, Estado: null }, 'Aún no tienes una actividad registrada. Crea una para comenzar.', true],
      ['PENDIENTE', { Estado: 'PENDIENTE' }, '', false],
      ['EN_CURSO', { Estado: 'EN_CURSO' }, '', false],
      ['COMPLETADO', { Estado: 'COMPLETADO' }, 'Esta actividad está COMPLETADA y ya no puede modificarse. Ya puedes iniciar una nueva actividad.', true],
      ['CANCELADO', { Estado: 'CANCELADO' }, 'Esta actividad fue CANCELADA. Puedes iniciar una nueva actividad.', true],
    ])('[aplicarReglasActividad] Comprueba el aviso y el botón Nueva Actividad con actividad %s', async (_d, cambios, aviso, botonVisible) => {
      await cargarPerfil('2', conEstado(cambios));

      expect($('aviso_actividad').textContent).toBe(aviso);
      expect($('aviso_actividad').classList.contains('oculto')).toBe(aviso === '');
      expect($('btn_nueva_actividad').classList.contains('oculto')).toBe(!botonVisible);
    });
  });

  describe('Función: bloquearEstadosAnteriores()', () => {
    /**
     * Función   : editar_guardar_act_alum.js › bloquearEstadosAnteriores().
     * Comprueba : que el estado solo puede avanzar (no se puede regresar) y que
     *             CANCELADO nunca se puede elegir.
     */
    test.each([
      ['PENDIENTE', { '': true, PENDIENTE: false, EN_CURSO: false, COMPLETADO: false, CANCELADO: true }],
      ['EN_CURSO', { '': true, PENDIENTE: true, EN_CURSO: false, COMPLETADO: false, CANCELADO: true }],
    ])('[bloquearEstadosAnteriores] Comprueba las opciones bloqueadas con estado %s', async (estado, bloqueadas) => {
      await cargarPerfil('2', conEstado({ Estado: estado }));

      for (const opcion of $('estado').options) {
        expect([opcion.value, opcion.disabled]).toEqual([opcion.value, bloqueadas[opcion.value]]);
      }
    });
  });

  describe('Función: habilitarEdicionAlumno()', () => {
    /**
     * Función   : editar_guardar_act_alum.js › habilitarEdicionAlumno().
     * Comprueba : que si la actividad está cerrada solo se editan los datos
     *             personales (grupo y horario).
     */
    test('[habilitarEdicionAlumno] Comprueba que con actividad cerrada solo se editan los datos personales', async () => {
      await cargarPerfil('2', conEstado({ Estado: 'COMPLETADO' }));
      await editar();

      expect($('grupo_alumno').disabled).toBe(false);
      expect($('horario_entrada').disabled).toBe(false);
      expect($('horario_salida').disabled).toBe(false);
      expect($('estado').disabled).toBe(true);
      expect($('area').disabled).toBe(true);
    });

    /**
     * Función   : editar_guardar_act_alum.js › habilitarEdicionAlumno() (EN_CURSO).
     * Comprueba : que en EN_CURSO se edita la actividad pero NO la empresa.
     */
    test('[habilitarEdicionAlumno] Comprueba que en EN_CURSO se edita la actividad pero no la empresa', async () => {
      await cargarPerfil('2', conEstado({ Estado: 'EN_CURSO' }));
      await editar();

      ['estado', 'area', 'programa', 'fecha_inicio', 'fecha_fin'].forEach((id) => expect($(id).disabled).toBe(false));
      expect($('id_empresa').classList.contains('oculto')).toBe(true);
      expect($('btn_crear_empresa').classList.contains('oculto')).toBe(true);
    });

    /**
     * Función   : editar_guardar_act_alum.js › habilitarSelectorEmpresa() y llenarSelectorEmpresas().
     * Comprueba : que en PENDIENTE se cambia el texto de la empresa por una lista
     *             con las empresas del catálogo y queda elegida la actual.
     */
    test('[habilitarSelectorEmpresa] Comprueba que en PENDIENTE aparece la lista de empresas con la actual elegida', async () => {
      await cargarPerfil('2', conEstado({ Estado: 'PENDIENTE' }));
      await editar();

      expect($('empresa_texto').classList.contains('oculto')).toBe(true);
      expect($('id_empresa').classList.contains('oculto')).toBe(false);
      expect($('id_empresa').disabled).toBe(false);
      expect($('btn_crear_empresa').classList.contains('oculto')).toBe(false);
      expect([...$('id_empresa').options].map((o) => [o.value, o.text])).toEqual([
        ['', '-- Selecciona una empresa --'], ['5', 'Acme'], ['6', 'Beta']
      ]);
      expect($('id_empresa').value).toBe('5');
    });

    /**
     * Función   : editar_guardar_act_alum.js › conectarEventos() (grupo_alumno).
     * Comprueba : que el grupo se convierte a mayúsculas al escribir.
     */
    test('[conectarEventos] Comprueba que el grupo se escribe en mayúsculas', async () => {
      await cargarPerfil('2');

      escribir('grupo_alumno', '3b');

      expect($('grupo_alumno').value).toBe('3B');
    });
  });

  describe('Función: validarDatosPersonales()', () => {
    beforeEach(async () => {
      await cargarPerfil('2', conEstado({ Estado: 'COMPLETADO' }));
      await editar();
    });

    /**
     * Función   : editar_guardar_act_alum.js › validarDatosPersonales() (REGEX.grupo).
     * Comprueba : que el grupo debe ser un número del 1 al 9 y una letra.
     */
    test.each(['0A', 'A1', '10', '7'])('[validarDatosPersonales] Comprueba que rechaza el grupo "%s"', async (grupo) => {
      $('grupo_alumno').value = grupo;

      await guardar();

      expect(lanzarToast).toHaveBeenCalledWith('El semestre y grupo debe ser un número (1-9) y una letra. Ejemplo: 1A', 'error');
      expect(llamadaA('guardar_datos.php')).toBeUndefined();
    });

    /**
     * Función   : editar_guardar_act_alum.js › validarDatosPersonales() (horarios).
     * Comprueba : que se llenan ambos horarios o ninguno, y que la salida es
     *             posterior a la entrada.
     */
    test.each([
      ['solo la entrada', '09:00', '', 'Debes completar ambos horarios o dejar ambos vacíos'],
      ['solo la salida', '', '13:00', 'Debes completar ambos horarios o dejar ambos vacíos'],
      ['salida antes de la entrada', '14:00', '09:00', 'La hora de salida debe ser posterior a la de entrada'],
      ['salida igual a la entrada', '09:00', '09:00', 'La hora de salida debe ser posterior a la de entrada'],
    ])('[validarDatosPersonales] Comprueba que rechaza el horario con %s', async (_d, entrada, salida, mensaje) => {
      $('horario_entrada').value = entrada;
      $('horario_salida').value = salida;

      await guardar();

      expect(lanzarToast).toHaveBeenCalledWith(mensaje, 'error');
      expect(llamadaA('guardar_datos.php')).toBeUndefined();
    });

    /**
     * Función   : editar_guardar_act_alum.js › validarDatosPersonales() y validarAlumno().
     * Comprueba : que con actividad cerrada solo se envían grupo y horario
     *             ("entrada - salida"), sin datos de actividad.
     */
    test('[validarAlumno] Comprueba que con actividad cerrada solo envía grupo y horario', async () => {
      $('grupo_alumno').value = '8c';
      $('horario_entrada').value = '09:00';
      $('horario_salida').value = '13:30';

      await guardar();

      expect(datosGuardados()).toEqual({ grupo: '8C', horario: '09:00 - 13:30' });
    });
  });

  describe('Función: validarActividad()', () => {
    /**
     * Función   : editar_guardar_act_alum.js › validarActividad() y validarAlumno().
     * Comprueba : que con actividad PENDIENTE se envían los datos personales,
     *             los de la actividad y la empresa elegida.
     */
    test('[validarActividad] Comprueba que en PENDIENTE envía datos de la actividad y la empresa elegida', async () => {
      await cargarPerfil('2', conEstado({ Estado: 'PENDIENTE' }));
      await editar();
      $('id_empresa').value = '6';
      $('estado').value = 'EN_CURSO';

      await guardar();

      expect(datosGuardados()).toEqual({
        grupo: '7A', horario: '08:00 - 14:00', estado: 'EN_CURSO', area: 'Sistemas', programa: 'Apoyo TI',
        fecha_inicio: '2026-02-01', fecha_fin: '2026-06-30', id_empresa: '6'
      });
    });

    /**
     * Función   : editar_guardar_act_alum.js › validarActividad() (empresaEditable).
     * Comprueba : que en EN_CURSO la empresa NO se envía (ya no se puede cambiar).
     */
    test('[validarActividad] Comprueba que en EN_CURSO no envía la empresa', async () => {
      await cargarPerfil('2', conEstado({ Estado: 'EN_CURSO' }));
      await editar();

      await guardar();

      expect(datosGuardados()).not.toHaveProperty('id_empresa');
      expect(datosGuardados().estado).toBe('EN_CURSO');
    });

    /**
     * Función   : editar_guardar_act_alum.js › validarActividad() (fechas).
     * Comprueba : que la fecha fin debe ser posterior a la fecha inicio.
     */
    test.each([['anterior', '2026-01-10'], ['igual', '2026-02-01']])(
      '[validarActividad] Comprueba que rechaza una fecha fin %s a la de inicio', async (_d, fin) => {
        await cargarPerfil('2', conEstado({ Estado: 'EN_CURSO' }));
        await editar();
        $('fecha_fin').value = fin;

        await guardar();

        expect(lanzarToast).toHaveBeenCalledWith('La fecha fin debe ser posterior a la fecha inicio', 'error');
        expect(llamadaA('guardar_datos.php')).toBeUndefined();
      });

    /**
     * Función   : editar_guardar_act_alum.js › camposFaltantesParaCompletar().
     * Comprueba : que para marcar COMPLETADO deben estar llenos grupo, horario,
     *             área, programa, fechas y empresa; si no, se listan los que faltan.
     */
    test('[camposFaltantesParaCompletar] Comprueba que no deja completar si faltan datos y dice cuáles', async () => {
      await cargarPerfil('2', conEstado({ Estado: 'EN_CURSO', Area: '', Fecha_fin: '', Id_empresa: null }));
      await editar();
      $('estado').value = 'COMPLETADO';

      await guardar();

      expect(lanzarToast).toHaveBeenCalledWith('Para completar la actividad faltan: Área, Fecha de fin, Empresa', 'error');
      expect(modal()).toBeNull();
      expect(llamadaA('guardar_datos.php')).toBeUndefined();
    });

    /**
     * Función   : editar_guardar_act_alum.js › confirmarCompletar() (Cancelar).
     * Comprueba : que al marcar COMPLETADO se pide confirmación y si se cancela
     *             no se guarda nada.
     */
    test('[confirmarCompletar] Comprueba que si cancela la confirmación no guarda', async () => {
      await cargarPerfil('2', conEstado({ Estado: 'EN_CURSO' }));
      await editar();
      $('estado').value = 'COMPLETADO';

      await guardar();
      expect(modal().querySelector('h2').textContent).toBe('Completar actividad');
      botonModal('Cancelar').click();
      await esperarPromesas();

      expect(modal()).toBeNull();
      expect(llamadaA('guardar_datos.php')).toBeUndefined();
    });

    /**
     * Función   : editar_guardar_act_alum.js › confirmarCompletar() (Sí, completar).
     * Comprueba : que si confirma se guarda la actividad como COMPLETADO.
     */
    test('[confirmarCompletar] Comprueba que si confirma guarda la actividad como COMPLETADO', async () => {
      await cargarPerfil('2', conEstado({ Estado: 'EN_CURSO' }));
      await editar();
      $('estado').value = 'COMPLETADO';

      await guardar();
      botonModal('Sí, completar').click();
      await esperarPromesas();

      expect(datosGuardados().estado).toBe('COMPLETADO');
      expect(lanzarToast).toHaveBeenCalledWith('Datos guardados correctamente', 'exito');
    });
  });

  describe('Función: nueva actividad (abrirModalActividad, crearActividad, validarNuevaActividad)', () => {
    async function abrirNuevaActividad() {
      await cargarPerfil('2', conEstado({ Estado: 'COMPLETADO' }));
      $('btn_nueva_actividad').click();
    }

    function llenarNuevaActividad({ expediente = 'exp-2026-001', servicio = '2', periodo = 'otoño', anio = '2026' } = {}) {
      $('modal_campo_no_expediente').value = expediente;
      $('modal_campo_id_servicio').value = servicio;
      $('modal_campo_periodo_tipo').value = periodo;
      $('modal_campo_periodo_anio').value = anio;
    }

    /**
     * Función   : editar_guardar_act_alum.js › abrirModalActividad() y camposModalActividad().
     * Comprueba : que el modal muestra expediente, servicios del catálogo,
     *             periodos con mayúscula inicial y el año actual.
     */
    test('[abrirModalActividad] Comprueba que el modal trae los servicios, periodos y el año actual', async () => {
      await abrirNuevaActividad();

      expect(modal().querySelector('h2').textContent).toBe('Nueva actividad');
      expect([...$('modal_campo_id_servicio').options].map((o) => o.text))
        .toEqual(['-- Selecciona un servicio --', 'Prácticas profesionales', 'Servicio social']);
      expect([...$('modal_campo_periodo_tipo').options].map((o) => o.text)).toEqual(['-- Selecciona --', 'Primavera', 'Otoño']);
      expect($('modal_campo_periodo_anio').value).toBe(String(new Date().getFullYear()));
      expect($('modal_campo_no_expediente').maxLength).toBe(15);
    });

    /**
     * Función   : editar_guardar_act_alum.js › validarNuevaActividad().
     * Comprueba : que los datos inválidos muestran el error dentro del modal y
     *             no se llama al servidor.
     */
    test.each([
      ['un expediente con espacios', { expediente: 'EXP 01' }, 'Escribe un No. de expediente válido (máx. 15: letras, números, - o /)'],
      ['un expediente vacío', { expediente: '' }, 'Escribe un No. de expediente válido (máx. 15: letras, números, - o /)'],
      ['sin servicio', { servicio: '' }, 'Selecciona un servicio'],
      ['sin periodo', { periodo: '' }, 'Selecciona el periodo'],
      ['un año de 2 dígitos', { anio: '26' }, 'Año del periodo inválido'],
    ])('[validarNuevaActividad] Comprueba que rechaza %s', async (_d, cambios, mensaje) => {
      await abrirNuevaActividad();
      llenarNuevaActividad(cambios);

      botonModal('Crear actividad').click();
      await esperarPromesas();

      expect(modal().querySelector('.modal-error').textContent).toBe(mensaje);
      expect(llamadaA('crear.php')).toBeUndefined();
    });

    /**
     * Función   : editar_guardar_act_alum.js › crearActividad().
     * Comprueba : que envía a crear.php la acción "actividad" con el expediente
     *             en mayúsculas y avisa "Nueva actividad creada".
     */
    test('[crearActividad] Comprueba que envía la nueva actividad a crear.php y avisa', async () => {
      await abrirNuevaActividad();
      llenarNuevaActividad();

      botonModal('Crear actividad').click();
      await esperarPromesas();

      expect(cuerpoJSON('crear.php')).toEqual({
        accion: 'actividad', no_expediente: 'EXP-2026-001', id_servicio: '2', periodo_tipo: 'otoño', periodo_anio: '2026'
      });
      expect(lanzarToast).toHaveBeenCalledWith('Nueva actividad creada', 'exito');
      expect(modal()).toBeNull();
    });

    /**
     * Función   : editar_guardar_act_alum.js › crearActividad() (respuesta con error).
     * Comprueba : que si el servidor la rechaza el error se muestra en el modal
     *             y este sigue abierto.
     */
    test('[crearActividad] Comprueba que el error del servidor se muestra en el modal', async () => {
      await abrirNuevaActividad();
      rutas['crear.php'] = () => respuesta({ success: false, error: 'Ese número de expediente ya está registrado' }, 409);
      llenarNuevaActividad();

      botonModal('Crear actividad').click();
      await esperarPromesas();

      expect(modal().querySelector('.modal-error').textContent).toBe('Ese número de expediente ya está registrado');
    });
  });

  describe('Función: nueva empresa (abrir/cerrar modal, crearEmpresa, validarEmpresa, seleccionarEmpresa)', () => {
    async function abrirModalEmpresa() {
      await cargarPerfil('2', conEstado({ Estado: 'PENDIENTE' }));
      await editar();
      $('btn_crear_empresa').click();
    }

    function llenarEmpresa(cambios = {}) {
      const d = {
        nueva_empresa_nombre: 'Nueva SA', nueva_empresa_descripcion: 'Software',
        nueva_empresa_razon_social: 'Nueva Sociedad Anónima', nueva_empresa_rfc: 'nue123456ab1',
        nueva_empresa_direccion: 'Calle 1 #20, Tlaxcala', nueva_empresa_web: 'nueva.mx', ...cambios
      };
      Object.entries(d).forEach(([id, v]) => { $(id).value = v; });
    }

    async function guardarEmpresa() {
      $('guardar_nueva_empresa').click();
      await esperarPromesas();
    }

    /**
     * Función   : editar_guardar_act_alum.js › abrirModalEmpresa() / cerrarModalEmpresa().
     * Comprueba : que el modal se abre y al cancelar se cierra y se limpian sus campos.
     */
    test('[abrirModalEmpresa / cerrarModalEmpresa] Comprueba que abre, cierra y limpia el modal', async () => {
      await abrirModalEmpresa();
      expect($('modal_nueva_empresa').classList.contains('abierto')).toBe(true);
      llenarEmpresa();

      $('cerrar_modal_empresa').click();

      expect($('modal_nueva_empresa').classList.contains('abierto')).toBe(false);
      expect($('nueva_empresa_nombre').value).toBe('');
      expect($('nueva_empresa_web').value).toBe('');
    });

    /**
     * Función   : editar_guardar_act_alum.js › cerrarModalEmpresaAlDarClicFuera().
     * Comprueba : que un clic en el fondo cierra el modal, pero un clic dentro no.
     */
    test('[cerrarModalEmpresaAlDarClicFuera] Comprueba que solo el clic en el fondo cierra el modal', async () => {
      await abrirModalEmpresa();

      document.querySelector('#modal_nueva_empresa .modal-contenido').click();
      expect($('modal_nueva_empresa').classList.contains('abierto')).toBe(true);

      $('modal_nueva_empresa').click();
      expect($('modal_nueva_empresa').classList.contains('abierto')).toBe(false);
    });

    /**
     * Función   : editar_guardar_act_alum.js › validarEmpresa().
     * Comprueba : que los datos inválidos de la empresa se rechazan sin llamar al servidor.
     */
    test.each([
      ['un nombre de 1 letra', { nueva_empresa_nombre: 'A' }, 'Escribe un nombre de empresa válido'],
      ['un nombre con símbolos raros', { nueva_empresa_nombre: 'Empresa <script>' }, 'Escribe un nombre de empresa válido'],
      ['una razón social inválida', { nueva_empresa_razon_social: 'X' }, 'Razón social inválida'],
      ['un RFC inválido', { nueva_empresa_rfc: '123' }, 'RFC inválido. Ejemplo: ABC123456XYZ'],
      ['una dirección muy corta', { nueva_empresa_direccion: 'C1' }, 'Dirección inválida'],
      ['un sitio web inválido', { nueva_empresa_web: 'no es web' }, 'Sitio web inválido'],
    ])('[validarEmpresa] Comprueba que rechaza %s', async (_d, cambios, mensaje) => {
      await abrirModalEmpresa();
      llenarEmpresa(cambios);

      await guardarEmpresa();

      expect(lanzarToast).toHaveBeenCalledWith(mensaje, 'error');
      expect(llamadaA('crear.php')).toBeUndefined();
    });

    /**
     * Función   : editar_guardar_act_alum.js › validarEmpresa() (campos opcionales).
     * Comprueba : que solo el nombre es obligatorio: los demás pueden ir vacíos.
     */
    test('[validarEmpresa] Comprueba que solo el nombre es obligatorio', async () => {
      await abrirModalEmpresa();
      llenarEmpresa({
        nueva_empresa_descripcion: '', nueva_empresa_razon_social: '', nueva_empresa_rfc: '',
        nueva_empresa_direccion: '', nueva_empresa_web: ''
      });

      await guardarEmpresa();

      expect(llamadaA('crear.php')).toBeDefined();
    });

    /**
     * Función   : editar_guardar_act_alum.js › crearEmpresa(), leerFormularioEmpresa() y seleccionarEmpresa().
     * Comprueba : que envía la empresa (RFC en mayúsculas) a crear.php, la agrega
     *             a la lista, la deja seleccionada, la agrega al catálogo y cierra el modal.
     */
    test('[crearEmpresa / seleccionarEmpresa] Comprueba que crea la empresa y la deja seleccionada', async () => {
      await abrirModalEmpresa();
      rutas['crear.php'] = () => respuesta({ success: true, id_empresa: '9', nombre: 'Nueva SA' });
      llenarEmpresa();

      await guardarEmpresa();

      expect(cuerpoJSON('crear.php')).toEqual({
        accion: 'empresa', nombre: 'Nueva SA', descripcion: 'Software', razon_social: 'Nueva Sociedad Anónima',
        rfc: 'NUE123456AB1', direccion: 'Calle 1 #20, Tlaxcala', sitio_web: 'nueva.mx'
      });
      expect($('id_empresa').value).toBe('9');
      expect([...$('id_empresa').options].map((o) => o.text)).toContain('Nueva SA');
      expect(modulos['mostrar_contenido.js'].obtenerCatalogos().empresas).toContainEqual({ Id_empresa: '9', Nombre: 'Nueva SA' });
      expect($('modal_nueva_empresa').classList.contains('abierto')).toBe(false);
      expect(lanzarToast).toHaveBeenCalledWith('Empresa creada correctamente', 'exito');
      expect($('guardar_nueva_empresa').disabled).toBe(false);
    });

    /**
     * Función   : editar_guardar_act_alum.js › crearEmpresa() (empresa ya existente y activa).
     * Comprueba : que si ya existe una empresa activa con ese nombre se selecciona
     *             la existente (sin duplicarla en la lista) y se muestra el aviso.
     */
    test('[crearEmpresa] Comprueba que si la empresa ya existe se selecciona la existente', async () => {
      await abrirModalEmpresa();
      rutas['crear.php'] = () => respuesta({
        success: false, error: 'Ya existe una empresa con ese nombre; se seleccionó en la lista.', id_empresa: 6, nombre: 'Beta'
      }, 409);
      llenarEmpresa({ nueva_empresa_nombre: 'beta' });

      await guardarEmpresa();

      expect($('id_empresa').value).toBe('6');
      expect([...$('id_empresa').options].filter((o) => o.text === 'Beta')).toHaveLength(1);
      expect($('modal_nueva_empresa').classList.contains('abierto')).toBe(false);
      expect(lanzarToast).toHaveBeenCalledWith('Ya existe una empresa con ese nombre; se seleccionó en la lista.', 'error');
    });

    /**
     * Función   : editar_guardar_act_alum.js › crearEmpresa() (error sin id).
     * Comprueba : que si el servidor responde error sin empresa el modal sigue
     *             abierto para corregir y se muestra el error.
     */
    test('[crearEmpresa] Comprueba que un error del servidor deja el modal abierto', async () => {
      await abrirModalEmpresa();
      rutas['crear.php'] = () => respuesta({ success: false, error: 'Ya existe una empresa con ese nombre pero está inactiva.', id_empresa: null }, 409);
      llenarEmpresa();

      await guardarEmpresa();

      expect($('modal_nueva_empresa').classList.contains('abierto')).toBe(true);
      expect(lanzarToast).toHaveBeenCalledWith('Ya existe una empresa con ese nombre pero está inactiva.', 'error');
    });
  });
});

// =====================================================================
// modal_dinamico.js
// =====================================================================
describe('modal_dinamico.js', () => {
  let m;
  beforeEach(() => {
    document.body.innerHTML = '';
    modulos = {};
    m = importar('./modal_dinamico.js');
  });

  describe('Función: confirmarModal()', () => {
    /**
     * Función   : modal_dinamico.js › confirmarModal() y crearModal().
     * Comprueba : que muestra título, mensaje y botones, y que "Confirmar"
     *             resuelve true y quita el modal.
     */
    test('[confirmarModal] Comprueba que muestra el modal y "Confirmar" responde true', async () => {
      const promesa = m.confirmarModal('¿Seguro?', { titulo: 'Atención', textoConfirmar: 'Sí' });

      expect(modal().querySelector('h2').textContent).toBe('Atención');
      expect(modal().querySelector('p').textContent).toBe('¿Seguro?');
      expect(document.activeElement).toBe(botonModal('Sí'));
      botonModal('Sí').click();

      await expect(promesa).resolves.toBe(true);
      expect(modal()).toBeNull();
    });

    /**
     * Función   : modal_dinamico.js › confirmarModal() (Cancelar y Esc).
     * Comprueba : que "Cancelar" y la tecla Esc responden false.
     */
    test.each([
      ['Cancelar', () => botonModal('Cancelar').click()],
      ['la tecla Esc', () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))],
    ])('[confirmarModal] Comprueba que %s responde false', async (_d, accion) => {
      const promesa = m.confirmarModal('¿Seguro?');

      accion();

      await expect(promesa).resolves.toBe(false);
      expect(modal()).toBeNull();
    });

    /**
     * Función   : modal_dinamico.js › crearModal() (reemplazo).
     * Comprueba : que si ya hay un modal abierto se quita antes de mostrar el nuevo.
     */
    test('[crearModal] Comprueba que nunca hay dos modales al mismo tiempo', () => {
      m.confirmarModal('Primero');
      m.confirmarModal('Segundo');

      expect(document.querySelectorAll('#modal-confirmacion')).toHaveLength(1);
      expect(modal().querySelector('p').textContent).toBe('Segundo');
    });
  });

  describe('Función: formularioModal()', () => {
    const CAMPOS = [
      { id: 'codigo', label: 'Código', maxLength: 5, placeholder: 'ABC', mayusculas: true },
      { id: 'tipo', label: 'Tipo', tipo: 'select', opciones: [{ valor: '', texto: '--' }, { valor: 'a', texto: 'A' }] },
      { id: 'anio', label: 'Año', tipo: 'number', min: 2000, max: 2155, valor: 2026 }
    ];

    /**
     * Función   : modal_dinamico.js › crearGrupoCampo(), crearInput() y crearSelect().
     * Comprueba : que se crean los campos con su etiqueta, tipo, límites y valor inicial.
     */
    test('[crearGrupoCampo] Comprueba que crea los campos con sus propiedades', () => {
      m.formularioModal({ titulo: 'Form', campos: CAMPOS, onEnviar: jest.fn() });

      expect($('modal_campo_codigo').maxLength).toBe(5);
      expect($('modal_campo_codigo').placeholder).toBe('ABC');
      expect(document.querySelector("label[for='modal_campo_codigo']").textContent).toBe('Código');
      expect($('modal_campo_tipo').tagName).toBe('SELECT');
      expect($('modal_campo_anio').type).toBe('number');
      expect($('modal_campo_anio').min).toBe('2000');
      expect($('modal_campo_anio').value).toBe('2026');
      expect(document.activeElement).toBe($('modal_campo_codigo'));
    });

    /**
     * Función   : modal_dinamico.js › marcarSelectVacio().
     * Comprueba : que el select lleva la clase "sin-valor" hasta que se elige algo.
     */
    test('[marcarSelectVacio] Comprueba la clase "sin-valor" del select', () => {
      m.formularioModal({ titulo: 'Form', campos: CAMPOS, onEnviar: jest.fn() });
      expect($('modal_campo_tipo').classList.contains('sin-valor')).toBe(true);

      $('modal_campo_tipo').value = 'a';
      $('modal_campo_tipo').dispatchEvent(new Event('change'));

      expect($('modal_campo_tipo').classList.contains('sin-valor')).toBe(false);
    });

    /**
     * Función   : modal_dinamico.js › crearInput() (mayusculas).
     * Comprueba : que los campos con mayusculas: true convierten lo que se escribe.
     */
    test('[crearInput] Comprueba que un campo con mayusculas convierte el texto', () => {
      m.formularioModal({ titulo: 'Form', campos: CAMPOS, onEnviar: jest.fn() });

      escribir('modal_campo_codigo', 'ab1');

      expect($('modal_campo_codigo').value).toBe('AB1');
    });

    /**
     * Función   : modal_dinamico.js › enviar() y leerValores().
     * Comprueba : que al enviar llama a onEnviar con los valores sin espacios y,
     *             si no hay error, cierra el modal y resuelve esos valores.
     */
    test('[formularioModal] Comprueba que envía los valores y cierra si no hay error', async () => {
      const onEnviar = jest.fn().mockResolvedValue(undefined);
      const promesa = m.formularioModal({ titulo: 'Form', campos: CAMPOS, textoEnviar: 'Guardar', onEnviar });
      $('modal_campo_codigo').value = '  X1  ';
      $('modal_campo_tipo').value = 'a';

      botonModal('Guardar').click();

      await expect(promesa).resolves.toEqual({ codigo: 'X1', tipo: 'a', anio: '2026' });
      expect(onEnviar).toHaveBeenCalledWith({ codigo: 'X1', tipo: 'a', anio: '2026' });
      expect(modal()).toBeNull();
    });

    /**
     * Función   : modal_dinamico.js › enviar() (onEnviar regresa un error).
     * Comprueba : que si onEnviar regresa un texto se muestra como error, el
     *             modal sigue abierto y los botones se vuelven a habilitar.
     */
    test('[formularioModal] Comprueba que muestra el error y deja el modal abierto', async () => {
      const onEnviar = jest.fn().mockResolvedValue('Dato repetido');
      m.formularioModal({ titulo: 'Form', campos: CAMPOS, onEnviar });

      botonModal('Enviar').click();
      expect(botonModal('Enviar').disabled).toBe(true); // mientras espera
      await esperarPromesas();

      expect(modal().querySelector('.modal-error').textContent).toBe('Dato repetido');
      expect(botonModal('Enviar').disabled).toBe(false);
      expect(botonModal('Cancelar').disabled).toBe(false);
    });

    /**
     * Función   : modal_dinamico.js › crearInput() (tecla Enter).
     * Comprueba : que presionar Enter en un campo envía el formulario.
     */
    test('[crearInput] Comprueba que la tecla Enter envía el formulario', async () => {
      const onEnviar = jest.fn().mockResolvedValue(undefined);
      m.formularioModal({ titulo: 'Form', campos: CAMPOS, onEnviar });

      $('modal_campo_codigo').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      await esperarPromesas();

      expect(onEnviar).toHaveBeenCalled();
    });

    /**
     * Función   : modal_dinamico.js › formularioModal() (Cancelar).
     * Comprueba : que Cancelar cierra el modal, resuelve null y no llama a onEnviar.
     */
    test('[formularioModal] Comprueba que Cancelar resuelve null sin enviar', async () => {
      const onEnviar = jest.fn();
      const promesa = m.formularioModal({ titulo: 'Form', campos: CAMPOS, onEnviar });

      botonModal('Cancelar').click();

      await expect(promesa).resolves.toBeNull();
      expect(onEnviar).not.toHaveBeenCalled();
    });
  });
});

// =====================================================================
// menu.js
// =====================================================================
describe('menu.js', () => {
  /**
   * Función   : menu.js › listener "DOMContentLoaded".
   * Comprueba : que al cargar la página se dibuja el menú con renderMenu()
   *             de ../js/menu.js.
   */
  test('[DOMContentLoaded] Comprueba que al cargar la página se llama a renderMenu()', async () => {
    await cargarPerfil('2');

    expect(renderMenu).toHaveBeenCalledTimes(1);
  });
});