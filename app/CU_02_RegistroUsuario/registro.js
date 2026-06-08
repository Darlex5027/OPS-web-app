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

    const elFormRegistro = document.getElementById("elFormRegistro");
    const elInputConfirmarPassword = document.getElementById("elInputConfirmarPassword");
    const docPMensaje = document.getElementById("docPMensaje");
    const elDivGrupoAlumno = document.getElementById("elDivGrupoAlumno");
    const elDivGrupoCoordinador = document.getElementById("elDivGrupoCoordinador");

    const elSelectCarreraAlumno = document.getElementById("elSelectCarreraAlumno");
    const elSelectCarreraCoordinador = document.getElementById("elSelectCarreraCoordinador");
    const elSelectFacultadAlumno = document.getElementById("elSelectFacultadAlumno");
    const elSelectFacultadCoordinador = document.getElementById("elSelectFacultadCoordinador");
    const elSelectOrganizacion = document.getElementById("elSelectOrganizacion");
    const elSelectActividad = document.getElementById("elSelectActividad");
    const elSelectPeriodo = document.getElementById("elSelectPeriodo");

    const elModalEmpresa = document.getElementById("elModalEmpresa");
    const elInputPassword = document.getElementById("elInputPassword");
    const elBtnNuevaEmpresa = document.getElementById("elBtnNuevaEmpresa");
    const elBtnGuardarEmpresa = document.getElementById("elBtnGuardarEmpresa");
    const elBtnCerrarModal = document.getElementById("elBtnCerrarModal");
    const elInputEmpresaRFC = document.getElementById("elInputEmpresaRFC");

    // Función para aplicar mayúsculas automáticas
    function aplicarMayusculasAlInstante() {
        const camposMayusculas = ['elInputMatricula', 'elInputGrupo'];

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

    // Validación de confirmación de contraseña con lanzarToast
    let timeoutConfirmacion = null;

    elInputConfirmarPassword.addEventListener("input", function () {
        const contrasena = elInputPassword.value;
        const confirmacion = this.value;
        const btnSubmit = document.querySelector("button[type='submit']");

        if (timeoutConfirmacion) {
            clearTimeout(timeoutConfirmacion);
        }

        if (confirmacion === "") {
            this.style.borderColor = "";
            btnSubmit.disabled = false;
        } else if (confirmacion === contrasena) {
            this.style.borderColor = "green";
            btnSubmit.disabled = false;
        } else {
            this.style.borderColor = "red";
            btnSubmit.disabled = true;
            lanzarToast("Las contraseñas no coinciden", "error");
        }
    });

    const radiosTipo = document.querySelectorAll("input[name='tipo_usuario']");

    if (elInputEmpresaRFC) {
        elInputEmpresaRFC.addEventListener("input", function () {
            this.value = this.value.toUpperCase();
        });
    }

    /* =========================
       CARGAR CARRERAS
    ========================= */

    let carreras = [];

    fetch(`${PATH_PHP}obtener_catalogos.php`)
        .then(respuesta => respuesta.json())
        .then(respuesta => {
            if (respuesta.success === false) {
                lanzarToast(respuesta.error || "Error al cargar los catálogos", "error");
                return;
            }
            carreras = respuesta.carreras;
            respuesta.facultades.forEach(facultad => {
                const option = document.createElement("option");
                option.value = facultad.Id_facultad;
                option.textContent = facultad.Nombre;
                if (elSelectFacultadAlumno)
                    elSelectFacultadAlumno.appendChild(option.cloneNode(true));
                if (elSelectFacultadCoordinador)
                    elSelectFacultadCoordinador.appendChild(option.cloneNode(true));
            });
        })
        .catch(() => lanzarToast("Error al cargar los catálogos", "error"));

    function cargarCarrerasPorFacultad(idFacultad, selectCarrera) {
        selectCarrera.innerHTML = '<option value="">Seleccione una carrera</option>';
        carreras
            .filter(carrera => carrera.Id_facultad == idFacultad)
            .forEach(carrera => {
                const option = document.createElement("option");
                option.value = carrera.Id_carrera;
                option.textContent = carrera.Nombre;
                selectCarrera.appendChild(option);
            });
    }

    if (elSelectFacultadAlumno) {
        elSelectFacultadAlumno.addEventListener("change", function () {
            cargarCarrerasPorFacultad(this.value, elSelectCarreraAlumno);
        });
    }

    if (elSelectFacultadCoordinador) {
        elSelectFacultadCoordinador.addEventListener("change", function () {
            cargarCarrerasPorFacultad(this.value, elSelectCarreraCoordinador);
        });
    }

    /* =========================
       CARGAR ACTIVIDADES
    ========================= */

    function cargarActividades() {
        fetch(`${PATH_PHP}obtener_actividades.php`)
            .then(respuesta => respuesta.json())
            .then(respuesta => {
                if (respuesta.success === false) {
                    lanzarToast(respuesta.error || "Error al cargar actividades", "error");
                    return;
                }
                if (!respuesta.actividades || !elSelectActividad) return;
                elSelectActividad.innerHTML = '<option value="">Seleccione una actividad</option>';
                respuesta.actividades.forEach(actividad => {
                    const option = document.createElement("option");
                    option.value = actividad.Id_actividad;
                    option.textContent = actividad.Nombre;
                    elSelectActividad.appendChild(option);
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
            .then(respuesta => respuesta.json())
            .then(respuesta => {
                if (respuesta.success === false) {
                    lanzarToast(respuesta.error || "Error al cargar las empresas", "error");
                    return;
                }
                if (!respuesta.empresas || !elSelectOrganizacion) return;
                elSelectOrganizacion.innerHTML = '<option value="">Seleccione una empresa (opcional)</option>';
                respuesta.empresas.forEach(empresa => {
                    const option = document.createElement("option");
                    option.value = empresa.Id_empresa;
                    option.textContent = empresa.Nombre;
                    if (idASeleccionar && empresa.Id_empresa == idASeleccionar) {
                        option.selected = true;
                    }
                    elSelectOrganizacion.appendChild(option);
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
            if (elDivGrupoAlumno) elDivGrupoAlumno.hidden = !esAlumno;
            if (elDivGrupoCoordinador) elDivGrupoCoordinador.hidden = esAlumno;
            if (elDivGrupoAlumno) {
                elDivGrupoAlumno.querySelectorAll("input, select").forEach(elemento => elemento.disabled = !esAlumno);
            }
            if (elDivGrupoCoordinador) {
                elDivGrupoCoordinador.querySelectorAll("input, select").forEach(elemento => elemento.disabled = esAlumno);
            }
            if (docPMensaje) docPMensaje.style.display = "none";
        });
    });

    document.querySelector("input[name='tipo_usuario']:checked").dispatchEvent(new Event("change"));

    /* =========================
       MODAL EMPRESA
    ========================= */

    if (elBtnNuevaEmpresa) {
        elBtnNuevaEmpresa.addEventListener("click", () => {
            elModalEmpresa.style.display = "block";
        });
    }

    if (elBtnCerrarModal) {
        elBtnCerrarModal.addEventListener("click", () => {
            elModalEmpresa.style.display = "none";
            limpiarModalEmpresa();
        });
    }

    if (elBtnGuardarEmpresa) {
        elBtnGuardarEmpresa.addEventListener("click", function () {
            const regexRFC = /^[A-Z0-9]{12,13}$/i;
            const nuevaEmpresa = {
                nombre_comercial: document.getElementById("elInputEmpresaNombre").value.trim(),
                razon_social: document.getElementById("elInputEmpresaRazon").value.trim(),
                rfc: document.getElementById("elInputEmpresaRFC").value.trim(),
                direccion: document.getElementById("elInputEmpresaDireccion").value.trim(),
                sitio_web: document.getElementById("elInputEmpresaSitioWeb").value.trim(),
                descripcion: document.getElementById("elTextareaEmpresaDescripcion").value.trim()
            };

            if (!nuevaEmpresa.nombre_comercial) {
                lanzarToast("Complete el nombre comercial de la empresa", "error");
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
                .then(respuesta => {
                    if (!respuesta.ok) {
                        throw new Error("Error del servidor");
                    }
                    return respuesta.json();
                })
                .then(respuesta => {
                    if (respuesta.success) {
                        lanzarToast("¡Empresa registrada exitosamente!", "exito");
                        elModalEmpresa.style.display = "none";
                        limpiarModalEmpresa();
                        cargarEmpresas(respuesta.id_empresa);
                    } else {
                        lanzarToast(respuesta.error || "No se pudo registrar la empresa", "error");
                    }
                })
                .catch(error => {
                    lanzarToast(error.message || "Error de conexión con el servidor", "error");
                });
        });
    }

    function limpiarModalEmpresa() {
        const camposModal = document.querySelectorAll("#elModalEmpresa input, #elModalEmpresa textarea");
        camposModal.forEach(campo => campo.value = "");
    }

    /* =========================
       ENVÍO FORMULARIO
    ========================= */

    elFormRegistro.addEventListener("submit", function (evento) {
        evento.preventDefault();
        if (docPMensaje) docPMensaje.style.display = "none";

        const tipo = document.querySelector("input[name='tipo_usuario']:checked").value;

        // Validaciones comunes
        const matricula = document.getElementById("elInputMatricula").value.trim();
        const password = elInputPassword.value;
        const confirmar = elInputConfirmarPassword.value;

        if (!matricula) {
            lanzarToast("La matrícula es obligatoria.", "error");
            return;
        }

        const regexAlumno = /^[0-9]{8}$/;
        const regexCoordinador = /^[0-9]{4}$/;

        if (tipo === "alumno" && !regexAlumno.test(matricula)) {
            lanzarToast("La matrícula del alumno debe tener 8 dígitos.", "error");
            return;
        }

        if (tipo === "coordinador" && !regexCoordinador.test(matricula)) {
            lanzarToast("La matrícula del coordinador debe tener 4 dígitos.", "error");
            return;
        }

        if (!password) {
            lanzarToast("La contraseña es obligatoria.", "error");
            return;
        }

        if (password !== confirmar) {
            lanzarToast("Las contraseñas no coinciden", "error");
            return;
        }

        const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!regexPassword.test(password)) {
            lanzarToast("La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.", "error");
            return;
        }

        const datos = {
            tipo_usuario: tipo,
            matricula: matricula,
            password: password,
            confirmar: confirmar
        };

        if (tipo === "alumno") {
            const nombre = document.getElementById("elInputNombreAlumno").value.trim();
            const apellido_p = document.getElementById("elInputApellidoPAlumno").value.trim();
            const apellido_m = document.getElementById("elInputApellidoMAlumno").value.trim();
            const id_carrera = elSelectCarreraAlumno.value;
            const grupo = document.getElementById("elInputGrupo").value.trim();
            const email = document.getElementById("elInputEmailAlumno").value.trim();
            const telefono = document.getElementById("elInputTelefonoAlumno").value.trim();
            const actividad = elSelectActividad.value;
            const periodo_tipo = elSelectPeriodo.value;

            if (!nombre) {
                lanzarToast("El nombre del alumno es obligatorio.", "error");
                return;
            }
            if (!elSelectFacultadAlumno.value) {
                lanzarToast("Debe seleccionar una facultad.", "error");
                return;
            }
            if (!id_carrera) {
                lanzarToast("Debe seleccionar una carrera.", "error");
                return;
            }
            if (!grupo) {
                lanzarToast("El grupo es obligatorio.", "error");
                return;
            }
            if (!email) {
                lanzarToast("El correo electrónico es obligatorio.", "error");
                return;
            }
            if (!telefono) {
                lanzarToast("El teléfono es obligatorio.", "error");
                return;
            }
            if (!actividad) {
                lanzarToast("Debe seleccionar una actividad.", "error");
                return;
            }
            if (!periodo_tipo) {
                lanzarToast("Debe seleccionar un periodo.", "error");
                return;
            }

            const regexGrupo = /^[0-9][A-Z]$/;
            if (!regexGrupo.test(grupo.toUpperCase())) {
                lanzarToast("El grupo debe tener formato: número y letra mayúscula (ejemplo: 7A).", "error");
                return;
            }

            const regexTelefono = /^[0-9]{3}-[0-9]{4}-[0-9]{3}$/;
            if (!regexTelefono.test(telefono)) {
                lanzarToast("El teléfono debe tener el formato xxx-xxxx-xxx.", "error");
                return;
            }

            const horaInicio = document.getElementById("elInputHoraInicio").value;
            const horaFin = document.getElementById("elInputHoraFin").value;

            let horario = null;
            if (horaInicio && horaFin) {
                if (horaInicio >= horaFin) {
                    lanzarToast("La hora de inicio debe ser menor a la hora de fin.", "error");
                    return;
                }
                horario = `${horaInicio} - ${horaFin}`;
            }

            datos.nombre = nombre;
            datos.apellido_p = apellido_p;
            datos.apellido_m = apellido_m;
            datos.id_carrera = id_carrera;
            datos.grupo = grupo;
            datos.horario = horario;
            datos.email = email;
            datos.telefono = telefono;
            datos.organizacion = elSelectOrganizacion.value || null;
            datos.actividad = actividad;
            datos.periodo_tipo = periodo_tipo;

        } else {
            // Coordinador
            const nombre = document.getElementById("elInputNombreCoordinador").value.trim();
            const apellido_p = document.getElementById("elInputApellidoPCoordinador").value.trim();
            const apellido_m = document.getElementById("elInputApellidoMCoordinador").value.trim();
            const id_carrera = elSelectCarreraCoordinador.value;
            const telefono = document.getElementById("elInputTelefonoCoordinador").value.trim();
            const correo = document.getElementById("elInputCorreoCoordinador").value.trim();

            if (!nombre) {
                lanzarToast("El nombre del coordinador es obligatorio.", "error");
                return;
            }
            if (!apellido_p) {
                lanzarToast("El apellido paterno del coordinador es obligatorio.", "error");
                return;
            }
            if (!elSelectFacultadCoordinador.value) {
                lanzarToast("Debe seleccionar una facultad.", "error");
                return;
            }
            if (!id_carrera) {
                lanzarToast("Debe seleccionar una carrera a cargo.", "error");
                return;
            }
            if (!telefono) {
                lanzarToast("El teléfono del coordinador es obligatorio.", "error");
                return;
            }
            if (!correo) {
                lanzarToast("El correo del coordinador es obligatorio.", "error");
                return;
            }

            datos.nombre = nombre;
            datos.apellido_p = apellido_p;
            datos.apellido_m = apellido_m;
            datos.id_carrera = id_carrera;
            datos.telefono = telefono;
            datos.correo = correo;
        }

        fetch(`${PATH_PHP}registro.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        })
            .then(respuesta => {
                if (!respuesta.ok) {
                    throw new Error("Error del servidor");
                }
                return respuesta.json();
            })
            .then(respuesta => {
                if (respuesta.success) {
                    lanzarToast("¡Registro exitoso! Redirigiendo...", "exito");
                    setTimeout(() => {
                        window.location.href = "../CU_01_Login/login.html";
                    }, 2000);
                } else {
                    lanzarToast(respuesta.error || "Error en el registro", "error");
                }
            })
            .catch(error => {
                lanzarToast(error.message || "Error de conexión con el servidor", "error");
            });
    });
});