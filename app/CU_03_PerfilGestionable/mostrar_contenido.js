// mostrar_contenido.js
import { lanzarToast } from '../js/lanzar_toast.js';
import { cargarPerfil, guardarPerfil, getReadonlyPerfil } from './perfil.js';
//import { cargarEmpresas, cargarActividades, guardarActividades, readonlyActividades, getEstadoActividad } from './actividades.js';
import { cargarEmpresas, cargarActividades, cargarCatalogos, guardarActividades, readonlyActividades, getEstadoActividad } from './actividades.js';

document.addEventListener("DOMContentLoaded", async () => {
    const formAdmin = document.getElementById("perfil_administrador");
    const formAlumno = document.getElementById("perfil_alumno");
    const formActividades = document.getElementById("perfil_actividades");
    const btnEditar = document.querySelector(".btn.editar");
    const btnGuardar = document.querySelector(".btn.guardar");

    // Estado inicial: todo oculto
    formAdmin.style.display = "none";
    formAlumno.style.display = "none";
    formActividades.style.display = "none";
    btnGuardar.style.display = "none";

    // Leer cookie de tipo de usuario
    const tipoCookie = document.cookie.split("; ").find((row) => row.startsWith("Id_tipo_usuario="));
    const tipoUsuario = tipoCookie ? tipoCookie.split("=")[1].trim() : null;

    if (!tipoUsuario) {
        console.error("No se encontró la cookie Id_tipo_usuario");
        return;
    }

    // ── Inicialización ───────────────────────────────────────────────────────
    await cargarPerfil(tipoUsuario);

    if (tipoUsuario === "2") {
        formActividades.style.display = "block";
        //await cargarEmpresas();
        //await cargarActividades();
        await cargarCatalogos();   // ← agregar antes de cargarActividades
        await cargarEmpresas();
        await cargarActividades();

        if (getEstadoActividad() === "COMPLETADO") {
            btnEditar.style.display = "none";
        }
    }

    // ── Helpers habilitar / deshabilitar ─────────────────────────────────────
    function habilitar(form, listaReadonly) {
        form.querySelectorAll("input, select").forEach((el) => {
            if (!listaReadonly.includes(el.id)) el.disabled = false;
        });
    }

    function deshabilitar(form) {
        form.querySelectorAll("input, select").forEach((el) => el.disabled = true);
    }

    // ── Botón Editar ─────────────────────────────────────────────────────────
    btnEditar.addEventListener("click", () => {
        const formVisible = (tipoUsuario === "1" || tipoUsuario === "3") ? formAdmin : formAlumno;
        habilitar(formVisible, getReadonlyPerfil(tipoUsuario));

        if (tipoUsuario === "2") habilitar(formActividades, readonlyActividades);

        btnEditar.style.display = "none";
        btnGuardar.style.display = "inline-block";
    });

    // ── Botón Guardar ────────────────────────────────────────────────────────
    btnGuardar.addEventListener("click", async () => {
        const formVisible = (tipoUsuario === "1" || tipoUsuario === "3") ? formAdmin : formAlumno;

        try {
            const promises = [guardarPerfil(tipoUsuario)];
            if (tipoUsuario === "2") promises.push(guardarActividades());

            const resultados = await Promise.all(promises);
            const hayError = resultados.some((r) => !r.success);

            lanzarToast(
                hayError ? "Ocurrió un error al guardar" : "Datos guardados correctamente",
                hayError ? "error" : "exito"
            );
        } catch {
            lanzarToast("Error de red al guardar", "error");
        }

        deshabilitar(formVisible);
        if (tipoUsuario === "2") deshabilitar(formActividades);

        btnGuardar.style.display = "none";
        btnEditar.style.display = "inline-block";
    });
});