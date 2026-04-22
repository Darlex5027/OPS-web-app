/**
 * Archivo      : login.js
 * Módulo       : CU_01_Login
 * Autor        : Francisco Angel Membrilla Alarcon
 * Fecha        : 22/04/2026
 * Descripción  : Lógica del formulario de inicio de sesión. Valida la matrícula 
 * en el frontend, envía las credenciales a login.php mediante fetch,
 * gestiona la creación de cookies de sesión y redirige al index.
 */

// Configuración de constantes globales del script
const TIEMPO_SESION = 3600; // Valor en segundos (1 hora)

const formLogin = document.getElementById("formLogin");
const mensaje = document.getElementById("mensaje");
const boton = formLogin.querySelector("button");

formLogin.addEventListener("submit", async function (e) {

    e.preventDefault();
    mensaje.style.display = "none";

    const matricula = document.getElementById("matricula").value.trim();
    const contrasena = document.getElementById("contrasena").value;

    const regex = /^\d{4}$|^\d{8}$/;

    // =========================
    // VALIDACIONES FRONTEND
    // =========================
    if (!regex.test(matricula)) {
        mostrarError("La matrícula debe ser de 4 u 8 dígitos");
        return;
    }

    if (!contrasena) {
        mostrarError("Ingrese su contraseña");
        return;
    }

    boton.disabled = true;

    try {

        const response = await fetch("../CU_01_Login/login.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                matricula,
                contrasena
            })
        });

        const data = await response.json();

        boton.disabled = false;

        // =========================
        // LOGIN EXITOSO
        // =========================
        if (data.success) {

            const usuario = data.usuario;
            const permisos = data.permisos || [];

            // =========================
            // COOKIES SEGURAS
            // =========================
            document.cookie = `Id_usuario=${usuario.Id_usuario}; max-age=${TIEMPO_SESION}; path=/`;
            document.cookie = `Matricula=${usuario.Matricula}; max-age=${TIEMPO_SESION}; path=/`;
            document.cookie = `Id_tipo_usuario=${usuario.Id_tipo_usuario}; max-age=${TIEMPO_SESION}; path=/`;
            document.cookie = `Id_carrera=${usuario.Id_carrera ?? ''}; max-age=${TIEMPO_SESION}; path=/`;
            document.cookie = `permisos=${encodeURIComponent(JSON.stringify(permisos))}; max-age=${TIEMPO_SESION}; path=/`;
            document.cookie = `perfil=${encodeURIComponent(JSON.stringify(usuario))}; max-age=${TIEMPO_SESION}; path=/`;
            // 1 = Administrador, 2 = Alumno
            if (usuario.Id_tipo_usuario == 1) {
                window.location.href = "../CU_03_PerfilGestionable/perfil_administrador.html";
            } else if (usuario.Id_tipo_usuario == 2) {
                window.location.href = "../CU_03_PerfilGestionable/perfil_alumno.html";
            } else {
                // En caso de que exista un rol diferente, enviamos al index
                window.location.href = "../index.html";
            }
            return;
        }

        // =========================
        // ERRORES DEL BACKEND (Sincronizados con login.php)
        // =========================
        switch (data.error) {

            case "matricula_no_existe":
                mostrarError("La matrícula no existe en el sistema");
                break;

            case "contrasena_incorrecta":
                mostrarError("La contraseña es incorrecta");
                break;

            case "usuario_bloqueado":
                mostrarError("El usuario se encuentra bloqueado");
                break;

            case "usuario_inactivo":
                mostrarError("Cuenta pendiente de activación");
                break;

            case "datos_invalidos":
            case "datos_incompletos":
                mostrarError("Por favor, rellene todos los campos correctamente");
                break;

            case "formato_matricula_invalido":
                mostrarError("El formato de la matrícula no es válido");
                break;

            case "error_conexion_db":
                mostrarError("Error interno: No se pudo conectar a la base de datos");
                break;

            default:
                mostrarError(data.error || "Error al iniciar sesión");
                break;
        }

    } catch (error) {

        boton.disabled = false;
        mostrarError("Error de conexión con el servidor");
        console.error(error);
    }

});

// =========================
// FUNCIÓN AUXILIAR
// =========================
function mostrarError(texto) {
    mensaje.style.display = "block";
    mensaje.innerText = texto;
}