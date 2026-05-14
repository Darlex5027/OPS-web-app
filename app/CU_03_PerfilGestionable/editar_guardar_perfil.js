import { lanzarToast } from '../js/lanzar_toast.js';

// ──────────────────────────────────────────────
// Constantes estáticas (no dependen del DOM)
// ──────────────────────────────────────────────

const regex = {
    telefono: /^\d{3}-\d{4}-\d{3}$/,
    correo: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|mx|edu)$/,
    grupo: /^[1-9][A-Z]$/
};

const campos = {
    admin: ["telefono_administrador", "correo_administrador"],
    alumno: ["grupo_alumno", "horario_entrada", "horario_salida"]
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const getTipo = () => {
    const cookie = document.cookie.split("; ").find(r => r.startsWith("Id_tipo_usuario="));
    return cookie ? cookie.split("=")[1].trim() : null;
};

const esAdmin = () => { const t = getTipo(); return t === "1" || t === "3"; };
const getVal  = (id) => document.getElementById(id).value;
const setDis  = (ids, val) => ids.forEach(id => document.getElementById(id).disabled = val);
const camposRol = () => esAdmin() ? campos.admin : campos.alumno;

function resetBotones(btn, editando) {
    btn.editar.style.display  = editando ? "none"         : "inline-block";
    btn.guardar.style.display = editando ? "inline-block" : "none";
    btn.cancelar.style.display = editando ? "inline-block" : "none";
}

function formatearTelefono(e) {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 3) val = val.slice(0, 3) + "-" + val.slice(3);
    if (val.length > 8) val = val.slice(0, 8) + "-" + val.slice(8);
    if (val.length > 12) val = val.slice(0, 12);
    e.target.value = val;
}

function validar() {
    if (esAdmin()) {
        if (!regex.telefono.test(getVal("telefono_administrador")))
            return lanzarToast("Teléfono inválido. Formato: 555-6321-859", "error"), false;
        if (!regex.correo.test(getVal("correo_administrador")))
            return lanzarToast("Correo inválido. Ej: a@b.com", "error"), false;
    } else {
        if (!regex.grupo.test(getVal("grupo_alumno")))
            return lanzarToast("Grupo inválido. Ej: 1A, 2B", "error"), false;
        if (!getVal("fecha_inicio"))
            return lanzarToast("La fecha de inicio es obligatoria.", "error"), false;
        if (!getVal("fecha_fin"))
            return lanzarToast("La fecha de fin es obligatoria.", "error"), false;
        if (new Date(getVal("fecha_fin")) < new Date(getVal("fecha_inicio")))
            return lanzarToast("La fecha fin no puede ser mayor a la fecha inicio.", "error"), false;
    }
    return true;
}

function guardar(datos) {
    fetch("guardar_datos.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
    })
        .then(r => r.json())
        .then(r => lanzarToast(
            r.success ? "Datos guardados correctamente" : "Error al guardar",
            r.success ? "exito" : "error"
        ))
        .catch(e => console.error(e));
}

function getDatosAlumno() {
    return {
        grupo:          getVal("grupo_alumno"),
        horario_entrada: getVal("horario_entrada"),
        horario_salida:  getVal("horario_salida"),
        estado:          getVal("estado"),
        area:            getVal("area"),
        programa:        getVal("programa"),
        fecha_inicio:    getVal("fecha_inicio"),
        fecha_fin:       getVal("fecha_fin"),
        id_empresa:      getVal("id_empresa"),
    };
}
document.addEventListener("DOMContentLoaded", () => {

    const btn = {
        editar:   document.querySelector(".btn.editar"),
        guardar:  document.querySelector(".btn.guardar"),
        cancelar: document.querySelector(".btn.cancelar")
    };

    // Estado inicial de botones
    resetBotones(btn, false);

    // Formato automático en campo teléfono
    document.getElementById("telefono_administrador").addEventListener("input", formatearTelefono);

    // Ocultar "Editar" si el alumno ya tiene estado COMPLETADO
    document.addEventListener("datosCargados", () => {
        if (!esAdmin() && document.getElementById("estado")?.value === "COMPLETADO") {
            btn.editar.style.display = "none";
        }
    });

    // Botón Editar
    btn.editar.addEventListener("click", () => {
        setDis(camposRol(), false);
        if (!esAdmin()) window.habilitarActividades?.(true);
        resetBotones(btn, true);
    });

    // Botón Guardar
    btn.guardar.addEventListener("click", () => {
        if (!validar()) return;
        const datos = esAdmin()
            ? Object.fromEntries(camposRol().map(id => [id, getVal(id)]))
            : getDatosAlumno();
        guardar(datos);
        setDis(camposRol(), true);
        if (!esAdmin()) window.habilitarActividades?.(false);
        resetBotones(btn, false);
    });

    // Botón Cancelar
    btn.cancelar.addEventListener("click", () => {
        setDis(camposRol(), true);
        if (!esAdmin()) window.habilitarActividades?.(false);
        resetBotones(btn, false);
    });

});