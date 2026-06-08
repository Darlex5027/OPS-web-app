// ================================
// Archivo : editar_guardar_perfil.js
// Módulo  : CU_03_PerfilGestionable
// Autor   : Viridiana Tonix Zarate
// Fecha   : 2026-05-24
// Descripción : Gestiona la edición y guardado del perfil del usuario
//               (administrador o alumno), incluyendo foto de perfil.
// ================================

import { lanzarToast } from '../js/lanzar_toast.js';

// Obtiene un elemento del DOM por su id
function obtenerElemento(id) {
    return document.getElementById(id);
}

// Lee el tipo de usuario desde las cookies de sesión
const tipoUsuario = document.cookie
    .split("; ")
    .find(function (r) { return r.startsWith("Id_tipo_usuario="); })
    ?.split("=")[1]
    ?.trim();

// ================================
// VALIDACIONES
// ================================

// Verifica que los campos obligatorios del administrador no estén vacíos
function validarAdministrador() {
    const campos = [
        { id: "correo_administrador",   label: "Correo" },
        { id: "telefono_administrador", label: "Teléfono" }
    ];
    const faltantes = campos.filter(function (campo) {
        const el = obtenerElemento(campo.id);
        return el && !el.value.trim();
    });
    if (faltantes.length > 0) {
        obtenerElemento(faltantes[0].id)?.focus();
        lanzarToast(`Campos incompletos: ${faltantes.map(function (c) { return c.label; }).join(", ")}`, "error");
        return false;
    }
    return true;
}

// Verifica que los campos del alumno estén completos cuando el estado es COMPLETADO
function validarAlumno() {
    const estado = obtenerElemento("estado")?.value || "";
    if (estado !== "COMPLETADO") return true;

    const campos = [
        { id: "grupo_alumno",    label: "Semestre y Grupo" },
        { id: "horario_entrada", label: "Horario de entrada" },
        { id: "horario_salida",  label: "Horario de salida" },
        { id: "area",            label: "Área" },
        { id: "programa",        label: "Programa" },
        { id: "estado",          label: "Estado" },
        { id: "fecha_inicio",    label: "Fecha de inicio" },
        { id: "fecha_fin",       label: "Fecha de fin" },
        { id: "id_empresa",      label: "Empresa" }
    ];
    const faltantes = campos.filter(function (campo) {
        const el = obtenerElemento(campo.id);
        return el && !el.value.trim();
    });
    if (faltantes.length > 0) {
        obtenerElemento(faltantes[0].id)?.focus();
        lanzarToast(`Campos incompletos: ${faltantes.map(function (c) { return c.label; }).join(", ")}`, "error");
        return false;
    }
    return true;
}

// Devuelve true si el estado actual de la actividad es COMPLETADO
function estaCompletado() {
    return obtenerElemento("estado")?.value?.toUpperCase() === "COMPLETADO";
}

// ================================
// MODAL — Nueva Empresa
// ================================

// Abre el modal para registrar una nueva empresa
function abrirModal() {
    obtenerElemento("modal_nueva_empresa").style.display = "flex";
}

// Cierra el modal y limpia sus campos
function cerrarModal() {
    obtenerElemento("modal_nueva_empresa").style.display = "none";
    limpiarModal();
}

// Limpia todos los campos del modal de nueva empresa
function limpiarModal() {
    ["nueva_empresa_nombre", "nueva_empresa_descripcion", "nueva_empresa_razon_social",
     "nueva_empresa_rfc",    "nueva_empresa_direccion",   "nueva_empresa_web"]
        .forEach(function (id) {
            const el = obtenerElemento(id);
            if (el) el.value = "";
        });
}

// Valida y envía los datos de la nueva empresa al servidor
function guardarNuevaEmpresa() {
    const nombre      = obtenerElemento("nueva_empresa_nombre")?.value.trim()        || "";
    const descripcion = obtenerElemento("nueva_empresa_descripcion")?.value.trim()   || "";
    const razonSocial = obtenerElemento("nueva_empresa_razon_social")?.value.trim()  || "";
    const rfc         = (obtenerElemento("nueva_empresa_rfc")?.value.trim()          || "").toUpperCase();
    const direccion   = obtenerElemento("nueva_empresa_direccion")?.value.trim()     || "";
    const sitioWeb    = obtenerElemento("nueva_empresa_web")?.value.trim()           || "";

    const regexNombre    = /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s.,&()-]{3,100}$/;
    const regexRazon     = /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s.,&()-]{3,150}$/;
    const regexRFC       = /^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$/;
    const regexDireccion = /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s#.,-]{5,200}$/;
    const regexWeb       = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/;

    if (!nombre)                                        return lanzarToast("El nombre de la empresa es obligatorio", "error");
    if (!regexNombre.test(nombre))                      return lanzarToast("Nombre de empresa inválido", "error");
    if (razonSocial && !regexRazon.test(razonSocial))   return lanzarToast("Razón social inválida", "error");
    if (rfc         && !regexRFC.test(rfc))             return lanzarToast("RFC inválido. Ejemplo: ABC123456XYZ", "error");
    if (direccion   && !regexDireccion.test(direccion)) return lanzarToast("Dirección inválida", "error");
    if (sitioWeb    && !regexWeb.test(sitioWeb))        return lanzarToast("Sitio web inválido", "error");

    fetch("crear_empresa.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            accion: "crear_empresa",
            nombre, descripcion,
            razon_social: razonSocial,
            rfc, direccion,
            sitio_web: sitioWeb
        })
    })
        .then(function (respuesta) { return respuesta.json(); })
        .then(function (resultado) {
            if (!resultado.success) return lanzarToast("Error al crear la empresa", "error");
            const elSelect = obtenerElemento("id_empresa");
            if (elSelect) {
                const elOpcion = document.createElement("option");
                elOpcion.value       = resultado.id_empresa;
                elOpcion.textContent = nombre;
                elOpcion.selected    = true;
                elSelect.appendChild(elOpcion);
            }
            const elTexto = obtenerElemento("empresa_texto");
            if (elTexto) elTexto.value = nombre;
            lanzarToast("Empresa creada correctamente", "exito");
            cerrarModal();
        })
        .catch(function () { lanzarToast("Error al conectar con el servidor", "error"); });
}

// ================================
// FOTO DE PERFIL
// ================================

// Inicializa el preview de la foto al seleccionar un archivo (valida tipo y tamaño)
function iniciarPreviewFoto() {
    const elInput   = obtenerElemento("foto_perfil_input");
    const elPreview = obtenerElemento("foto_perfil_preview");
    if (!elInput || !elPreview) return;

    elInput.addEventListener("change", function (e) {
        const archivo = e.target.files[0];
        if (!archivo) return;

        const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];
        if (!tiposPermitidos.includes(archivo.type)) {
            lanzarToast("Solo se permiten imágenes JPG, PNG o WEBP", "error");
            elInput.value = "";
            return;
        }
        if (archivo.size > 2 * 1024 * 1024) {
            lanzarToast("La imagen no debe superar los 2MB", "error");
            elInput.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = function (ev) { elPreview.src = ev.target.result; };
        reader.readAsDataURL(archivo);
    });
}

// Envía la foto al servidor y actualiza el preview si tiene éxito
async function subirFoto(archivo) {
    try {
        const fd = new FormData();
        fd.append("foto_perfil", archivo);
        const respuesta = await fetch("guardar_foto.php", { method: "POST", body: fd });
        const texto     = await respuesta.text();
        let resultado;
        try {
            resultado = JSON.parse(texto);
        } catch {
            lanzarToast("Advertencia: respuesta inesperada del servidor", "error");
            return false;
        }
        if (!resultado.success) {
            lanzarToast(resultado.error || "Error al subir la foto", "error");
            return false;
        }
        const elPreview = obtenerElemento("foto_perfil_preview");
        if (elPreview && resultado.url) elPreview.src = resultado.url;
        return true;
    } catch {
        lanzarToast("Error al subir la foto", "error");
        return false;
    }
}

// ================================
// MODO EDITAR
// ================================

// Valida si el registro está completado antes de permitir editar
function intentarEditar(btnEditar, btnGuardar, btnCancelar) {
    if (estaCompletado()) {
        lanzarToast("Este registro está completado y no puede editarse.", "error");
        return;
    }
    modoEditar(btnEditar, btnGuardar, btnCancelar);
}

// Activa el modo edición habilitando campos según el tipo de usuario
function modoEditar(btnEditar, btnGuardar, btnCancelar) {
    btnEditar.style.display   = "none";
    btnGuardar.style.display  = "inline-block";
    btnCancelar.style.display = "inline-block";

    // Habilita la foto para todos los tipos de usuario
    const elInputFoto = obtenerElemento("foto_perfil_input");
    if (elInputFoto) elInputFoto.disabled = false;
    obtenerElemento("btn_cambiar_foto")?.classList.remove("oculto");

    if (tipoUsuario === "1" || tipoUsuario === "3") {
        // Administrador: habilita teléfono y correo
        ["telefono_administrador", "correo_administrador"].forEach(function (id) {
            const el = obtenerElemento(id);
            if (el) { el.disabled = false; el.readOnly = false; }
        });
    } else {
        // Alumno: habilita campos del perfil y actividades
        ["grupo_alumno", "horario_entrada", "horario_salida",
         "area", "programa", "estado", "fecha_inicio", "fecha_fin"]
            .forEach(function (id) {
                const el = obtenerElemento(id);
                if (el) { el.disabled = false; el.readOnly = false; }
            });

        const elTextoEmpresa  = obtenerElemento("empresa_texto");
        const elSelectEmpresa = obtenerElemento("id_empresa");
        const elBtnCrear      = obtenerElemento("btn_crear_empresa");

        if (elTextoEmpresa)  elTextoEmpresa.style.display  = "none";
        if (elSelectEmpresa) { elSelectEmpresa.style.display = "block"; elSelectEmpresa.disabled = false; }
        if (elBtnCrear)      elBtnCrear.classList.remove("oculto");
    }
}

// ================================
// MODO GUARDAR
// ================================

// Valida y envía los datos del formulario según el tipo de usuario
async function modoGuardar() {
    const elInputFoto = obtenerElemento("foto_perfil_input");
    if (elInputFoto?.files.length > 0) {
        const fotoOk = await subirFoto(elInputFoto.files[0]);
        if (!fotoOk) return;
    }

    if (tipoUsuario === "1" || tipoUsuario === "3") {
        // Guardar datos del administrador
        if (!validarAdministrador()) return;

        const correo   = obtenerElemento("correo_administrador")?.value.trim();
        const telefono = obtenerElemento("telefono_administrador")?.value.trim();

        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|mx|edu)$/.test(correo)) {
            return lanzarToast("Correo inválido", "error");
        }
        if (!/^\d{3}-\d{4}-\d{3}$/.test(telefono)) {
            return lanzarToast("Formato de teléfono: 246-5444-885", "error");
        }

        enviarDatos({ telefono_administrador: telefono, correo_administrador: correo });

    } else {
        // Guardar datos del alumno
        if (!validarAlumno()) return;

        const horaEntrada    = obtenerElemento("horario_entrada")?.value || "";
        const horaSalida     = obtenerElemento("horario_salida")?.value  || "";
        const fechaInicio    = obtenerElemento("fecha_inicio")?.value    || "";
        const fechaFin       = obtenerElemento("fecha_fin")?.value       || "";
        const grupoInput     = (obtenerElemento("grupo_alumno")?.value   || "").trim().toUpperCase();
        const elSelectEmpresa = obtenerElemento("id_empresa");

        if (grupoInput && !/^[1-9][A-Z]$/.test(grupoInput)) {
            return lanzarToast("El semestre y grupo debe tener el formato: número (1-9) seguido de una letra. Ejemplo: 1A, 2B", "error");
        }
        if ((horaEntrada || horaSalida) && (!horaEntrada || !horaSalida)) {
            return lanzarToast("Debes completar ambos horarios", "error");
        }
        if (horaEntrada && horaSalida && horaSalida <= horaEntrada) {
            return lanzarToast("La salida debe ser posterior a la entrada", "error");
        }
        if (fechaInicio && fechaFin && fechaFin <= fechaInicio) {
            return lanzarToast("La fecha fin debe ser posterior a la fecha inicio", "error");
        }

        const datos = {};
        if (grupoInput)                                    datos.grupo        = grupoInput;
        if (horaEntrada && horaSalida)                     datos.horario      = `${horaEntrada} - ${horaSalida}`;
        if (obtenerElemento("area")?.value.trim())         datos.area         = obtenerElemento("area").value.trim();
        if (obtenerElemento("programa")?.value.trim())     datos.programa     = obtenerElemento("programa").value.trim();
        if (obtenerElemento("estado")?.value)              datos.estado       = obtenerElemento("estado").value;
        if (fechaInicio)                                   datos.fecha_inicio = fechaInicio;
        if (fechaFin)                                      datos.fecha_fin    = fechaFin;
        if (elSelectEmpresa?.value)                        datos.id_empresa   = elSelectEmpresa.value;

        enviarDatos(datos);
    }
}

// ================================
// ENVIAR DATOS
// ================================

// Envía los datos al servidor y muestra el resultado al usuario
function enviarDatos(datos) {
    fetch("guardar_datos.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
    })
        .then(async function (respuesta) {
            const texto = await respuesta.text();
            try { return JSON.parse(texto); }
            catch { throw new Error("Respuesta no válida del servidor"); }
        })
        .then(function (resultado) {
            if (resultado.success) {
                lanzarToast("Datos guardados correctamente", "exito");
                setTimeout(function () { location.reload(); }, 1500);
            } else {
                let mensaje = resultado.error || "Error al guardar los datos";
                if (mensaje.includes("Grupo") || mensaje.includes("grupo")) {
                    mensaje = "Por favor, completa el campo 'Semestre y Grupo'";
                } else if (mensaje.includes("Empresa") || mensaje.includes("empresa")) {
                    mensaje = "Por favor, selecciona una empresa";
                } else if (mensaje.includes("constraint") || mensaje.includes("Integrity")) {
                    mensaje = "Hay datos requeridos incompletos. Verifica todos los campos.";
                }
                lanzarToast(mensaje, "error");
            }
        })
        .catch(function () {
            lanzarToast("Error de conexión con el servidor. Por favor, intenta de nuevo.", "error");
        });
}

// ================================
// INICIALIZACIÓN — funciones llamadas desde DOMContentLoaded
// ================================

// Deshabilita todos los campos editables al cargar la página
function inicializarCamposDeshabilitados() {
    ["grupo_alumno", "horario_entrada", "horario_salida",
     "area", "programa", "estado", "fecha_inicio", "fecha_fin", "id_empresa",
     "telefono_administrador", "correo_administrador", "foto_perfil_input"]
        .forEach(function (id) {
            const el = obtenerElemento(id);
            if (el) el.disabled = true;
        });
}

// Bloquea los botones si el estado ya es COMPLETADO al cargar la página
function inicializarBloqueoCompletado(btnEditar, btnGuardar, btnCancelar) {
    if (estaCompletado()) {
        btnEditar.style.display   = "none";
        btnEditar.disabled        = true;
        btnGuardar.style.display  = "none";
        btnGuardar.disabled       = true;
        btnCancelar.style.display = "none";
        btnCancelar.disabled      = true;
    }
}

// Registra los botones principales y el botón de cambiar foto
function inicializarBotones(btnEditar, btnGuardar, btnCancelar) {
    btnEditar?.addEventListener("click",  function () { intentarEditar(btnEditar, btnGuardar, btnCancelar); });
    btnGuardar?.addEventListener("click", function () { modoGuardar(); });
    btnCancelar?.addEventListener("click", function () { location.reload(); });

    // Abre el selector de archivo al hacer clic en "Cambiar foto"
    obtenerElemento("btn_cambiar_foto")?.addEventListener("click", function () {
        obtenerElemento("foto_perfil_input")?.click();
    });
}

// Registra los eventos del modal de empresa
function inicializarModalEmpresa() {
    obtenerElemento("btn_crear_empresa")    ?.addEventListener("click", abrirModal);
    obtenerElemento("cerrar_modal_empresa") ?.addEventListener("click", cerrarModal);
    obtenerElemento("guardar_nueva_empresa")?.addEventListener("click", guardarNuevaEmpresa);
    obtenerElemento("modal_nueva_empresa")  ?.addEventListener("click", function (e) {
        if (e.target === obtenerElemento("modal_nueva_empresa")) cerrarModal();
    });
}

// Formatea el teléfono automáticamente mientras el usuario escribe
function inicializarFormatoTelefono() {
    obtenerElemento("telefono_administrador")?.addEventListener("input", function (e) {
        let val = e.target.value.replace(/\D/g, "");
        if (val.length > 3)  val = val.slice(0, 3) + "-" + val.slice(3);
        if (val.length > 8)  val = val.slice(0, 8) + "-" + val.slice(8);
        if (val.length > 12) val = val.slice(0, 12);
        e.target.value = val;
    });
}

// Fuerza mayúsculas en el campo de grupo mientras el usuario escribe
function inicializarFormatoGrupo() {
    obtenerElemento("grupo_alumno")?.addEventListener("input", function (e) {
        e.target.value = e.target.value.toUpperCase();
    });
}

// ================================
// DOMContentLoaded — punto de entrada
// ================================

document.addEventListener("DOMContentLoaded", function () {
    const esAdmin = tipoUsuario === "1" || tipoUsuario === "3";

    inicializarCamposDeshabilitados();

    // La foto del sidebar es compartida para todos los tipos de usuario
    iniciarPreviewFoto();
    obtenerElemento("btn_cambiar_foto")?.addEventListener("click", function () {
        obtenerElemento("foto_perfil_input")?.click();
    });

    if (esAdmin) {
        // Solo el admin usa sus propios botones con IDs específicos
        const btnEditar   = obtenerElemento("btn_editar_admin");
        const btnGuardar  = obtenerElemento("btn_guardar_admin");
        const btnCancelar = obtenerElemento("btn_cancelar_admin");

        if (btnGuardar)  btnGuardar.style.display  = "none";
        if (btnCancelar) btnCancelar.style.display = "none";

        inicializarBloqueoCompletado(btnEditar, btnGuardar, btnCancelar);
        inicializarBotones(btnEditar, btnGuardar, btnCancelar);
        inicializarFormatoTelefono();
    }

    // El alumno tiene sus propios botones manejados en editar_guardar_act_alum.js
    // Solo se registran los formatos de campos que existen en el HTML para ambos
    inicializarFormatoGrupo();
    inicializarModalEmpresa();
});