/**
 * @jest-environment jsdom
 *
 * Archivo      : registro.test.js
 * Módulo       : CU_02_RegistroUsuario (Pruebas unitarias)
 * Archivo bajo prueba : app/CU_02_RegistroUsuario/registro.js
 * Herramienta  : Jest + jsdom
 * Descripción  : Pruebas unitarias de registro.js. Se usa el HTML real
 *                (registro.html) y se simulan las respuestas de los PHP con un
 *                mock de fetch, así no se necesita servidor.
 *                registro.js es un módulo que importa lanzarToast de
 *                ../js/lanzar_toast.js; la prueba sustituye ese import por un
 *                simulador (jest.fn) para revisar qué mensajes se muestran.
 *                El código original NO se modifica.
 *
 * Cómo correrlo (dentro de OPS-web-app):
 *   npx jest Pruebas_Unitarias/CU_02 --verbose
 *
 * Funciones de registro.js que se prueban:
 *   1. Listener "input" de #confirmar_password   → compara contraseñas.
 *   2. aplicarMayusculasAlInstante() / "input" de #emp_rfc → mayúsculas automáticas.
 *   3. Listener "input" de #password             → colores de requisitos.
 *   4. Carga de catálogos (fetch obtener_catalogos.php) y cargarCarrerasPorFacultad().
 *   5. cargarActividades()                       → fetch obtener_actividades.php.
 *   6. cargarEmpresas()                          → fetch obtener_empresas.php.
 *   7. Listener "change" de los radios tipo_usuario (alumno / coordinador).
 *   8. Modal de empresa: abrir, cerrar y limpiarModalEmpresa().
 *   9. Listener "click" de #guardarEmpresa       → registrar_empresa.php.
 *  10. Listener "submit" de #formRegistro        → validaciones y registro.php.
 *
 * Cada prueba indica:
 *   - Función   : qué función de registro.js se está probando.
 *   - Comprueba : qué comportamiento se verifica.
 */
const fs = require('fs');
const path = require('path');

const RUTA_APP = path.resolve(__dirname, '../../app/CU_02_RegistroUsuario');
const HTML = fs.readFileSync(path.join(RUTA_APP, 'registro.html'), 'utf8');
const BODY = HTML.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
const CODIGO_JS = fs
  .readFileSync(path.join(RUTA_APP, 'registro.js'), 'utf8')
  .replace(/^\s*import\s*\{\s*lanzarToast\s*\}\s*from\s*['"][^'"]+['"];?/m, '');

// =====================================================================
// DATOS SIMULADOS (lo que responderían los PHP)
// =====================================================================
const CATALOGOS = {
  facultades: [
    { Id_facultad: 1, Nombre: 'FCBIyT' },
    { Id_facultad: 2, Nombre: 'Ciencias de la Salud' }
  ],
  carreras: [
    { Id_carrera: 10, Nombre: 'Ing. en Computación', Id_facultad: 1 },
    { Id_carrera: 11, Nombre: 'Ing. Química', Id_facultad: 1 },
    { Id_carrera: 20, Nombre: 'Enfermería', Id_facultad: 2 }
  ]
};
const ACTIVIDADES = {
  success: true,
  actividades: [
    { Id_actividad: 1, Nombre: 'Prácticas profesionales' },
    { Id_actividad: 2, Nombre: 'Servicio social' }
  ]
};
const EMPRESAS = {
  empresas: [
    { Id_empresa: 5, Nombre: 'Acme' },
    { Id_empresa: 6, Nombre: 'Beta' }
  ]
};

// =====================================================================
// FUNCIONES DE APOYO (no son pruebas)
// =====================================================================
let lanzarToast;
let rutas;

/** Respuesta simulada de fetch. */
function respuesta(json, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(json) });
}

/** Deja que terminen las promesas pendientes (fetch → json → then). */
async function esperarPromesas() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

/**
 * Carga registro.html y ejecuta registro.js como lo haría el navegador.
 * @param {object} cambios Respuestas distintas para algún PHP, por ejemplo
 *                         { 'obtener_empresas.php': () => Promise.reject(...) }
 */
async function cargarRegistro(cambios = {}) {
  document.body.innerHTML = BODY;

  rutas = {
    'obtener_catalogos.php': () => respuesta(CATALOGOS),
    'obtener_actividades.php': () => respuesta(ACTIVIDADES),
    'obtener_empresas.php': () => respuesta(EMPRESAS),
    'registrar_empresa.php': () => respuesta({ success: true, id_empresa: 6, nombre: 'Beta' }),
    'registro.php': () => respuesta({ success: true }),
    ...cambios
  };
  global.fetch = jest.fn((url, opciones) => rutas[url](opciones));

  let alCargarDom = null;
  const espia = jest
    .spyOn(document, 'addEventListener')
    .mockImplementation((evento, callback) => {
      if (evento === 'DOMContentLoaded') alCargarDom = callback;
    });

  // eslint-disable-next-line no-new-func
  new Function('lanzarToast', '"use strict";\n' + CODIGO_JS)(lanzarToast);

  espia.mockRestore();
  alCargarDom();
  await esperarPromesas();
}

const $ = (id) => document.getElementById(id);

function escribir(id, valor, evento = 'input') {
  $(id).value = valor;
  $(id).dispatchEvent(new Event(evento));
}

function elegir(id, valor) {
  $(id).value = valor;
  $(id).dispatchEvent(new Event('change'));
}

function cambiarTipo(tipo) {
  const radio = document.querySelector(`input[name='tipo_usuario'][value='${tipo}']`);
  radio.checked = true;
  radio.dispatchEvent(new Event('change'));
}

/** Llena el formulario con datos válidos de un alumno (se pueden cambiar campos). */
function llenarAlumno(cambios = {}) {
  const d = {
    matricula: '20232389',
    password: 'Clave123!',
    confirmar_password: 'Clave123!',
    nombre_alumno: 'Ana',
    apellido_p_alumno: 'López',
    apellido_m_alumno: 'Ruiz',
    facultad_alumno: '1',
    carrera_alumno: '10',
    actividad: '1',
    periodo_tipo: 'primavera',
    grupo: '7A',
    hora_inicio: '',
    hora_fin: '',
    email_alumno: 'ana@uatx.mx',
    telefono_alumno: '246-1234-567',
    organizacion: '',
    ...cambios
  };
  escribir('matricula', d.matricula);
  escribir('password', d.password);
  escribir('confirmar_password', d.confirmar_password);
  escribir('nombre_alumno', d.nombre_alumno);
  escribir('apellido_p_alumno', d.apellido_p_alumno);
  escribir('apellido_m_alumno', d.apellido_m_alumno);
  elegir('facultad_alumno', d.facultad_alumno);
  elegir('carrera_alumno', d.carrera_alumno);
  elegir('actividad', d.actividad);
  elegir('periodo_tipo', d.periodo_tipo);
  escribir('grupo', d.grupo);
  $('hora_inicio').value = d.hora_inicio;
  $('hora_fin').value = d.hora_fin;
  escribir('email_alumno', d.email_alumno);
  escribir('telefono_alumno', d.telefono_alumno);
  elegir('organizacion', d.organizacion);
}

/** Llena el formulario con datos válidos de un coordinador. */
function llenarCoordinador(cambios = {}) {
  cambiarTipo('coordinador');
  const d = {
    matricula: '1234',
    password: 'Clave123!',
    confirmar_password: 'Clave123!',
    nombre_coordinador: 'Luis',
    apellido_p_coordinador: 'Pérez',
    apellido_m_coordinador: 'Gómez',
    facultad_coordinador: '1',
    carrera_coordinador: '11',
    telefono_coordinador: '2461112233',
    correo_coordinador: 'luis@uatx.mx',
    ...cambios
  };
  escribir('matricula', d.matricula);
  escribir('password', d.password);
  escribir('confirmar_password', d.confirmar_password);
  escribir('nombre_coordinador', d.nombre_coordinador);
  escribir('apellido_p_coordinador', d.apellido_p_coordinador);
  escribir('apellido_m_coordinador', d.apellido_m_coordinador);
  elegir('facultad_coordinador', d.facultad_coordinador);
  elegir('carrera_coordinador', d.carrera_coordinador);
  escribir('telefono_coordinador', d.telefono_coordinador);
  escribir('correo_coordinador', d.correo_coordinador);
}

async function enviarFormulario() {
  $('formRegistro').dispatchEvent(new Event('submit', { cancelable: true }));
  await esperarPromesas();
}

/** Llamada a fetch hecha a un PHP (o undefined si no se llamó). */
const llamadaA = (archivo) => fetch.mock.calls.find((c) => c[0] === archivo);
const cuerpoEnviadoA = (archivo) => JSON.parse(llamadaA(archivo)[1].body);
const opciones = (id) => [...$(id).options].map((o) => [o.value, o.textContent]);

function llenarEmpresa(cambios = {}) {
  const d = {
    emp_nombre: 'Nueva SA',
    emp_razon: 'Nueva Sociedad Anónima',
    emp_rfc: 'NUE123456AB1',
    emp_direccion: 'Calle 1, Tlaxcala',
    emp_web: 'https://nueva.mx',
    emp_desc: 'Empresa de software',
    ...cambios
  };
  Object.entries(d).forEach(([id, valor]) => { $(id).value = valor; });
}

// =====================================================================
// PREPARACIÓN DE CADA PRUEBA
// =====================================================================
beforeEach(async () => {
  lanzarToast = jest.fn();
  jest.spyOn(console, 'error').mockImplementation(() => {}); // aviso de navegación de jsdom
  await cargarRegistro();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  delete global.fetch;
});

// =====================================================================
describe('registro.js', () => {

  // ===================================================================
  describe('Función: "input" de #confirmar_password (comparar contraseñas)', () => {

    /**
     * Función   : listener "input" de #confirmar_password.
     * Comprueba : que si las contraseñas son distintas el campo se pone rojo,
     *             aparece "Las contraseñas no coinciden" y se deshabilita el botón.
     */
    test('[input #confirmar_password] Comprueba que si no coinciden se marca en rojo y se bloquea el botón', () => {
      escribir('password', 'Clave123!');
      escribir('confirmar_password', 'Otra123!');

      expect($('confirmar_password').style.borderColor).toBe('red');
      expect($('error-password').style.display).toBe('block');
      expect(document.querySelector("button[type='submit']").disabled).toBe(true);
    });

    /**
     * Función   : listener "input" de #confirmar_password.
     * Comprueba : que si las contraseñas coinciden el campo se pone verde, se
     *             oculta el error y el botón se habilita.
     */
    test('[input #confirmar_password] Comprueba que si coinciden se marca en verde y se habilita el botón', () => {
      escribir('password', 'Clave123!');
      escribir('confirmar_password', 'Otra');
      escribir('confirmar_password', 'Clave123!');

      expect($('confirmar_password').style.borderColor).toBe('green');
      expect($('error-password').style.display).toBe('none');
      expect(document.querySelector("button[type='submit']").disabled).toBe(false);
    });

    /**
     * Función   : listener "input" de #confirmar_password.
     * Comprueba : que si se borra la confirmación se quitan el color y el error
     *             y el botón vuelve a habilitarse.
     */
    test('[input #confirmar_password] Comprueba que si se vacía la confirmación se limpia el estado', () => {
      escribir('password', 'Clave123!');
      escribir('confirmar_password', 'x');
      escribir('confirmar_password', '');

      expect($('confirmar_password').style.borderColor).toBe('');
      expect($('error-password').style.display).toBe('none');
      expect(document.querySelector("button[type='submit']").disabled).toBe(false);
    });
  });

  // ===================================================================
  describe('Función: aplicarMayusculasAlInstante() y "input" de #emp_rfc', () => {

    /**
     * Función   : aplicarMayusculasAlInstante() e "input" de #emp_rfc.
     * Comprueba : que matrícula, grupo y RFC se convierten a mayúsculas mientras
     *             se escriben.
     */
    test.each([
      ['matricula', 'ab12cd34', 'AB12CD34'],
      ['grupo', '7a', '7A'],
      ['emp_rfc', 'abc123456xy9', 'ABC123456XY9'],
    ])('[aplicarMayusculasAlInstante] Comprueba que #%s convierte "%s" en "%s"', (id, escrito, esperado) => {
      escribir(id, escrito);

      expect($(id).value).toBe(esperado);
    });
  });

  // ===================================================================
  describe('Función: "input" de #password (requisitos de la contraseña)', () => {

    /**
     * Función   : listener "input" de #password.
     * Comprueba : que cada requisito se pinta en verde si se cumple y en rojo si no.
     */
    test.each([
      ['abc', { 'req-long': 'red', 'req-mayus': 'red', 'req-minus': 'green', 'req-num': 'red', 'req-esp': 'red' }],
      ['ABCDEFGH', { 'req-long': 'green', 'req-mayus': 'green', 'req-minus': 'red', 'req-num': 'red', 'req-esp': 'red' }],
      ['abc12345', { 'req-long': 'green', 'req-mayus': 'red', 'req-minus': 'green', 'req-num': 'green', 'req-esp': 'red' }],
      ['Clave123!', { 'req-long': 'green', 'req-mayus': 'green', 'req-minus': 'green', 'req-num': 'green', 'req-esp': 'green' }],
    ])('[input #password] Comprueba los colores de los requisitos para "%s"', (clave, colores) => {
      escribir('password', clave);

      Object.entries(colores).forEach(([id, color]) => {
        expect($(id).style.color).toBe(color);
      });
    });
  });

  // ===================================================================
  describe('Función: carga de catálogos y cargarCarrerasPorFacultad()', () => {

    /**
     * Función   : fetch a obtener_catalogos.php (al cargar la página).
     * Comprueba : que las facultades se agregan a los selects de alumno y de
     *             coordinador.
     */
    test('[obtener_catalogos] Comprueba que llena las facultades de alumno y coordinador', () => {
      const esperado = [['', 'Seleccione una facultad'], ['1', 'FCBIyT'], ['2', 'Ciencias de la Salud']];

      expect(opciones('facultad_alumno')).toEqual(esperado);
      expect(opciones('facultad_coordinador')).toEqual(esperado);
    });

    /**
     * Función   : cargarCarrerasPorFacultad() (al cambiar #facultad_alumno).
     * Comprueba : que solo aparecen las carreras de la facultad elegida.
     */
    test('[cargarCarrerasPorFacultad] Comprueba que el alumno solo ve las carreras de su facultad', () => {
      elegir('facultad_alumno', '1');

      expect(opciones('carrera_alumno')).toEqual([
        ['', 'Seleccione una carrera'], ['10', 'Ing. en Computación'], ['11', 'Ing. Química']
      ]);
    });

    /**
     * Función   : cargarCarrerasPorFacultad() (al cambiar #facultad_coordinador).
     * Comprueba : que al cambiar de facultad se reemplazan las carreras anteriores.
     */
    test('[cargarCarrerasPorFacultad] Comprueba que al cambiar de facultad se reemplazan las carreras', () => {
      elegir('facultad_coordinador', '1');
      elegir('facultad_coordinador', '2');

      expect(opciones('carrera_coordinador')).toEqual([['', 'Seleccione una carrera'], ['20', 'Enfermería']]);
    });

    /**
     * Función   : fetch a obtener_catalogos.php (bloque catch).
     * Comprueba : que si falla la carga se muestra "Error al cargar los catálogos".
     */
    test('[obtener_catalogos] Comprueba que si falla la carga se muestra un error', async () => {
      lanzarToast = jest.fn();
      await cargarRegistro({ 'obtener_catalogos.php': () => Promise.reject(new Error('sin red')) });

      expect(lanzarToast).toHaveBeenCalledWith('Error al cargar los catálogos', 'error');
    });
  });

  // ===================================================================
  describe('Función: cargarActividades()', () => {

    /**
     * Función   : cargarActividades().
     * Comprueba : que las actividades se agregan al select #actividad.
     */
    test('[cargarActividades] Comprueba que llena el select de actividades', () => {
      expect(opciones('actividad')).toEqual([
        ['', 'Seleccione una actividad'], ['1', 'Prácticas profesionales'], ['2', 'Servicio social']
      ]);
    });

    /**
     * Función   : cargarActividades() (if (!data.actividades) return).
     * Comprueba : que si el servidor responde sin "actividades" el select se queda
     *             como estaba, sin errores.
     */
    test('[cargarActividades] Comprueba que sin "actividades" en la respuesta no cambia el select', async () => {
      await cargarRegistro({ 'obtener_actividades.php': () => respuesta({ success: false, error: 'error_conexion_db' }) });

      expect(opciones('actividad')).toEqual([['', 'Seleccione una actividad']]);
    });

    /**
     * Función   : cargarActividades() (bloque catch).
     * Comprueba : que si falla la carga se muestra "Error al cargar actividades".
     */
    test('[cargarActividades] Comprueba que si falla la carga se muestra un error', async () => {
      lanzarToast = jest.fn();
      await cargarRegistro({ 'obtener_actividades.php': () => Promise.reject(new Error('sin red')) });

      expect(lanzarToast).toHaveBeenCalledWith('Error al cargar actividades', 'error');
    });
  });

  // ===================================================================
  describe('Función: cargarEmpresas()', () => {

    /**
     * Función   : cargarEmpresas().
     * Comprueba : que las empresas se agregan al select #organizacion con la
     *             opción "(opcional)".
     */
    test('[cargarEmpresas] Comprueba que llena el select de empresas', () => {
      expect(opciones('organizacion')).toEqual([
        ['', 'Seleccione una empresa (opcional)'], ['5', 'Acme'], ['6', 'Beta']
      ]);
    });

    /**
     * Función   : cargarEmpresas() (bloque catch).
     * Comprueba : que si falla la carga se muestra "Error al cargar las empresas".
     */
    test('[cargarEmpresas] Comprueba que si falla la carga se muestra un error', async () => {
      lanzarToast = jest.fn();
      await cargarRegistro({ 'obtener_empresas.php': () => Promise.reject(new Error('sin red')) });

      expect(lanzarToast).toHaveBeenCalledWith('Error al cargar las empresas', 'error');
    });
  });

  // ===================================================================
  describe('Función: "change" de los radios tipo_usuario', () => {

    /**
     * Función   : listener "change" de tipo_usuario (se ejecuta al cargar).
     * Comprueba : que al inicio se muestra la sección de alumno y los campos de
     *             coordinador quedan ocultos y deshabilitados.
     */
    test('[change tipo_usuario] Comprueba que al cargar se muestra Alumno y se oculta Coordinador', () => {
      expect($('grupoAlumno').hidden).toBe(false);
      expect($('grupoCoordinador').hidden).toBe(true);
      expect($('nombre_coordinador').disabled).toBe(true);
      expect($('nombre_alumno').disabled).toBe(false);
    });

    /**
     * Función   : listener "change" de tipo_usuario.
     * Comprueba : que al elegir Coordinador se muestra su sección, se oculta la
     *             del alumno y se deshabilitan los campos del alumno.
     */
    test('[change tipo_usuario] Comprueba que al elegir Coordinador se intercambian las secciones', () => {
      cambiarTipo('coordinador');

      expect($('grupoAlumno').hidden).toBe(true);
      expect($('grupoCoordinador').hidden).toBe(false);
      expect($('nombre_alumno').disabled).toBe(true);
      expect($('carrera_alumno').disabled).toBe(true);
      expect($('nombre_coordinador').disabled).toBe(false);
    });

    /**
     * Función   : listener "change" de tipo_usuario.
     * Comprueba : que al regresar a Alumno todo vuelve al estado inicial.
     */
    test('[change tipo_usuario] Comprueba que al regresar a Alumno se restauran las secciones', () => {
      cambiarTipo('coordinador');
      cambiarTipo('alumno');

      expect($('grupoAlumno').hidden).toBe(false);
      expect($('grupoCoordinador').hidden).toBe(true);
      expect($('nombre_alumno').disabled).toBe(false);
      expect($('nombre_coordinador').disabled).toBe(true);
    });

    /**
     * Función   : listener "change" de tipo_usuario (mensaje.style.display = "none").
     * Comprueba : que al cambiar de tipo de cuenta se oculta el mensaje anterior.
     */
    test('[change tipo_usuario] Comprueba que al cambiar de tipo se oculta el mensaje', () => {
      $('mensaje').style.display = 'block';

      cambiarTipo('coordinador');

      expect($('mensaje').style.display).toBe('none');
    });
  });

  // ===================================================================
  describe('Función: modal de empresa (abrir, cerrar y limpiarModalEmpresa)', () => {

    /**
     * Función   : listener "click" de #btnNuevaEmpresa.
     * Comprueba : que el botón "Registrar nueva empresa" abre el modal.
     */
    test('[click #btnNuevaEmpresa] Comprueba que abre el modal de empresa', () => {
      $('btnNuevaEmpresa').click();

      expect($('modalEmpresa').style.display).toBe('block');
    });

    /**
     * Función   : listener "click" de #cerrarModal y limpiarModalEmpresa().
     * Comprueba : que "Cancelar" cierra el modal y borra lo que se había escrito.
     */
    test('[click #cerrarModal / limpiarModalEmpresa] Comprueba que Cancelar cierra el modal y limpia los campos', () => {
      $('btnNuevaEmpresa').click();
      llenarEmpresa();

      $('cerrarModal').click();

      expect($('modalEmpresa').style.display).toBe('none');
      ['emp_nombre', 'emp_razon', 'emp_rfc', 'emp_direccion', 'emp_web', 'emp_desc']
        .forEach((id) => expect($(id).value).toBe(''));
    });
  });

  // ===================================================================
  describe('Función: "click" de #guardarEmpresa (registrar empresa)', () => {

    /**
     * Función   : listener "click" de #guardarEmpresa (validación de obligatorios).
     * Comprueba : que si falta nombre comercial, razón social o RFC se muestra
     *             un error y NO se llama al servidor.
     */
    test.each([
      ['nombre comercial', { emp_nombre: '' }],
      ['razón social', { emp_razon: '   ' }],
      ['RFC', { emp_rfc: '' }],
    ])('[click #guardarEmpresa] Comprueba que sin %s no se envía la empresa', async (_campo, cambios) => {
      llenarEmpresa(cambios);

      $('guardarEmpresa').click();
      await esperarPromesas();

      expect(lanzarToast).toHaveBeenCalledWith('Complete los campos obligatorios de la empresa', 'error');
      expect(llamadaA('registrar_empresa.php')).toBeUndefined();
    });

    /**
     * Función   : listener "click" de #guardarEmpresa (regexRFC).
     * Comprueba : que un RFC que no tiene 12 o 13 letras/números se rechaza.
     */
    test.each([
      ['corto (11)', 'ABC12345678'],
      ['largo (14)', 'ABCD1234567890'],
      ['con guiones', 'ABC-123456-X1'],
    ])('[click #guardarEmpresa] Comprueba que rechaza un RFC %s', async (_desc, rfc) => {
      llenarEmpresa({ emp_rfc: rfc });

      $('guardarEmpresa').click();
      await esperarPromesas();

      expect(lanzarToast).toHaveBeenCalledWith('RFC inválido. Debe tener entre 12 y 13 caracteres.', 'error');
      expect(llamadaA('registrar_empresa.php')).toBeUndefined();
    });

    /**
     * Función   : listener "click" de #guardarEmpresa (fetch a registrar_empresa.php).
     * Comprueba : que envía un POST en JSON con los datos de la empresa sin
     *             espacios al inicio ni al final.
     */
    test('[click #guardarEmpresa] Comprueba que envía la empresa en JSON a registrar_empresa.php', async () => {
      llenarEmpresa({ emp_nombre: '  Nueva SA  ' });

      $('guardarEmpresa').click();
      await esperarPromesas();

      expect(llamadaA('registrar_empresa.php')[1].method).toBe('POST');
      expect(llamadaA('registrar_empresa.php')[1].headers).toEqual({ 'Content-Type': 'application/json' });
      expect(cuerpoEnviadoA('registrar_empresa.php')).toEqual({
        nombre_comercial: 'Nueva SA',
        razon_social: 'Nueva Sociedad Anónima',
        rfc: 'NUE123456AB1',
        direccion: 'Calle 1, Tlaxcala',
        sitio_web: 'https://nueva.mx',
        descripcion: 'Empresa de software'
      });
    });

    /**
     * Función   : listener "click" de #guardarEmpresa (data.success = true) y cargarEmpresas(id).
     * Comprueba : que al registrar la empresa se muestra el mensaje de éxito, se
     *             cierra y limpia el modal, se recargan las empresas y queda
     *             seleccionada la nueva.
     */
    test('[click #guardarEmpresa / cargarEmpresas] Comprueba que al guardar se cierra el modal y se selecciona la nueva empresa', async () => {
      rutas['registrar_empresa.php'] = () => respuesta({ success: true, id_empresa: 7, nombre: 'Nueva SA' });
      rutas['obtener_empresas.php'] = () => respuesta({
        empresas: [...EMPRESAS.empresas, { Id_empresa: 7, Nombre: 'Nueva SA' }]
      });
      $('btnNuevaEmpresa').click();
      llenarEmpresa();

      $('guardarEmpresa').click();
      await esperarPromesas();

      expect(lanzarToast).toHaveBeenCalledWith('¡Empresa registrada exitosamente!', 'exito');
      expect($('modalEmpresa').style.display).toBe('none');
      expect($('emp_nombre').value).toBe('');
      expect($('organizacion').value).toBe('7');
    });

    /**
     * Función   : listener "click" de #guardarEmpresa (data.success = false).
     * Comprueba : que si el servidor rechaza la empresa (por ejemplo RFC repetido)
     *             se muestra su mensaje y el modal sigue abierto.
     */
    test('[click #guardarEmpresa] Comprueba que muestra el error del servidor y deja el modal abierto', async () => {
      rutas['registrar_empresa.php'] = () => respuesta({
        success: false, error: 'El nombre de la empresa o el RFC ya se encuentran registrados.'
      });
      $('btnNuevaEmpresa').click();
      llenarEmpresa();

      $('guardarEmpresa').click();
      await esperarPromesas();

      expect(lanzarToast).toHaveBeenCalledWith('El nombre de la empresa o el RFC ya se encuentran registrados.', 'error');
      expect($('modalEmpresa').style.display).toBe('block');
    });

    /**
     * Función   : listener "click" de #guardarEmpresa (data.error vacío).
     * Comprueba : que si el servidor no manda mensaje se muestra
     *             "No se pudo registrar la empresa".
     */
    test('[click #guardarEmpresa] Comprueba el mensaje genérico si el servidor no explica el error', async () => {
      rutas['registrar_empresa.php'] = () => respuesta({ success: false });
      llenarEmpresa();

      $('guardarEmpresa').click();
      await esperarPromesas();

      expect(lanzarToast).toHaveBeenCalledWith('No se pudo registrar la empresa', 'error');
    });

    /**
     * Función   : listener "click" de #guardarEmpresa (if (!res.ok) throw).
     * Comprueba : que si el servidor responde con error HTTP se muestra
     *             "Error del servidor".
     */
    test('[click #guardarEmpresa] Comprueba que un error HTTP muestra "Error del servidor"', async () => {
      rutas['registrar_empresa.php'] = () => respuesta({}, false);
      llenarEmpresa();

      $('guardarEmpresa').click();
      await esperarPromesas();

      expect(lanzarToast).toHaveBeenCalledWith('Error del servidor', 'error');
    });
  });

  // ===================================================================
  describe('Función: "submit" de #formRegistro (validaciones)', () => {

    /**
     * Función   : listener "submit" de #formRegistro (regexAlumno).
     * Comprueba : que la matrícula de un alumno debe tener exactamente 8 dígitos.
     */
    test.each(['1234', '2023238', '202323890', '2023238A'])(
      '[submit #formRegistro] Comprueba que rechaza la matrícula de alumno "%s"', async (matricula) => {
        llenarAlumno({ matricula });

        await enviarFormulario();

        expect(lanzarToast).toHaveBeenCalledWith('La matrícula del alumno debe tener 8 dígitos.', 'error');
        expect(llamadaA('registro.php')).toBeUndefined();
      });

    /**
     * Función   : listener "submit" de #formRegistro (regexCoordinador).
     * Comprueba : que la matrícula de un coordinador debe tener exactamente 4 dígitos.
     */
    test.each(['20232389', '123', '12345'])(
      '[submit #formRegistro] Comprueba que rechaza la matrícula de coordinador "%s"', async (matricula) => {
        llenarCoordinador({ matricula });

        await enviarFormulario();

        expect(lanzarToast).toHaveBeenCalledWith('La matrícula del coordinador debe tener 4 dígitos.', 'error');
        expect(llamadaA('registro.php')).toBeUndefined();
      });

    /**
     * Función   : listener "submit" de #formRegistro (password !== confirmar).
     * Comprueba : que si las contraseñas no coinciden no se envía el registro.
     */
    test('[submit #formRegistro] Comprueba que rechaza contraseñas que no coinciden', async () => {
      llenarAlumno({ confirmar_password: 'Otra123!' });

      await enviarFormulario();

      expect(lanzarToast).toHaveBeenCalledWith('Las contraseñas no coinciden', 'error');
      expect(llamadaA('registro.php')).toBeUndefined();
    });

    /**
     * Función   : listener "submit" de #formRegistro (regexPassword).
     * Comprueba : que la contraseña debe tener 8+ caracteres, mayúscula,
     *             minúscula, número y símbolo.
     */
    test.each([
      ['sin mayúscula', 'clave123!'],
      ['sin minúscula', 'CLAVE123!'],
      ['sin número', 'Claveabc!'],
      ['sin símbolo', 'Clave1234'],
      ['de menos de 8 caracteres', 'Cl1!'],
    ])('[submit #formRegistro] Comprueba que rechaza una contraseña %s', async (_desc, clave) => {
      llenarAlumno({ password: clave, confirmar_password: clave });

      await enviarFormulario();

      expect(lanzarToast).toHaveBeenCalledWith('La contraseña debe tener mayúscula, minúscula, número y símbolo.', 'error');
      expect(llamadaA('registro.php')).toBeUndefined();
    });

    /**
     * Función   : listener "submit" de #formRegistro (validación del horario).
     * Comprueba : que la hora de inicio debe ser menor que la hora de fin.
     */
    test.each([
      ['mayor', '14:00', '09:00'],
      ['igual', '10:00', '10:00'],
    ])('[submit #formRegistro] Comprueba que rechaza una hora de inicio %s a la de fin', async (_desc, inicio, fin) => {
      llenarAlumno({ hora_inicio: inicio, hora_fin: fin });

      await enviarFormulario();

      expect(lanzarToast).toHaveBeenCalledWith('La hora de inicio debe ser menor a la hora de fin.', 'error');
      expect(llamadaA('registro.php')).toBeUndefined();
    });

    /**
     * Función   : listener "submit" de #formRegistro (if (!datos.actividad)).
     * Comprueba : que el alumno debe elegir una actividad.
     */
    test('[submit #formRegistro] Comprueba que exige seleccionar una actividad', async () => {
      llenarAlumno({ actividad: '' });

      await enviarFormulario();

      expect(lanzarToast).toHaveBeenCalledWith('Debe seleccionar una actividad.', 'error');
      expect(llamadaA('registro.php')).toBeUndefined();
    });

    /**
     * Función   : listener "submit" de #formRegistro (if (!datos.periodo_tipo)).
     * Comprueba : que el alumno debe elegir un periodo.
     */
    test('[submit #formRegistro] Comprueba que exige seleccionar un periodo', async () => {
      llenarAlumno({ periodo_tipo: '' });

      await enviarFormulario();

      expect(lanzarToast).toHaveBeenCalledWith('Debe seleccionar un periodo.', 'error');
      expect(llamadaA('registro.php')).toBeUndefined();
    });

    /**
     * Función   : listener "submit" de #formRegistro (regexGrupo).
     * Comprueba : que el grupo debe ser un número seguido de una letra (ej. 7A).
     */
    test.each(['A7', '77', '7', 'AB'])(
      '[submit #formRegistro] Comprueba que rechaza el grupo "%s"', async (grupo) => {
        llenarAlumno({ grupo });

        await enviarFormulario();

        expect(lanzarToast).toHaveBeenCalledWith('El grupo debe tener formato 7A.', 'error');
        expect(llamadaA('registro.php')).toBeUndefined();
      });

    /**
     * Función   : listener "submit" de #formRegistro (regexTelefono).
     * Comprueba : que el teléfono del alumno debe tener el formato xxx-xxxx-xxx.
     */
    test.each(['2461234567', '246-123-4567', '246 1234 567', 'abc-defg-hij'])(
      '[submit #formRegistro] Comprueba que rechaza el teléfono "%s"', async (telefono) => {
        llenarAlumno({ telefono_alumno: telefono });

        await enviarFormulario();

        expect(lanzarToast).toHaveBeenCalledWith('El teléfono debe tener el formato xxx-xxxx-xxx.', 'error');
        expect(llamadaA('registro.php')).toBeUndefined();
      });

    /**
     * Función   : listener "submit" de #formRegistro (e.preventDefault()).
     * Comprueba : que enviar el formulario no recarga la página.
     */
    test('[submit #formRegistro] Comprueba que evita que el formulario recargue la página', async () => {
      llenarAlumno();
      const evento = new Event('submit', { cancelable: true });

      $('formRegistro').dispatchEvent(evento);
      await esperarPromesas();

      expect(evento.defaultPrevented).toBe(true);
    });
  });

  // ===================================================================
  describe('Función: "submit" de #formRegistro (envío a registro.php)', () => {

    /**
     * Función   : listener "submit" de #formRegistro (armado de "datos" para alumno).
     * Comprueba : que un alumno válido envía a registro.php todos sus datos, sin
     *             horario (null) ni organización (null) si no los llenó.
     */
    test('[submit #formRegistro] Comprueba los datos que envía un alumno sin horario ni empresa', async () => {
      llenarAlumno();

      await enviarFormulario();

      expect(llamadaA('registro.php')[1].method).toBe('POST');
      expect(cuerpoEnviadoA('registro.php')).toEqual({
        tipo_usuario: 'alumno',
        matricula: '20232389',
        password: 'Clave123!',
        confirmar: 'Clave123!',
        nombre: 'Ana',
        apellido_p: 'López',
        apellido_m: 'Ruiz',
        id_carrera: '10',
        grupo: '7A',
        horario: null,
        email: 'ana@uatx.mx',
        telefono: '246-1234-567',
        organizacion: null,
        actividad: '1',
        periodo_tipo: 'primavera'
      });
    });

    /**
     * Función   : listener "submit" de #formRegistro (horario y organización).
     * Comprueba : que el horario se envía como "inicio - fin" y la empresa
     *             elegida como su Id.
     */
    test('[submit #formRegistro] Comprueba que envía el horario "inicio - fin" y la empresa elegida', async () => {
      llenarAlumno({ hora_inicio: '08:00', hora_fin: '12:30', organizacion: '6' });

      await enviarFormulario();

      expect(cuerpoEnviadoA('registro.php').horario).toBe('08:00 - 12:30');
      expect(cuerpoEnviadoA('registro.php').organizacion).toBe('6');
    });

    /**
     * Función   : listener "submit" de #formRegistro (horario opcional).
     * Comprueba : que si solo se llena una de las dos horas el horario se envía null.
     */
    test('[submit #formRegistro] Comprueba que con una sola hora el horario se envía vacío (null)', async () => {
      llenarAlumno({ hora_inicio: '08:00', hora_fin: '' });

      await enviarFormulario();

      expect(cuerpoEnviadoA('registro.php').horario).toBeNull();
    });

    /**
     * Función   : listener "submit" de #formRegistro (armado de "datos" para coordinador).
     * Comprueba : que un coordinador envía sus propios datos (teléfono y correo)
     *             y no los campos del alumno.
     */
    test('[submit #formRegistro] Comprueba los datos que envía un coordinador', async () => {
      llenarCoordinador();

      await enviarFormulario();

      expect(cuerpoEnviadoA('registro.php')).toEqual({
        tipo_usuario: 'coordinador',
        matricula: '1234',
        password: 'Clave123!',
        confirmar: 'Clave123!',
        nombre: 'Luis',
        apellido_p: 'Pérez',
        apellido_m: 'Gómez',
        id_carrera: '11',
        telefono: '2461112233',
        correo: 'luis@uatx.mx'
      });
    });

    /**
     * Función   : listener "submit" de #formRegistro (data.success = true).
     * Comprueba : que al registrarse se muestra "¡Registro exitoso! Redirigiendo..."
     *             y a los 2 segundos se redirige al login.
     */
    test('[submit #formRegistro] Comprueba que tras el registro exitoso avisa y redirige al login', async () => {
      jest.useFakeTimers();
      llenarAlumno();

      await enviarFormulario();
      expect(lanzarToast).toHaveBeenCalledWith('¡Registro exitoso! Redirigiendo...', 'exito');

      console.error.mockClear();
      jest.advanceTimersByTime(2000);

      // jsdom no navega entre páginas: avisa "Not implemented: navigation".
      const avisos = console.error.mock.calls.map((a) => String((a[0] && a[0].message) || a[0]));
      expect(avisos.some((t) => t.includes('navigation'))).toBe(true);
    });

    /**
     * Función   : listener "submit" de #formRegistro (data.success = false).
     * Comprueba : que si registro.php rechaza el registro se muestra su mensaje
     *             (por ejemplo "La matrícula ya está registrada.").
     */
    test('[submit #formRegistro] Comprueba que muestra el error que devuelve registro.php', async () => {
      rutas['registro.php'] = () => respuesta({ success: false, error: 'La matrícula ya está registrada.' });
      llenarAlumno();

      await enviarFormulario();

      expect(lanzarToast).toHaveBeenCalledWith('La matrícula ya está registrada.', 'error');
    });

    /**
     * Función   : listener "submit" de #formRegistro (data.error vacío).
     * Comprueba : que si el servidor no explica el error se muestra "Error en el registro".
     */
    test('[submit #formRegistro] Comprueba el mensaje genérico "Error en el registro"', async () => {
      rutas['registro.php'] = () => respuesta({ success: false });
      llenarAlumno();

      await enviarFormulario();

      expect(lanzarToast).toHaveBeenCalledWith('Error en el registro', 'error');
    });

    /**
     * Función   : listener "submit" de #formRegistro (if (!res.ok) throw / catch).
     * Comprueba : que un error HTTP muestra "Error del servidor" y un fallo de red
     *             muestra el mensaje del error.
     */
    test.each([
      ['un error HTTP', () => respuesta({}, false), 'Error del servidor'],
      ['un fallo de red', () => Promise.reject(new Error('Failed to fetch')), 'Failed to fetch'],
    ])('[submit #formRegistro] Comprueba el mensaje ante %s', async (_desc, ruta, mensajeEsperado) => {
      rutas['registro.php'] = ruta;
      llenarAlumno();

      await enviarFormulario();

      expect(lanzarToast).toHaveBeenCalledWith(mensajeEsperado, 'error');
    });
  });
});