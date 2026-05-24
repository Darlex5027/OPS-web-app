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
function abrirModal() {
    getEl("modalNuevaEmpresa").style.display = "flex";
}

function cerrarModal() {
    getEl("modalNuevaEmpresa").style.display = "none";
    limpiarModal();
}

function limpiarModal() {
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
function guardarNuevaEmpresa() {
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
            cerrarModal();
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

    getEl("btnCrearEmpresa").addEventListener("click", abrirModal);
    getEl("cerrarModalEmpresa").addEventListener("click", cerrarModal);
    getEl("guardarNuevaEmpresa").addEventListener("click", guardarNuevaEmpresa);

    getEl("modalNuevaEmpresa").addEventListener("click", (e) => {
        if (e.target === getEl("modalNuevaEmpresa")) cerrarModal();
    });

});