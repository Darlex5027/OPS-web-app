document.addEventListener("DOMContentLoaded", () => {
    const formAdmin = document.getElementById("perfil_administrador");
    const formAlumno = document.getElementById("perfil_alumno");
    const btnEditar = document.querySelector(".btn.editar");
    const btnGuardar = document.querySelector(".btn.guardar");

    // Ocultar formularios y botón guardar al inicio
    formAdmin.style.display = "none";
    formAlumno.style.display = "none";
    btnGuardar.style.display = "none";

    // Leer cookie de tipo de usuario
    const tipoCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("Id_tipo_usuario="));
    const tipoUsuario = tipoCookie ? tipoCookie.split("=")[1].trim() : null;

    console.log("Tipo usuario:", tipoUsuario);

    if (!tipoUsuario) {
        console.error("No se encontró la cookie Id_tipo_usuario");
        return;
    }

    fetch("obtener_datos.php")
        .then((response) => {
            if (!response.ok) throw new Error("Error en la respuesta del servidor");
            return response.json();
        })
        .then((data) => {
            if (!data || data.error) {
                console.error("Error:", data?.error || "Sin datos");
                return;
            }

            if (!data.length) {
                console.error("No se encontraron registros");
                return;
            }

            const perfil = data[0];

            if (tipoUsuario === "1" || tipoUsuario === "3") {
                formAdmin.style.display = "block";
                formAlumno.style.display = "none";

                document.getElementById("nombre_administrador").value = perfil.Nombre || "";
                document.getElementById("apellido_paterno_administrador").value = perfil.Apellido_P || "";
                document.getElementById("apellido_materno_administrador").value = perfil.Apellido_M || "";
                document.getElementById("id_carrera_administrador").value = perfil.Nombre_Carrera || "";
                document.getElementById("telefono_administrador").value = perfil.Telefono || "";
                document.getElementById("correo_administrador").value = perfil.Correo || "";
                document.getElementById("fecha_registro_administrador").value = perfil.Fecha_registro || "";

            } else if (tipoUsuario === "2") {
                formAlumno.style.display = "block";
                formAdmin.style.display = "none";

                document.getElementById("nombre_alumno").value = perfil.Nombre || "";
                document.getElementById("apellido_paterno_alumno").value = perfil.Apellido_P || "";
                document.getElementById("apellido_materno_alumno").value = perfil.Apellido_M || "";
                document.getElementById("id_carrera_alumno").value = perfil.Nombre_Carrera || "";
                document.getElementById("grupo_alumno").value = perfil.Grupo || "";
                document.getElementById("no_expediente_alumno").value = perfil.No_Expediente || "";
                document.getElementById("area_o_programa_alumno").value = perfil.Area_o_Programa || "";
                document.getElementById("observaciones_alumno").value = perfil.Observaciones || "";
                document.getElementById("horario_alumno").value = perfil.Horario || "";
                document.getElementById("organizacion_alumno").value = perfil.Organizacion || "";
                document.getElementById("fecha_registro_alumno").value = perfil.Fecha_registro || "";
            }
        })
        .catch((error) => console.error("Error al obtener datos:", error));

    // ── Botón Editar 
    btnEditar.addEventListener("click", () => {
        const formVisible = formAdmin.style.display !== "none" ? formAdmin : formAlumno;
        formVisible.querySelectorAll("input:not(#nombre_alumno,#apellido_paterno_alumno,#apellido_materno_alumno,#fecha_registro_alumno,#id_carrera_alumno,#fecha_registro_administrador,#nombre_administrador,#apellido_paterno_administrador,#apellido_materno_administrador,#id_carrera_administrador)").forEach(input => input.disabled = false);

        btnEditar.style.display = "none";
        btnGuardar.style.display = "inline-block";
    });

    // ── Botón Guardar
    btnGuardar.addEventListener("click", () => {
        const formVisible = formAdmin.style.display !== "none" ? formAdmin : formAlumno;

        const datos = {};
        formVisible.querySelectorAll("input").forEach(input => {
            datos[input.id] = input.value;
        });

        fetch("guardar_datos.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                lanzarToast("Datos guardados correctamente", "exito");
            } else {
                lanzarToast("Error al guardar: ", "error");
            }
        })
        .catch(error => console.error("Error:", error));

        formVisible.querySelectorAll("input").forEach(input => input.disabled = true);
        btnGuardar.style.display = "none";
        btnEditar.style.display = "inline-block";
    });
});
function lanzarToast(texto, tipo) {
    const toast = document.getElementById('toast-mensaje');
    // 1. Limpiamos clases previas y ponemos la nueva
    toast.className = 'toast'; // Resetea a la base
    toast.classList.add(tipo); // Agrega 'exito' o 'error'
    // 2. Insertamos el texto
    toast.innerText = texto;
    // 3. Mostramos
    toast.classList.remove('oculto');
    // 4. Desvanecemos en 3 segundos
    setTimeout(() => {
        toast.classList.add('oculto');
    }, 3000);
}