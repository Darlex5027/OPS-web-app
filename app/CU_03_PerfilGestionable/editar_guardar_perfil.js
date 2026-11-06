// ================================
// Archivo : editar_guardar_perfil.js
// Autor   : Viridiana Tonix Zarate
// Fecha   : 2026-05-24
// Desc.   : Controlador ÚNICO de los
//           botones Editar / Guardar /
//           Cancelar y de la foto de perfil.
//
// Cambios principales:
//  - Es el único script que escucha los botones (antes también lo hacía
//    editar_guardar_act_alum.js → doble guardado y doble alta de empresa).
//  - Valida TODO antes de subir la foto. Antes la foto se subía primero y,
//    si luego fallaba una validación, quedaba guardada a medias.
//  - Si solo cambió la foto, no se llama a guardar_datos.php.
//  - El botón Guardar se bloquea mientras se envía (evita doble clic).
//  - "Completado" ya no bloquea todo el perfil: solo la actividad.
//  - No se permite editar hasta que los datos terminaron de cargar.
// ================================
import { lanzarToast } from '../js/lanzar_toast.js';
import {
    initActividades,
    aplicarEstadoActividad,
    habilitarEdicionAlumno,
    recolectarDatosAlumno
} from './editar_guardar_act_alum.js?v=20261105b';

// =========================
// UTILIDADES
// =========================
const getEl = (id) => document.getElementById(id);

const tipoUsuario = document.cookie
    .split("; ")
    .find(r => r.startsWith("Id_tipo_usuario="))
    ?.split("=")[1]
    ?.trim();

const ES_ADMIN  = tipoUsuario === "1" || tipoUsuario === "3";
const ES_ALUMNO = tipoUsuario === "2";

const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];
const MAX_FOTO   = 2 * 1024 * 1024;

const CAMPOS_EDITABLES = [
    "grupo_alumno", "horario_entrada", "horario_salida", "id_empresa",
    "area", "programa", "estado", "fecha_inicio", "fecha_fin",
    "telefono_administrador", "correo_administrador", "foto_perfil_input"
];

let datosListos = false;
let guardando   = false;
let btnEditar, btnGuardar, btnCancelar;

// Los módulos se ejecutan antes de DOMContentLoaded, así que este listener
// ya está registrado cuando mostrar_contenido.js dispara el evento.
document.addEventListener("datosCargados", (e) => {
    datosListos = true;
    if (ES_ALUMNO) aplicarEstadoActividad(e.detail?.datos);
});

// =========================
// ADMINISTRADOR
// =========================
function recolectarDatosAdmin() {
    const correo   = getEl("correo_administrador")?.value.trim()   ?? "";
    const telefono = getEl("telefono_administrador")?.value.trim() ?? "";

    if (!correo || !telefono) {
        const faltan = [!correo && "Correo", !telefono && "Teléfono"].filter(Boolean);
        getEl(!correo ? "correo_administrador" : "telefono_administrador")?.focus();
        lanzarToast(`Campos incompletos: ${faltan.join(", ")}`, "error");
        return null;
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|mx|edu)$/.test(correo)) {
        lanzarToast("Correo inválido", "error");
        return null;
    }
    if (!/^\d{3}-\d{4}-\d{3}$/.test(telefono)) {
        lanzarToast("Formato de teléfono: 246-5444-885", "error");
        return null;
    }
    return { telefono_administrador: telefono, correo_administrador: correo };
}

// =========================
// FOTO DE PERFIL
// =========================
function iniciarPreviewFoto() {
    const input   = getEl("foto_perfil_input");
    const preview = getEl("foto_perfil_preview");
    if (!input || !preview) return;

    input.addEventListener("change", (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;

        if (!TIPOS_FOTO.includes(archivo.type)) {
            lanzarToast("Solo se permiten imágenes JPG, PNG o WEBP", "error");
            input.value = "";
            return;
        }
        if (archivo.size > MAX_FOTO) {
            lanzarToast("La imagen no debe superar los 2MB", "error");
            input.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => { preview.src = ev.target.result; };
        reader.readAsDataURL(archivo);
    });
}

async function subirFoto(archivo) {
    try {
        const fd = new FormData();
        fd.append("foto_perfil", archivo);
        const r    = await fetch("guardar_foto.php", { method: "POST", body: fd });
        const resp = await leerJSON(r, "guardar_foto.php");

        if (!resp) return false;
        if (!resp.success) {
            lanzarToast(resp.error || "Error al subir la foto", "error");
            return false;
        }
        const preview = getEl("foto_perfil_preview");
        if (preview && resp.url) preview.src = resp.url;
        return true;

    } catch {
        lanzarToast("Error al subir la foto", "error");
        return false;
    }
}

// =========================
// LEER RESPUESTA JSON (muestra en consola si el PHP mandó otra cosa)
// =========================
async function leerJSON(r, archivo) {
    const texto = await r.text();
    try {
        return JSON.parse(texto);
    } catch {
        console.error(`${archivo} respondió algo que no es JSON (HTTP ${r.status}):\n`, texto || "(vacío)");
        lanzarToast(`Error del servidor en ${archivo} (HTTP ${r.status}). Revisa la consola.`, "error");
        return null;
    }
}

// =========================
// ENVIAR DATOS
// =========================
async function enviar(datos) {
    try {
        const r    = await fetch("guardar_datos.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });
        const resp = await leerJSON(r, "guardar_datos.php");

        if (!resp) return false;
        if (!resp.success) {
            lanzarToast(resp.error || "Error al guardar los datos", "error");
            return false;
        }
        return true;

    } catch {
        lanzarToast("Error de conexión con el servidor. Por favor, intenta de nuevo.", "error");
        return false;
    }
}

// =========================
// EDITAR
// =========================
async function modoEditar() {
    if (!datosListos) {
        return lanzarToast("Espera a que terminen de cargar tus datos", "error");
    }

    btnEditar.classList.add("oculto");
    btnGuardar.classList.remove("oculto");
    btnCancelar.classList.remove("oculto");

    const inputFoto = getEl("foto_perfil_input");
    if (inputFoto) inputFoto.disabled = false;
    getEl("btn_cambiar_foto")?.classList.remove("oculto");

    if (ES_ADMIN) {
        ["telefono_administrador", "correo_administrador"].forEach(id => {
            const el = getEl(id);
            if (el) { el.disabled = false; el.readOnly = false; }
        });
    } else if (ES_ALUMNO) {
        await habilitarEdicionAlumno();
    }
}

// =========================
// GUARDAR
// =========================
async function modoGuardar() {
    if (guardando) return;

    // 1) Validar primero, sin tocar el servidor
    const datos = ES_ADMIN ? recolectarDatosAdmin()
                : ES_ALUMNO ? await recolectarDatosAlumno()
                : null;
    if (!datos) return;

    const foto = getEl("foto_perfil_input")?.files[0];
    const hayDatos = Object.keys(datos).length > 0;

    if (!foto && !hayDatos) {
        return lanzarToast("No hay cambios para guardar", "error");
    }

    guardando = true;
    btnGuardar.disabled = true;

    // 2) Foto y 3) datos
    const ok = (!foto || await subirFoto(foto)) && (!hayDatos || await enviar(datos));

    if (ok) {
        lanzarToast("Datos guardados correctamente", "exito");
        setTimeout(() => location.reload(), 1500);
        return;  // el botón queda bloqueado hasta recargar
    }

    guardando = false;
    btnGuardar.disabled = false;
}

// =========================
// DOMCONTENTLOADED
// =========================
document.addEventListener("DOMContentLoaded", () => {

    btnEditar   = document.querySelector(".form-actions .btn.editar");
    btnGuardar  = document.querySelector(".form-actions .btn.guardar");
    btnCancelar = document.querySelector(".form-actions .btn.cancelar");

    btnGuardar.classList.add("oculto");
    btnCancelar.classList.add("oculto");

    CAMPOS_EDITABLES.forEach(id => {
        const el = getEl(id);
        if (el) el.disabled = true;
    });

    iniciarPreviewFoto();
    if (ES_ALUMNO) initActividades();

    getEl("btn_cambiar_foto")?.addEventListener("click", () => getEl("foto_perfil_input")?.click());

    btnEditar.addEventListener("click",   modoEditar);
    btnGuardar.addEventListener("click",  modoGuardar);
    btnCancelar.addEventListener("click", () => location.reload());

    // Formatear teléfono automáticamente (###-####-###)
    getEl("telefono_administrador")?.addEventListener("input", e => {
        let val = e.target.value.replace(/\D/g, "").slice(0, 10);
        if (val.length > 7) val = `${val.slice(0, 3)}-${val.slice(3, 7)}-${val.slice(7)}`;
        else if (val.length > 3) val = `${val.slice(0, 3)}-${val.slice(3)}`;
        e.target.value = val;
    });
});