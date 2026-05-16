//  Archivo     : encuesta_form.js
//  Módulo      : CU_12_CrearFormularios
//  Autor       : Daniela Hernandez Hernandez
//  Fecha       : 05/05/2026
//  Descripción : Carga los servicios disponibles, valida y envía los datos del formulario
//                para registrar una nueva encuesta en el servidor.

import { renderMenu } from "../js/menu.js";
import { lanzarToast } from "../js/lanzar_toast.js";
import { obtenerCookie } from '../js/cookie.js';

document.addEventListener('DOMContentLoaded', function () {
    const cookieTipoUsuario = obtenerCookie('Id_tipo_usuario');
    if (cookieTipoUsuario == 2) {
        window.location.href = '../CU_03_PerfilGestionable/perfil.html';
    }
    renderMenu();
    fetchServicios();
});
// Consulta la lista de servicios al servidor y los manda a renderizar
function fetchServicios() {
    fetch('obtener_servicios.php')
        .then(function (respuesta) {
            return respuesta.json();
        })
        .then(function (respuesta) {
            if (respuesta.error) {
                lanzarToast(respuesta.error, "error");
                return
            }
            if (respuesta.success) {
                renderServicios(respuesta.data);
            }
        })
        .catch(function (error) {
            lanzarToast("No se pudo cargar el Servicio", "error");
        });
}
// Llena el select de servicios con las opciones obtenidas del servidor
function renderServicios(servicios) {
    const elSelectServicio = document.getElementById('selectServicio');
    servicios.forEach(function (servicio) {
        const elOpcion = document.createElement('option');
        elOpcion.value = servicio.Id_servicio;
        elOpcion.textContent = servicio.Servicio;
        elSelectServicio.appendChild(elOpcion);
    });
}
// Valida el formulario y envía los datos de la nueva encuesta al servidor
function guardarEncuesta() {
    const valorNombre = document.getElementById('inputNombre').value;
    const valorDescripcion = document.getElementById('inputDescripcion').value;
    const valorServicio = document.getElementById('selectServicio').value;
    const valorActivo = document.getElementById('selectActivo').value;
    const valorContestador = document.getElementById('selectContestador').value;
    const valorPeriodoTipo = document.getElementById('selectPeriodoTipo').value;
    const valorPeriodoAnio = document.getElementById('inputPeriodoAnio').value;
    const valorFechaFin = document.getElementById('inputFechaFin').value;

    if (!validarFormulario()) {
        return;
    }

    fetch('encuesta_guardar.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nombre: valorNombre,
            descripcion: valorDescripcion,
            servicio: valorServicio,
            activo: valorActivo,
            contestador: valorContestador,
            periodo_tipo: valorPeriodoTipo,
            periodo_anio: valorPeriodoAnio,
            fecha_fin: valorFechaFin
        })
    })
        .then(function (respuesta) {
            return respuesta.json();
        })
        .then(function (resultado) {
            if (resultado.error) {
                lanzarToast(resultado.error, "error");
                return
            }
            if (resultado.success) {
                lanzarToast("Encuesta guardada correctamente", "exito");
                // Redirige a la lista de encuestas tras guardar exitosamente
                setTimeout(() => {
                    window.location.href = './encuestas_lista.html';
                }, 2000);
            }
        })
        .catch(function (error) {
            lanzarToast("No se pudo guardar la encuesta", "error");
        });
}

// Valida que los campos obligatorios no estén vacíos, que el año sea válido
// y que la fecha de expiración sea mayor a hoy
function validarFormulario() {
    const nombres = {
        "inputNombre": "Nombre",
        "inputDescripcion": "Descripcion",
        "selectServicio": "Servicio",
        "selectPeriodoTipo": "Tipo de periodo",
        "inputPeriodoAnio": "Año",
        "selectActivo": "Activo",
        "selectContestador": "Contestador",
        "inputFechaFin": "Fecha de expiración"
    };

    const campos = ["inputNombre", "inputDescripcion", "selectServicio", "selectActivo", "selectContestador", "selectPeriodoTipo", "inputPeriodoAnio", "inputFechaFin"];
    // Verifica que ningún campo esté vacío
    for (const idCampo of campos) {
        const elCampo = document.getElementById(idCampo);
        if (!elCampo.value.trim()) {
            elCampo.focus();
            lanzarToast(`${nombres[idCampo]} no puede estar vacío`, "error");
            return false;
        }
    }
    // Valida que el año tenga exactamente 4 dígitos numéricos
    const anioActual = new Date().getFullYear();
    const elAnio = document.getElementById('inputPeriodoAnio');
    if (!/^\d{4}$/.test(elAnio.value)) {
        elAnio.focus();
        lanzarToast("El año debe ser exactamente 4 dígitos numéricos", "error");
        return false;
    }
    // Valida que el año no sea menor al actual
    if (parseInt(elAnio.value) < anioActual) {
        elAnio.focus();
        lanzarToast(`El año no puede ser menor a ${anioActual}`, "error");
        return false;
    }
    // Valida que la fecha de expiración sea mayor a hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const elFechaFin = document.getElementById('inputFechaFin');
    const fechaFin = new Date(elFechaFin.value + 'T00:00:00');
    if (fechaFin <= hoy) {
        elFechaFin.focus();
        lanzarToast("La fecha de expiración debe ser mayor a hoy", "error");
        return false;
    }
    return true;
}
// Expone las funciones al scope global para que los botones del HTML puedan invocarlas
window.guardarEncuesta = guardarEncuesta;
window.validarFormulario = validarFormulario;