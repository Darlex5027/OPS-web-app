import { lanzarToast } from '../js/lanzar_toast.js';

// =========================
// UTILIDADES
// =========================
const getEl = (id) => document.getElementById(id);

const tipoUsuario = document.cookie.split("; ")
    .find(r => r.startsWith("Id_tipo_usuario="))
    ?.split("=")[1].trim();

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
        accion: "crear_empresa",
        nombre,
        descripcion: getEl("nueva_empresa_descripcion").value.trim(),
        razon_social: getEl("nueva_empresa_razon_social").value.trim(),
        rfc: getEl("nueva_empresa_rfc").value.trim(),
        direccion: getEl("nueva_empresa_direccion").value.trim(),
        sitio_web: getEl("nueva_empresa_web").value.trim()
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

// =========================
// EDITAR
// =========================
function modoEditar(btnEditar, btnGuardar, btnCancelar) {
    btnEditar.style.display = "none";
    btnGuardar.style.display = "inline-block";
    btnCancelar.style.display = "inline-block";

    const inputFoto = getEl("foto_perfil_input");
    if (inputFoto) inputFoto.disabled = false;

    if (tipoUsuario === "1" || tipoUsuario === "3") {
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

        const empresaTexto = getEl("empresa_texto");
        const selectEmpresa = getEl("id_empresa");
        if (empresaTexto) empresaTexto.style.display = "none";
        if (selectEmpresa) selectEmpresa.style.display = "block";
    }
}

// =========================
// GUARDAR
// =========================
function modoGuardar() {
    const data = new FormData();

    const inputFoto = getEl("foto_perfil_input");
    if (inputFoto?.files.length > 0) data.append("foto_perfil", inputFoto.files[0]);

    if (tipoUsuario === "1" || tipoUsuario === "3") {
        const correo = getEl("correo_administrador")?.value.trim();
        const telefono = getEl("telefono_administrador")?.value.trim();

        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|mx|edu)$/.test(correo))
            return lanzarToast("Correo inválido", "error");
        if (!/^\d{3}-\d{4}-\d{3}$/.test(telefono))
            return lanzarToast("Formato: 246-5444-885", "error");

        data.append("telefono", telefono);
        data.append("correo", correo);

    } else {
        const fechaInicio = getEl("fecha_inicio")?.value;
        const fechaFin = getEl("fecha_fin")?.value;

        if (fechaInicio && fechaFin && fechaFin <= fechaInicio)
            return lanzarToast("La fecha fin debe ser posterior a la fecha inicio", "error");

        data.append("grupo", getEl("grupo_alumno")?.value);
        data.append("horario_entrada", getEl("horario_entrada")?.value);
        data.append("horario_salida", getEl("horario_salida")?.value);
        data.append("area", getEl("area")?.value);
        data.append("programa", getEl("programa")?.value);
        data.append("estado", getEl("estado")?.value);
        data.append("fecha_inicio", fechaInicio);
        data.append("fecha_fin", fechaFin);

        const selectEmpresa = getEl("id_empresa");
        if (selectEmpresa?.value === "nueva") {
            data.append("nueva_empresa", getEl("nueva_empresa")?.value || "");
        } else {
            data.append("id_empresa", selectEmpresa?.value || "");
        }
    }

    fetch("guardar_datos.php", { method: "POST", body: data })
        .then(async r => {
            const texto = await r.text();
            try { return JSON.parse(texto); }
            catch { throw new Error("La respuesta no es JSON válido"); }
        })
        .then(resp => {
            lanzarToast(
                resp.success ? "Datos guardados correctamente" : resp.error || "Error al guardar",
                resp.success ? "exito" : "error"
            );
            if (resp.success) setTimeout(() => location.reload(), 1500);
        })
        .catch(() => lanzarToast("Error de conexión", "error"));
}

// =============================================
// DOMCONTENTLOADED — solo inicialización
// =============================================
document.addEventListener("DOMContentLoaded", () => {

    const btnEditar = document.querySelector(".btn.editar");
    const btnGuardar = document.querySelector(".btn.guardar");
    const btnCancelar = document.querySelector(".btn.cancelar");

    btnGuardar.style.display = "none";
    btnCancelar.style.display = "none";

    btnEditar?.addEventListener("click", () => modoEditar(btnEditar, btnGuardar, btnCancelar));
    btnGuardar?.addEventListener("click", () => modoGuardar());
    btnCancelar?.addEventListener("click", () => location.reload());

    getEl("btnCrearEmpresa").addEventListener("click", abrirModal);
    getEl("cerrarModalEmpresa").addEventListener("click", cerrarModal);
    getEl("guardarNuevaEmpresa").addEventListener("click", guardarNuevaEmpresa);

    getEl("modalNuevaEmpresa").addEventListener("click", e => {
        if (e.target === getEl("modalNuevaEmpresa")) cerrarModal();
    });

    // Formatear teléfono automáticamente
    getEl("telefono_administrador")?.addEventListener("input", e => {
        let val = e.target.value.replace(/\D/g, "");
        if (val.length > 3) val = val.slice(0, 3) + "-" + val.slice(3);
        if (val.length > 8) val = val.slice(0, 8) + "-" + val.slice(8);
        if (val.length > 12) val = val.slice(0, 12);
        e.target.value = val;
    });

});