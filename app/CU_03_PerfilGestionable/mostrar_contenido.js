import { lanzarToast } from '../js/lanzar_toast.js';

document.addEventListener("DOMContentLoaded", () => {

    const getEl       = (id) => document.getElementById(id);
    const setVal      = (id, val) => getEl(id) && (getEl(id).value = val || "");
    const tipoUsuario = document.cookie.split("; ")
        .find(r => r.startsWith("Id_tipo_usuario="))
        ?.split("=")[1].trim();

    if (!tipoUsuario) return console.error("No se encontró la cookie Id_tipo_usuario");

    // Ocultar secciones al inicio
    getEl("perfil_administrador").style.display            = "none";
    document.querySelector(".contenedor-alumno").style.display = "none";

    // Campos que deben estar llenos si el estado es COMPLETADO
    const CAMPOS_REQUERIDOS_COMPLETADO = [
        { id: "area",            label: "Área" },
        { id: "programa",        label: "Programa" },
        { id: "fecha_inicio",    label: "Fecha de inicio" },
        { id: "fecha_fin",       label: "Fecha de fin" },
        { id: "grupo_alumno",    label: "Semestre y Grupo" },
        { id: "horario_entrada", label: "Horario de entrada" },
        { id: "horario_salida",  label: "Horario de salida" },
        { id: "empresa_texto",   label: "Empresa" },
    ];

    // Resalta en rojo los campos vacíos y avisa al alumno
    function verificarCamposCompletado() {
        const vacios = CAMPOS_REQUERIDOS_COMPLETADO.filter(c => !getEl(c.id)?.value?.trim());
        if (vacios.length === 0) return;

        vacios.forEach(c => {
            const el = getEl(c.id);
            if (el) {
                el.style.borderColor     = "#e74c3c";
                el.style.backgroundColor = "#fff5f5";
            }
        });

        const nombres = vacios.map(c => `• ${c.label}`).join("\n");
        lanzarToast(`Faltan campos por completar:\n${nombres}`, "error");
    }

    // Parsear horario "8:00-14:00" y repartirlo en los dos inputs
    function cargarHorario(horario) {
        const match = (horario || "").match(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/);
        setVal("horario_entrada", match ? match[1] : horario);
        setVal("horario_salida",  match ? match[2] : "");
    }

    // Mapear datos del administrador
    function cargarAdmin(p) {
        getEl("perfil_administrador").style.display = "block";
        setVal("nombre_administrador",           p.Nombre);
        setVal("apellido_paterno_administrador", p.Apellido_P);
        setVal("apellido_materno_administrador", p.Apellido_M);
        setVal("id_carrera_administrador",       p.Nombre_Carrera);
        setVal("telefono_administrador",         p.Telefono);
        setVal("correo_administrador",           p.Correo);
        setVal("fecha_registro_administrador",   p.Fecha_registro);
    }

    // Mapear datos del alumno y sus actividades
    function cargarAlumno(p) {
        document.querySelector(".contenedor-alumno").style.display = "flex";
        getEl("perfil_alumno").style.display = "block";

        // Perfil
        setVal("nombre_alumno",           p.Nombre);
        setVal("apellido_paterno_alumno", p.Apellido_P);
        setVal("apellido_materno_alumno", p.Apellido_M);
        setVal("id_carrera_alumno",       p.Nombre_Carrera);
        setVal("grupo_alumno",            p.Grupo);
        setVal("no_expediente_alumno",    p.No_Expediente);
        setVal("fecha_registro_alumno",   p.Fecha_registro);
        cargarHorario(p.Horario);

        // Actividades
        setVal("servicio",           p.Nombre_servicio);
        setVal("empresa_texto",      p.Nombre_empresa);
        setVal("area",               p.Area);
        setVal("programa",           p.Programa);
        setVal("estado",             p.Estado);
        setVal("periodo_tipo",       p.periodo_tipo);
        setVal("periodo_año",        p.periodo_año);
        setVal("fecha_inicio",       p.Fecha_inicio);
        setVal("fecha_fin",          p.Fecha_fin);
        setVal("fecha_registro",     p.Fecha_registro_act);
        setVal("fecha_modificacion", p.Fecha_modificacion);

        // Guardar Id_empresa para preseleccionar al editar
        getEl("empresa_texto").dataset.idEmpresa = p.Id_empresa || "";
        // Guardar estado actual para control de permisos de edición
        getEl("estado").dataset.estadoActual = p.Estado || "";

        // Asegurar que select y botón crear queden ocultos hasta que el alumno dé click en Editar
        getEl("id_empresa").classList.add("oculto");
        getEl("btnCrearEmpresa").classList.add("oculto");

        // Si el estado es COMPLETADO, verificar que todo esté lleno
        if (p.Estado === "COMPLETADO") verificarCamposCompletado();
    }

    // Fetch principal: obtener datos del usuario logueado
    fetch("obtener_datos.php")
        .then(r => { if (!r.ok) throw new Error("Error servidor"); return r.json(); })
        .then(data => {
            if (!data?.length || data.error) return console.error("Error:", data?.error);
            const p = data[0];
            if (tipoUsuario === "1" || tipoUsuario === "3") cargarAdmin(p);
            else if (tipoUsuario === "2")                   cargarAlumno(p);

            // Avisar que los datos ya están listos
            document.dispatchEvent(new CustomEvent("datosCargados"));
        })
        .catch(e => console.error("Error al obtener datos:", e));
});