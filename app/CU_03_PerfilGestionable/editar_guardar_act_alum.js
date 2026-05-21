import { lanzarToast } from '../js/lanzar_toast.js';

// =========================
// UTILIDADES
// =========================
const getVal = (id) => document.getElementById(id)?.value ?? "";
const getEl  = (id) => document.getElementById(id);

const setDis = (ids, val) =>
    ids.forEach(id => {
        const el = getEl(id);
        if (el) el.disabled = val;
    });

const setVis = (id, vis) =>
    getEl(id)?.classList.toggle("oculto", !vis);

// =========================
// CONSTANTES / CONFIGURACIÓN
// =========================
const COMUNES = ["estado", "area", "programa", "fecha_inicio", "fecha_fin", "grupo_alumno", "horario_entrada", "horario_salida"];
const PENDIENTE = [...COMUNES, "id_empresa"];
const POR_ESTADO = { EN_CURSO: COMUNES, COMPLETADO: [] };

const CAMPOS_COMPLETADO = [
    { id: "area",             label: "Área" },
    { id: "programa",         label: "Programa" },
    { id: "fecha_inicio",     label: "Fecha de inicio" },
    { id: "fecha_fin",        label: "Fecha de fin" },
    { id: "grupo_alumno",     label: "Semestre y Grupo" },
    { id: "horario_entrada",  label: "Horario de entrada" },
    { id: "horario_salida",   label: "Horario de salida" },
    { id: "empresa_texto",    label: "Empresa" }
];

const regexEmpresa = {
    nombre:       /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\.,\-]{2,100}$/,
    razon_social: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\.,\-&]{2,150}$/,
    rfc:          /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/,
    direccion:    /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\.,\-#]{5,200}$/,
    sitio_web:    /^https?:\/\/(www\.)?[a-zA-Z0-9\-]+(\.[a-zA-Z]{2,})+([\/\w\-._~:?#[\]@!$&'()*+,;=]*)?$/
};

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
    ["nueva_empresa_nombre", "nueva_empresa_descripcion", "nueva_empresa_razon_social",
        "nueva_empresa_rfc", "nueva_empresa_direccion", "nueva_empresa_web"]
        .forEach(id => { getEl(id).value = ""; });
}

// =========================
// CREAR EMPRESA
// =========================
function guardarNuevaEmpresa() {
    const nombre       = getVal("nueva_empresa_nombre").trim();
    const descripcion  = getVal("nueva_empresa_descripcion").trim();
    const razon_social = getVal("nueva_empresa_razon_social").trim();
    const rfc          = getVal("nueva_empresa_rfc").trim().toUpperCase();
    const direccion    = getVal("nueva_empresa_direccion").trim();
    const sitio_web    = getVal("nueva_empresa_web").trim();

    if (!nombre)                                                               return lanzarToast("El nombre es obligatorio", "error");
    if (!regexEmpresa.nombre.test(nombre))                                     return lanzarToast("Nombre inválido", "error");
    if (!descripcion)                                                           return lanzarToast("La descripción es obligatoria", "error");
    if (razon_social && !regexEmpresa.razon_social.test(razon_social))         return lanzarToast("Razón social inválida", "error");
    if (rfc          && !regexEmpresa.rfc.test(rfc))                           return lanzarToast("RFC inválido", "error");
    if (direccion    && !regexEmpresa.direccion.test(direccion))               return lanzarToast("Dirección inválida", "error");
    if (sitio_web    && !regexEmpresa.sitio_web.test(sitio_web))               return lanzarToast("Sitio web inválido", "error");

    fetch("crear_empresa.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, descripcion, razon_social, rfc, direccion, sitio_web })
    })
        .then(r => r.json())
        .then(r => {
            if (!r.success) return lanzarToast("Error al crear empresa", "error");
            getEl("id_empresa").appendChild(new Option(nombre, r.id_empresa, true, true));
            getEl("empresa_texto").value = nombre;
            getEl("empresa_texto").dataset.idEmpresa = r.id_empresa;
            lanzarToast("Empresa creada correctamente", "exito");
            cerrarModal();
        })
        .catch(e => console.error(e));
}

// =========================
// CARGAR EMPRESAS
// =========================
async function cargarEmpresas() {
    try {
        const data = await fetch("obtener_empresas.php").then(r => r.json());
        if (data.error) return lanzarToast("Error al cargar empresas", "error");

        const sel = getEl("id_empresa");
        sel.innerHTML = '<option value="">-- Selecciona una empresa --</option>';
        data.forEach(e => sel.appendChild(new Option(e.Nombre, e.Id_empresa)));

        const idActual = getEl("empresa_texto").dataset.idEmpresa;
        if (idActual) sel.value = idActual;
    } catch (e) {
        lanzarToast("Error de conexión al cargar empresas", "error");
    }
}

// =========================
// VALIDAR COMPLETADO
// =========================
function validarCompletado() {
    const camposVacios = CAMPOS_COMPLETADO.filter(campo => !getVal(campo.id).trim());
    if (camposVacios.length > 0) {
        lanzarToast(`Faltan campos obligatorios: ${camposVacios.map(c => c.label).join(", ")}`, "error");
        return false;
    }
    return true;
}

// =========================
// CAMBIO DE ESTADO
// =========================
function manejarCambioEstado(e, obtenerEstadoAnterior, guardarEstadoAnterior) {
    const nuevoEstado = e.target.value;
    if (nuevoEstado === "COMPLETADO") {
        if (!validarCompletado()) {
            e.target.value = obtenerEstadoAnterior();
            lanzarToast("Debes llenar todos los campos vacíos antes de marcar su Estado como COMPLETADO.", "error");
            return;
        }
        lanzarToast("Todos los campos están completos.", "exito");
    }
    guardarEstadoAnterior(nuevoEstado);
}

// =========================
// HABILITAR ACTIVIDADES
// =========================
window.habilitarActividades = async (habilitar) => {
    const estado = getEl("estado").value || "";

    if (estado === "COMPLETADO") {
        setDis(PENDIENTE, true);
        setVis("id_empresa",      false);
        setVis("btnCrearEmpresa", false);
        setVis("empresa_texto",   true);
        if (habilitar) lanzarToast("Este registro está completado y no puede editarse.", "error");
        return;
    }

    setDis(PENDIENTE, true);
    if (habilitar) setDis(POR_ESTADO[estado] ?? [], false);

    setVis("id_empresa",      habilitar);
    setVis("btnCrearEmpresa", habilitar && estado === "PENDIENTE");
    setVis("empresa_texto",   !habilitar);

    if (habilitar && estado === "EN_CURSO") setDis(["id_empresa", "btnCrearEmpresa"], true);
    if (habilitar) await cargarEmpresas();
};

// =========================
// GUARDAR ACTIVIDADES
// =========================
window.guardarActividades = () => {
    const estado = getVal("estado");
    if (estado === "COMPLETADO" && !validarCompletado()) return;

    const datos = {
        estado,
        area:             getVal("area"),
        programa:         getVal("programa"),
        fecha_inicio:     getVal("fecha_inicio"),
        fecha_fin:        getVal("fecha_fin"),
        grupo:            getVal("grupo_alumno"),
        horario_entrada:  getVal("horario_entrada"),
        horario_salida:   getVal("horario_salida")
    };

    if (estado === "PENDIENTE") {
        const idEmpresa = getVal("id_empresa");
        if (!idEmpresa) return lanzarToast("Debes seleccionar una empresa.", "error");
        datos.id_empresa = idEmpresa;

        const sel = getEl("id_empresa");
        const txt = getEl("empresa_texto");
        txt.value = sel.options[sel.selectedIndex]?.text || "";
        txt.dataset.idEmpresa = sel.value;
    }

    fetch("guardar_datos.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
    })
        .then(r => r.json())
        .then(r => lanzarToast(r.success ? "Actividades guardadas" : "Error al guardar", r.success ? "exito" : "error"))
        .catch(e => console.error(e));
};

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

        cargarEmpresas();
    }
}

// =========================
// GUARDAR
// =========================
function modoGuardar() {
    const data = new FormData();

    const inputFoto = getEl("foto_perfil_input");
    if (inputFoto?.files.length > 0) data.append("foto_perfil", inputFoto.files[0]);

    if (tipoUsuario === "1" || tipoUsuario === "3") {
        const correo   = getEl("correo_administrador")?.value.trim();
        const telefono = getEl("telefono_administrador")?.value.trim();

        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(correo))
            return lanzarToast("Correo inválido", "error");
        if (!/^\d{3}-\d{3}-\d{2}-\d{2}$/.test(telefono))
            return lanzarToast("Formato: 246-470-78-88", "error");

        data.append("correo",   correo);
        data.append("telefono", telefono);

    } else {
        const fechaInicio = getEl("fecha_inicio")?.value;
        const fechaFin    = getEl("fecha_fin")?.value;

        if (fechaInicio && fechaFin && fechaFin <= fechaInicio)
            return lanzarToast("La fecha fin debe ser posterior a la fecha inicio", "error");

        data.append("grupo",        getEl("grupo_alumno")?.value);
        data.append("horario",      `${getEl("horario_entrada")?.value}-${getEl("horario_salida")?.value}`);
        data.append("area",         getEl("area")?.value);
        data.append("programa",     getEl("programa")?.value);
        data.append("estado",       getEl("estado")?.value);
        data.append("fecha_inicio", fechaInicio);
        data.append("fecha_fin",    fechaFin);

        const selectEmpresa = getEl("id_empresa");
        if (selectEmpresa?.value === "nueva") {
            data.append("nueva_empresa", getEl("nueva_empresa")?.value || "");
        } else {
            data.append("id_empresa", selectEmpresa?.value || "");
        }
    }

    fetch("guardar_datos.php", { method: "POST", body: data })
        .then(async r => {
            const texto = await r.text();
            try { return JSON.parse(texto); }
            catch { throw new Error("La respuesta no es JSON válido"); }
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

// =========================
// BLOQUEO POR ESTADO COMPLETADO
// =========================

function estaCompletado() {
    return getVal("estado") === "COMPLETADO";
}

function bloquearSiCompletado() {
    if (!estaCompletado()) return false;

    // Deshabilitar todos los campos
    setDis(PENDIENTE, true);
    setVis("id_empresa",      false);
    setVis("btnCrearEmpresa", false);
    setVis("empresa_texto",   true);

    // Ocultar y deshabilitar los tres botones de acción
    const btnEditar   = document.querySelector(".btn.editar");
    const btnGuardar  = document.querySelector(".btn.guardar");
    const btnCancelar = document.querySelector(".btn.cancelar");

    if (btnEditar)   { btnEditar.style.display   = "none"; btnEditar.disabled   = true; }
    if (btnGuardar)  { btnGuardar.style.display  = "none"; btnGuardar.disabled  = true; }
    if (btnCancelar) { btnCancelar.style.display = "none"; btnCancelar.disabled = true; }

    return true;
}

function intentarEditar(btnEditar, btnGuardar, btnCancelar) {
    if (estaCompletado()) {
        lanzarToast("Este registro está completado y no puede editarse.", "error");
        return;
    }
    modoEditar(btnEditar, btnGuardar, btnCancelar);
}

// =========================
// DOMContentLoaded — solo inicialización
// =========================
document.addEventListener("DOMContentLoaded", () => {

    let estadoAnterior = getVal("estado");

    const btnEditar   = document.querySelector(".btn.editar");
    const btnGuardar  = document.querySelector(".btn.guardar");
    const btnCancelar = document.querySelector(".btn.cancelar");

    btnGuardar.style.display  = "none";
    btnCancelar.style.display = "none";

    // Bloquear UI si ya está COMPLETADO al cargar
    if (!bloquearSiCompletado()) {
        setVis("id_empresa",      false);
        setVis("btnCrearEmpresa", false);
    }

    // Eventos de botones
    btnEditar?.addEventListener("click",  () => intentarEditar(btnEditar, btnGuardar, btnCancelar));
    btnGuardar?.addEventListener("click", () => modoGuardar());
    btnCancelar?.addEventListener("click", () => location.reload());

    // Modal
    getEl("btnCrearEmpresa").addEventListener("click", abrirModal);
    getEl("cerrarModalEmpresa").addEventListener("click", cerrarModal);
    getEl("modalNuevaEmpresa").addEventListener("click", e => {
        if (e.target === getEl("modalNuevaEmpresa")) cerrarModal();
    });

    // Crear empresa
    getEl("guardarNuevaEmpresa").addEventListener("click", guardarNuevaEmpresa);

    // Cambio de estado
    getEl("estado").addEventListener("focus",  () => { estadoAnterior = getVal("estado"); });
    getEl("estado").addEventListener("change", e =>
        manejarCambioEstado(e, () => estadoAnterior, v => { estadoAnterior = v; })
    );

    // Validar fechas
    getEl("fecha_inicio").addEventListener("change", e => {
        getEl("fecha_fin").min = e.target.value;
    });
});