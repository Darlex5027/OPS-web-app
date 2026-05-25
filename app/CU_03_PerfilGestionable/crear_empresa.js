// ================================
// Archivo : crear_empresa.js
// Autor   : Viridiana Tonix Zarate
// Fecha   : 2026-05-24
// Desc.   : Gestiona la creación
//           de nuevas empresas en
//           el modal del perfil.
// ================================
import { lanzarToast } from '../js/lanzar_toast.js';

// =========================
// UTILIDADES
// =========================
const getEl = (id) => document.getElementById(id);

// =========================
// MODAL
// =========================
function abrir_modal() {
    getEl("modal_nueva_empresa").style.display = "flex";
}

function cerrar_modal() {
    getEl("modal_nueva_empresa").style.display = "none";
    limpiar_modal();
}

function limpiar_modal() {
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
function guardar_nueva_empresa() {
    const nombre = getEl("nueva_empresa_nombre").value.trim();

    if (!nombre) {
        lanzarToast("El nombre de la empresa es obligatorio", "error");
        return;
    }

    const datos = {
        accion:       "crear_empresa",
        nombre,
        descripcion:  getEl("nueva_empresa_descripcion").value.trim(),
        razon_social: getEl("nueva_empresa_razon_social").value.trim(),
        rfc:          getEl("nueva_empresa_rfc").value.trim(),
        direccion:    getEl("nueva_empresa_direccion").value.trim(),
        sitio_web:    getEl("nueva_empresa_web").value.trim()
    };

    fetch("crear_empresa.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
    })
        .then(r => r.json())
        .then(result => {
            if (!result.success) {
                lanzarToast("Error al crear la empresa", "error");
                return;
            }

            const select = getEl("id_empresa");
            const option = document.createElement("option");
            option.value = result.id_empresa;
            option.textContent = nombre;
            option.selected = true;
            select.appendChild(option);

            getEl("empresa_texto").value = nombre;

            lanzarToast("Empresa creada correctamente", "exito");
            cerrar_modal();
        })
        .catch(error => {
            console.error("Error:", error);
            lanzarToast("Error al conectar con el servidor", "error");
        });
}

// =============================================
// DOMCONTENTLOADED — solo inicialización
// =============================================
document.addEventListener("DOMContentLoaded", () => {

    getEl("btn_crear_empresa").addEventListener("click", abrir_modal);
    getEl("cerrar_modal_empresa").addEventListener("click", cerrar_modal);
    getEl("guardar_nueva_empresa").addEventListener("click", guardar_nueva_empresa);

    getEl("modal_nueva_empresa").addEventListener("click", (e) => {
        if (e.target === getEl("modal_nueva_empresa")) cerrar_modal();
    });

});