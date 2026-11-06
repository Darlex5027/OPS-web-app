// ================================
// Archivo : mostrar_contenido.js
// Autor   : Viridiana Tonix Zarate
// Fecha   : 2026-05-24
// Desc.   : Carga y muestra los
//           datos del perfil del
//           usuario logueado en
//           función de su tipo.
//
// Cambios:
//  - El horario se normaliza a HH:MM (un <input type="time"> no acepta
//    "8:00" ni "08:00:00", y se quedaba vacío).
//  - El evento datosCargados ahora incluye todos los datos, para que el
//    módulo de actividades sepa el estado real guardado en BD.
//  - Se avisa al usuario si falla la carga (antes solo console.error).
// ================================

import { lanzarToast } from '../js/lanzar_toast.js';

const getEl  = (id) => document.getElementById(id);
const setVal = (id, val) => { const el = getEl(id); if (el) el.value = val ?? ""; };

const normalizarHora = (h) => {
    const [hh, mm] = h.split(":");
    return `${hh.padStart(2, "0")}:${mm}`;
};

function cargarHorario(horario) {
    const m = typeof horario === "string"
        && horario.match(/(\d{1,2}:\d{2})(?::\d{2})?\s*-\s*(\d{1,2}:\d{2})/);

    if (horario && !m) console.warn("Formato de horario no reconocido:", horario);

    setVal("horario_entrada", m ? normalizarHora(m[1]) : "");
    setVal("horario_salida",  m ? normalizarHora(m[2]) : "");
}

function cargarAdmin(d) {
    getEl("perfil_administrador").classList.remove("oculto");
    setVal("nombre_administrador",           d.Nombre);
    setVal("apellido_paterno_administrador", d.Apellido_P);
    setVal("apellido_materno_administrador", d.Apellido_M);
    setVal("id_carrera_administrador",       d.Nombre_Carrera);
    setVal("telefono_administrador",         d.Telefono);
    setVal("correo_administrador",           d.Correo);
    setVal("fecha_registro_administrador",   d.Fecha_registro);
}

function cargarAlumno(d) {
    document.querySelector(".contenedor-alumno").classList.remove("oculto");

    // Perfil
    setVal("nombre_alumno",           d.Nombre);
    setVal("apellido_paterno_alumno", d.Apellido_P);
    setVal("apellido_materno_alumno", d.Apellido_M);
    setVal("id_carrera_alumno",       d.Nombre_Carrera);
    setVal("grupo_alumno",            d.Grupo);
    setVal("fecha_registro_alumno",   d.Fecha_registro);
    cargarHorario(d.Horario);

    // Actividad vigente (la abierta, o la última completada/cancelada)
    setVal("no_expediente",      d.No_expediente);   // ahora vive en Actividades_Alumnos
    setVal("servicio",           d.Nombre_servicio);
    setVal("empresa_texto",      d.Nombre_empresa);
    setVal("area",               d.Area);
    setVal("programa",           d.Programa);
    setVal("estado",             d.Estado);
    setVal("periodo_tipo",       d.periodo_tipo);
    setVal("periodo_año",        d["periodo_año"]);
    setVal("fecha_inicio",       d.Fecha_inicio);
    setVal("fecha_fin",          d.Fecha_fin);
    setVal("fecha_registro",     d.Fecha_registro_act);
    setVal("fecha_modificacion", d.Fecha_modificacion);

    if (d.Fecha_inicio) getEl("fecha_fin").min = d.Fecha_inicio;
    getEl("empresa_texto").dataset.idEmpresa = d.Id_empresa ?? "";
}

document.addEventListener("DOMContentLoaded", async () => {

    const tipoUsuario = document.cookie.split("; ")
        .find(r => r.startsWith("Id_tipo_usuario="))
        ?.split("=")[1]?.trim();

    if (!tipoUsuario) return console.error("No se encontró la cookie Id_tipo_usuario");

    // Ambos formularios empiezan con la clase "oculto" en el HTML
    getEl("perfil_administrador").classList.add("oculto");
    document.querySelector(".contenedor-alumno").classList.add("oculto");

    try {
        const r     = await fetch("obtener_datos.php");
        const texto = await r.text();
        let data = null;
        try {
            data = JSON.parse(texto);
        } catch {
            console.error(`obtener_datos.php respondió algo que no es JSON (HTTP ${r.status}):\n`, texto || "(vacío)");
            throw new Error(`obtener_datos.php no respondió JSON (HTTP ${r.status}). ` +
                "¿Está utilidades_json.php en la misma carpeta? Revisa la consola.");
        }

        if (!r.ok || !Array.isArray(data) || !data.length) {
            throw new Error(data?.error || `HTTP ${r.status}`);
        }

        const datos = data[0];
        if (tipoUsuario === "1" || tipoUsuario === "3") cargarAdmin(datos);
        else if (tipoUsuario === "2")                   cargarAlumno(datos);

        document.dispatchEvent(new CustomEvent("datosCargados", {
            detail: { datos, Profile_picture_path: datos.Profile_picture_path || null }
        }));

    } catch (e) {
        console.error("Error al obtener datos:", e);
        lanzarToast(`No se pudieron cargar los datos del perfil: ${e.message}`, "error");
    }
});