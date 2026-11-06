// ================================
// Archivo : crear_empresa.js
// Autor   : Viridiana Tonix Zarate
// Fecha   : 2026-05-24
// Desc.   : Gestiona la creación
//           de nuevas empresas en
//           el modal del perfil.
//
// Cambios: ahora es la ÚNICA lógica del modal de empresa.
// Antes había tres copias (este archivo, editar_guardar_perfil.js y
// editar_guardar_act_alum.js); las dos últimas estaban cargadas a la vez,
// así que "Guardar Empresa" creaba la empresa DOS veces, y una de ellas
// enviaba razonSocial/sitioWeb en camelCase (el PHP los perdía).
// Se exporta initCrearEmpresa() y lo importa editar_guardar_act_alum.js.
// ================================
import { lanzarToast } from '../js/lanzar_toast.js';

const getEl = (id) => document.getElementById(id);
const valor = (id) => (getEl(id)?.value ?? "").trim();

const CAMPOS_MODAL = [
    "nueva_empresa_nombre",
    "nueva_empresa_descripcion",
    "nueva_empresa_razon_social",
    "nueva_empresa_rfc",
    "nueva_empresa_direccion",
    "nueva_empresa_web"
];

const REGEX = {
    nombre:      /^[\p{L}\d\s.,&()'\-]{2,100}$/u,
    razonSocial: /^[\p{L}\d\s.,&()'\-]{2,150}$/u,
    rfc:         /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/,
    direccion:   /^[\p{L}\d\s#.,()\-]{5,200}$/u,
    sitioWeb:    /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i
};

let alCrear = null;
let enviando = false;
let iniciado = false;

function abrirModal() {
    getEl("modal_nueva_empresa").classList.add("abierto");
    getEl("nueva_empresa_nombre")?.focus();
}

function cerrarModal() {
    getEl("modal_nueva_empresa").classList.remove("abierto");
    CAMPOS_MODAL.forEach(id => { const el = getEl(id); if (el) el.value = ""; });
}

async function guardarNuevaEmpresa() {
    if (enviando) return;

    const nombre       = valor("nueva_empresa_nombre");
    const descripcion  = valor("nueva_empresa_descripcion");
    const razon_social = valor("nueva_empresa_razon_social");
    const rfc          = valor("nueva_empresa_rfc").toUpperCase();
    const direccion    = valor("nueva_empresa_direccion");
    let   sitio_web    = valor("nueva_empresa_web");

    if (!nombre)                                                   return lanzarToast("El nombre de la empresa es obligatorio", "error");
    if (!REGEX.nombre.test(nombre))                                return lanzarToast("Nombre de empresa inválido", "error");
    if (razon_social && !REGEX.razonSocial.test(razon_social))     return lanzarToast("Razón social inválida", "error");
    if (rfc          && !REGEX.rfc.test(rfc))                      return lanzarToast("RFC inválido. Ejemplo: ABC123456XYZ", "error");
    if (direccion    && !REGEX.direccion.test(direccion))          return lanzarToast("Dirección inválida", "error");
    if (sitio_web    && !REGEX.sitioWeb.test(sitio_web))           return lanzarToast("Sitio web inválido", "error");
    if (sitio_web    && !/^https?:\/\//i.test(sitio_web))          sitio_web = `https://${sitio_web}`;

    const btn = getEl("guardar_nueva_empresa");
    enviando = true;
    if (btn) btn.disabled = true;

    try {
        const r   = await fetch("crear_empresa.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, descripcion, razon_social, rfc, direccion, sitio_web })
        });
        // Se lee como texto para poder ver en consola qué respondió el PHP
        // si no es JSON (warnings, error fatal, espacios antes de <?php...)
        const texto = await r.text();
        let res;
        try {
            res = JSON.parse(texto);
        } catch {
            console.error(`crear_empresa.php respondió algo que no es JSON (HTTP ${r.status}):\n`, texto);
            return lanzarToast(`Error del servidor al crear la empresa (HTTP ${r.status}). Revisa la consola.`, "error");
        }
        if (!res.success) console.warn("crear_empresa.php:", r.status, res);

        if (res.success) {
            alCrear?.(res.id_empresa, res.nombre || nombre);
            lanzarToast("Empresa creada correctamente", "exito");
            cerrarModal();
            return;
        }

        // Duplicada: si está activa, se selecciona la existente
        if (r.status === 409 && res.id_empresa) {
            alCrear?.(res.id_empresa, res.nombre || nombre);
            cerrarModal();
        }
        // En modo depuración el PHP manda el mensaje real de MariaDB en "detalle"
        lanzarToast(res.detalle ? `${res.error}: ${res.detalle}` : (res.error || "Error al crear la empresa"), "error");

    } catch (e) {
        console.error("crear_empresa:", e);
        lanzarToast("Error al conectar con el servidor", "error");
    } finally {
        enviando = false;
        if (btn) btn.disabled = false;
    }
}

/**
 * Conecta los botones del modal. Llamar una sola vez.
 * @param {{ onCreada?: (id: string, nombre: string) => void }} opciones
 */
export function initCrearEmpresa({ onCreada } = {}) {
    alCrear = onCreada ?? null;
    if (iniciado) return;
    iniciado = true;

    getEl("btn_crear_empresa")?.addEventListener("click", abrirModal);
    getEl("cerrar_modal_empresa")?.addEventListener("click", cerrarModal);
    getEl("guardar_nueva_empresa")?.addEventListener("click", guardarNuevaEmpresa);

    const modal = getEl("modal_nueva_empresa");
    modal?.addEventListener("click", (e) => { if (e.target === modal) cerrarModal(); });
}