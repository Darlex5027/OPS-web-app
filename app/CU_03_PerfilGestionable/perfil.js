// perfil.js
const readonlyAdmin  = ["nombre_administrador","apellido_paterno_administrador","apellido_materno_administrador","id_carrera_administrador","fecha_registro_administrador"];
const readonlyAlumno = ["nombre_alumno","apellido_paterno_alumno","apellido_materno_alumno","id_carrera_alumno","no_expediente_alumno","fecha_registro_alumno"];

export function cargarPerfil(tipoUsuario) {
    return fetch("obtener_datos.php")
        .then((r) => {
            if (!r.ok) throw new Error("Error en la respuesta del servidor");
            return r.json();
        })
        .then((data) => {
            if (!data || data.error || !data.length) {
                console.error("Error o sin datos:", data?.error);
                return null;
            }

            const perfil = data[0];

            if (tipoUsuario === "1" || tipoUsuario === "3") {
                document.getElementById("perfil_administrador").style.display = "block";
                document.getElementById("perfil_alumno").style.display        = "none";

                document.getElementById("nombre_administrador").value           = perfil.Nombre         || "";
                document.getElementById("apellido_paterno_administrador").value = perfil.Apellido_P     || "";
                document.getElementById("apellido_materno_administrador").value = perfil.Apellido_M     || "";
                document.getElementById("id_carrera_administrador").value       = perfil.Nombre_Carrera || "";
                document.getElementById("telefono_administrador").value         = perfil.Telefono       || "";
                document.getElementById("correo_administrador").value           = perfil.Correo         || "";
                document.getElementById("fecha_registro_administrador").value   = perfil.Fecha_registro || "";

            } else if (tipoUsuario === "2") {
                document.getElementById("perfil_alumno").style.display      = "block";
                document.getElementById("perfil_administrador").style.display = "none";

                document.getElementById("nombre_alumno").value           = perfil.Nombre         || "";
                document.getElementById("apellido_paterno_alumno").value = perfil.Apellido_P     || "";
                document.getElementById("apellido_materno_alumno").value = perfil.Apellido_M     || "";
                document.getElementById("id_carrera_alumno").value       = perfil.Nombre_Carrera || "";
                document.getElementById("grupo_alumno").value            = perfil.Grupo          || "";
                document.getElementById("no_expediente_alumno").value    = perfil.No_Expediente  || "";
                document.getElementById("horario_alumno").value          = perfil.Horario        || "";
                document.getElementById("fecha_registro_alumno").value   = perfil.Fecha_registro || "";
            }

            return perfil;
        });
}

export function guardarPerfil(tipoUsuario) {
    const formVisible = (tipoUsuario === "1" || tipoUsuario === "3")
        ? document.getElementById("perfil_administrador")
        : document.getElementById("perfil_alumno");

    const datos = {};
    formVisible.querySelectorAll("input").forEach((input) => {
        datos[input.id] = input.value;
    });

    return fetch("guardar_datos.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
    }).then((r) => r.json());
}

export function getReadonlyPerfil(tipoUsuario) {
    return (tipoUsuario === "1" || tipoUsuario === "3") ? readonlyAdmin : readonlyAlumno;
}