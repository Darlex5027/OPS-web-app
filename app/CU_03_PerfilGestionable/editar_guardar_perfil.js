import { lanzarToast } from '../js/lanzar_toast.js';

// =========================
// UTILIDADES
// =========================
const getEl = (id) => document.getElementById(id);

const tipoUsuario = document.cookie.split("; ")
    .find(r => r.startsWith("Id_tipo_usuario="))
    ?.split("=")[1].trim();

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

    const nombre        = getEl("nueva_empresa_nombre").value.trim();
    const descripcion   = getEl("nueva_empresa_descripcion").value.trim();
    const razonSocial   = getEl("nueva_empresa_razon_social").value.trim();
    const rfc           = getEl("nueva_empresa_rfc").value.trim().toUpperCase();
    const direccion     = getEl("nueva_empresa_direccion").value.trim();
    const sitioWeb      = getEl("nueva_empresa_web").value.trim();

    // =========================
    // EXPRESIONES REGULARES
    // =========================

    // Nombre empresa
    const regexNombre = /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s.,&()-]{3,100}$/;

    // Razón social
    const regexRazon = /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s.,&()-]{3,150}$/;

    // RFC mexicano
    const regexRFC = /^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$/;

    // Dirección
    const regexDireccion = /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s#.,-]{5,200}$/;

    // URL página web
    const regexWeb = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/;

    // =========================
    // VALIDACIONES
    // =========================

    if (!nombre) {

        lanzarToast(
            "El nombre de la empresa es obligatorio",
            "error"
        );

        return;
    }

    if (!regexNombre.test(nombre)) {

        lanzarToast(
            "Nombre de empresa inválido",
            "error"
        );

        return;
    }

    if (razonSocial && !regexRazon.test(razonSocial)) {

        lanzarToast(
            "Razón social inválida",
            "error"
        );

        return;
    }

    if (rfc && !regexRFC.test(rfc)) {

        lanzarToast(
            "RFC inválido. Ejemplo: ABC123456XYZ",
            "error"
        );

        return;
    }

    if (direccion && !regexDireccion.test(direccion)) {

        lanzarToast(
            "Dirección inválida",
            "error"
        );

        return;
    }

    if (sitioWeb && !regexWeb.test(sitioWeb)) {

        lanzarToast(
            "Sitio web inválido",
            "error"
        );

        return;
    }

    // =========================
    // DATOS
    // =========================

    const datos = {

        accion: "crear_empresa",

        nombre,

        descripcion,

        razon_social: razonSocial,

        rfc,

        direccion,

        sitio_web: sitioWeb

    };

    // =========================
    // FETCH
    // =========================

    fetch("crear_empresa.php", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(datos)

    })

    .then(r => r.json())

    .then(result => {

        if (!result.success) {

            lanzarToast(
                "Error al crear la empresa",
                "error"
            );

            return;
        }

        const select = getEl("id_empresa");

        const option = document.createElement("option");

        option.value = result.id_empresa;

        option.textContent = nombre;

        option.selected = true;

        select.appendChild(option);

        getEl("empresa_texto").value = nombre;

        lanzarToast(
            "Empresa creada correctamente",
            "exito"
        );

        cerrarModal();

    })

    .catch(error => {

        console.error("Error:", error);

        lanzarToast(
            "Error al conectar con el servidor",
            "error"
        );

    });
}

// =========================
// BLOQUEO POR ESTADO COMPLETADO
// =========================

// ✅ CORRECCIÓN: .toUpperCase() para que "Completado", "COMPLETADO", etc. funcionen igual
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

    if (tipoUsuario === "1" || tipoUsuario === "3") {
        ["telefono_administrador", "correo_administrador"].forEach(id => {
            const el = getEl(id);
            if (el) { el.disabled = false; el.readOnly = false; }
        });
    } else {
        ["grupo_alumno", "horario_entrada", "horario_salida", "id_empresa",
            "nueva_empresa", "area", "programa", "estado", "fecha_inicio", "fecha_fin"]
            .forEach(id => {
                const el = getEl(id);
                if (el) { el.disabled = false; el.readOnly = false; }
            });

        const empresaTexto  = getEl("empresa_texto");
        const selectEmpresa = getEl("id_empresa");
        if (empresaTexto)  empresaTexto.style.display  = "none";
        if (selectEmpresa) selectEmpresa.style.display = "block";
    }
}

// =========================
// GUARDAR
// =========================
function modoGuardar() {

    if (tipoUsuario === "1" || tipoUsuario === "3") {

        const correo   = getEl("correo_administrador")?.value.trim();
        const telefono = getEl("telefono_administrador")?.value.trim();

        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|mx|edu)$/.test(correo))
            return lanzarToast("Correo inválido", "error");
        if (!/^\d{3}-\d{4}-\d{3}$/.test(telefono))
            return lanzarToast("Formato: 246-5444-885", "error");

        const inputFoto = getEl("foto_perfil_input");
        if (inputFoto?.files.length > 0) subirFoto(inputFoto.files[0]);

        enviar({
            telefono_administrador: telefono,
            correo_administrador:   correo
        });

    } else {

        const horarioEntrada = getEl("horario_entrada")?.value;
        const horarioSalida  = getEl("horario_salida")?.value;
        const fechaInicio    = getEl("fecha_inicio")?.value;
        const fechaFin       = getEl("fecha_fin")?.value;

        if (!horarioEntrada || !horarioSalida)
            return lanzarToast("Los horarios son obligatorios", "error");
        if (horarioSalida <= horarioEntrada)
            return lanzarToast("La salida debe ser posterior a la entrada", "error");
        if (fechaInicio && fechaFin && fechaFin <= fechaInicio)
            return lanzarToast("La fecha fin debe ser posterior a la fecha inicio", "error");

        const inputFoto = getEl("foto_perfil_input");
        if (inputFoto?.files.length > 0) subirFoto(inputFoto.files[0]);

        const selectEmpresa = getEl("id_empresa");

        enviar({
            grupo:         getEl("grupo_alumno")?.value,
            horario:       `${horarioEntrada} - ${horarioSalida}`,
            area:          getEl("area")?.value,
            programa:      getEl("programa")?.value,
            estado:        getEl("estado")?.value,
            fecha_inicio:  fechaInicio,
            fecha_fin:     fechaFin,
            id_empresa:    selectEmpresa?.value !== "nueva" ? selectEmpresa?.value : null,
            nueva_empresa: selectEmpresa?.value === "nueva" ? getEl("nueva_empresa")?.value : null
        });
    }
}

// Envía datos como JSON
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
            lanzarToast(
                resp.success ? "Datos guardados correctamente" : resp.error || "Error al guardar",
                resp.success ? "exito" : "error"
            );
            if (resp.success) setTimeout(() => location.reload(), 1500);
        })
        .catch(() => lanzarToast("Error de conexión", "error"));
}

// Sube la foto por separado con FormData
function subirFoto(archivo) {
    const fd = new FormData();
    fd.append("foto_perfil", archivo);
    fetch("guardar_foto.php", { method: "POST", body: fd })
        .catch(() => lanzarToast("Error al subir la foto", "error"));
}

// =============================================
// DOMCONTENTLOADED — solo inicialización
// =============================================
document.addEventListener("DOMContentLoaded", () => {

    const btnEditar   = document.querySelector(".btn.editar");
    const btnGuardar  = document.querySelector(".btn.guardar");
    const btnCancelar = document.querySelector(".btn.cancelar");

    btnGuardar.style.display  = "none";
    btnCancelar.style.display = "none";

    // Deshabilitar todos los campos al cargar
    [
        "grupo_alumno", "horario_entrada", "horario_salida", "id_empresa",
        "nueva_empresa", "area", "programa", "estado", "fecha_inicio", "fecha_fin",
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

    // Eventos de botones
    btnEditar?.addEventListener("click",  () => intentarEditar(btnEditar, btnGuardar, btnCancelar));
    btnGuardar?.addEventListener("click", () => modoGuardar());
    btnCancelar?.addEventListener("click", () => location.reload());

    getEl("btnCrearEmpresa")?.addEventListener("click", abrirModal);
    getEl("cerrarModalEmpresa")?.addEventListener("click", cerrarModal);
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

});