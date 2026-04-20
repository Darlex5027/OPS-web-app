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

            const tiempo = 3600;

            // =========================
            // COOKIES SEGURAS
            // =========================
            document.cookie = `Id_usuario=${usuario.Id_usuario}; max-age=${tiempo}; path=/`;
            document.cookie = `Matricula=${usuario.Matricula}; max-age=${tiempo}; path=/`;
            document.cookie = `Id_tipo_usuario=${usuario.Id_tipo_usuario}; max-age=${tiempo}; path=/`;
            document.cookie = `Id_carrera=${usuario.Id_carrera ?? ''}; max-age=${tiempo}; path=/`;
            document.cookie = `permisos=${encodeURIComponent(JSON.stringify(permisos))}; max-age=${tiempo}; path=/`;
            document.cookie = `perfil=${encodeURIComponent(JSON.stringify(usuario))}; max-age=${tiempo}; path=/`;

            window.location.href = "../index.html";
            return;
        }

        // =========================
        // ERRORES DEL BACKEND
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