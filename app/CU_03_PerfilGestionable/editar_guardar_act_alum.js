// ================================
// Archivo : editar_guardar_act_alum.js
// Autor   : Viridiana Tonix Zarate
// Fecha   : 2026-05-24
// Desc.   : Gestiona la edición y
//           guardado de actividades
//           del alumno (empresa,
//           área, programa, estado, etc).
// ================================

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

const cookieTipoUsuario = document.cookie.split("; ")
    .find(r => r.startsWith("Id_tipo_usuario="))
    ?.split("=")[1].trim();

// =========================
// VALIDACIÓN DE ACTIVIDADES
// Solo exige campos completos si el estado es COMPLETADO
// =========================
function validarActividades() {
    const estado = getVal("estado");

    if (estado !== "COMPLETADO") return true;

    const campos = [
        { id: "estado",          label: "Estado" },
        { id: "area",            label: "Área" },
        { id: "programa",        label: "Programa" },
        { id: "fecha_inicio",    label: "Fecha de inicio" },
        { id: "fecha_fin",       label: "Fecha de fin" },
        { id: "grupo_alumno",    label: "Semestre y Grupo" },
        { id: "horario_entrada", label: "Horario de entrada" },
        { id: "horario_salida",  label: "Horario de salida" },
        { id: "id_empresa",      label: "Empresa" }
    ];

    const faltantes = campos.filter(c => {
        const el = getEl(c.id);
        return el && !getVal(c.id).trim();
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
    getEl("modal_nueva_empresa").style.display = "flex";
}

function cerrarModal() {
    getEl("modal_nueva_empresa").style.display = "none";
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
        lanzarToast(`Campos incompletos: ${camposVacios.map(c => c.label).join(", ")}`, "error");
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
        setVis("id_empresa",        false);
        setVis("btn_crear_empresa", false);
        setVis("empresa_texto",     true);
        if (habilitar) lanzarToast("Este registro está completado y no puede editarse.", "error");
        return;
    }

    setDis(PENDIENTE, true);
    if (habilitar) setDis(POR_ESTADO[estado] ?? [], false);

    setVis("id_empresa",        habilitar);
    setVis("btn_crear_empresa", habilitar && estado === "PENDIENTE");
    setVis("empresa_texto",     !habilitar);

    if (habilitar && estado === "EN_CURSO") setDis(["id_empresa", "btn_crear_empresa"], true);
    if (habilitar) await cargarEmpresas();
};

// =========================
// GUARDAR ACTIVIDADES
// =========================
window.guardarActividades = () => {
    if (!validarActividades()) return;

    const estado = getVal("estado");
    if (estado === "COMPLETADO" && !validarCompletado()) return;

    // Validar y formatear grupo SOLO si tiene valor
    const grupoInput = getVal("grupo_alumno").trim().toUpperCase();
    const regexGrupo = /^[1-9][A-Z]$/;
    if (grupoInput && !regexGrupo.test(grupoInput)) {
        return lanzarToast("El semestre y grupo debe tener el formato: número (1-9) seguido de una letra. Ejemplo: 1A, 2B, 3C", "error");
    }

    const horarioEntrada = getVal("horario_entrada").trim();
    const horarioSalida  = getVal("horario_salida").trim();

    if ((horarioEntrada || horarioSalida) && (!horarioEntrada || !horarioSalida)) {
        return lanzarToast("Debes completar ambos horarios o dejar ambos vacíos", "error");
    }

    let horarioCompleto = "";
    if (horarioEntrada && horarioSalida) {
        if (horarioSalida <= horarioEntrada) {
            return lanzarToast("La hora de salida debe ser posterior a la de entrada", "error");
        }
        horarioCompleto = `${horarioEntrada} - ${horarioSalida}`;
    }

    const datos = {
        estado,
        area:         getVal("area"),
        programa:     getVal("programa"),
        fecha_inicio: getVal("fecha_inicio"),
        fecha_fin:    getVal("fecha_fin"),
        grupo:        grupoInput,
        horario:      horarioCompleto
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
        .then(r => {
            if (r.success) {
                lanzarToast("Actividades guardadas correctamente", "exito");
                setTimeout(() => location.reload(), 1500);
            } else {
                lanzarToast(r.error || "Error al guardar", "error");
            }
        })
        .catch(e => {
            console.error(e);
            lanzarToast("Error de conexión al guardar", "error");
        });
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

    if (cookieTipoUsuario === "1" || cookieTipoUsuario === "3") {
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
// GUARDAR (PERFIL ALUMNO)
// =========================
function modoGuardar() {
    if (!validarActividades()) return;

    // Validar y formatear grupo SOLO si tiene valor
    const grupoInput = getVal("grupo_alumno").trim().toUpperCase();
    const regexGrupo = /^[1-9][A-Z]$/;
    if (grupoInput && !regexGrupo.test(grupoInput)) {
        return lanzarToast("El semestre y grupo debe tener el formato: número (1-9) seguido de una letra. Ejemplo: 1A, 2B, 3C", "error");
    }

    const horarioEntrada = getVal("horario_entrada").trim();
    const horarioSalida  = getVal("horario_salida").trim();

    if ((horarioEntrada || horarioSalida) && (!horarioEntrada || !horarioSalida)) {
        return lanzarToast("Debes completar ambos horarios", "error");
    }

    if (horarioEntrada && horarioSalida && horarioSalida <= horarioEntrada) {
        return lanzarToast("La salida debe ser posterior a la entrada", "error");
    }

    const fechaInicio = getEl("fecha_inicio")?.value;
    const fechaFin    = getEl("fecha_fin")?.value;
    if (fechaInicio && fechaFin && fechaFin <= fechaInicio) {
        return lanzarToast("La fecha fin debe ser posterior a la fecha inicio", "error");
    }

    const datos = {};

    if (grupoInput) datos.grupo = grupoInput;

    if (horarioEntrada && horarioSalida) {
        datos.horario = `${horarioEntrada} - ${horarioSalida}`;
    }

    if (getVal("area").trim())     datos.area        = getVal("area").trim();
    if (getVal("programa").trim()) datos.programa     = getVal("programa").trim();
    if (getVal("estado"))          datos.estado       = getVal("estado");
    if (fechaInicio)               datos.fecha_inicio = fechaInicio;
    if (fechaFin)                  datos.fecha_fin    = fechaFin;

    const selectEmpresa = getEl("id_empresa");
    if (selectEmpresa?.value) datos.id_empresa = selectEmpresa.value;

    fetch("guardar_datos.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
    })
        .then(async r => {
            const texto = await r.text();
            try { return JSON.parse(texto); }
            catch { throw new Error("La respuesta no es JSON válido"); }
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
        .catch(() => lanzarToast("Error de conexión", "error"));
}

// =========================
// BLOQUEO POR ESTADO COMPLETADO
// =========================
function isCompletado() {
    return getVal("estado") === "COMPLETADO";
}

function bloquearSiCompletado() {
    if (!isCompletado()) return false;

    setDis(PENDIENTE, true);
    setVis("id_empresa",      false);
    setVis("modal_nueva_empresa", false);
    setVis("empresa_texto",   true);

    const btnEditar   = document.querySelector(".btn.editar");
    const btnGuardar  = document.querySelector(".btn.guardar");
    const btnCancelar = document.querySelector(".btn.cancelar");

    if (btnEditar)   { btnEditar.style.display   = "none"; btnEditar.disabled   = true; }
    if (btnGuardar)  { btnGuardar.style.display  = "none"; btnGuardar.disabled  = true; }
    if (btnCancelar) { btnCancelar.style.display = "none"; btnCancelar.disabled = true; }

    return true;
}

function intentarEditar(btnEditar, btnGuardar, btnCancelar) {
    if (isCompletado()) {
        lanzarToast("Este registro está completado y no puede editarse.", "error");
        return;
    }
    modoEditar(btnEditar, btnGuardar, btnCancelar);
}

// =========================
// FORMATEO AUTOMÁTICO A MAYÚSCULAS
// =========================
function inicializarFormateoGrupo() {
    const grupoEl = getEl("grupo_alumno");
    if (!grupoEl) return;
    grupoEl.addEventListener("input", (e) => {
        e.target.value = e.target.value.toUpperCase();
    });
}

// =========================
// DOMContentLoaded
// =========================
document.addEventListener("DOMContentLoaded", () => {

    let estadoAnterior = getVal("estado");

    const btnEditar   = document.querySelector(".btn.editar");
    const btnGuardar  = document.querySelector(".btn.guardar");
    const btnCancelar = document.querySelector(".btn.cancelar");

    btnGuardar.style.display  = "none";
    btnCancelar.style.display = "none";

    if (!bloquearSiCompletado()) {
        setVis("id_empresa",        false);
        setVis("btn_crear_empresa", false);
    }

    inicializarFormateoGrupo();

    btnEditar?.addEventListener("click",   () => intentarEditar(btnEditar, btnGuardar, btnCancelar));
    btnGuardar?.addEventListener("click",  () => modoGuardar());
    btnCancelar?.addEventListener("click", () => location.reload());

    const btn_crear_empresa        = getEl("btn_crear_empresa");
    const cerrar_modal_empresa     = getEl("cerrar_modal_empresa");
    const modal_nueva_empresa      = getEl("modal_nueva_empresa");
    const guardar_nueva_empresa    = getEl("guardar_nueva_empresa");

    if (btn_crear_empresa)        btn_crear_empresa.addEventListener("click", abrirModal);
    if (cerrar_modal_empresa)     cerrar_modal_empresa.addEventListener("click", cerrarModal);
    if (modal_nueva_empresa) {
        modal_nueva_empresa.addEventListener("click", e => {
            if (e.target === modal_nueva_empresa) cerrarModal();
        });
    }
    if (guardar_nueva_empresa) guardar_nueva_empresa.addEventListener("click", guardarNuevaEmpresa);

    const estadoEl = getEl("estado");
    if (estadoEl) {
        estadoEl.addEventListener("focus",  () => { estadoAnterior = getVal("estado"); });
        estadoEl.addEventListener("change", e =>
            manejarCambioEstado(e, () => estadoAnterior, v => { estadoAnterior = v; })
        );
    }

    const fechaInicioEl = getEl("fecha_inicio");
    if (fechaInicioEl) {
        fechaInicioEl.addEventListener("change", e => {
            const fechaFinEl = getEl("fecha_fin");
            if (fechaFinEl) fechaFinEl.min = e.target.value;
        });
    }
});