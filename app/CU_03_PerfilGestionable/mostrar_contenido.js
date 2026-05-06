document.addEventListener("DOMContentLoaded", () => {

    const formAdmin = document.getElementById("perfil_administrador");
    const contenedorAlumno = document.querySelector(".contenedor-alumno");

    const btnEditar = document.querySelector(".btn.editar");
    const btnGuardar = document.querySelector(".btn.guardar");

    function setValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value || "";
    }

    function formatearFecha(fecha) {
        if (!fecha) return "";
        return fecha.substring(0, 10);
    }

    function mostrarToast(msg, tipo = "exito") {
        const toast = document.getElementById("toast-mensaje");
        if (!toast) return;
        toast.textContent = msg;
        toast.className = `toast ${tipo}`;
        setTimeout(() => toast.className = "toast oculto", 3000);
    }

    // =========================
    // EMPRESAS
    // =========================
    function cargarEmpresas() {
        fetch("obtener_empresas.php")
            .then(res => res.json())
            .then(empresas => {

                const select = document.getElementById("id_empresa");
                select.innerHTML = `
                    <option value="">-- Seleccionar empresa --</option>
                    <option value="nueva">+ Agregar nueva empresa</option>
                `;

                empresas.forEach(emp => {
                    const option = document.createElement("option");
                    option.value = emp.Id_empresa;
                    option.textContent = emp.Nombre;
                    select.appendChild(option);
                });
            });
    }

    // =========================
    // DETECTAR NUEVA EMPRESA
    // =========================
    document.addEventListener("change", (e) => {
        if (e.target.id === "id_empresa") {
            const nueva = document.getElementById("nueva_empresa");

            if (e.target.value === "nueva") {
                nueva.style.display = "block";
            } else {
                nueva.style.display = "none";
            }
        }
    });

    // =========================
    // INICIO
    // =========================
    formAdmin.style.display = "none";
    contenedorAlumno.style.display = "none";
    btnGuardar.style.display = "none";

    const tipoUsuario = document.cookie
        .split("; ")
        .find(row => row.startsWith("Id_tipo_usuario="))
        ?.split("=")[1];

    if (!tipoUsuario) {
        mostrarToast("No hay sesión activa", "error");
        return;
    }

    // =========================
    // CARGAR DATOS
    // =========================
    fetch("obtener_datos.php")
        .then(res => res.json())
        .then(perfil => {

            if (perfil.error) {
                mostrarToast(perfil.error, "error");
                return;
            }

            // ADMIN
            if (tipoUsuario == "1" || tipoUsuario == "3") {

                formAdmin.style.display = "block";

                setValue("nombre_administrador", perfil.Nombre);
                setValue("apellido_paterno_administrador", perfil.Apellido_P);
                setValue("apellido_materno_administrador", perfil.Apellido_M);
                setValue("id_carrera_administrador", perfil.Nombre_Carrera);
                setValue("telefono_administrador", perfil.Telefono);
                setValue("correo_administrador", perfil.Correo);
                setValue("fecha_registro_administrador", formatearFecha(perfil.Fecha_registro));
            }

            // ALUMNO
            else {

                contenedorAlumno.style.display = "flex";

                setValue("nombre_alumno", perfil.Nombre);
                setValue("apellido_paterno_alumno", perfil.Apellido_P);
                setValue("apellido_materno_alumno", perfil.Apellido_M);
                setValue("id_carrera_alumno", perfil.Nombre_Carrera);

                setValue("grupo_alumno", perfil.Grupo);
                setValue("no_expediente_alumno", perfil.No_Expediente);

                if (perfil.Horario) {
                    const partes = perfil.Horario.split("-");
                    setValue("horario_entrada", partes[0]);
                    setValue("horario_salida", partes[1]);
                }

                setValue("id_alumno_servicio", perfil.Nombre_servicio);
                setValue("id_alumno", perfil.Nombre);
                setValue("id_servicio", perfil.Nombre_servicio);

                setValue("empresa_texto", perfil.Nombre_empresa);

                setValue("area", perfil.Area);
                setValue("programa", perfil.Programa);
                setValue("periodo_tipo", perfil.periodo_tipo);
                setValue("periodo_año", perfil.periodo_año);

                setValue("fecha_inicio", formatearFecha(perfil.Fecha_inicio));
                setValue("fecha_fin", formatearFecha(perfil.Fecha_fin));

                document.getElementById("estado").value = perfil.Estado || "";
            }
        });

    // =========================
    // EDITAR
    // =========================
    btnEditar.addEventListener("click", () => {

        document.querySelectorAll("input, select").forEach(el => {
            el.disabled = false;
        });

        // Mostrar select empresa
        document.getElementById("empresa_texto").style.display = "none";
        document.getElementById("id_empresa").style.display = "block";

        cargarEmpresas();

        btnGuardar.style.display = "inline-block";
    });

    // =========================
    // GUARDAR
    // =========================
    btnGuardar.addEventListener("click", () => {

        const data = new FormData();

        const grupo = document.getElementById("grupo_alumno");
        const entrada = document.getElementById("horario_entrada");
        const salida = document.getElementById("horario_salida");

        if (grupo) data.append("grupo", grupo.value);

        if (entrada.value && salida.value) {
            data.append("horario", `${entrada.value}-${salida.value}`);
        }

        data.append("area", document.getElementById("area").value);
        data.append("programa", document.getElementById("programa").value);
        data.append("estado", document.getElementById("estado").value);
        data.append("periodo_año", document.getElementById("periodo_año").value);
        data.append("fecha_inicio", document.getElementById("fecha_inicio").value);
        data.append("fecha_fin", document.getElementById("fecha_fin").value);

        // 🔥 EMPRESA
        const selectEmpresa = document.getElementById("id_empresa");
        const nuevaEmpresa = document.getElementById("nueva_empresa");

        if (selectEmpresa.value === "nueva") {
            data.append("nueva_empresa", nuevaEmpresa.value);
        } else {
            data.append("id_empresa", selectEmpresa.value);
        }

        fetch("guardar_datos.php", {
            method: "POST",
            body: data
        })
        .then(res => res.json())
        .then(resp => {

            if (resp.success) {
                mostrarToast("Guardado correctamente");

                document.querySelectorAll("input, select").forEach(el => {
                    el.disabled = true;
                });

                btnGuardar.style.display = "none";
            }
        });
    });

});