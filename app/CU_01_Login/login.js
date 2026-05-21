/**
 * Archivo      : login.js
 * Módulo       : CU_01_Login
 * Autor        : Francisco Angel Membrila Alarcon
 * Fecha        : 22/04/2026
 * Descripción  : Lógica del formulario de inicio de sesión. Valida la matrícula 
 *                en el frontend, envía las credenciales a login.php mediante fetch,
 *                gestiona la creación de cookies de sesión y redirige al index.
 *                Incluye funcionalidad de mostrar/ocultar contraseña.
 */

// Configuración de constantes globales del script
const TIEMPO_SESION = 3600; // Valor en segundos (1 hora)

// =========================
// ESPERAR A QUE EL DOM ESTÉ LISTO
// =========================
document.addEventListener('DOMContentLoaded', function() {
    
    const formLogin = document.getElementById("formLogin");
    const mensaje = document.getElementById("mensaje");
    const boton = formLogin ? formLogin.querySelector("button") : null;
    
    // =========================
    // FUNCIONALIDAD MOSTRAR/OCULTAR CONTRASEÑA
    // =========================
    const contrasenaInput = document.getElementById("contrasena");
    
    // Crear el botón dinámicamente si no existe
    let togglePasswordBtn = document.getElementById("togglePassword");
    
    if (!togglePasswordBtn && contrasenaInput) {
        // Crear el botón
        togglePasswordBtn = document.createElement("button");
        togglePasswordBtn.type = "button";
        togglePasswordBtn.id = "togglePassword";
        togglePasswordBtn.textContent = "👁️";
        togglePasswordBtn.setAttribute("title", "Mostrar contraseña");
        togglePasswordBtn.style.position = "absolute";
        togglePasswordBtn.style.right = "10px";
        togglePasswordBtn.style.top = "50%";
        togglePasswordBtn.style.transform = "translateY(-50%)";
        togglePasswordBtn.style.background = "transparent";
        togglePasswordBtn.style.border = "none";
        togglePasswordBtn.style.cursor = "pointer";
        togglePasswordBtn.style.fontSize = "1.2rem";
        togglePasswordBtn.style.padding = "5px";
        togglePasswordBtn.style.zIndex = "10";
        
        // Envolver el input en un contenedor relativo
        const parent = contrasenaInput.parentNode;
        const wrapper = document.createElement("div");
        wrapper.style.position = "relative";
        wrapper.style.width = "100%";
        
        // Reemplazar el input con el wrapper
        parent.insertBefore(wrapper, contrasenaInput);
        wrapper.appendChild(contrasenaInput);
        wrapper.appendChild(togglePasswordBtn);
        
        // Ajustar el padding del input
        contrasenaInput.style.paddingRight = "40px";
    }
    
    if (togglePasswordBtn && contrasenaInput) {
        togglePasswordBtn.addEventListener("click", function() {
            // Cambiar el tipo de input entre 'password' y 'text'
            const tipoActual = contrasenaInput.type;
            const nuevoTipo = tipoActual === "password" ? "text" : "password";
            contrasenaInput.type = nuevoTipo;
            
            // Cambiar el ícono/emoji para indicar el estado actual
            if (nuevoTipo === "text") {
                togglePasswordBtn.textContent = "🙈"; // Ojo cerrado/cruzado
                togglePasswordBtn.setAttribute("title", "Ocultar contraseña");
            } else {
                togglePasswordBtn.textContent = "👁️"; // Ojo abierto
                togglePasswordBtn.setAttribute("title", "Mostrar contraseña");
            }
        });
    }
    
    if (!formLogin) return;
    
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
    
                document.cookie = `Activo=${usuario.Activo}; max-age=${TIEMPO_SESION}; path=/`;
                document.cookie = `Fecha_registro=${usuario.Fecha_registro}; max-age=${TIEMPO_SESION}; path=/`;
                document.cookie = `Fecha_ultimo_acceso=${usuario.Fecha_ultimo_acceso}; max-age=${TIEMPO_SESION}; path=/`;
                document.cookie = `Intentos_fallidos=${usuario.Intentos_fallidos}; max-age=${TIEMPO_SESION}; path=/`;
                document.cookie = `Bloqueado=${usuario.Bloqueado}; max-age=${TIEMPO_SESION}; path=/`;
    
                document.cookie = `permisos=${encodeURIComponent(JSON.stringify(permisos))}; max-age=${TIEMPO_SESION}; path=/`;
                // 3 = Coordinador, 1 = Alumno (según tu comentario)
                window.location.href = "../CU_03_PerfilGestionable/perfil.html";
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
    
});