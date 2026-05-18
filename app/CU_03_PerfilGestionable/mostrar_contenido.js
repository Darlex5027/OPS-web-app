import { lanzarToast } from '../js/lanzar_toast.js';

// ─── Helpers ────────────────────────────────────────────────────────────────
const getEl = (id) => document.getElementById(id);
const setVal = (id, val) => getEl(id) && (getEl(id).value = val || "");

const tipoUsuario = document.cookie.split("; ")
    .find(r => r.startsWith("Id_tipo_usuario="))
    ?.split("=")[1].trim();

// ─── Verificar campos completado ────────────────────────────────────────────
function verificarCamposCompletado() {
    const vacios = CAMPOS_REQUERIDOS_COMPLETADO.filter(c => !getEl(c.id)?.value?.trim());
    if (vacios.length === 0) return;

    vacios.forEach(c => {
        const el = getEl(c.id);
        if (el) {
            el.style.borderColor = "#e74c3c";
            el.style.backgroundColor = "#fff5f5";
        }
    });

    const nombres = vacios.map(c => `• ${c.label}`).join("\n");
    lanzarToast(`Faltan campos por completar:\n${nombres}`, "error");
}

// ─── Cargar horario ──────────────────────────────────────────────────────────
function cargarHorario(horario) {
    const match = (horario || "").match(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/);
    setVal("horario_entrada", match ? match[1] : horario);
    setVal("horario_salida", match ? match[2] : "");
}

// ─── Cargar Admin ────────────────────────────────────────────────────────────
function cargarAdmin(p) {
    getEl("perfil_administrador").style.display = "block";
    setVal("nombre_administrador", p.Nombre);
    setVal("apellido_paterno_administrador", p.Apellido_P);
    setVal("apellido_materno_administrador", p.Apellido_M);
    setVal("id_carrera_administrador", p.Nombre_Carrera);
    setVal("telefono_administrador", p.Telefono);
    setVal("correo_administrador", p.Correo);
    setVal("fecha_registro_administrador", p.Fecha_registro);
}

// ─── Cargar Alumno ───────────────────────────────────────────────────────────
function cargarAlumno(p) {
    document.querySelector(".contenedor-alumno").style.display = "flex";
    getEl("perfil_alumno").style.display = "block";

    setVal("nombre_alumno", p.Nombre);
    setVal("apellido_paterno_alumno", p.Apellido_P);
    setVal("apellido_materno_alumno", p.Apellido_M);
    setVal("id_carrera_alumno", p.Nombre_Carrera);
    setVal("grupo_alumno", p.Grupo);
    setVal("no_expediente_alumno", p.No_Expediente);
    setVal("fecha_registro_alumno", p.Fecha_registro);
    cargarHorario(p.Horario);

    setVal("servicio", p.Nombre_servicio);
    setVal("empresa_texto", p.Nombre_empresa);
    setVal("area", p.Area);
    setVal("programa", p.Programa);
    setVal("estado", p.Estado);
    setVal("periodo_tipo", p.periodo_tipo);
    setVal("periodo_año", p.periodo_año);
    setVal("fecha_inicio", p.Fecha_inicio);
    setVal("fecha_fin", p.Fecha_fin);
    setVal("fecha_registro", p.Fecha_registro_act);
    setVal("fecha_modificacion", p.Fecha_modificacion);

    getEl("empresa_texto").dataset.idEmpresa = p.Id_empresa || "";
    getEl("estado").dataset.estadoActual = p.Estado || "";

    getEl("id_empresa").classList.add("oculto");
    getEl("btnCrearEmpresa").classList.add("oculto");

    if (p.Estado === "COMPLETADO") verificarCamposCompletado();
}

// ─── Editar ──────────────────────────────────────────────────────────────────
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

// ─── Bloquear ────────────────────────────────────────────────────────────────
function bloquearCampos(btnEditar, btnGuardar, btnCancelar) {
    btnEditar.style.display = "inline-block";
    btnGuardar.style.display = "none";
    btnCancelar.style.display = "none";

    const inputFoto = getEl("foto_perfil_input");
    if (inputFoto) inputFoto.disabled = true;

    const campos = tipoUsuario === "1" || tipoUsuario === "3"
        ? ["telefono_administrador", "correo_administrador"]
        : ["grupo_alumno", "horario_entrada", "horario_salida", "id_empresa",
            "nueva_empresa", "area", "programa", "estado", "fecha_inicio", "fecha_fin"];

    campos.forEach(id => {
        const el = getEl(id);
        if (el) { el.disabled = true; el.readOnly = true; }
    });

    if (tipoUsuario === "2") {
        const empresaTexto = getEl("empresa_texto");
        const selectEmpresa = getEl("id_empresa");
        if (empresaTexto) empresaTexto.style.display = "block";
        if (selectEmpresa) selectEmpresa.style.display = "none";
    }
}

// ─── Guardar ─────────────────────────────────────────────────────────────────
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
            return lanzarToast("Formato: 555-1001-001", "error");

        data.append("telefono_administrador", telefono);
        data.append("correo_administrador", correo);

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
            if (resp.success) {
                // ✅ Bloquea campos al guardar exitosamente
                bloquearCampos(
                    document.querySelector(".btn.editar"),
                    document.querySelector(".btn.guardar"),
                    document.querySelector(".btn.cancelar")
                );
                setTimeout(() => location.reload(), 1500);
            }
        })
        .catch(() => lanzarToast("Error de conexión", "error"));
}

// ─── Inicialización ──────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {

    if (!tipoUsuario) return console.error("No se encontró la cookie Id_tipo_usuario");

    getEl("perfil_administrador").style.display = "none";
    document.querySelector(".contenedor-alumno").style.display = "none";

    const btnEditar = document.querySelector(".btn.editar");
    const btnGuardar = document.querySelector(".btn.guardar");
    const btnCancelar = document.querySelector(".btn.cancelar");

    btnGuardar.style.display = "none";
    btnCancelar.style.display = "none";

    btnEditar?.addEventListener("click", () => modoEditar(btnEditar, btnGuardar, btnCancelar));
    btnGuardar?.addEventListener("click", () => modoGuardar());
    // ✅ Bloquea campos al cancelar
    btnCancelar?.addEventListener("click", () => {
        bloquearCampos(btnEditar, btnGuardar, btnCancelar);
        location.reload();
    });

    fetch("obtener_datos.php")
        .then(r => { if (!r.ok) throw new Error("Error servidor"); return r.json(); })
        .then(data => {
            if (!data?.length || data.error) return console.error("Error:", data?.error);
            const p = data[0];
            if (tipoUsuario === "1" || tipoUsuario === "3") cargarAdmin(p);
            else if (tipoUsuario === "2") cargarAlumno(p);

            document.dispatchEvent(new CustomEvent("datosCargados"));
        })
        .catch(e => console.error("Error al obtener datos:", e));
});