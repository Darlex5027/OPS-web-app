// ================================
// Archivo : editar_guardar_act_alum.js
// Autor   : Viridiana Tonix Zarate
// Fecha   : 2026-05-24
// Desc.   : Lógica de las actividades
//           del alumno (empresa, área,
//           programa, estado, etc.) y
//           alta de una nueva actividad.
//
// Cambios principales:
//  - Ya NO registra sus propios clics en Editar/Guardar/Cancelar
//    (editar_guardar_perfil.js también lo hacía → cada clic guardaba dos veces).
//    Ahora exporta funciones y el controlador único las usa.
//  - La decisión "¿está completada?" se toma con el estado GUARDADO en BD
//    (llega en el evento datosCargados). Antes se leía el <select> en
//    DOMContentLoaded, cuando todavía estaba vacío, así que nunca bloqueaba.
//  - Actividad COMPLETADA: se bloquea solo la actividad (no el perfil) y
//    aparece el botón "Nueva actividad".
//  - El estado solo puede avanzar (PENDIENTE → EN_CURSO → COMPLETADO).
//  - La empresa solo se elige mientras la actividad está PENDIENTE.
//  - Se eliminó código muerto (window.habilitarActividades,
//    window.guardarActividades, validaciones duplicadas).
// ================================

import { lanzarToast } from '../js/lanzar_toast.js';
import { initCrearEmpresa } from './crear_empresa.js?v=20261105b';
import { confirmarModal, formularioModal } from './modal_dinamico.js?v=20261105b';

// =========================
// UTILIDADES
// =========================
const getEl     = (id) => document.getElementById(id);
const valor     = (id) => (getEl(id)?.value ?? "").trim();
const mostrar   = (id, visible) => getEl(id)?.classList.toggle("oculto", !visible);
const habilitar = (ids, activo) => ids.forEach(id => { const el = getEl(id); if (el) el.disabled = !activo; });

// =========================
// CONFIGURACIÓN
// =========================
const NIVEL_ESTADO     = { PENDIENTE: 1, EN_CURSO: 2, COMPLETADO: 3 };
const CAMPOS_PERFIL    = ["grupo_alumno", "horario_entrada", "horario_salida"];
const CAMPOS_ACTIVIDAD = ["estado", "area", "programa", "fecha_inicio", "fecha_fin"];
const REGEX_EXPEDIENTE = /^[A-Z0-9\/-]{1,15}$/;

// Estado de la actividad tal como está en la BD
const actividad = { existe: false, estado: "" };
let estadoPrevio = "";

const ESTADOS_ABIERTOS = ["PENDIENTE", "EN_CURSO"];

const nivelGuardado          = () => NIVEL_ESTADO[actividad.estado] ?? 1;
export const actividadAbierta = () => actividad.existe && ESTADOS_ABIERTOS.includes(actividad.estado);
const empresaEditable        = () => actividadAbierta() && nivelGuardado() === 1;

function idEmpresaActual() {
    return empresaEditable()
        ? valor("id_empresa")
        : (getEl("empresa_texto")?.dataset.idEmpresa || "");
}

const REQUERIDOS_COMPLETADO = [
    { id: "grupo_alumno",    label: "Semestre y Grupo" },
    { id: "horario_entrada", label: "Horario de entrada" },
    { id: "horario_salida",  label: "Horario de salida" },
    { id: "area",            label: "Área" },
    { id: "programa",        label: "Programa" },
    { id: "fecha_inicio",    label: "Fecha de inicio" },
    { id: "fecha_fin",       label: "Fecha de fin" },
    { id: "id_empresa",      label: "Empresa", obtener: idEmpresaActual }
];

const camposFaltantes = () =>
    REQUERIDOS_COMPLETADO.filter(c => !(c.obtener ? c.obtener() : valor(c.id)));

// =========================
// ESTADO TRAS CARGAR DATOS
// =========================
/**
 * Se llama cuando mostrar_contenido.js terminó de cargar el perfil.
 * @param {object} datos - fila devuelta por obtener_datos.php
 */
export function aplicarEstadoActividad(datos = {}) {
    actividad.existe = Boolean(datos.Tiene_actividad);
    actividad.estado = String(datos.Estado || "").toUpperCase();

    // No permitir regresar a un estado anterior
    // CANCELADO nunca lo elige el alumno; solo se muestra si así viene de BD
    const select = getEl("estado");
    if (select) {
        [...select.options].forEach(op => {
            op.disabled = op.value === "CANCELADO"
                || (actividad.existe && (!op.value || (NIVEL_ESTADO[op.value] ?? 0) < nivelGuardado()));
        });
    }

    const completadas = Number(datos.Actividades_completadas) || 0;
    let aviso = "";
    if (!actividad.existe) {
        aviso = "Aún no tienes una actividad registrada. Crea una para comenzar.";
    } else if (actividad.estado === "CANCELADO") {
        aviso = "Esta actividad fue CANCELADA. Puedes iniciar una nueva actividad.";
    } else if (!actividadAbierta()) {
        aviso = `Esta actividad está COMPLETADA y ya no puede modificarse` +
                (completadas > 1 ? ` (llevas ${completadas} completadas)` : "") +
                `. Ya puedes iniciar una nueva actividad.`;
    }

    const avisoEl = getEl("aviso_actividad");
    if (avisoEl) {
        avisoEl.textContent = aviso;
        avisoEl.classList.toggle("oculto", !aviso);
    }

    mostrar("btn_nueva_actividad", !actividadAbierta());
}

// =========================
// MODO EDICIÓN
// =========================
export async function habilitarEdicionAlumno() {
    // Los datos personales siempre se pueden editar
    habilitar(CAMPOS_PERFIL, true);

    // La actividad solo si está abierta
    if (!actividadAbierta()) return;

    habilitar(CAMPOS_ACTIVIDAD, true);
    estadoPrevio = valor("estado");

    if (empresaEditable()) {
        mostrar("empresa_texto", false);
        mostrar("id_empresa", true);
        mostrar("btn_crear_empresa", true);
        getEl("id_empresa").disabled = false;
        await cargarEmpresas();
    }
}

async function cargarEmpresas() {
    const select = getEl("id_empresa");
    if (!select) return;

    try {
        const r    = await fetch("obtener_empresas.php");
        const data = await r.json();
        if (!r.ok || !data.success || !Array.isArray(data.data)) {
            throw new Error(data.error || `HTTP ${r.status}`);
        }

        select.replaceChildren(new Option("-- Selecciona una empresa --", ""));
        data.data.forEach(e => select.add(new Option(e.Nombre, e.Id_empresa)));

        const idActual = getEl("empresa_texto")?.dataset.idEmpresa;
        if (idActual) select.value = idActual;

    } catch (e) {
        console.error("cargarEmpresas:", e);
        lanzarToast("No se pudieron cargar las empresas", "error");
        select.replaceChildren(new Option("-- Error al cargar empresas --", ""));
    }
}

function manejarCambioEstado(e) {
    if (e.target.value === "COMPLETADO") {
        const faltan = camposFaltantes();
        if (faltan.length) {
            lanzarToast(`Para completar la actividad faltan: ${faltan.map(c => c.label).join(", ")}`, "error");
            e.target.value = estadoPrevio;
            return;
        }
    }
    estadoPrevio = e.target.value;
}

// =========================
// RECOLECTAR Y VALIDAR
// =========================
/**
 * Devuelve (Promise) el objeto a enviar a guardar_datos.php, o null si hay
 * error o si el usuario canceló la confirmación.
 */
export async function recolectarDatosAlumno() {
    const error = (mensaje, idFoco) => {
        lanzarToast(mensaje, "error");
        if (idFoco) getEl(idFoco)?.focus();
        return null;
    };

    const grupo = valor("grupo_alumno").toUpperCase();
    if (grupo && !/^[1-9][A-Z]$/.test(grupo)) {
        return error("El semestre y grupo debe tener el formato: número (1-9) seguido de una letra. Ejemplo: 1A, 2B, 3C", "grupo_alumno");
    }

    const entrada = valor("horario_entrada");
    const salida  = valor("horario_salida");
    if (Boolean(entrada) !== Boolean(salida)) {
        return error("Debes completar ambos horarios o dejar ambos vacíos", entrada ? "horario_salida" : "horario_entrada");
    }
    if (entrada && salida <= entrada) {
        return error("La hora de salida debe ser posterior a la de entrada", "horario_salida");
    }

    const datos = {};
    if (grupo)   datos.grupo   = grupo;
    if (entrada) datos.horario = `${entrada} - ${salida}`;

    // Actividad cerrada o inexistente: solo se mandan los datos personales
    if (!actividadAbierta()) return datos;

    const estado      = valor("estado");
    const fechaInicio = valor("fecha_inicio");
    const fechaFin    = valor("fecha_fin");

    if (fechaInicio && fechaFin && fechaFin <= fechaInicio) {
        return error("La fecha fin debe ser posterior a la fecha inicio", "fecha_fin");
    }

    if (estado === "COMPLETADO" && actividad.estado !== "COMPLETADO") {
        const faltan = camposFaltantes();
        if (faltan.length) {
            return error(`Para completar la actividad faltan: ${faltan.map(c => c.label).join(", ")}`, faltan[0].id);
        }
        const confirmado = await confirmarModal(
            "Al marcar la actividad como COMPLETADA ya no podrás modificarla. ¿Deseas continuar?",
            { titulo: "Completar actividad", textoConfirmar: "Sí, completar" }
        );
        if (!confirmado) return null;
    }

    if (estado)                datos.estado       = estado;
    if (valor("area"))         datos.area         = valor("area");
    if (valor("programa"))     datos.programa     = valor("programa");
    if (fechaInicio)           datos.fecha_inicio = fechaInicio;
    if (fechaFin)              datos.fecha_fin    = fechaFin;
    if (empresaEditable() && valor("id_empresa")) datos.id_empresa = valor("id_empresa");

    return datos;
}

// =========================
// NUEVA ACTIVIDAD (modal dinámico)
// =========================
async function cargarCatalogosActividad() {
    try {
        const r    = await fetch("obtener_servicios.php");
        const data = await r.json();
        if (!r.ok || !data.success) throw new Error(data.error || `HTTP ${r.status}`);
        return data;
    } catch (e) {
        console.error("cargarCatalogosActividad:", e);
        lanzarToast("No se pudieron cargar los servicios", "error");
        return null;
    }
}

/** Se llama al pulsar "Crear actividad". Devuelve un texto si hay error. */
async function guardarNuevaActividad(v) {
    const no_expediente = v.no_expediente.toUpperCase();

    if (!no_expediente)                        return "Escribe el número de expediente";
    if (!REGEX_EXPEDIENTE.test(no_expediente)) return "No. de expediente inválido (máx. 15: letras, números, - o /)";
    if (!v.id_servicio)                        return "Selecciona un servicio";
    if (!v.periodo_tipo)                       return "Selecciona el periodo";
    if (!/^\d{4}$/.test(v.periodo_anio))       return "Año del periodo inválido";

    try {
        const r   = await fetch("crear_actividad.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                no_expediente,
                id_servicio:  v.id_servicio,
                periodo_tipo: v.periodo_tipo,
                periodo_anio: v.periodo_anio
            })
        });
        const res = await r.json().catch(() => ({}));
        if (!res.success) return res.error || "No se pudo crear la actividad";
    } catch (e) {
        console.error("guardarNuevaActividad:", e);
        return "Error de conexión con el servidor";
    }

    lanzarToast("Nueva actividad creada", "exito");
    setTimeout(() => location.reload(), 1200);
    return null;
}

async function abrirModalActividad() {
    if (actividadAbierta()) {
        return lanzarToast("Ya tienes una actividad abierta. Complétala antes de crear otra.", "error");
    }

    const catalogos = await cargarCatalogosActividad();
    if (!catalogos) return;

    await formularioModal({
        titulo: "Nueva actividad",
        mensaje: "Captura los datos para iniciar tu nueva actividad.",
        textoEnviar: "Crear actividad",
        campos: [
            {
                id: "no_expediente", label: "No. Expediente",
                maxLength: 15, placeholder: "Ej. EXP-2026-001", mayusculas: true
            },
            {
                id: "id_servicio", label: "Servicio", tipo: "select",
                opciones: [
                    { valor: "", texto: "-- Selecciona un servicio --" },
                    ...catalogos.servicios.map(s => ({ valor: s.Id_servicio, texto: s.Servicio }))
                ]
            },
            {
                id: "periodo_tipo", label: "Periodo", tipo: "select",
                // El ENUM viene en minúsculas ('primavera', 'otoño'); solo se capitaliza la etiqueta
                opciones: [
                    { valor: "", texto: "-- Selecciona --" },
                    ...catalogos.periodos.map(p => ({ valor: p, texto: p.charAt(0).toUpperCase() + p.slice(1) }))
                ]
            },
            {
                id: "periodo_anio", label: "Año", tipo: "number",
                min: 2000, max: 2155, valor: new Date().getFullYear()
            }
        ],
        onEnviar: guardarNuevaActividad
    });
}

// =========================
// INICIALIZACIÓN
// =========================
let iniciado = false;

export function initActividades() {
    if (iniciado) return;
    iniciado = true;

    getEl("grupo_alumno")?.addEventListener("input", e => {
        e.target.value = e.target.value.toUpperCase();
    });

    getEl("fecha_inicio")?.addEventListener("change", e => {
        const fin = getEl("fecha_fin");
        if (fin) fin.min = e.target.value;
    });

    const estadoEl = getEl("estado");
    estadoEl?.addEventListener("focus",  () => { estadoPrevio = estadoEl.value; });
    estadoEl?.addEventListener("change", manejarCambioEstado);

    initCrearEmpresa({
        onCreada: (id, nombre) => {
            const select = getEl("id_empresa");
            if (select) {
                if (![...select.options].some(o => o.value === String(id))) {
                    select.add(new Option(nombre, id));
                }
                select.value = String(id);
            }
            const texto = getEl("empresa_texto");
            if (texto) {
                texto.value = nombre;
                texto.dataset.idEmpresa = id;
            }
        }
    });

    getEl("btn_nueva_actividad")?.addEventListener("click", abrirModalActividad);
}