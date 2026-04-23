/**
 * ARCHIVO: registro.js
 * Descripción: Controla la lógica de registro de usuarios (Alumnos/Admins)
 * y la integración con el modal de empresas.
 */

const form = document.getElementById("formRegistro");
const mensaje = document.getElementById("mensaje");

const radiosTipo = document.querySelectorAll("input[name='tipo_usuario']");
const grupoAlumno = document.getElementById("grupoAlumno");
const grupoAdmin = document.getElementById("grupoAdmin");

const selectCarreraAlumno = document.getElementById("carrera_alumno");
const selectCarreraAdmin = document.getElementById("carrera_admin");
const selectOrganizacion = document.getElementById("organizacion");

// Elementos del modal
const modalEmpresa = document.getElementById("modalEmpresa");
const btnNuevaEmpresa = document.getElementById("btnNuevaEmpresa");
const btnGuardarEmpresa = document.getElementById("guardarEmpresa");
const btnCerrarModal = document.getElementById("cerrarModal");

// Rutas base para los archivos PHP (ajustadas a tu estructura de carpetas)
const PATH_PHP = "";

document.addEventListener("DOMContentLoaded", function() {
    // 1. Cargar catálogo de Carreras
    fetch(`${PATH_PHP}obtener_catalogos.php`)
        .then(res => res.json())
        .then(data => {
            if (data.carreras) {
                const optionsHtml = '<option value="">Seleccione una carrera</option>';
                selectCarreraAlumno.innerHTML = optionsHtml;
                selectCarreraAdmin.innerHTML = optionsHtml;

                data.carreras.forEach(carrera => {
                    const option = document.createElement("option");
                    option.value = carrera.Id_carrera;
                    // IMPORTANTE: Tu DB usa "Nombre", no "Nombre_carrera"
                    option.textContent = carrera.Nombre; 
                    
                    selectCarreraAlumno.appendChild(option);
                    selectCarreraAdmin.appendChild(option.cloneNode(true));
                });
            }
        })
        .catch(err => console.error("Error al cargar carreras:", err));

    // 2. Cargar catálogo de Empresas
    cargarEmpresas();
});

function cargarEmpresas() {
    fetch(`${PATH_PHP}obtener_empresas.php`)
        .then(res => res.json())
        .then(data => {
            if (data.empresas) {
                selectOrganizacion.innerHTML = '<option value="">Seleccione una empresa (opcional)</option>';
                data.empresas.forEach(emp => {
                    const option = document.createElement("option");
                    option.value = emp.Id_empresa;
                    // Ajustado a "Nombre_comercial" según tu tabla empresas
                    option.textContent = emp.Nombre_comercial; 
                    selectOrganizacion.appendChild(option);
                });
            }
        })
        .catch(err => console.error("Error al cargar empresas:", err));
}

// Alternar formularios Admin/Alumno
radiosTipo.forEach(radio => {
    radio.addEventListener("change", function() {
        const esAlumno = this.value === "alumno";
        grupoAlumno.hidden = !esAlumno;
        grupoAdmin.hidden = esAlumno;
        
        // Resetear validaciones al cambiar de tipo
        mensaje.style.display = "none";
    });
});

// ==========================================
// LÓGICA DEL MODAL DE EMPRESAS
// ==========================================
btnNuevaEmpresa.addEventListener("click", () => modalEmpresa.style.display = "block");
btnCerrarModal.addEventListener("click", () => {
    modalEmpresa.style.display = "none";
    limpiarModalEmpresa();
});

btnGuardarEmpresa.addEventListener("click", function() {
    const nuevaEmpresa = {
        nombre_comercial: document.getElementById("emp_nombre").value.trim(),
        razon_social: document.getElementById("emp_razon").value.trim(),
        rfc: document.getElementById("emp_rfc").value.trim(),
        direccion: document.getElementById("emp_direccion").value.trim(),
        sitio_web: document.getElementById("emp_web").value.trim(),
        descripcion: document.getElementById("emp_desc").value.trim()
    };

    if (!nuevaEmpresa.nombre_comercial || !nuevaEmpresa.razon_social || !nuevaEmpresa.rfc) {
        alert("Complete los campos obligatorios de la empresa");
        return;
    }

    fetch(`${PATH_PHP}registrar_empresa.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevaEmpresa)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert("Empresa registrada");
            modalEmpresa.style.display = "none";
            limpiarModalEmpresa();
            cargarEmpresas();
        } else {
            alert("Error: " + data.error);
        }
    });
});

function limpiarModalEmpresa() {
    document.querySelectorAll("#modalEmpresa input, #modalEmpresa textarea").forEach(i => i.value = "");
}

// ==========================================
// ENVÍO DEL FORMULARIO PRINCIPAL
// ==========================================
form.addEventListener("submit", function(e) {
    e.preventDefault();
    mensaje.style.display = "none";

    const tipo = document.querySelector("input[name='tipo_usuario']:checked").value;
    
    // Construcción del objeto de datos
    const datos = {
        tipo_usuario: tipo,
        matricula: document.getElementById("matricula").value.trim(),
        password: document.getElementById("password").value,
        confirmar: document.getElementById("confirmar_password").value
    };

    // Validaciones básicas de acceso
    if (datos.password !== datos.confirmar) {
        return mostrarError("Las contraseñas no coinciden");
    }
    if (datos.password.length < 8) {
        return mostrarError("La contraseña debe tener al menos 8 caracteres");
    }

    // Datos específicos según tipo
    if (tipo === "alumno") {
        datos.nombre = document.getElementById("nombre_alumno").value.trim();
        datos.apellido_p = document.getElementById("apellido_p_alumno").value.trim();
        datos.apellido_m = document.getElementById("apellido_m_alumno").value.trim();
        datos.id_carrera = selectCarreraAlumno.value;
        datos.horario = document.getElementById("horario").value.trim();
        datos.email = document.getElementById("email_alumno").value.trim();
        datos.telefono = document.getElementById("telefono_alumno").value.trim();
        datos.organizacion = selectOrganizacion.value || null; // Enviar null si no hay empresa
    } else {
        datos.nombre = document.getElementById("nombre_admin").value.trim();
        datos.apellido_p = document.getElementById("apellido_p_admin").value.trim();
        datos.apellido_m = document.getElementById("apellido_m_admin").value.trim();
        datos.id_carrera = selectCarreraAdmin.value;
        datos.telefono = document.getElementById("telefono_admin").value.trim();
        datos.correo = document.getElementById("correo_admin").value.trim();
    }

    // Enviar a registro.php
    fetch(`${PATH_PHP}registro.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            mensaje.className = "mensaje-exito";
            mensaje.innerText = "¡Registro exitoso! Redirigiendo...";
            mensaje.style.display = "block";
            setTimeout(() => window.location.href = "login.html", 2000);
        } else {
            mostrarError(data.error || "Error en el registro");
        }
    })
    .catch(() => mostrarError("Error de conexión con el servidor"));
});

function mostrarError(texto) {
    mensaje.className = "mensaje-error";
    mensaje.style.display = "block";
    mensaje.innerText = texto;
}