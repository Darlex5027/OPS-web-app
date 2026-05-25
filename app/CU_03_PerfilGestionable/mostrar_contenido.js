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

    getEl("perfil_administrador").style.display            = "none";
    document.querySelector(".contenedor-alumno").style.display = "none";

    function cargarHorario(horario) {
        if (!horario || typeof horario !== 'string') {
            setVal("horario_entrada", "");
            setVal("horario_salida", "");
            return;
        }

        // Intenta varios patrones
        let match = horario.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
        
        if (match) {
            setVal("horario_entrada", match[1]);
            setVal("horario_salida", match[2]);
        } else {
            // Si no coincide con el patrón, dejar vacío
            console.warn("Formato de horario no reconocido:", horario);
            setVal("horario_entrada", "");
            setVal("horario_salida", "");
        }
    }

    // Mapear datos del administrador
    function cargarAdmin(datosPerfil) {
        getEl("perfil_administrador").style.display = "block";
        setVal("nombre_administrador",           datosPerfil.Nombre);
        setVal("apellido_paterno_administrador", datosPerfil.Apellido_P);
        setVal("apellido_materno_administrador", datosPerfil.Apellido_M);
        setVal("id_carrera_administrador",       datosPerfil.Nombre_Carrera);
        setVal("telefono_administrador",         datosPerfil.Telefono);
        setVal("correo_administrador",           datosPerfil.Correo);
        setVal("fecha_registro_administrador",   datosPerfil.Fecha_registro);
    }

    // Mapear datos del alumno y sus actividades
    function cargarAlumno(datosPerfil) {
        document.querySelector(".contenedor-alumno").style.display = "flex";
        getEl("perfil_alumno").style.display = "block";

        // Perfil
        setVal("nombre_alumno",           datosPerfil.Nombre);
        setVal("apellido_paterno_alumno", datosPerfil.Apellido_P);
        setVal("apellido_materno_alumno", datosPerfil.Apellido_M);
        setVal("id_carrera_alumno",       datosPerfil.Nombre_Carrera);
        setVal("grupo_alumno",            datosPerfil.Grupo);
        setVal("no_expediente_alumno",    datosPerfil.No_Expediente);
        setVal("fecha_registro_alumno",   datosPerfil.Fecha_registro);
        
        console.log("Horario recibido de BD:", datosPerfil.Horario);
        cargarHorario(datosPerfil.Horario);

        // Actividades
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
        getEl("empresa_texto").dataset.idEmpresa = datosPerfil.Id_empresa || "";
        // Guardar estado actual para control de permisos de edición
        getEl("estado").dataset.estadoActual = datosPerfil.Estado || "";
    }

    // Fetch principal: obtener datos del usuario logueado
    fetch("obtener_datos.php")
        .then(r => { if (!r.ok) throw new Error("Error servidor"); return r.json(); })
        .then(data => {
            if (!data?.length || data.error) return console.error("Error:", data?.error);
            const datosPerfil = data[0];
            if (cookieTipoUsuario === "1" || cookieTipoUsuario === "3") cargarAdmin(datosPerfil);
            else if (cookieTipoUsuario === "2")                        cargarAlumno(datosPerfil);

            // ← Avisar que los datos ya están listos, pasando Profile_picture_path
            document.dispatchEvent(new CustomEvent("datosCargados", {
                detail: { Profile_picture_path: datosPerfil.Profile_picture_path || null }
            }));
        })
        .catch(e => console.error("Error al obtener datos:", e));
});