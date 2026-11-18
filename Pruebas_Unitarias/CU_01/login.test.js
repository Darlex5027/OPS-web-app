/**
 * @jest-environment jsdom
 *
 * Archivo      : login.test.js
 * Módulo       : CU_01_Login (Pruebas unitarias)
 * Archivo bajo prueba : app/CU_01_Login/login.js
 * Herramienta  : Jest + jsdom
 * Descripción  : Pruebas unitarias de login.js. Se usa el HTML real (login.html)
 *                y se simula la respuesta de login.php con un mock de fetch,
 *                así no se necesita servidor. El código original NO se modifica.
 *
 * Cómo correrlo (dentro de la carpeta Pruebas_Unitarias):
 *   npm install --save-dev jest jest-environment-jsdom   (solo la primera vez)
 *   npx jest CU_01 --verbose
 *
 * Funciones de login.js que se prueban:
 *   1. Listener "DOMContentLoaded"        → inicializa la página.
 *   2. Listener "click" de #togglePassword → muestra/oculta la contraseña.
 *   3. Listener "submit" de #formLogin     → valida, llama a fetch, crea cookies y redirige.
 *   4. mostrarError(texto)                → muestra el mensaje de error en #mensaje.
 *
 * Cada prueba indica:
 *   - Función   : qué función de login.js se está probando.
 *   - Comprueba : qué comportamiento se verifica.
 */
const fs = require('fs');
const path = require('path');

const RUTA_APP = path.resolve(__dirname, '../../app/CU_01_Login');
const RUTA_LOGIN_JS = path.join(RUTA_APP, 'login.js');
const HTML_LOGIN = fs.readFileSync(path.join(RUTA_APP, 'login.html'), 'utf8');
const BODY_LOGIN = HTML_LOGIN.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];

// =====================================================================
// FUNCIONES DE APOYO (no son pruebas)
// =====================================================================

/**
 * Carga el HTML del login y ejecuta login.js como lo haría el navegador.
 * Se captura la función registrada en DOMContentLoaded para ejecutarla
 * manualmente y evitar que se acumulen listeners entre pruebas.
 */
function cargarLogin(htmlBody = BODY_LOGIN) {
  document.body.innerHTML = htmlBody;

  let alCargarDom = null;
  const espia = jest
    .spyOn(document, 'addEventListener')
    .mockImplementation((evento, callback) => {
      if (evento === 'DOMContentLoaded') alCargarDom = callback;
    });

  jest.isolateModules(() => {
    require(RUTA_LOGIN_JS);
  });

  espia.mockRestore();
  alCargarDom(); // "el DOM ya está listo"
}

/** Respuesta simulada de fetch (lo que devolvería login.php). */
function respuestaBackend(json) {
  return Promise.resolve({ json: () => Promise.resolve(json) });
}

/** Escribe matrícula y contraseña y envía el formulario. */
async function enviarFormulario(matricula, contrasena) {
  document.getElementById('matricula').value = matricula;
  document.getElementById('contrasena').value = contrasena;
  document
    .getElementById('formLogin')
    .dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  await esperarPromesas();
}

/** Deja que terminen las promesas pendientes (fetch y response.json()). */
function esperarPromesas() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Convierte document.cookie en un objeto { nombre: valor }. */
function leerCookies() {
  return document.cookie
    .split('; ')
    .filter(Boolean)
    .reduce((cookies, par) => {
      const indice = par.indexOf('=');
      cookies[par.slice(0, indice)] = par.slice(indice + 1);
      return cookies;
    }, {});
}

function borrarCookies() {
  Object.keys(leerCookies()).forEach((nombre) => {
    document.cookie = `${nombre}=; max-age=0; path=/`;
  });
}

const mensaje = () => document.getElementById('mensaje');
const botonEnviar = () => document.querySelector("#formLogin button[type='submit']");

// Usuarios de ejemplo como los devolvería login.php
const USUARIO_ALUMNO = {
  Id_usuario: 10,
  Matricula: '20232389',
  Id_tipo_usuario: 2,
  Id_carrera: 4,
  Id_alumno: 55,
  Activo: 1,
  Fecha_registro: '2026-01-15 10:00:00',
  Fecha_ultimo_acceso: '2026-11-11 15:00:00',
  Intentos_fallidos: 0,
  Bloqueado: 0
};

const USUARIO_COORDINADOR = {
  Id_usuario: 3,
  Matricula: '1234',
  Id_tipo_usuario: 3,
  Id_carrera: null,
  Id_alumno: null,
  Activo: 1,
  Fecha_registro: '2025-08-01 09:00:00',
  Fecha_ultimo_acceso: '2026-11-10 12:00:00',
  Intentos_fallidos: 0,
  Bloqueado: 0
};

// =====================================================================
// PREPARACIÓN DE CADA PRUEBA
// =====================================================================
beforeEach(() => {
  borrarCookies();
  global.fetch = jest.fn();
  // Silencia los avisos de jsdom ("navigation not implemented") y el
  // console.error del catch de login.js, para que la salida quede limpia.
  jest.spyOn(console, 'error').mockImplementation(() => {});
  cargarLogin();
});

afterEach(() => {
  jest.restoreAllMocks();
  delete global.fetch;
});

// =====================================================================
describe('login.js', () => {

  // ===================================================================
  // FUNCIÓN 1: listener "DOMContentLoaded"
  // ===================================================================
  describe('Función: DOMContentLoaded (inicialización de la página)', () => {

    /**
     * Función   : listener "DOMContentLoaded" de document.
     * Comprueba : que si la página NO tiene el formulario #formLogin, el script
     *             no truena (entra al "if (!formLogin) return;").
     */
    test('[DOMContentLoaded] Comprueba que no lanza error si la página no tiene formulario de login', () => {
      expect(() =>
        cargarLogin('<input id="contrasena" type="password"><button id="togglePassword"><i></i></button>')
      ).not.toThrow();
      expect(() => cargarLogin('<p>Página sin formulario</p>')).not.toThrow();
    });
  });

  // ===================================================================
  // FUNCIÓN 2: listener "click" de #togglePassword
  // ===================================================================
  describe('Función: click de #togglePassword (mostrar/ocultar contraseña)', () => {

    /**
     * Función   : listener "click" del botón #togglePassword.
     * Comprueba : que con un clic la contraseña se hace visible (type="text"),
     *             el ícono cambia a "fa-eye-slash" y el título a "Ocultar contraseña".
     */
    test('[click #togglePassword] Comprueba que con un clic se muestra la contraseña y cambia el ícono', () => {
      const input = document.getElementById('contrasena');
      const boton = document.getElementById('togglePassword');

      boton.click();

      expect(input.type).toBe('text');
      expect(boton.querySelector('i').className).toBe('fa-regular fa-eye-slash');
      expect(boton.getAttribute('title')).toBe('Ocultar contraseña');
    });

    /**
     * Función   : listener "click" del botón #togglePassword.
     * Comprueba : que con un segundo clic la contraseña se vuelve a ocultar
     *             (type="password"), el ícono regresa a "fa-eye" y el título a
     *             "Mostrar contraseña".
     */
    test('[click #togglePassword] Comprueba que con dos clics la contraseña se vuelve a ocultar', () => {
      const input = document.getElementById('contrasena');
      const boton = document.getElementById('togglePassword');

      boton.click();
      boton.click();

      expect(input.type).toBe('password');
      expect(boton.querySelector('i').className).toBe('fa-regular fa-eye');
      expect(boton.getAttribute('title')).toBe('Mostrar contraseña');
    });
  });

  // ===================================================================
  // FUNCIÓN 3: listener "submit" de #formLogin — VALIDACIONES FRONTEND
  // ===================================================================
  describe('Función: submit de #formLogin (validaciones del frontend)', () => {

    /**
     * Función   : listener "submit" de #formLogin (bloque VALIDACIONES FRONTEND)
     *             y mostrarError().
     * Comprueba : que una matrícula que no tiene 4 u 8 dígitos se rechaza con el
     *             mensaje "La matrícula debe ser de 4 u 8 dígitos" y que NO se
     *             llama al servidor (fetch).
     */
    test.each([
      ['vacía', ''],
      ['de 3 dígitos', '123'],
      ['de 5 dígitos', '12345'],
      ['de 7 dígitos', '1234567'],
      ['con letras', 'abcd'],
      ['con letras y números', '2023a389'],
      ['con símbolos', '12-4'],
    ])('[submit #formLogin] Comprueba que rechaza una matrícula %s ("%s") sin llamar a fetch', async (_desc, matricula) => {
      await enviarFormulario(matricula, 'secreta123');

      expect(mensaje().style.display).toBe('block');
      expect(mensaje().innerText).toBe('La matrícula debe ser de 4 u 8 dígitos');
      expect(fetch).not.toHaveBeenCalled();
    });

    /**
     * Función   : listener "submit" de #formLogin (bloque VALIDACIONES FRONTEND)
     *             y mostrarError().
     * Comprueba : que si la contraseña está vacía se muestra "Ingrese su contraseña"
     *             y NO se llama al servidor.
     */
    test('[submit #formLogin] Comprueba que rechaza la contraseña vacía sin llamar a fetch', async () => {
      await enviarFormulario('20232389', '');

      expect(mensaje().style.display).toBe('block');
      expect(mensaje().innerText).toBe('Ingrese su contraseña');
      expect(fetch).not.toHaveBeenCalled();
    });

    /**
     * Función   : listener "submit" de #formLogin (bloque VALIDACIONES FRONTEND).
     * Comprueba : que las matrículas válidas (4 u 8 dígitos) pasan la validación
     *             y sí se envía la petición al servidor.
     */
    test.each([
      ['4 dígitos', '1234'],
      ['8 dígitos', '20232389'],
    ])('[submit #formLogin] Comprueba que acepta una matrícula de %s y envía la petición', async (_desc, matricula) => {
      fetch.mockReturnValue(respuestaBackend({ success: false, error: 'matricula_no_existe' }));

      await enviarFormulario(matricula, 'secreta123');

      expect(fetch).toHaveBeenCalledTimes(1);
    });

    /**
     * Función   : listener "submit" de #formLogin (lectura de la matrícula con trim()).
     * Comprueba : que los espacios al inicio y al final de la matrícula se quitan
     *             antes de validarla y enviarla.
     */
    test('[submit #formLogin] Comprueba que quita los espacios alrededor de la matrícula (trim)', async () => {
      fetch.mockReturnValue(respuestaBackend({ success: false, error: 'matricula_no_existe' }));

      await enviarFormulario('  20232389  ', 'secreta123');

      const cuerpo = JSON.parse(fetch.mock.calls[0][1].body);
      expect(cuerpo.matricula).toBe('20232389');
    });
  });

  // ===================================================================
  // FUNCIÓN 3: listener "submit" de #formLogin — PETICIÓN AL SERVIDOR
  // ===================================================================
  describe('Función: submit de #formLogin (petición fetch a login.php)', () => {

    /**
     * Función   : listener "submit" de #formLogin (llamada a fetch).
     * Comprueba : que la petición se envía a "../CU_01_Login/login.php" con método
     *             POST, cabecera Content-Type JSON y cuerpo {matricula, contrasena}.
     */
    test('[submit #formLogin] Comprueba que envía un POST en JSON a login.php con matrícula y contraseña', async () => {
      fetch.mockReturnValue(respuestaBackend({ success: false, error: 'contrasena_incorrecta' }));

      await enviarFormulario('20232389', 'Mi Clave 123');

      expect(fetch).toHaveBeenCalledWith('../CU_01_Login/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula: '20232389', contrasena: 'Mi Clave 123' })
      });
    });

    /**
     * Función   : listener "submit" de #formLogin (lectura de la contraseña).
     * Comprueba : que la contraseña se envía exactamente como la escribió el
     *             usuario (a diferencia de la matrícula, NO se le aplica trim).
     */
    test('[submit #formLogin] Comprueba que la contraseña se envía tal cual, sin quitarle espacios', async () => {
      fetch.mockReturnValue(respuestaBackend({ success: false, error: 'contrasena_incorrecta' }));

      await enviarFormulario('20232389', '  clave  ');

      expect(JSON.parse(fetch.mock.calls[0][1].body).contrasena).toBe('  clave  ');
    });

    /**
     * Función   : listener "submit" de #formLogin (boton.disabled).
     * Comprueba : que el botón "Iniciar sesión" se deshabilita mientras se espera
     *             la respuesta (evita doble envío) y se habilita al terminar.
     */
    test('[submit #formLogin] Comprueba que deshabilita el botón mientras espera y lo habilita al terminar', async () => {
      let responder;
      fetch.mockReturnValue(new Promise((resolve) => { responder = resolve; }));

      document.getElementById('matricula').value = '20232389';
      document.getElementById('contrasena').value = 'secreta123';
      document.getElementById('formLogin').dispatchEvent(new Event('submit', { cancelable: true }));

      expect(botonEnviar().disabled).toBe(true); // esperando al servidor

      responder({ json: () => Promise.resolve({ success: false, error: 'contrasena_incorrecta' }) });
      await esperarPromesas();

      expect(botonEnviar().disabled).toBe(false);
    });

    /**
     * Función   : listener "submit" de #formLogin (e.preventDefault()).
     * Comprueba : que el envío del formulario no recarga la página.
     */
    test('[submit #formLogin] Comprueba que evita que el formulario recargue la página (preventDefault)', async () => {
      fetch.mockReturnValue(respuestaBackend({ success: false, error: 'contrasena_incorrecta' }));
      document.getElementById('matricula').value = '20232389';
      document.getElementById('contrasena').value = 'secreta123';

      const evento = new Event('submit', { cancelable: true });
      document.getElementById('formLogin').dispatchEvent(evento);
      await esperarPromesas();

      expect(evento.defaultPrevented).toBe(true);
    });

    /**
     * Función   : listener "submit" de #formLogin (mensaje.style.display = "none").
     * Comprueba : que al volver a enviar el formulario se oculta el mensaje de
     *             error que había quedado del intento anterior.
     */
    test('[submit #formLogin] Comprueba que oculta el mensaje de error anterior al volver a enviar', async () => {
      await enviarFormulario('12', 'x'); // genera un error
      expect(mensaje().style.display).toBe('block');

      let responder;
      fetch.mockReturnValue(new Promise((resolve) => { responder = resolve; }));
      document.getElementById('matricula').value = '20232389';
      document.getElementById('contrasena').value = 'secreta123';
      document.getElementById('formLogin').dispatchEvent(new Event('submit', { cancelable: true }));

      expect(mensaje().style.display).toBe('none');
      responder({ json: () => Promise.resolve({ success: false, error: 'contrasena_incorrecta' }) });
      await esperarPromesas();
    });
  });

  // ===================================================================
  // FUNCIÓN 3 y 4: "submit" de #formLogin + mostrarError() — ERRORES
  // ===================================================================
  describe('Función: submit de #formLogin + mostrarError() (errores del backend)', () => {

    /**
     * Función   : listener "submit" de #formLogin (switch de data.error) y mostrarError().
     * Comprueba : que cada código de error que devuelve login.php se traduce al
     *             mensaje correcto para el usuario, que el botón se vuelve a
     *             habilitar y que NO se crean cookies de sesión.
     */
    test.each([
      ['matricula_no_existe', 'La matrícula no existe en el sistema'],
      ['contrasena_incorrecta', 'La contraseña es incorrecta'],
      ['usuario_bloqueado', 'El usuario se encuentra bloqueado'],
      ['usuario_inactivo', 'Cuenta pendiente de activación'],
      ['datos_invalidos', 'Por favor, rellene todos los campos correctamente'],
      ['datos_incompletos', 'Por favor, rellene todos los campos correctamente'],
      ['formato_matricula_invalido', 'El formato de la matrícula no es válido'],
      ['error_conexion_db', 'Error interno: No se pudo conectar a la base de datos'],
    ])('[submit #formLogin / mostrarError] Comprueba que el error "%s" muestra: "%s"', async (codigoError, textoEsperado) => {
      fetch.mockReturnValue(respuestaBackend({ success: false, error: codigoError }));

      await enviarFormulario('20232389', 'secreta123');

      expect(mensaje().style.display).toBe('block');
      expect(mensaje().innerText).toBe(textoEsperado);
      expect(botonEnviar().disabled).toBe(false);
      expect(leerCookies().Id_usuario).toBeUndefined(); // no inicia sesión
    });

    /**
     * Función   : listener "submit" de #formLogin (caso "default" del switch) y mostrarError().
     * Comprueba : que un código de error que no está contemplado se muestra tal
     *             como lo envía el servidor.
     */
    test('[submit #formLogin / mostrarError] Comprueba que un error desconocido se muestra tal como lo envía el servidor', async () => {
      fetch.mockReturnValue(respuestaBackend({ success: false, error: 'algo_raro' }));

      await enviarFormulario('20232389', 'secreta123');

      expect(mensaje().innerText).toBe('algo_raro');
    });

    /**
     * Función   : listener "submit" de #formLogin (caso "default" del switch) y mostrarError().
     * Comprueba : que si el servidor no envía ningún código de error se muestra
     *             el mensaje genérico "Error al iniciar sesión".
     */
    test('[submit #formLogin / mostrarError] Comprueba que sin código de error se muestra "Error al iniciar sesión"', async () => {
      fetch.mockReturnValue(respuestaBackend({ success: false }));

      await enviarFormulario('20232389', 'secreta123');

      expect(mensaje().innerText).toBe('Error al iniciar sesión');
    });

    /**
     * Función   : listener "submit" de #formLogin (bloque catch) y mostrarError().
     * Comprueba : que si fetch falla (servidor caído / sin internet) se muestra
     *             "Error de conexión con el servidor", se habilita el botón y se
     *             registra el error en consola.
     */
    test('[submit #formLogin / mostrarError] Comprueba que si fetch falla se muestra "Error de conexión con el servidor"', async () => {
      fetch.mockRejectedValue(new Error('Failed to fetch'));

      await enviarFormulario('20232389', 'secreta123');

      expect(mensaje().innerText).toBe('Error de conexión con el servidor');
      expect(botonEnviar().disabled).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });

    /**
     * Función   : listener "submit" de #formLogin (bloque catch al hacer response.json()).
     * Comprueba : que si el servidor responde algo que no es JSON (por ejemplo un
     *             error de PHP en HTML) se muestra "Error de conexión con el servidor".
     */
    test('[submit #formLogin / mostrarError] Comprueba que una respuesta que no es JSON muestra "Error de conexión con el servidor"', async () => {
      fetch.mockReturnValue(Promise.resolve({
        json: () => Promise.reject(new SyntaxError('Unexpected token <'))
      }));

      await enviarFormulario('20232389', 'secreta123');

      expect(mensaje().innerText).toBe('Error de conexión con el servidor');
      expect(botonEnviar().disabled).toBe(false);
    });
  });

  // ===================================================================
  // FUNCIÓN 3: "submit" de #formLogin — LOGIN EXITOSO
  // ===================================================================
  describe('Función: submit de #formLogin (login exitoso: cookies y redirección)', () => {

    /**
     * Función   : listener "submit" de #formLogin (bloques LOGIN EXITOSO y COOKIES SEGURAS).
     * Comprueba : que al iniciar sesión un alumno se guardan todas las cookies del
     *             usuario (incluida Id_alumno) y la lista de permisos codificada,
     *             y que no se muestra ningún mensaje de error.
     */
    test('[submit #formLogin] Comprueba que un alumno guarda todas sus cookies, incluida Id_alumno', async () => {
      fetch.mockReturnValue(respuestaBackend({
        success: true,
        usuario: USUARIO_ALUMNO,
        permisos: ['ver_perfil', 'subir_documentos']
      }));

      await enviarFormulario('20232389', 'secreta123');
      const cookies = leerCookies();

      expect(cookies).toMatchObject({
        Id_usuario: '10',
        Matricula: '20232389',
        Id_tipo_usuario: '2',
        Id_carrera: '4',
        Id_alumno: '55',
        Activo: '1',
        Fecha_registro: '2026-01-15 10:00:00',
        Fecha_ultimo_acceso: '2026-11-11 15:00:00',
        Intentos_fallidos: '0',
        Bloqueado: '0'
      });
      expect(JSON.parse(decodeURIComponent(cookies.permisos)))
        .toEqual(['ver_perfil', 'subir_documentos']);
      expect(mensaje().style.display).toBe('none');
    });

    /**
     * Función   : listener "submit" de #formLogin (bloque NUEVA COOKIE DINÁMICA).
     * Comprueba : que un coordinador (Id_tipo_usuario = 3) NO recibe la cookie
     *             Id_alumno y que una carrera nula se guarda como cookie vacía.
     */
    test('[submit #formLogin] Comprueba que un coordinador NO guarda Id_alumno y su Id_carrera nula queda vacía', async () => {
      fetch.mockReturnValue(respuestaBackend({
        success: true,
        usuario: USUARIO_COORDINADOR,
        permisos: ['gestionar_alumnos']
      }));

      await enviarFormulario('1234', 'secreta123');
      const cookies = leerCookies();

      expect(cookies.Id_tipo_usuario).toBe('3');
      expect(cookies.Id_carrera).toBe('');
      expect(cookies).not.toHaveProperty('Id_alumno');
    });

    /**
     * Función   : listener "submit" de #formLogin (parseInt(usuario.Id_tipo_usuario) === 2).
     * Comprueba : que si el servidor manda el tipo de usuario como texto ("2"),
     *             igual se reconoce como alumno y se guarda Id_alumno.
     */
    test('[submit #formLogin] Comprueba que un alumno con Id_tipo_usuario "2" (texto) también guarda Id_alumno', async () => {
      fetch.mockReturnValue(respuestaBackend({
        success: true,
        usuario: { ...USUARIO_ALUMNO, Id_tipo_usuario: '2' },
        permisos: []
      }));

      await enviarFormulario('20232389', 'secreta123');

      expect(leerCookies().Id_alumno).toBe('55');
    });

    /**
     * Función   : listener "submit" de #formLogin (usuario.Id_alumno ?? '').
     * Comprueba : que si un alumno no tiene Id_alumno (null), la cookie se guarda
     *             vacía en lugar de con el texto "null".
     */
    test('[submit #formLogin] Comprueba que un alumno sin Id_alumno guarda la cookie Id_alumno vacía', async () => {
      fetch.mockReturnValue(respuestaBackend({
        success: true,
        usuario: { ...USUARIO_ALUMNO, Id_alumno: null },
        permisos: []
      }));

      await enviarFormulario('20232389', 'secreta123');

      expect(leerCookies().Id_alumno).toBe('');
    });

    /**
     * Función   : listener "submit" de #formLogin (data.permisos || []).
     * Comprueba : que si el servidor no envía permisos, la cookie "permisos"
     *             guarda una lista vacía.
     */
    test('[submit #formLogin] Comprueba que sin permisos del servidor se guarda una lista vacía', async () => {
      fetch.mockReturnValue(respuestaBackend({ success: true, usuario: USUARIO_ALUMNO }));

      await enviarFormulario('20232389', 'secreta123');

      expect(JSON.parse(decodeURIComponent(leerCookies().permisos))).toEqual([]);
    });

    /**
     * Función   : listener "submit" de #formLogin (window.location.href = ...perfil.html).
     * Comprueba : que después de un login exitoso se intenta redirigir al perfil.
     *             jsdom no puede navegar entre páginas y avisa con un console.error
     *             "Not implemented: navigation"; ese aviso confirma la redirección.
     */
    test('[submit #formLogin] Comprueba que tras el login exitoso redirige al perfil', async () => {
      fetch.mockReturnValue(respuestaBackend({ success: true, usuario: USUARIO_ALUMNO, permisos: [] }));

      await enviarFormulario('20232389', 'secreta123');

      const avisos = console.error.mock.calls.map((args) => String(args[0] && args[0].message || args[0]));
      expect(avisos.some((texto) => texto.includes('navigation'))).toBe(true);
    });
  });
});