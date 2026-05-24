import { lanzarToast } from '../js/lanzar_toast.js';

// =========================
// UTILIDADES
// =========================
const getEl = (id) => document.getElementById(id);

const tipoUsuario = document.cookie.split("; ")
    .find(r => r.startsWith("Id_tipo_usuario="))
    ?.split("=")[1].trim();

// =========================
// VALIDACIÓN DE ADMINISTRADOR
// =========================
function validarAdministrador() {
    const campos = [
        { id: "correo_administrador",   label: "Correo" },
        { id: "telefono_administrador", label: "Teléfono" }
    ];

    const faltantes = campos.filter(c => {
        const el = getEl(c.id);
        return el && !el.value.trim();
    });

    if (faltantes.length > 0) {
        getEl(faltantes[0].id)?.focus();
        lanzarToast(`Campos incompletos: ${faltantes.map(c => c.label).join(", ")}`, "error");
        return false;
    }

    return true;
}

// =========================
// VALIDACIÓN DE ALUMNO
// Solo exige campos completos si el estado es COMPLETADO
// =========================
function validarAlumno() {
    const estado = getEl("estado")?.value || "";

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

    const faltantes = campos.filter(c => {
        const el = getEl(c.id);
        return el && !el.value.trim();
    });

    if (faltantes.length > 0) {
        getEl(faltantes[0].id)?.focus();
        lanzarToast(`Campos incompletos: ${faltantes.map(c => c.label).join(", ")}`, "error");
        return false;
    }

    return true;
}

// =========================
// MODAL
// =========================
function abrirModal() {
    getEl("modalNuevaEmpresa").style.display = "flex";
}

function cerrarModal() {
    getEl("modalNuevaEmpresa").style.display = "none";
    limpiarModal();
}

function limpiarModal() {
    [
        "nueva_empresa_nombre",
        "nueva_empresa_descripcion",
        "nueva_empresa_razon_social",
        "nueva_empresa_rfc",
        "nueva_empresa_direccion",
        "nueva_empresa_web"
    ].forEach(id => { getEl(id).value = ""; });
}

// =========================
// CREAR EMPRESA
// =========================
function guardarNuevaEmpresa() {

    const nombre      = getEl("nueva_empresa_nombre").value.trim();
    const descripcion = getEl("nueva_empresa_descripcion").value.trim();
    const razonSocial = getEl("nueva_empresa_razon_social").value.trim();
    const rfc         = getEl("nueva_empresa_rfc").value.trim().toUpperCase();
    const direccion   = getEl("nueva_empresa_direccion").value.trim();
    const sitioWeb    = getEl("nueva_empresa_web").value.trim();

    const regexNombre    = /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s.,&()-]{3,100}$/;
    const regexRazon     = /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s.,&()-]{3,150}$/;
    const regexRFC       = /^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$/;
    const regexDireccion = /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s#.,-]{5,200}$/;
    const regexWeb       = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/;

    if (!nombre)                                      return lanzarToast("El nombre de la empresa es obligatorio", "error");
    if (!regexNombre.test(nombre))                    return lanzarToast("Nombre de empresa inválido", "error");
    if (razonSocial && !regexRazon.test(razonSocial)) return lanzarToast("Razón social inválida", "error");
    if (rfc         && !regexRFC.test(rfc))           return lanzarToast("RFC inválido. Ejemplo: ABC123456XYZ", "error");
    if (direccion   && !regexDireccion.test(direccion)) return lanzarToast("Dirección inválida", "error");
    if (sitioWeb    && !regexWeb.test(sitioWeb))      return lanzarToast("Sitio web inválido", "error");

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
        .then(r => r.json())
        .then(result => {
            if (!result.success) return lanzarToast("Error al crear la empresa", "error");

            const select = getEl("id_empresa");
            const option = document.createElement("option");
            option.value = result.id_empresa;
            option.textContent = nombre;
            option.selected = true;
            select.appendChild(option);

            getEl("empresa_texto").value = nombre;
            lanzarToast("Empresa creada correctamente", "exito");
            cerrarModal();
        })
        .catch(() => lanzarToast("Error al conectar con el servidor", "error"));
}

// =========================
// FOTO DE PERFIL — PREVIEW
// =========================
function iniciarPreviewFoto() {
    const input   = getEl("foto_perfil_input");
    const preview = getEl("foto_perfil_preview");
    if (!input || !preview) return;

    input.addEventListener("change", (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;

        const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];
        if (!tiposPermitidos.includes(archivo.type)) {
            lanzarToast("Solo se permiten imágenes JPG, PNG o WEBP", "error");
            input.value = "";
            return;
        }

        if (archivo.size > 2 * 1024 * 1024) {
            lanzarToast("La imagen no debe superar los 2MB", "error");
            input.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => { preview.src = ev.target.result; };
        reader.readAsDataURL(archivo);
    });
}

// =========================
// BLOQUEO POR ESTADO COMPLETADO
// =========================
function estaCompletado() {
    return getEl("estado")?.value?.toUpperCase() === "COMPLETADO";
}

function intentarEditar(btnEditar, btnGuardar, btnCancelar) {
    if (estaCompletado()) {
        lanzarToast("Este registro está completado y no puede editarse.", "error");
        return;
    }
    modoEditar(btnEditar, btnGuardar, btnCancelar);
}

// =========================
// EDITAR
// =========================
function modoEditar(btnEditar, btnGuardar, btnCancelar) {
    btnEditar.style.display   = "none";
    btnGuardar.style.display  = "inline-block";
    btnCancelar.style.display = "inline-block";

    const inputFoto = getEl("foto_perfil_input");
    if (inputFoto) inputFoto.disabled = false;

    const btnFoto = getEl("btn_cambiar_foto");
    if (btnFoto) btnFoto.classList.remove("oculto");

    if (tipoUsuario === "1" || tipoUsuario === "3") {
        ["telefono_administrador", "correo_administrador"].forEach(id => {
            const el = getEl(id);
            if (el) { el.disabled = false; el.readOnly = false; }
        });
    } else {
        ["grupo_alumno", "horario_entrada", "horario_salida",
            "area", "programa", "estado", "fecha_inicio", "fecha_fin"]
            .forEach(id => {
                const el = getEl(id);
                if (el) { el.disabled = false; el.readOnly = false; }
            });

        const empresaTexto  = getEl("empresa_texto");
        const selectEmpresa = getEl("id_empresa");
        const btnCrear      = getEl("btnCrearEmpresa");

        if (empresaTexto)  empresaTexto.style.display  = "none";
        if (selectEmpresa) {
            selectEmpresa.style.display = "block";
            selectEmpresa.disabled = false;
        }
        if (btnCrear) btnCrear.classList.remove("oculto");
    }
}

// =========================
// GUARDAR
// =========================
async function modoGuardar() {

    const inputFoto = getEl("foto_perfil_input");
    if (inputFoto?.files.length > 0) {
        const fotoOk = await subirFoto(inputFoto.files[0]);
        if (!fotoOk) return;
    }

    if (tipoUsuario === "1" || tipoUsuario === "3") {

        if (!validarAdministrador()) return;

        const correo   = getEl("correo_administrador")?.value.trim();
        const telefono = getEl("telefono_administrador")?.value.trim();

        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|mx|edu)$/.test(correo))
            return lanzarToast("Correo inválido", "error");
        if (!/^\d{3}-\d{4}-\d{3}$/.test(telefono))
            return lanzarToast("Formato de teléfono: 246-5444-885", "error");

        enviar({ telefono_administrador: telefono, correo_administrador: correo });

    } else {

        if (!validarAlumno()) return;

        const horarioEntrada = getEl("horario_entrada")?.value;
        const horarioSalida  = getEl("horario_salida")?.value;
        const fechaInicio    = getEl("fecha_inicio")?.value;
        const fechaFin       = getEl("fecha_fin")?.value;
        const grupoInput     = getEl("grupo_alumno")?.value.trim().toUpperCase();
        const selectEmpresa  = getEl("id_empresa");

        // Validar formato del grupo SOLO si tiene valor
        const regexGrupo = /^[1-9][A-Z]$/;
        if (grupoInput && !regexGrupo.test(grupoInput)) {
            return lanzarToast("El semestre y grupo debe tener el formato: número (1-9) seguido de una letra. Ejemplo: 1A, 2B, 3C", "error");
        }

        // Validar horario solo si se llenó alguno de los dos
        if (horarioEntrada || horarioSalida) {
            if (!horarioEntrada || !horarioSalida)
                return lanzarToast("Debes completar ambos horarios", "error");
            if (horarioSalida <= horarioEntrada)
                return lanzarToast("La salida debe ser posterior a la entrada", "error");
        }

        // Validar fechas solo si se llenaron
        if (fechaInicio && fechaFin && fechaFin <= fechaInicio) {
            return lanzarToast("La fecha fin debe ser posterior a la fecha inicio", "error");
        }

        const datos = {};

        if (grupoInput) datos.grupo = grupoInput;

        if (horarioEntrada && horarioSalida) {
            datos.horario = `${horarioEntrada} - ${horarioSalida}`;
        }

        if (getEl("area")?.value.trim())     datos.area        = getEl("area").value.trim();
        if (getEl("programa")?.value.trim()) datos.programa     = getEl("programa").value.trim();
        if (getEl("estado")?.value)          datos.estado       = getEl("estado").value;
        if (fechaInicio)                     datos.fecha_inicio = fechaInicio;
        if (fechaFin)                        datos.fecha_fin    = fechaFin;
        if (selectEmpresa?.value)            datos.id_empresa   = selectEmpresa.value;

        enviar(datos);
    }
}

// =========================
// ENVIAR DATOS
// =========================
function enviar(datos) {
    fetch("guardar_datos.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
    })
        .then(async r => {
            const texto = await r.text();
            try { return JSON.parse(texto); }
            catch { throw new Error("Respuesta no válida del servidor"); }
        })
        .then(resp => {
            if (resp.success) {
                lanzarToast("Datos guardados correctamente", "exito");
                setTimeout(() => location.reload(), 1500);
            } else {
                let mensajeUsuario = "Error al guardar los datos";
                if (resp.error) {
                    if (resp.error.includes("Grupo") || resp.error.includes("grupo")) {
                        mensajeUsuario = "Por favor, completa el campo 'Semestre y Grupo'";
                    } else if (resp.error.includes("Empresa") || resp.error.includes("empresa")) {
                        mensajeUsuario = "Por favor, selecciona una empresa";
                    } else if (resp.error.includes("constraint") || resp.error.includes("Integrity")) {
                        mensajeUsuario = "Hay datos requeridos incompletos. Verifica todos los campos.";
                    } else {
                        mensajeUsuario = resp.error;
                    }
                }
                lanzarToast(mensajeUsuario, "error");
            }
        })
        .catch(() => lanzarToast("Error de conexión con el servidor. Por favor, intenta de nuevo.", "error"));
}

// =========================
// SUBIR FOTO
// =========================
async function subirFoto(archivo) {
    try {
        const fd = new FormData();
        fd.append("foto_perfil", archivo);
        const r    = await fetch("guardar_foto.php", { method: "POST", body: fd });
        const texto = await r.text(); // ← Leer como texto primero
        let resp;
        try {
            resp = JSON.parse(texto);
        } catch {
            // El PHP respondió algo que no es JSON, pero puede que la foto sí se subió
            lanzarToast("Advertencia: respuesta inesperada del servidor", "error");
            return false;
        }
        if (!resp.success) {
            lanzarToast(resp.error || "Error al subir la foto", "error");
            return false;
        }
        const preview = document.getElementById("foto_perfil_preview");
        if (preview && resp.url) preview.src = resp.url;
        return true;
    } catch {
        lanzarToast("Error al subir la foto", "error");
        return false;
    }
}

// =========================
// DOMCONTENTLOADED
// =========================
document.addEventListener("DOMContentLoaded", () => {

    const btnEditar   = document.querySelector(".btn.editar");
    const btnGuardar  = document.querySelector(".btn.guardar");
    const btnCancelar = document.querySelector(".btn.cancelar");

    btnGuardar.style.display  = "none";
    btnCancelar.style.display = "none";

    // Deshabilitar todos los campos al cargar
    [
        "grupo_alumno", "horario_entrada", "horario_salida", "id_empresa",
        "area", "programa", "estado", "fecha_inicio", "fecha_fin",
        "telefono_administrador", "correo_administrador", "foto_perfil_input"
    ].forEach(id => {
        const el = getEl(id);
        if (el) el.disabled = true;
    });

    // Bloquear botones si ya está COMPLETADO al cargar
    if (estaCompletado()) {
        btnEditar.style.display   = "none";
        btnEditar.disabled        = true;
        btnGuardar.style.display  = "none";
        btnGuardar.disabled       = true;
        btnCancelar.style.display = "none";
        btnCancelar.disabled      = true;
    }

    iniciarPreviewFoto();

    getEl("btn_cambiar_foto")?.addEventListener("click", () => {
        getEl("foto_perfil_input")?.click();
    });

    btnEditar?.addEventListener("click",   () => intentarEditar(btnEditar, btnGuardar, btnCancelar));
    btnGuardar?.addEventListener("click",  () => modoGuardar());
    btnCancelar?.addEventListener("click", () => location.reload());

    getEl("btnCrearEmpresa")?.addEventListener("click",     abrirModal);
    getEl("cerrarModalEmpresa")?.addEventListener("click",  cerrarModal);
    getEl("guardarNuevaEmpresa")?.addEventListener("click", guardarNuevaEmpresa);

    getEl("modalNuevaEmpresa")?.addEventListener("click", e => {
        if (e.target === getEl("modalNuevaEmpresa")) cerrarModal();
    });

    // Formatear teléfono automáticamente
    getEl("telefono_administrador")?.addEventListener("input", e => {
        let val = e.target.value.replace(/\D/g, "");
        if (val.length > 3) val = val.slice(0, 3) + "-" + val.slice(3);
        if (val.length > 8) val = val.slice(0, 8) + "-" + val.slice(8);
        if (val.length > 12) val = val.slice(0, 12);
        e.target.value = val;
    });

    // Formatear grupo automáticamente a MAYÚSCULAS
    getEl("grupo_alumno")?.addEventListener("input", e => {
        e.target.value = e.target.value.toUpperCase();
    });
});