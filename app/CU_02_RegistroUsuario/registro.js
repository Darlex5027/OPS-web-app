/**
 * registro.js
 * Controla el registro de alumnos y coordinadores
 */

document.addEventListener("DOMContentLoaded", function () {

    const PATH_PHP = "";

    const form = document.getElementById("formRegistro");
    const confirmarInput = document.getElementById("confirmar_password");

    confirmarInput.addEventListener("input", function () {

        const pass = document.getElementById("password").value;
        const confirm = this.value;

        if (confirm === pass) {

            this.style.borderColor = "green";

        } else {

            this.style.borderColor = "red";

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

    const modalEmpresa = document.getElementById("modalEmpresa");
    const passwordInput = document.getElementById("password");

    passwordInput.addEventListener("input", function () {

        const valor = this.value;

        document.getElementById("req-long").style.color =
            valor.length >= 8 ? "green" : "red";

        document.getElementById("req-mayus").style.color =
            /[A-Z]/.test(valor) ? "green" : "red";

        document.getElementById("req-minus").style.color =
            /[a-z]/.test(valor) ? "green" : "red";

        document.getElementById("req-num").style.color =
            /\d/.test(valor) ? "green" : "red";

        document.getElementById("req-esp").style.color =
            /[\W_]/.test(valor) ? "green" : "red";

    });
    const btnNuevaEmpresa = document.getElementById("btnNuevaEmpresa");
    const btnGuardarEmpresa = document.getElementById("guardarEmpresa");
    const btnCerrarModal = document.getElementById("cerrarModal");



    /* =========================
       CARGAR CARRERAS
    ========================= */

    let carreras = [];

    fetch(`${PATH_PHP}obtener_catalogos.php`)
        .then(res => res.json())
        .then(data => {

            carreras = data.carreras;

            // Cargar facultades
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
        .catch(() => alert("Error al cargar catálogos"));

    function cargarCarrerasPorFacultad(idFacultad, selectCarrera) {

        selectCarrera.innerHTML = '<option value="">Seleccione una carrera</option>';

        carreras
            .filter(c => c.Id_Facultad == idFacultad)
            .forEach(carrera => {

                const option = document.createElement("option");
                option.value = carrera.Id_carrera;
                option.textContent = carrera.Nombre;

                selectCarrera.appendChild(option);

            });
    }

    if (selectFacultadAlumno) {

        selectFacultadAlumno.addEventListener("change", function () {

            cargarCarrerasPorFacultad(
                this.value,
                selectCarreraAlumno
            );

        });

    }

    if (selectFacultadCoordinador) {

        selectFacultadCoordinador.addEventListener("change", function () {

            cargarCarrerasPorFacultad(
                this.value,
                selectCarreraCoordinador
            );

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

                selectActividad.innerHTML =
                    '<option value="">Seleccione una actividad</option>';

                data.actividades.forEach(act => {

                    const option = document.createElement("option");
                    option.value = act.Id_actividad;
                    option.textContent = act.Nombre;

                    selectActividad.appendChild(option);

                });

            })
            .catch(() => alert("Error al cargar actividades"));
    }

    cargarActividades();

    /* =========================
       CARGAR EMPRESAS
    ========================= */

    function cargarEmpresas() {

        fetch(`${PATH_PHP}obtener_empresas.php`)
            .then(res => res.json())
            .then(data => {

                if (!data.empresas || !selectOrganizacion) return;

                selectOrganizacion.innerHTML =
                    '<option value="">Seleccione una empresa (opcional)</option>';

                data.empresas.forEach(emp => {

                    const option = document.createElement("option");
                    option.value = emp.Id_empresa;
                    option.textContent = emp.Nombre;

                    selectOrganizacion.appendChild(option);

                });

            })
            .catch(() => alert("Error al cargar empresas"));

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
                grupoAlumno
                    .querySelectorAll("input, select")
                    .forEach(el => el.disabled = !esAlumno);
            }

            if (grupoCoordinador) {
                grupoCoordinador
                    .querySelectorAll("input, select")
                    .forEach(el => el.disabled = esAlumno);
            }

            if (mensaje) mensaje.style.display = "none";

        });

    });

    document
        .querySelector("input[name='tipo_usuario']:checked")
        .dispatchEvent(new Event("change"));



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

            if (!nuevaEmpresa.nombre_comercial ||
                !nuevaEmpresa.razon_social ||
                !nuevaEmpresa.rfc) {

                alert("Complete los campos obligatorios de la empresa");
                return;
            }
            if (!regexRFC.test(nuevaEmpresa.rfc)) {
                alert("RFC inválido. Debe tener entre 12 y 13 caracteres.");
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

                        alert("Empresa registrada");

                        modalEmpresa.style.display = "none";
                        limpiarModalEmpresa();
                        cargarEmpresas();

                    } else {

                        alert("Error: " + (data.error || "No se pudo registrar la empresa"));

                    }

                })
                .catch(error => {

                    alert(error.message || "Error de conexión con el servidor");

                });
        });

    }



    function limpiarModalEmpresa() {

        document
            .querySelectorAll("#modalEmpresa input, #modalEmpresa textarea")
            .forEach(i => i.value = "");

    }



    /* =========================
       ENVÍO FORMULARIO
    ========================= */

    form.addEventListener("submit", function (e) {

        e.preventDefault();
        if (mensaje) mensaje.style.display = "none";

        const tipo =
            document.querySelector("input[name='tipo_usuario']:checked").value;

        const datos = {

            tipo_usuario: tipo,
            matricula: document.getElementById("matricula").value.trim(),
            password: document.getElementById("password").value,
            confirmar: document.getElementById("confirmar_password").value

        };

        const regexAlumno = /^[0-9]{8}$/;
        const regexCoordinador = /^[0-9]{4}$/;
        const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        const regexTelefono = /^[0-9]{10}$/;
        const regexGrupo = /^[0-9][A-Z]$/;

        if (tipo === "alumno" && !regexAlumno.test(datos.matricula))
            return mostrarError("La matrícula del alumno debe tener 8 dígitos.");

        if (tipo === "coordinador" && !regexCoordinador.test(datos.matricula))
            return mostrarError("La matrícula del coordinador debe tener 4 dígitos.");

        if (datos.password !== datos.confirmar)
            return mostrarError("Las contraseñas no coinciden");

        if (!regexPassword.test(datos.password))
            return mostrarError("La contraseña debe tener mayúscula, minúscula, número y símbolo.");



        if (tipo === "alumno") {

            datos.nombre = document.getElementById("nombre_alumno").value.trim();
            datos.apellido_p = document.getElementById("apellido_p_alumno").value.trim();
            datos.apellido_m = document.getElementById("apellido_m_alumno").value.trim();
            datos.id_carrera = selectCarreraAlumno.value;
            datos.grupo = document.getElementById("grupo").value.trim();

            const horaInicio = document.getElementById("hora_inicio").value;
            const horaFin = document.getElementById("hora_fin").value;
            if (!horaInicio || !horaFin)
                return mostrarError("Debe ingresar el horario de actividad.");

            if (horaInicio >= horaFin)
                return mostrarError("La hora de inicio debe ser menor a la hora de fin.");
            datos.horario = `${horaInicio} - ${horaFin}`;

            datos.email = document.getElementById("email_alumno").value.trim();
            datos.telefono = document.getElementById("telefono_alumno").value.trim();
            datos.organizacion = selectOrganizacion.value || null;
            datos.actividad = selectActividad.value;
            if (!datos.actividad)
                return mostrarError("Debe seleccionar una actividad.");

            if (tipo === "alumno" && !regexGrupo.test(datos.grupo.toUpperCase()))
                return mostrarError("El grupo debe tener formato 7A.");

            if (tipo === "alumno" && !regexTelefono.test(datos.telefono))
                return mostrarError("El teléfono debe tener 10 dígitos.");

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

                    mensaje.className = "mensaje-exito";
                    mensaje.innerText = "¡Registro exitoso! Redirigiendo...";
                    mensaje.style.display = "block";

                    alert("Registro realizado correctamente");

                    setTimeout(() => {

                        window.location.href = "../CU_01_Login/login.html";

                    }, 2000);

                } else {

                    alert(data.error || "Error en el registro");

                }

            })
            .catch(error => {

                alert(error.message || "Error de conexión con el servidor");

            });

    });



    function mostrarError(texto) {

        mensaje.className = "mensaje-error";
        mensaje.style.display = "block";
        mensaje.innerText = texto;

    }

});