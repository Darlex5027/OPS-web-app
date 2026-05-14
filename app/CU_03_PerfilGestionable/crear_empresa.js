import { lanzarToast } from '../js/lanzar_toast.js';

document.addEventListener("DOMContentLoaded", () => {

    const modal = document.getElementById("modalNuevaEmpresa");
    const btnCrearEmpresa = document.getElementById("btnCrearEmpresa");
    const btnCerrarModal = document.getElementById("cerrarModalEmpresa");
    const btnGuardarEmpresa = document.getElementById("guardarNuevaEmpresa");

    // =========================
    // ABRIR MODAL
    // =========================
    btnCrearEmpresa.addEventListener("click", () => {
        modal.style.display = "flex";
    });

    // =========================
    // CERRAR MODAL
    // =========================
    btnCerrarModal.addEventListener("click", () => {
        cerrarModal();
    });

    // Cerrar si se hace clic fuera del modal
    modal.addEventListener("click", (e) => {
        if (e.target === modal) cerrarModal();
    });

    function cerrarModal() {
        modal.style.display = "none";
        limpiarModal();
    }

    function limpiarModal() {
        document.getElementById("nueva_empresa_nombre").value = "";
        document.getElementById("nueva_empresa_descripcion").value = "";
        document.getElementById("nueva_empresa_razon_social").value = "";
        document.getElementById("nueva_empresa_rfc").value = "";
        document.getElementById("nueva_empresa_direccion").value = "";
        document.getElementById("nueva_empresa_web").value = "";
    }

    // =========================
    // GUARDAR NUEVA EMPRESA
    // =========================
    btnGuardarEmpresa.addEventListener("click", () => {
        const nombre = document.getElementById("nueva_empresa_nombre").value.trim();

        if (!nombre) {
            lanzarToast("El nombre de la empresa es obligatorio", "error");
            return;
        }

        const datos = {
            accion: "crear_empresa",
            nombre: nombre,
            descripcion: document.getElementById("nueva_empresa_descripcion").value.trim(),
            razon_social: document.getElementById("nueva_empresa_razon_social").value.trim(),
            rfc: document.getElementById("nueva_empresa_rfc").value.trim(),
            direccion: document.getElementById("nueva_empresa_direccion").value.trim(),
            sitio_web: document.getElementById("nueva_empresa_web").value.trim()
        };

        fetch("crear_empresa.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    lanzarToast("Empresa creada correctamente", "exito");

                    // Agregar la nueva empresa al select
                    const select = document.getElementById("id_empresa");
                    const option = document.createElement("option");
                    option.value = result.id_empresa;
                    option.textContent = nombre;
                    option.selected = true;
                    select.appendChild(option);

                    // Mostrar el nombre en el input de texto
                    document.getElementById("empresa_texto").value = nombre;

                    cerrarModal();
                } else {
                    lanzarToast("Error al crear la empresa", "error");
                }
            })
            .catch(error => {
                console.error("Error:", error);
                lanzarToast("Error al conectar con el servidor", "error");
            });
    });
});