// =========================
// VARIABLE GLOBAL
// =========================
let datosPerfil = {};

document.addEventListener("DOMContentLoaded", () => {

    // =========================
    // ELEMENTOS
    // =========================
    const formAdmin =
        document.getElementById("perfil_administrador");
    const formMaestro =
        document.getElementById("perfil_maestro");

    const contenedorAlumno =
        document.querySelector(".contenedor-alumno");

    const btnEditar =
        document.querySelector(".btn.editar");

    const btnGuardar =
        document.querySelector(".btn.guardar");

    const btnCancelar =
        document.querySelector(".btn.cancelar");

    const inputFoto =
        document.getElementById("foto_perfil");

    const modalEmpresa =
        document.getElementById("modalNuevaEmpresa");

    const btnCrearEmpresa =
        document.getElementById("btnCrearEmpresa");

    const btnCerrarModal =
        document.getElementById("cerrarModalEmpresa");

    const btnGuardarEmpresa =
        document.getElementById("guardarNuevaEmpresa");

    // =========================
    // HELPERS
    // =========================
    function setValue(id, value) {

        const el = document.getElementById(id);

        if (el) {
            el.value = value || "";
        }
    }

    function formatearFecha(fecha) {

        if (!fecha) return "";

        return fecha.substring(0, 10);
    }

    function mostrarToast(msg, tipo = "exito") {

        const toast =
            document.getElementById("toast-mensaje");

        if (!toast) return;

        toast.textContent = msg;

        toast.className = `toast ${tipo}`;

        setTimeout(() => {

            toast.className = "toast oculto";

        }, 3000);
    }

    // =========================
    // BLOQUEAR CAMPOS
    // =========================
    function bloquearCampos(lista) {

        lista.forEach(id => {

            const campo =
                document.getElementById(id);

            if (campo) {

                campo.disabled = true;
                campo.readOnly = true;
            }
        });
    }

    // =========================
    // CAMPOS PROTEGIDOS
    // =========================
    const camposProtegidosAdmin = [
        "nombre_administrador",
        "apellido_paterno_administrador",
        "apellido_materno_administrador",
        "id_carrera_administrador",
        "fecha_registro_administrador"
    ];

    const camposProtegidosAlumno = [
        "nombre_alumno",
        "apellido_paterno_alumno",
        "apellido_materno_alumno",
        "id_carrera_alumno",
        "no_expediente_alumno",
        "fecha_registro_alumno",
        "periodo_tipo",
        "periodo_año",
        "fecha_registro",
        "fecha_modificacion",
        "servicio"
    ];

    // =========================
    // VALIDAR GRUPO
    // =========================
    const grupoInput =
        document.getElementById("grupo_alumno");

    grupoInput?.addEventListener("input", (e) => {

        let valor = e.target.value.toUpperCase();

        valor = valor.replace(/[^A-Z0-9]/g, "");

        if (valor.length >= 1) {

            valor =
                valor.charAt(0).replace(/[^1-9]/g, "") +
                valor.slice(1);
        }

        if (valor.length >= 2) {

            valor =
                valor.charAt(0) +
                valor.charAt(1).replace(/[^A-Z]/g, "");
        }

        valor = valor.substring(0, 2);

        e.target.value = valor;
    });

    // =========================
    // VALIDAR FOTO
    // =========================
    if (inputFoto) {

        inputFoto.setAttribute(
            "accept",
            "image/png,image/jpeg,image/jpg,image/webp"
        );

        inputFoto.disabled = true;

        inputFoto.addEventListener("change", (e) => {

            const archivo = e.target.files[0];

            if (!archivo) return;

            const tiposPermitidos = [
                "image/png",
                "image/jpeg",
                "image/jpg",
                "image/webp"
            ];

            if (!tiposPermitidos.includes(archivo.type)) {

                mostrarToast(
                    "Solo se permiten imágenes",
                    "error"
                );

                e.target.value = "";

                return;
            }

            const tamañoMaximo =
                5 * 1024 * 1024;

            if (archivo.size > tamañoMaximo) {

                mostrarToast(
                    "La imagen supera 5MB",
                    "error"
                );

                e.target.value = "";

                return;
            }
        });
    }

    // =========================
    // INICIO
    // =========================
    if (formAdmin) {
        formAdmin.style.display = "none";
    }
    if (formMaestro) {
        formMaestro.style.display = "none";
    }
    if (contenedorAlumno) {
        contenedorAlumno.style.display = "none";
    }

    if (btnGuardar) {
        btnGuardar.style.display = "none";
    }

    if (btnCancelar) {
        btnCancelar.style.display = "none";
    }

    if (btnCrearEmpresa) {
        btnCrearEmpresa.style.display = "none";
    }

    // =========================
    // COOKIE
    // =========================
    const tipoUsuario = document.cookie
        .split("; ")
        .find(row =>
            row.startsWith("Id_tipo_usuario=")
        )
        ?.split("=")[1];

    if (!tipoUsuario) {

        mostrarToast(
            "No hay sesión activa",
            "error"
        );

        return;
    }

    // =========================
    // CARGAR EMPRESAS
    // =========================
    function cargarEmpresas(idSeleccionado = "") {

        fetch("obtener_empresas.php")
            .then(res => res.json())
            .then(empresas => {

                const select =
                    document.getElementById("id_empresa");

                if (!select) return;

                select.innerHTML = `
                    <option value="">
                        -- Selecciona una empresa --
                    </option>
                `;

                empresas.forEach(emp => {

                    const option =
                        document.createElement("option");

                    option.value = emp.Id_empresa;
                    option.textContent = emp.Nombre;

                    if (
                        emp.Id_empresa == idSeleccionado
                    ) {

                        option.selected = true;
                    }

                    select.appendChild(option);
                });
            });
    }

    // =========================
    // MODAL NUEVA EMPRESA
    // =========================
    btnCrearEmpresa?.addEventListener("click", () => {

        modalEmpresa.style.display = "flex";
    });

    btnCerrarModal?.addEventListener("click", () => {

        modalEmpresa.style.display = "none";
    });

    window.addEventListener("click", (e) => {

        if (e.target === modalEmpresa) {

            modalEmpresa.style.display = "none";
        }
    });

    // =========================
    // GUARDAR NUEVA EMPRESA
    // =========================
    btnGuardarEmpresa?.addEventListener("click", () => {

        const nombre =
            document.getElementById("nueva_empresa_nombre")?.value.trim();

        const descripcion =
            document.getElementById("nueva_empresa_descripcion")?.value.trim();

        const razonSocial =
            document.getElementById("nueva_empresa_razon_social")?.value.trim();

        const rfc =
            document.getElementById("nueva_empresa_rfc")?.value.trim();

        const direccion =
            document.getElementById("nueva_empresa_direccion")?.value.trim();

        const sitioWeb =
            document.getElementById("nueva_empresa_web")?.value.trim();

        if (!nombre) {

            mostrarToast(
                "Ingresa el nombre de la empresa",
                "error"
            );

            return;
        }

        const dataEmpresa = new FormData();

        dataEmpresa.append("nombre", nombre);
        dataEmpresa.append("descripcion", descripcion);
        dataEmpresa.append("razon_social", razonSocial);
        dataEmpresa.append("rfc", rfc);
        dataEmpresa.append("direccion", direccion);
        dataEmpresa.append("sitio_web", sitioWeb);

        fetch("crear_empresa.php", {

            method: "POST",
            body: dataEmpresa

        })
            .then(res => res.json())
            .then(resp => {

                if (resp.success) {

                    mostrarToast(
                        "Empresa creada correctamente",
                        "exito"
                    );

                    cargarEmpresas(resp.id_empresa);

                    modalEmpresa.style.display = "none";

                    document.getElementById("nueva_empresa_nombre").value = "";
                    document.getElementById("nueva_empresa_descripcion").value = "";
                    document.getElementById("nueva_empresa_razon_social").value = "";
                    document.getElementById("nueva_empresa_rfc").value = "";
                    document.getElementById("nueva_empresa_direccion").value = "";
                    document.getElementById("nueva_empresa_web").value = "";

                } else {

                    mostrarToast(
                        resp.error || "Error al crear empresa",
                        "error"
                    );
                }
            })
            .catch(error => {

                console.error(error);

                mostrarToast(
                    "Error de conexión",
                    "error"
                );
            });
    });

    // =========================
    // CARGAR DATOS
    // =========================
    fetch("obtener_datos.php")
        .then(res => res.json())
        .then(perfil => {

            datosPerfil = perfil;

            if (perfil.error) {

                mostrarToast(
                    perfil.error,
                    "error"
                );

                return;
            }

            // =========================
            // ADMIN
            // =========================
            if (tipoUsuario == "1") {

                formAdmin.style.display = "block";

                setValue("nombre_administrador", perfil.Nombre);
                setValue("apellido_paterno_administrador", perfil.Apellido_P);
                setValue("apellido_materno_administrador", perfil.Apellido_M);
                setValue("id_carrera_administrador", perfil.Nombre_Carrera);
                setValue("telefono_administrador", perfil.Telefono);
                setValue("correo_administrador", perfil.Correo);

                setValue(
                    "fecha_registro_administrador",
                    formatearFecha(perfil.Fecha_registro)
                );

                bloquearCampos(camposProtegidosAdmin);
            }

            // =========================
            // MAESTRO
            // =========================
            else if (tipoUsuario == "3") {

                formMaestro.style.display = "block";

                setValue("nombre_maestro", perfil.Nombre);
                setValue("apellido_paterno_maestro", perfil.Apellido_P);
                setValue("apellido_materno_maestro", perfil.Apellido_M);
                setValue("id_carrera_maestro", perfil.Nombre_Carrera);
                setValue("telefono_maestro", perfil.Telefono);
                setValue("correo_maestro", perfil.Correo);

                setValue(
                    "fecha_registro_maestro",
                    formatearFecha(perfil.Fecha_registro)
                );

                bloquearCampos([
                    "nombre_maestro",
                    "apellido_paterno_maestro",
                    "apellido_materno_maestro",
                    "id_carrera_maestro",
                    "fecha_registro_maestro"
                ]);
            }

            // =========================
            // ALUMNO
            // =========================
            else if (tipoUsuario == "2") {

                contenedorAlumno.style.display = "flex";

                setValue("nombre_alumno", perfil.Nombre);
                setValue("apellido_paterno_alumno", perfil.Apellido_P);
                setValue("apellido_materno_alumno", perfil.Apellido_M);
                setValue("id_carrera_alumno", perfil.Nombre_Carrera);
                setValue("grupo_alumno", perfil.Grupo);
                setValue("no_expediente_alumno", perfil.No_Expediente);
                setValue("servicio", perfil.Nombre_servicio);

                // HORARIO
                if (perfil.Horario) {

                    const partes =
                        perfil.Horario.split("-");

                    setValue("horario_entrada", partes[0]);
                    setValue("horario_salida", partes[1]);
                }

                // EMPRESA
                cargarEmpresas(perfil.Id_empresa);

                const empresaTexto =
                    document.getElementById("empresa_texto");

                if (empresaTexto) {

                    empresaTexto.value =
                        perfil.Nombre_empresa || "";
                }

                setValue("area", perfil.Area);
                setValue("programa", perfil.Programa);
                setValue("periodo_tipo", perfil.periodo_tipo);
                setValue("periodo_año", perfil.periodo_año);

                setValue(
                    "fecha_inicio",
                    formatearFecha(perfil.Fecha_inicio)
                );

                setValue(
                    "fecha_fin",
                    formatearFecha(perfil.Fecha_fin)
                );

                setValue(
                    "fecha_registro",
                    formatearFecha(perfil.Fecha_registro_act)
                );

                setValue(
                    "fecha_modificacion",
                    formatearFecha(perfil.Fecha_modificacion)
                );

                // =========================
                // ESTADO
                // =========================
                const estado = document.getElementById("estado");

                if (estado) {

                    const estadoBD = (perfil.Estado || "")
                        .trim()
                        .toUpperCase()
                        .replace(/_/g, " ");  // EN_CURSO → EN CURSO

                    estado.selectedIndex = 0;

                    for (let i = 0; i < estado.options.length; i++) {

                        const opcion = estado.options[i];

                        const valor = opcion.value
                            .trim()
                            .toUpperCase()
                            .replace(/_/g, " ");  // normalizar igual

                        if (valor === estadoBD) {
                            opcion.selected = true;
                            break;
                        }
                    }

                    setTimeout(() => {
                        estado.disabled = true;
                    }, 50);
                }

                // DESHABILITAR
                document.querySelectorAll(
                    ".contenedor-alumno input, .contenedor-alumno select, .contenedor-alumno textarea"
                )
                    .forEach(el => {

                        if (
                            el.id !== "foto_perfil"
                        ) {

                            el.disabled = true;
                        }
                    });

                bloquearCampos(
                    camposProtegidosAlumno
                );

                // SI COMPLETADO
                if (
                    perfil.Estado &&
                    perfil.Estado.toUpperCase() ===
                    "COMPLETADO"
                ) {

                    btnEditar.style.display = "none";
                }
            }
        })
        .catch(error => {

            console.error(error);

            mostrarToast(
                "Error al cargar datos",
                "error"
            );
        });

    // =========================
    // EDITAR
    // =========================
    btnEditar?.addEventListener("click", () => {

        btnEditar.style.display = "none";

        btnGuardar.style.display =
            "inline-block";

        btnCancelar.style.display =
            "inline-block";

        if (inputFoto) {
            inputFoto.disabled = false;
        }

        // ADMIN
        if (tipoUsuario == "1") {

            [
                "telefono_administrador",
                "correo_administrador"
            ]
                .forEach(id => {

                    const campo =
                        document.getElementById(id);

                    if (campo) {

                        campo.disabled = false;
                        campo.readOnly = false;
                    }
                });
        }
        // =========================
        // MAESTRO
        // =========================
        else if (tipoUsuario == "3") {

            [
                "telefono_maestro",
                "correo_maestro"
            ]
                .forEach(id => {

                    const campo =
                        document.getElementById(id);

                    if (campo) {

                        campo.disabled = false;
                        campo.readOnly = false;
                    }
                });
        }

        // ALUMNO
        else {

            [
                "grupo_alumno",
                "horario_entrada",
                "horario_salida",
                "area",
                "programa",
                "estado",
                "fecha_inicio",
                "fecha_fin",
                "id_empresa"
            ]
                .forEach(id => {

                    const campo =
                        document.getElementById(id);

                    if (campo) {

                        campo.disabled = false;
                        campo.readOnly = false;
                    }
                });

            const empresaTexto =
                document.getElementById("empresa_texto");

            const empresaSelect =
                document.getElementById("id_empresa");

            if (empresaTexto && empresaSelect) {

                empresaTexto.style.display = "none";

                empresaSelect.style.display = "block";
            }

            if (btnCrearEmpresa) {

                btnCrearEmpresa.style.display =
                    "block";
            }
        }
    });

    // =========================
    // GUARDAR
    // =========================
    btnGuardar?.addEventListener("click", () => {

        const data = new FormData();

        // FOTO
        if (
            inputFoto &&
            inputFoto.files.length > 0
        ) {

            data.append(
                "foto_perfil",
                inputFoto.files[0]
            );
        }

        // ADMIN
        if (tipoUsuario == "1") {

            data.append(
                "telefono",
                document
                    .getElementById(
                        "telefono_administrador"
                    )?.value
            );

            data.append(
                "correo",
                document
                    .getElementById(
                        "correo_administrador"
                    )?.value
            );
        }
        // =========================
        // MAESTRO
        // =========================
        else if (tipoUsuario == "3") {

            data.append(
                "telefono",
                document
                    .getElementById(
                        "telefono_maestro"
                    )?.value
            );

            data.append(
                "correo",
                document
                    .getElementById(
                        "correo_maestro"
                    )?.value
            );
        }
        // ALUMNO
        else {

            const fechaInicio =
                document.getElementById(
                    "fecha_inicio"
                )?.value;

            const fechaFin =
                document.getElementById(
                    "fecha_fin"
                )?.value;

            if (
                fechaInicio &&
                fechaFin &&
                fechaFin <= fechaInicio
            ) {

                mostrarToast(
                    "La fecha fin debe ser posterior",
                    "error"
                );

                return;
            }

            data.append(
                "grupo",
                document
                    .getElementById(
                        "grupo_alumno"
                    )?.value
            );

            data.append(
                "horario",
                `${document.getElementById("horario_entrada")?.value}-${document.getElementById("horario_salida")?.value}`
            );

            data.append(
                "area",
                document
                    .getElementById("area")?.value
            );

            data.append(
                "programa",
                document
                    .getElementById("programa")?.value
            );

            data.append(
                "estado",
                document
                    .getElementById("estado")?.value
            );

            data.append(
                "fecha_inicio",
                fechaInicio
            );

            data.append(
                "fecha_fin",
                fechaFin
            );

            data.append(
                "id_empresa",
                document
                    .getElementById("id_empresa")
                    ?.value || ""
            );
        }

        fetch("guardar_datos.php", {

            method: "POST",
            body: data

        })
            .then(res => res.json())
            .then(resp => {

                if (resp.success) {

                    mostrarToast(
                        "Datos guardados",
                        "exito"
                    );

                    setTimeout(() => {

                        location.reload();

                    }, 1500);

                } else {

                    mostrarToast(
                        resp.error ||
                        "Error al guardar",
                        "error"
                    );
                }
            })
            .catch(error => {

                console.error(error);

                mostrarToast(
                    "Error de conexión",
                    "error"
                );
            });
    });

    // =========================
    // CANCELAR
    // =========================
    btnCancelar?.addEventListener("click", () => {

        location.reload();
    });

});