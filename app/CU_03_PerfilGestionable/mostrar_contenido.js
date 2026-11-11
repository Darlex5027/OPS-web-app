// ================================
// Archivo : mostrar_contenido.js
// Autor   : Viridiana Tonix Zarate
// Fecha   : 2026-05-24
// Desc.   : Carga los datos del usuario logueado, los muestra según
//           su tipo y avisa a los demás JS con el evento "datosCargados".
//           También exporta las utilidades que usan
//           editar_guardar_perfil.js y editar_guardar_act_alum.js.
//
// Contenido:
//   1. Utilidades compartidas (exportadas)
//   2. Catálogos (exportados)
//   3. Cargar datos
//   4. Mostrar administrador
//   5. Mostrar alumno
//   6. Inicio
// ================================
import { lanzarToast } from '../js/lanzar_toast.js';


// =====================================================
// 1. UTILIDADES COMPARTIDAS (EXPORTADAS)
// =====================================================
function leerCookie(nombre) {
    return document.cookie.split("; ").find(c => c.startsWith(`${nombre}=`))?.split("=")[1];
}

const tipoUsuario = leerCookie("Id_tipo_usuario");
export const ES_ADMIN  = tipoUsuario === "1" || tipoUsuario === "3";
export const ES_ALUMNO = tipoUsuario === "2";

export function getEl(id) {
    return document.getElementById(id);
}

export function valor(id) {
    return getEl(id).value.trim();
}

export function setVal(id, val) {
    getEl(id).value = val ?? "";
}

export function mostrar(id, visible) {
    getEl(id).classList.toggle("oculto", !visible);
}

export function habilitar(ids) {
    ids.forEach(id => { getEl(id).disabled = false; });
}

/** Fecha de solo lectura: "2026-04-14" → "14/04/2026" (vacía → "—"). */
function setFecha(id, fecha) {
    const [anio, mes, dia] = String(fecha ?? "").split("-");
    setVal(id, dia ? `${dia}/${mes}/${anio}` : "—");
}

export function capitalizar(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function convertirAMayusculas(e) {
    e.target.value = e.target.value.toUpperCase();
}

/** Muestra un error, enfoca el campo (si se indica) y devuelve null. */
export function errorCampo(mensaje, idCampo) {
    lanzarToast(mensaje, "error");
    if (idCampo) getEl(idCampo).focus();
    return null;
}

/** Avisa que todo salió bien y recarga la página. */
export function terminarConExito(mensaje) {
    lanzarToast(mensaje, "exito");
    setTimeout(() => location.reload(), 1500);
}

async function peticion(url, opciones) {
    try {
        const respuesta = await fetch(url, opciones);
        return await respuesta.json();
    } catch (e) {
        console.error(url, e);
        return { success: false, error: "Error de conexión con el servidor" };
    }
}

/** POST con JSON. Devuelve la respuesta o { success: false, error }. */
export function enviarJSON(url, datos) {
    return peticion(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
    });
}

/** POST con FormData (para mandar archivos). */
export function enviarFormulario(url, formData) {
    return peticion(url, { method: "POST", body: formData });
}


// =====================================================
// 2. CATÁLOGOS (EXPORTADOS)
// =====================================================
// Empresas, servicios y periodos: llegan junto con los datos del alumno
let catalogos = { empresas: [], servicios: [], periodos: [] };

export function obtenerCatalogos() {
    return catalogos;
}

/** Al crear una empresa se agrega a la lista sin volver a pedirla al servidor. */
export function agregarEmpresaACatalogo(id, nombre) {
    if (!catalogos.empresas.some(e => String(e.Id_empresa) === String(id))) {
        catalogos.empresas.push({ Id_empresa: id, Nombre: nombre });
    }
}


// =====================================================
// 3. CARGAR DATOS
// =====================================================
async function obtenerPerfil() {
    const respuesta = await fetch("obtener_datos.php");
    const data      = await respuesta.json();
    if (!data.success) throw new Error(data.error || `HTTP ${respuesta.status}`);
    return data;
}

async function cargarDatos() {
    try {
        const { datos, catalogos: listas } = await obtenerPerfil();
        if (listas) catalogos = listas;

        if (ES_ADMIN)  mostrarAdmin(datos);
        if (ES_ALUMNO) mostrarAlumno(datos);
        mostrarFoto(datos.Profile_picture_path);

        avisarDatosCargados(datos);
    } catch (e) {
        console.error("obtener_datos:", e);
        lanzarToast(`No se pudieron cargar los datos del perfil: ${e.message}`, "error");
    }
}

/** editar_guardar_perfil.js y editar_guardar_act_alum.js escuchan este evento. */
function avisarDatosCargados(datos) {
    document.dispatchEvent(new CustomEvent("datosCargados", { detail: { datos } }));
}

function mostrarFoto(ruta) {
    if (ruta) getEl("foto_perfil_preview").src = ruta;
}


// =====================================================
// 4. MOSTRAR ADMINISTRADOR
// =====================================================
function mostrarAdmin(d) {
    mostrar("perfil_administrador", true);
    getEl("titulo_administrador").textContent = tipoUsuario === "3" ? "Perfil Coordinador" : "Perfil Administrador";
    setVal("nombre_administrador",           d.Nombre);
    setVal("apellido_paterno_administrador", d.Apellido_P);
    setVal("apellido_materno_administrador", d.Apellido_M);
    setVal("id_carrera_administrador",       d.Nombre_Carrera);
    setVal("telefono_administrador",         d.Telefono);
    setVal("correo_administrador",           d.Correo);
    setFecha("fecha_registro_administrador",   d.Fecha_registro);
}


// =====================================================
// 5. MOSTRAR ALUMNO
// =====================================================
const REGEX_HORARIO = /(\d{1,2}):(\d{2})(?::\d{2})?\s*-\s*(\d{1,2}):(\d{2})/;

function mostrarAlumno(d) {
    document.querySelector(".contenedor-alumno").classList.remove("oculto");
    mostrarDatosPersonales(d);
    mostrarActividad(d);
}

function mostrarDatosPersonales(d) {
    setVal("nombre_alumno",           d.Nombre);
    setVal("apellido_paterno_alumno", d.Apellido_P);
    setVal("apellido_materno_alumno", d.Apellido_M);
    setVal("id_carrera_alumno",       d.Nombre_Carrera);
    setVal("grupo_alumno",            d.Grupo);
    setFecha("fecha_registro_alumno",   d.Fecha_registro);
    mostrarHorario(d.Horario);
}

/** "8:00 - 14:00:00" → "08:00" y "14:00" (formato de <input type="time">). */
function mostrarHorario(horario) {
    const h = String(horario ?? "").match(REGEX_HORARIO);
    setVal("horario_entrada", h ? `${h[1].padStart(2, "0")}:${h[2]}` : "");
    setVal("horario_salida",  h ? `${h[3].padStart(2, "0")}:${h[4]}` : "");
}

function mostrarActividad(d) {
    setVal("no_expediente",      d.No_expediente);
    setVal("servicio",           d.Nombre_servicio);
    setVal("empresa_texto",      d.Nombre_empresa);
    setVal("area",               d.Area);
    setVal("programa",           d.Programa);
    setVal("estado",             d.Estado);
    setVal("periodo_tipo",       d.periodo_tipo);
    setVal("periodo_año",        d["periodo_año"]);
    setVal("fecha_inicio",       d.Fecha_inicio);
    setVal("fecha_fin",          d.Fecha_fin);
    setFecha("fecha_registro",     d.Fecha_registro_act);
    setFecha("fecha_modificacion", d.Fecha_modificacion);
    getEl("empresa_texto").dataset.idEmpresa = d.Id_empresa ?? "";
}


// =====================================================
// 6. INICIO
// =====================================================
document.addEventListener("DOMContentLoaded", cargarDatos);