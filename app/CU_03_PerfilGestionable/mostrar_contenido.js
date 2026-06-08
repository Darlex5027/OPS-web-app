// ================================
// Archivo : mostrar_contenido.js
// Autor   : Viridiana Tonix Zarate
// Fecha   : 2026-05-24
// Desc.   : Carga y muestra los
//           datos del perfil del
//           usuario logueado en
//           función de su tipo.
// ================================

import { lanzarToast } from '../js/lanzar_toast.js';

document.addEventListener("DOMContentLoaded", () => {

    const getEl      = (id) => document.getElementById(id);
    const setVal     = (id, val) => getEl(id) && (getEl(id).value = val || "");
    const cookieTipoUsuario = document.cookie.split("; ")
        .find(r => r.startsWith("Id_tipo_usuario="))
        ?.split("=")[1].trim();

    if (!cookieTipoUsuario) return console.error("No se encontró la cookie Id_tipo_usuario");

    // Ocultar ambos bloques al inicio
    // (ahora se usan los IDs nuevos tabla_perfil_alumno y tabla_actividades
    //  en lugar de ocultar .contenedor-alumno completo)
    if (getEl("perfil_administrador"))
        getEl("perfil_administrador").style.display = "none";
    if (getEl("acciones_admin"))
        getEl("acciones_admin").style.display = "none";

    const contenedorAlumno = document.querySelector(".contenedor-alumno");
    if (contenedorAlumno) contenedorAlumno.style.display = "none";

    const contenedorAct2 = document.querySelector(".contenedor-actividades-2");
    if (contenedorAct2) contenedorAct2.style.display = "none";

    // ─────────────────────────────────────
    function cargarHorario(horario) {
        if (!horario || typeof horario !== 'string') {
            setVal("horario_entrada", "");
            setVal("horario_salida",  "");
            return;
        }
        const match = horario.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
        if (match) {
            setVal("horario_entrada", match[1]);
            setVal("horario_salida",  match[2]);
        } else {
            console.warn("Formato de horario no reconocido:", horario);
            setVal("horario_entrada", "");
            setVal("horario_salida",  "");
        }
    }

    // ─────────────────────────────────────
    // Datos del administrador
    // ─────────────────────────────────────
    function cargarAdmin(datosPerfil) {
        // Mostrar formulario y sus botones propios
        if (getEl("perfil_administrador"))
            getEl("perfil_administrador").style.display = "block";
        if (getEl("acciones_admin"))
            getEl("acciones_admin").style.display = "flex";

        setVal("nombre_administrador",           datosPerfil.Nombre);
        setVal("apellido_paterno_administrador", datosPerfil.Apellido_P);
        setVal("apellido_materno_administrador", datosPerfil.Apellido_M);
        setVal("id_carrera_administrador",       datosPerfil.Nombre_Carrera);
        setVal("telefono_administrador",         datosPerfil.Telefono);
        setVal("correo_administrador",           datosPerfil.Correo);
        setVal("fecha_registro_administrador",   datosPerfil.Fecha_registro);
    }

    // ─────────────────────────────────────
    // Datos del alumno + actividades
    // ─────────────────────────────────────
    function cargarAlumno(datosPerfil) {
        // Mostrar .contenedor-alumno (contiene tabla_perfil_alumno y tabla_actividades)
        if (contenedorAlumno) contenedorAlumno.style.display = "flex";

        // ── Perfil ──
        setVal("nombre_alumno",           datosPerfil.Nombre);
        setVal("apellido_paterno_alumno", datosPerfil.Apellido_P);
        setVal("apellido_materno_alumno", datosPerfil.Apellido_M);
        setVal("id_carrera_alumno",       datosPerfil.Nombre_Carrera);
        setVal("grupo_alumno",            datosPerfil.Grupo);
        setVal("no_expediente_alumno",    datosPerfil.No_Expediente);
        setVal("fecha_registro_alumno",   datosPerfil.Fecha_registro);

        console.log("Horario recibido de BD:", datosPerfil.Horario);
        cargarHorario(datosPerfil.Horario);

        // ── Actividades (primera) ──
        setVal("servicio",           datosPerfil.Nombre_servicio);
        setVal("empresa_texto",      datosPerfil.Nombre_empresa);
        setVal("area",               datosPerfil.Area);
        setVal("programa",           datosPerfil.Programa);
        setVal("estado",             datosPerfil.Estado);
        setVal("periodo_tipo",       datosPerfil.periodo_tipo);
        setVal("periodo_año",        datosPerfil.periodo_año);
        setVal("fecha_inicio",       datosPerfil.Fecha_inicio);
        setVal("fecha_fin",          datosPerfil.Fecha_fin);
        setVal("fecha_registro",     datosPerfil.Fecha_registro_act);
        setVal("fecha_modificacion", datosPerfil.Fecha_modificacion);

        // Guardar Id_empresa para preseleccionar al editar
        if (getEl("empresa_texto"))
            getEl("empresa_texto").dataset.idEmpresa = datosPerfil.Id_empresa || "";

        // Guardar estado actual para control de permisos
        if (getEl("estado"))
            getEl("estado").dataset.estadoActual = datosPerfil.Estado || "";

        // ── Actividades 2 (si existen datos) ──
        // Solo se muestra el bloque si la BD devuelve datos para la segunda actividad
        if (datosPerfil.Nombre_servicio_2 || datosPerfil.Area_2) {
            if (contenedorAct2) contenedorAct2.style.display = "block";

            setVal("servicio_2",           datosPerfil.Nombre_servicio_2);
            setVal("empresa_texto_2",      datosPerfil.Nombre_empresa_2);
            setVal("area_2",               datosPerfil.Area_2);
            setVal("programa_2",           datosPerfil.Programa_2);
            setVal("estado_2",             datosPerfil.Estado_2);
            setVal("periodo_tipo_2",       datosPerfil.periodo_tipo_2);
            setVal("periodo_año_2",        datosPerfil.periodo_año_2);
            setVal("fecha_inicio_2",       datosPerfil.Fecha_inicio_2);
            setVal("fecha_fin_2",          datosPerfil.Fecha_fin_2);
            setVal("fecha_registro_2",     datosPerfil.Fecha_registro_act_2);
            setVal("fecha_modificacion_2", datosPerfil.Fecha_modificacion_2);

            if (getEl("empresa_texto_2"))
                getEl("empresa_texto_2").dataset.idEmpresa = datosPerfil.Id_empresa_2 || "";
        }
    }

    // ─────────────────────────────────────
    // Fetch principal
    // ─────────────────────────────────────
    fetch("obtener_datos.php")
        .then(r => { if (!r.ok) throw new Error("Error servidor"); return r.json(); })
        .then(data => {
            if (!data?.length || data.error) return console.error("Error:", data?.error);
            const datosPerfil = data[0];

            if (cookieTipoUsuario === "1" || cookieTipoUsuario === "3")
                cargarAdmin(datosPerfil);
            else if (cookieTipoUsuario === "2")
                cargarAlumno(datosPerfil);

            // Avisar que los datos están listos (lo escucha editar_guardar_act_alum.js)
            document.dispatchEvent(new CustomEvent("datosCargados", {
                detail: { Profile_picture_path: datosPerfil.Profile_picture_path || null }
            }));
        })
        .catch(e => console.error("Error al obtener datos:", e));
});