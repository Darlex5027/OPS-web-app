// ================================
// Archivo : editar_guardar_perfil.js
// Autor   : Viridiana Tonix Zarate
// Fecha   : 2026-05-24
// Desc.   : Botones Editar / Guardar / Cancelar, datos del
//           administrador y foto de perfil. La parte del alumno
//           la valida editar_guardar_act_alum.js.
//
// Contenido:
//   1. Configuración y estado
//   2. Modo edición
//   3. Validación del administrador
//   4. Guardar
//   5. Foto de perfil
//   6. Inicio (eventos)
// ================================
import { lanzarToast } from '../js/lanzar_toast.js';
import { habilitarEdicionAlumno, validarAlumno } from './editar_guardar_act_alum.js?v=20261106g';
import {
    ES_ADMIN, ES_ALUMNO, getEl, valor, mostrar, habilitar, errorCampo, terminarConExito, enviarFormulario
} from './mostrar_contenido.js?v=20261106g';


// =====================================================
// 1. CONFIGURACIÓN Y ESTADO
// =====================================================
const TIPOS_FOTO     = ["image/jpeg", "image/png", "image/webp"];
const MAX_FOTO_BYTES = 2 * 1024 * 1024;

const REGEX = {
    correo:   /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|mx|edu)$/,
    telefono: /^\d{3}-\d{4}-\d{3}$/
};

let datosListos = false;

function boton(clase) {
    return document.querySelector(`.form-actions .${clase}`);
}


// =====================================================
// 2. MODO EDICIÓN
// =====================================================
function modoEditar() {
    if (!datosListos) return lanzarToast("Espera a que terminen de cargar tus datos", "error");

    mostrarBotonesEdicion();
    habilitarFoto();

    if (ES_ADMIN)  habilitar(["telefono_administrador", "correo_administrador"]);
    if (ES_ALUMNO) habilitarEdicionAlumno();
}

function mostrarBotonesEdicion() {
    boton("editar").classList.add("oculto");
    boton("guardar").classList.remove("oculto");
    boton("cancelar").classList.remove("oculto");
}

function habilitarFoto() {
    mostrar("btn_cambiar_foto", true);
    getEl("foto_perfil_input").disabled = false;
}


// =====================================================
// 3. VALIDACIÓN DEL ADMINISTRADOR
// =====================================================
/** Devuelve los datos del admin, o null si hay error. */
function validarAdmin() {
    const correo   = valor("correo_administrador");
    const telefono = valor("telefono_administrador");

    if (!REGEX.correo.test(correo))     return errorCampo("Correo inválido", "correo_administrador");
    if (!REGEX.telefono.test(telefono)) return errorCampo("Formato de teléfono: 246-5444-885", "telefono_administrador");

    return { telefono_administrador: telefono, correo_administrador: correo };
}

/** Mientras se escribe: ###-####-### */
function formatearTelefono(e) {
    const n = e.target.value.replace(/\D/g, "").slice(0, 10);
    e.target.value = [n.slice(0, 3), n.slice(3, 7), n.slice(7)].filter(Boolean).join("-");
}


// =====================================================
// 4. GUARDAR
// =====================================================
async function modoGuardar() {
    const btnGuardar = boton("guardar");
    if (btnGuardar.disabled) return;

    const datos = ES_ADMIN ? validarAdmin() : await validarAlumno();
    if (!datos) return;

    const foto = getEl("foto_perfil_input").files[0];
    if (!foto && !Object.keys(datos).length) return lanzarToast("No hay cambios para guardar", "error");

    btnGuardar.disabled = true;
    const respuesta = await enviarFormulario("guardar_datos.php", armarFormulario(datos, foto));

    if (!respuesta.success) {
        btnGuardar.disabled = false;
        return lanzarToast(respuesta.error || "Error al guardar", "error");
    }
    terminarConExito("Datos guardados correctamente");
}

/** Datos y foto viajan juntos en una sola petición. */
function armarFormulario(datos, foto) {
    const formData = new FormData();
    formData.append("datos", JSON.stringify(datos));
    if (foto) formData.append("foto_perfil", foto);
    return formData;
}


// =====================================================
// 5. FOTO DE PERFIL
// =====================================================
function abrirSelectorFoto() {
    getEl("foto_perfil_input").click();
}

function previsualizarFoto() {
    const input   = getEl("foto_perfil_input");
    const archivo = input.files[0];
    if (!archivo) return;

    const error = validarFoto(archivo);
    if (error) {
        input.value = "";
        return lanzarToast(error, "error");
    }
    getEl("foto_perfil_preview").src = URL.createObjectURL(archivo);
}

function validarFoto(archivo) {
    if (!TIPOS_FOTO.includes(archivo.type)) return "Solo se permiten imágenes JPG, PNG o WEBP";
    if (archivo.size > MAX_FOTO_BYTES)      return "La imagen no debe superar los 2MB";
    return null;
}


// =====================================================
// 6. INICIO (EVENTOS)
// =====================================================
function conectarEventos() {
    boton("editar").addEventListener("click", modoEditar);
    boton("guardar").addEventListener("click", modoGuardar);
    boton("cancelar").addEventListener("click", () => location.reload());

    getEl("btn_cambiar_foto").addEventListener("click", abrirSelectorFoto);
    getEl("foto_perfil_input").addEventListener("change", previsualizarFoto);
    getEl("telefono_administrador").addEventListener("input", formatearTelefono);
}

document.addEventListener("datosCargados", () => { datosListos = true; });
document.addEventListener("DOMContentLoaded", conectarEventos);