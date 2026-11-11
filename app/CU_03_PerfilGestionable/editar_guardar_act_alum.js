// ================================
// Archivo : editar_guardar_act_alum.js
// Autor   : Viridiana Tonix Zarate
// Fecha   : 2026-05-24
// Desc.   : Actividad del alumno: qué se puede editar según su estado,
//           validación antes de guardar, alta de una nueva actividad
//           y modal para crear una empresa.
//
// Funciones que usa editar_guardar_perfil.js:
//   habilitarEdicionAlumno()  y  validarAlumno()
//
// Contenido:
//   1. Configuración y estado
//   2. Reglas de la actividad
//   3. Modo edición
//   4. Validaciones
//   5. Nueva actividad
//   6. Nueva empresa
//   7. Inicio (eventos)
// ================================
import { lanzarToast } from '../js/lanzar_toast.js';
import { confirmarModal, formularioModal } from './modal_dinamico.js?v=20261106g';
import {
    ES_ALUMNO, getEl, valor, setVal, mostrar, habilitar, capitalizar, convertirAMayusculas,
    errorCampo, terminarConExito, enviarJSON, obtenerCatalogos, agregarEmpresaACatalogo
} from './mostrar_contenido.js?v=20261106g';


// =====================================================
// 1. CONFIGURACIÓN Y ESTADO
// =====================================================
const NIVEL_ESTADO = { PENDIENTE: 1, EN_CURSO: 2, COMPLETADO: 3 };

const REGEX = {
    grupo:       /^[1-9][A-Z]$/,
    expediente:  /^[A-Z0-9\/-]{1,15}$/,
    anio:        /^\d{4}$/,
    nombre:      /^[\p{L}\d\s.,&()'\-]{2,100}$/u,
    razonSocial: /^[\p{L}\d\s.,&()'\-]{2,150}$/u,
    rfc:         /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/,
    direccion:   /^[\p{L}\d\s#.,()\-]{5,200}$/u,
    sitioWeb:    /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i
};

// Campos que deben estar llenos para marcar COMPLETADO
const REQUERIDOS_COMPLETADO = {
    grupo_alumno:    "Semestre y Grupo",
    horario_entrada: "Horario",
    area:            "Área",
    programa:        "Programa",
    fecha_inicio:    "Fecha de inicio",
    fecha_fin:       "Fecha de fin"
};

// Campos del modal de empresa → id del input
const CAMPOS_EMPRESA = {
    nombre:       "nueva_empresa_nombre",
    descripcion:  "nueva_empresa_descripcion",
    razon_social: "nueva_empresa_razon_social",
    rfc:          "nueva_empresa_rfc",
    direccion:    "nueva_empresa_direccion",
    sitio_web:    "nueva_empresa_web"
};

// Actividad tal como está guardada en la BD
const actividad = {
    existe: false,
    estado: ""
};


// =====================================================
// 2. REGLAS DE LA ACTIVIDAD
// =====================================================
function actividadAbierta() {
    return actividad.existe && (actividad.estado === "PENDIENTE" || actividad.estado === "EN_CURSO");
}

/** La empresa solo se elige mientras la actividad está PENDIENTE. */
function empresaEditable() {
    return actividad.estado === "PENDIENTE";
}

/** Se ejecuta cuando mostrar_contenido.js termina de cargar los datos. */
function aplicarReglasActividad(e) {
    const datos = e.detail.datos;
    actividad.existe = Boolean(datos.Tiene_actividad);
    actividad.estado = datos.Estado || "";

    bloquearEstadosAnteriores();
    mostrarAvisoActividad();
    mostrar("btn_nueva_actividad", !actividadAbierta());
}

/** El estado solo puede avanzar; CANCELADO nunca lo elige el alumno. */
function bloquearEstadosAnteriores() {
    const nivelActual = NIVEL_ESTADO[actividad.estado];

    for (const opcion of getEl("estado").options) {
        opcion.disabled = opcion.value === "CANCELADO" ||
            (actividad.existe && (!opcion.value || NIVEL_ESTADO[opcion.value] < nivelActual));
    }
}

function mostrarAvisoActividad() {
    const aviso = textoAvisoActividad();
    getEl("aviso_actividad").textContent = aviso;
    mostrar("aviso_actividad", Boolean(aviso));
}

function textoAvisoActividad() {
    if (!actividad.existe)                 return "Aún no tienes una actividad registrada. Crea una para comenzar.";
    if (actividad.estado === "CANCELADO")  return "Esta actividad fue CANCELADA. Puedes iniciar una nueva actividad.";
    if (actividad.estado === "COMPLETADO") return "Esta actividad está COMPLETADA y ya no puede modificarse. Ya puedes iniciar una nueva actividad.";
    return "";
}


// =====================================================
// 3. MODO EDICIÓN
// =====================================================
/** Los datos personales siempre se editan; la actividad solo si está abierta. */
export function habilitarEdicionAlumno() {
    habilitar(["grupo_alumno", "horario_entrada", "horario_salida"]);
    if (!actividadAbierta()) return;

    habilitar(["estado", "area", "programa", "fecha_inicio", "fecha_fin"]);
    if (empresaEditable()) habilitarSelectorEmpresa();
}

function habilitarSelectorEmpresa() {
    mostrar("empresa_texto", false);
    mostrar("id_empresa", true);
    mostrar("btn_crear_empresa", true);
    getEl("id_empresa").disabled = false;
    llenarSelectorEmpresas();
}

function llenarSelectorEmpresas() {
    const select = getEl("id_empresa");
    select.replaceChildren(new Option("-- Selecciona una empresa --", ""));
    obtenerCatalogos().empresas.forEach(e => select.add(new Option(e.Nombre, e.Id_empresa)));
    select.value = getEl("empresa_texto").dataset.idEmpresa;
}


// =====================================================
// 4. VALIDACIONES
// =====================================================
/** Devuelve los datos del alumno a guardar, o null si hay error o canceló. */
export async function validarAlumno() {
    const datos = validarDatosPersonales();
    if (!datos || !actividadAbierta()) return datos;

    const datosActividad = await validarActividad();
    return datosActividad && { ...datos, ...datosActividad };
}

function validarDatosPersonales() {
    const grupo   = valor("grupo_alumno").toUpperCase();
    const entrada = valor("horario_entrada");
    const salida  = valor("horario_salida");

    if (grupo && !REGEX.grupo.test(grupo))    return errorCampo("El semestre y grupo debe ser un número (1-9) y una letra. Ejemplo: 1A", "grupo_alumno");
    if (Boolean(entrada) !== Boolean(salida)) return errorCampo("Debes completar ambos horarios o dejar ambos vacíos", "horario_entrada");
    if (entrada && salida <= entrada)         return errorCampo("La hora de salida debe ser posterior a la de entrada", "horario_salida");

    const datos = {};
    if (grupo)   datos.grupo   = grupo;
    if (entrada) datos.horario = `${entrada} - ${salida}`;
    return datos;
}

async function validarActividad() {
    const datos = {
        estado:       valor("estado"),
        area:         valor("area"),
        programa:     valor("programa"),
        fecha_inicio: valor("fecha_inicio"),
        fecha_fin:    valor("fecha_fin")
    };
    const idEmpresa = idEmpresaSeleccionada();

    if (datos.fecha_inicio && datos.fecha_fin && datos.fecha_fin <= datos.fecha_inicio) {
        return errorCampo("La fecha fin debe ser posterior a la fecha inicio", "fecha_fin");
    }

    if (datos.estado === "COMPLETADO") {
        const faltan = camposFaltantesParaCompletar(idEmpresa);
        if (faltan.length) return errorCampo(`Para completar la actividad faltan: ${faltan.join(", ")}`);
        if (!(await confirmarCompletar())) return null;
    }

    if (empresaEditable() && idEmpresa) datos.id_empresa = idEmpresa;
    return datos;
}

function idEmpresaSeleccionada() {
    return empresaEditable() ? valor("id_empresa") : getEl("empresa_texto").dataset.idEmpresa;
}

function camposFaltantesParaCompletar(idEmpresa) {
    const faltan = Object.keys(REQUERIDOS_COMPLETADO)
        .filter(id => !valor(id))
        .map(id => REQUERIDOS_COMPLETADO[id]);
    if (!idEmpresa) faltan.push("Empresa");
    return faltan;
}

function confirmarCompletar() {
    return confirmarModal(
        "Al marcar la actividad como COMPLETADA ya no podrás modificarla. ¿Deseas continuar?",
        { titulo: "Completar actividad", textoConfirmar: "Sí, completar" }
    );
}


// =====================================================
// 5. NUEVA ACTIVIDAD
// =====================================================
function abrirModalActividad() {
    formularioModal({
        titulo:      "Nueva actividad",
        mensaje:     "Captura los datos para iniciar tu nueva actividad.",
        textoEnviar: "Crear actividad",
        campos:      camposModalActividad(obtenerCatalogos()),
        onEnviar:    crearActividad
    });
}

function camposModalActividad({ servicios, periodos }) {
    return [
        { id: "no_expediente", label: "No. Expediente", maxLength: 15, placeholder: "Ej. EXP-2026-001", mayusculas: true },
        {
            id: "id_servicio", label: "Servicio", tipo: "select",
            opciones: [{ valor: "", texto: "-- Selecciona un servicio --" },
                       ...servicios.map(s => ({ valor: s.Id_servicio, texto: s.Servicio }))]
        },
        {
            id: "periodo_tipo", label: "Periodo", tipo: "select",
            opciones: [{ valor: "", texto: "-- Selecciona --" },
                       ...periodos.map(p => ({ valor: p, texto: capitalizar(p) }))]
        },
        { id: "periodo_anio", label: "Año", tipo: "number", min: 2000, max: 2155, valor: new Date().getFullYear() }
    ];
}

/** Se llama desde el modal. Devuelve un texto si hay error (el modal lo muestra). */
async function crearActividad(valores) {
    valores.no_expediente = valores.no_expediente.toUpperCase();

    const error = validarNuevaActividad(valores);
    if (error) return error;

    const respuesta = await enviarJSON("crear.php", { accion: "actividad", ...valores });
    if (!respuesta.success) return respuesta.error || "No se pudo crear la actividad";

    terminarConExito("Nueva actividad creada");
}

function validarNuevaActividad(v) {
    if (!REGEX.expediente.test(v.no_expediente)) return "Escribe un No. de expediente válido (máx. 15: letras, números, - o /)";
    if (!v.id_servicio)                          return "Selecciona un servicio";
    if (!v.periodo_tipo)                         return "Selecciona el periodo";
    if (!REGEX.anio.test(v.periodo_anio))        return "Año del periodo inválido";
    return null;
}


// =====================================================
// 6. NUEVA EMPRESA
// =====================================================
function abrirModalEmpresa() {
    getEl("modal_nueva_empresa").classList.add("abierto");
}

function cerrarModalEmpresa() {
    getEl("modal_nueva_empresa").classList.remove("abierto");
    Object.values(CAMPOS_EMPRESA).forEach(id => setVal(id, ""));
}

function cerrarModalEmpresaAlDarClicFuera(e) {
    if (e.target === getEl("modal_nueva_empresa")) cerrarModalEmpresa();
}

async function crearEmpresa() {
    const empresa = leerFormularioEmpresa();
    const error   = validarEmpresa(empresa);
    if (error) return lanzarToast(error, "error");

    const btnGuardar = getEl("guardar_nueva_empresa");
    btnGuardar.disabled = true;
    const respuesta = await enviarJSON("crear.php", { accion: "empresa", ...empresa });
    btnGuardar.disabled = false;

    // Creada, o ya existía y está activa: se selecciona en la lista
    if (respuesta.id_empresa) {
        seleccionarEmpresa(respuesta.id_empresa, respuesta.nombre);
        cerrarModalEmpresa();
    }
    lanzarToast(respuesta.success ? "Empresa creada correctamente" : (respuesta.error || "Error al crear la empresa"),
                respuesta.success ? "exito" : "error");
}

function leerFormularioEmpresa() {
    const empresa = {};
    for (const [campo, id] of Object.entries(CAMPOS_EMPRESA)) empresa[campo] = valor(id);
    empresa.rfc = empresa.rfc.toUpperCase();
    return empresa;
}

function validarEmpresa(e) {
    if (!REGEX.nombre.test(e.nombre))                               return "Escribe un nombre de empresa válido";
    if (e.razon_social && !REGEX.razonSocial.test(e.razon_social)) return "Razón social inválida";
    if (e.rfc          && !REGEX.rfc.test(e.rfc))                  return "RFC inválido. Ejemplo: ABC123456XYZ";
    if (e.direccion    && !REGEX.direccion.test(e.direccion))      return "Dirección inválida";
    if (e.sitio_web    && !REGEX.sitioWeb.test(e.sitio_web))       return "Sitio web inválido";
    return null;
}

function seleccionarEmpresa(id, nombre) {
    const select = getEl("id_empresa");
    if (![...select.options].some(o => o.value === String(id))) select.add(new Option(nombre, id));
    select.value = String(id);
    agregarEmpresaACatalogo(id, nombre);
}


// =====================================================
// 7. INICIO (EVENTOS)
// =====================================================
function conectarEventos() {
    getEl("grupo_alumno").addEventListener("input", convertirAMayusculas);
    getEl("btn_nueva_actividad").addEventListener("click", abrirModalActividad);

    getEl("btn_crear_empresa").addEventListener("click", abrirModalEmpresa);
    getEl("cerrar_modal_empresa").addEventListener("click", cerrarModalEmpresa);
    getEl("guardar_nueva_empresa").addEventListener("click", crearEmpresa);
    getEl("modal_nueva_empresa").addEventListener("click", cerrarModalEmpresaAlDarClicFuera);
}

if (ES_ALUMNO) {
    document.addEventListener("datosCargados", aplicarReglasActividad);
    document.addEventListener("DOMContentLoaded", conectarEventos);
}