/**
 * Archivo      : registro.js
 * Módulo       : CU_02_RegistroUsuario
 * Autor        : Francisco Angel Membrila Alarcón
 * Fecha        : 22/04/2026
 * Descripción  : Lógica del formulario de registro de usuario. Valida los datos
 * en el frontend, envía la información a registro.php mediante fetch,
 * gestiona la creación de cookies de sesión y redirige al index.
 */

import { lanzarToast } from '../js/lanzar_toast.js';
document.addEventListener("DOMContentLoaded", function () {

    const PATH_PHP = "";

    const form = document.getElementById("formRegistro");
    const confirmarInput = document.getElementById("confirmar_password");

    confirmarInput.addEventListener("input", function () {
        const pass = document.getElementById("password").value;
        const confirm = this.value;
        const errorSpan = document.getElementById("error-password");
        const btnSubmit = document.querySelector("button[type='submit']");

        if (confirm === "") {
            errorSpan.style.display = "none";
            this.style.borderColor = "";
            btnSubmit.disabled = false;
        } else if (confirm === pass) {
            this.style.borderColor = "green";
            errorSpan.style.display = "none";
            btnSubmit.disabled = false;
        } else {
            this.style.borderColor = "red";
            errorSpan.style.display = "block";
            btnSubmit.disabled = true;
        }
    });

    const mensaje = document.getElementById("mensaje");

    const radiosTipo = document.querySelectorAll("input[name='tipo_usuario']");
    const grupoAlumno = document.getElementById("grupoAlumno");
    const grupoCoordinador = document.getElementById("grupoCoordinador");

    const selectCarreraAlumno = document.getElementById("carrera_alumno");
    const selectCarreraCoordinador = document.getElementById("carrera_coordinador");
    const selectFacultadAlumno = document.getElementById("facultad_alumno");
    const selectFacultadCoordinador = document.getElementById("facultad_coordinador");
    const selectOrganizacion = document.getElementById("organizacion");
    const selectActividad = document.getElementById("actividad");
    const selectPeriodo = document.getElementById("periodo_tipo");

    const modalEmpresa = document.getElementById("modalEmpresa");
    const passwordInput = document.getElementById("password");

    // Función para aplicar mayúsculas automáticas
    function aplicarMayusculasAlInstante() {
        const camposMayusculas = ['matricula', 'grupo'];

        camposMayusculas.forEach(campoId => {
            const campo = document.getElementById(campoId);
            if (campo) {
                campo.addEventListener('input', function () {
                    this.value = this.value.toUpperCase();
                });
            }
        });
    }

    aplicarMayusculasAlInstante();

    passwordInput.addEventListener("input", function () {
        const valor = this.value;
        document.getElementById("req-long").style.color = valor.length >= 8 ? "green" : "red";
        document.getElementById("req-mayus").style.color = /[A-Z]/.test(valor) ? "green" : "red";
        document.getElementById("req-minus").style.color = /[a-z]/.test(valor) ? "green" : "red";
        document.getElementById("req-num").style.color = /\d/.test(valor) ? "green" : "red";
        document.getElementById("req-esp").style.color = /[\W_]/.test(valor) ? "green" : "red";
    });

    const btnNuevaEmpresa = document.getElementById("btnNuevaEmpresa");
    const btnGuardarEmpresa = document.getElementById("guardarEmpresa");
    const btnCerrarModal = document.getElementById("cerrarModal");
    const inputRFC = document.getElementById("emp_rfc");

    if (inputRFC) {
        inputRFC.addEventListener("input", function () {
            this.value = this.value.toUpperCase();
        });
    }

    /* =========================
       CARGAR CARRERAS
    ========================= */

    let carreras = [];

    fetch(`${PATH_PHP}obtener_catalogos.php`)
        .then(res => res.json())
        .then(data => {
            carreras = data.carreras;
            data.facultades.forEach(fac => {
                const option = document.createElement("option");
                option.value = fac.Id_facultad;
                option.textContent = fac.Nombre;
                if (selectFacultadAlumno)
                    selectFacultadAlumno.appendChild(option.cloneNode(true));
                if (selectFacultadCoordinador)
                    selectFacultadCoordinador.appendChild(option.cloneNode(true));
            });
        })
        .catch(() => lanzarToast("Error al cargar los catálogos", "error"));

    function cargarCarrerasPorFacultad(idFacultad, selectCarrera) {
        selectCarrera.innerHTML = '<option value="">Seleccione una carrera</option>';
        carreras
            .filter(c => c.Id_facultad == idFacultad)
            .forEach(carrera => {
                const option = document.createElement("option");
                option.value = carrera.Id_carrera;
                option.textContent = carrera.Nombre;
                selectCarrera.appendChild(option);
            });
    }

    if (selectFacultadAlumno) {
        selectFacultadAlumno.addEventListener("change", function () {
            cargarCarrerasPorFacultad(this.value, selectCarreraAlumno);
        });
    }

    if (selectFacultadCoordinador) {
        selectFacultadCoordinador.addEventListener("change", function () {
            cargarCarrerasPorFacultad(this.value, selectCarreraCoordinador);
        });
    }

    /* =========================
       CARGAR ACTIVIDADES
    ========================= */

    function cargarActividades() {
        fetch(`${PATH_PHP}obtener_actividades.php`)
            .then(res => res.json())
            .then(data => {
                if (!data.actividades || !selectActividad) return;
                selectActividad.innerHTML = '<option value="">Seleccione una actividad</option>';
                data.actividades.forEach(act => {
                    const option = document.createElement("option");
                    option.value = act.Id_actividad;
                    option.textContent = act.Nombre;
                    selectActividad.appendChild(option);
                });
            })
            .catch(() => lanzarToast("Error al cargar actividades", "error"));
    }

    cargarActividades();

    /* =========================
       CARGAR EMPRESAS
    ========================= */

    function cargarEmpresas(idASeleccionar = null) {
        fetch(`${PATH_PHP}obtener_empresas.php`)
            .then(res => res.json())
            .then(data => {
                if (!data.empresas || !selectOrganizacion) return;
                selectOrganizacion.innerHTML = '<option value="">Seleccione una empresa (opcional)</option>';
                data.empresas.forEach(emp => {
                    const option = document.createElement("option");
                    option.value = emp.Id_empresa;
                    option.textContent = emp.Nombre;
                    if (idASeleccionar && emp.Id_empresa == idASeleccionar) {
                        option.selected = true;
                    }
                    selectOrganizacion.appendChild(option);
                });
            })
            .catch(() => lanzarToast("Error al cargar las empresas", "error"));
    }

    cargarEmpresas();

    /* =========================
       CAMBIO ALUMNO / COORDINADOR
    ========================= */

    radiosTipo.forEach(radio => {
        radio.addEventListener("change", function () {
            const esAlumno = this.value === "alumno";
            if (grupoAlumno) grupoAlumno.hidden = !esAlumno;
            if (grupoCoordinador) grupoCoordinador.hidden = esAlumno;
            if (grupoAlumno) {
                grupoAlumno.querySelectorAll("input, select").forEach(el => el.disabled = !esAlumno);
            }
            if (grupoCoordinador) {
                grupoCoordinador.querySelectorAll("input, select").forEach(el => el.disabled = esAlumno);
            }
            if (mensaje) mensaje.style.display = "none";
        });
    });

    document.querySelector("input[name='tipo_usuario']:checked").dispatchEvent(new Event("change"));

    /* =========================
       MODAL EMPRESA
    ========================= */

    if (btnNuevaEmpresa) {
        btnNuevaEmpresa.addEventListener("click", () => {
            modalEmpresa.style.display = "block";
        });
    }

    if (btnCerrarModal) {
        btnCerrarModal.addEventListener("click", () => {
            modalEmpresa.style.display = "none";
            limpiarModalEmpresa();
        });
    }

    if (btnGuardarEmpresa) {
        btnGuardarEmpresa.addEventListener("click", function () {
            const regexRFC = /^[A-Z0-9]{12,13}$/i;
            const nuevaEmpresa = {
                nombre_comercial: document.getElementById("emp_nombre").value.trim(),
                razon_social: document.getElementById("emp_razon").value.trim(),
                rfc: document.getElementById("emp_rfc").value.trim(),
                direccion: document.getElementById("emp_direccion").value.trim(),
                sitio_web: document.getElementById("emp_web").value.trim(),
                descripcion: document.getElementById("emp_desc").value.trim()
            };

            if (!nuevaEmpresa.nombre_comercial) {
                lanzarToast("El nombre comercial es obligatorio.", "error");
                return;
            }

            if (nuevaEmpresa.rfc && !regexRFC.test(nuevaEmpresa.rfc)) {
                lanzarToast("RFC inválido. Debe tener entre 12 y 13 caracteres.", "error");
                return;
            }

            fetch(`${PATH_PHP}registrar_empresa.php`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(nuevaEmpresa)
            })
                .then(res => {
                    if (!res.ok) {
                        throw new Error("Error del servidor");
                    }
                    return res.json();
                })
                .then(data => {
                    if (data.success) {
                        lanzarToast("¡Empresa registrada exitosamente!", "exito");
                        modalEmpresa.style.display = "none";
                        limpiarModalEmpresa();
                        cargarEmpresas(data.id_empresa);
                    } else {
                        lanzarToast(data.error || "No se pudo registrar la empresa", "error");
                    }
                })
                .catch(error => {
                    lanzarToast(error.message || "Error de conexión con el servidor", "error");
                });
        });
    }

    function limpiarModalEmpresa() {
        document.querySelectorAll("#modalEmpresa input, #modalEmpresa textarea").forEach(i => i.value = "");
    }

    /* =========================
       ENVÍO FORMULARIO
    ========================= */

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (mensaje) mensaje.style.display = "none";

        const tipo = document.querySelector("input[name='tipo_usuario']:checked").value;
        const datos = {
            tipo_usuario: tipo,
            matricula: document.getElementById("matricula").value.trim(),
            password: document.getElementById("password").value,
            confirmar: document.getElementById("confirmar_password").value
        };

        const regexAlumno = /^[0-9]{8}$/;
        const regexCoordinador = /^[0-9]{4}$/;
        const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        const regexTelefono = /^[0-9]{3}-[0-9]{4}-[0-9]{3}$/;
        const regexGrupo = /^[0-9][A-Z]$/;

        if (tipo === "alumno" && !regexAlumno.test(datos.matricula)) {
            lanzarToast("La matrícula del alumno debe tener 8 dígitos.", "error");
            return;
        }

        if (tipo === "coordinador" && !regexCoordinador.test(datos.matricula)) {
            lanzarToast("La matrícula del coordinador debe tener 4 dígitos.", "error");
            return;
        }

        if (datos.password !== datos.confirmar) {
            lanzarToast("Las contraseñas no coinciden", "error");
            return;
        }

        if (!regexPassword.test(datos.password)) {
            lanzarToast("La contraseña debe tener mayúscula, minúscula, número y símbolo.", "error");
            return;
        }

        if (tipo === "alumno") {
            datos.nombre = document.getElementById("nombre_alumno").value.trim();
            datos.apellido_p = document.getElementById("apellido_p_alumno").value.trim();
            datos.apellido_m = document.getElementById("apellido_m_alumno").value.trim();
            datos.id_carrera = selectCarreraAlumno.value;
            datos.grupo = document.getElementById("grupo").value.trim();

            const horaInicio = document.getElementById("hora_inicio").value;
            const horaFin = document.getElementById("hora_fin").value;

            // Horario opcional
            let horario = null;
            if (horaInicio && horaFin) {
                if (horaInicio >= horaFin) {
                    lanzarToast("La hora de inicio debe ser menor a la hora de fin.", "error");
                    return;
                }
                horario = `${horaInicio} - ${horaFin}`;
            }
            datos.horario = horario;

            datos.email = document.getElementById("email_alumno").value.trim();
            datos.telefono = document.getElementById("telefono_alumno").value.trim();
            datos.organizacion = selectOrganizacion.value || null;
            datos.actividad = selectActividad.value;

            if (!datos.actividad) {
                lanzarToast("Debe seleccionar una actividad.", "error");
                return;
            }

            datos.periodo_tipo = selectPeriodo.value;
            if (!datos.periodo_tipo) {
                lanzarToast("Debe seleccionar un periodo.", "error");
                return;
            }

            if (!regexGrupo.test(datos.grupo.toUpperCase())) {
                lanzarToast("El grupo debe tener formato 7A.", "error");
                return;
            }

            if (!regexTelefono.test(datos.telefono)) {
                lanzarToast("El teléfono debe tener el formato xxx-xxxx-xxx.", "error");
                return;
            }

        } else {
            datos.nombre = document.getElementById("nombre_coordinador").value.trim();
            datos.apellido_p = document.getElementById("apellido_p_coordinador").value.trim();
            datos.apellido_m = document.getElementById("apellido_m_coordinador").value.trim();
            datos.id_carrera = selectCarreraCoordinador.value;
            datos.telefono = document.getElementById("telefono_coordinador").value.trim();
            datos.correo = document.getElementById("correo_coordinador").value.trim();
        }

        fetch(`${PATH_PHP}registro.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error("Error del servidor");
                }
                return res.json();
            })
            .then(data => {
                if (data.success) {
                    lanzarToast("¡Registro exitoso! Redirigiendo...", "exito");
                    setTimeout(() => {
                        window.location.href = "../CU_01_Login/login.html";
                    }, 2000);
                } else {
                    lanzarToast(data.error || "Error en el registro", "error");
                }
            })
            .catch(error => {
                lanzarToast(error.message || "Error de conexión con el servidor", "error");
            });
    });
});