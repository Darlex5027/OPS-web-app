//  Archivo     : pregunta_form.js
//  Módulo      : CU_12_CrearFormularios
//  Autor       : Daniela Hernandez Hernandez
//  Fecha       : 05/05/2026
//  Descripción : Valida y envía los datos del formulario para registrar una nueva pregunta,
//                convierte la sección a mayúscula antes del envío.

import { renderMenu } from "../js/menu.js";
import { lanzarToast } from "../js/lanzar_toast.js";
import { obtenerCookie } from "../js/cookie.js";

document.addEventListener('DOMContentLoaded', function () {
    const cookieTipoUsuario = obtenerCookie('Id_tipo_usuario');
    if (cookieTipoUsuario == 2) {
        window.location.href = '../CU_03_PerfilGestionable/perfil.html';
    }
    renderMenu();
});
// Valida el formulario y envía los datos de la nueva pregunta al servidor
function guardarPregunta() {
    const params = new URLSearchParams(window.location.search);
    const idEncuesta = params.get('Id_encuesta');
    const valorPregunta = document.getElementById('inputPregunta').value;
    const valorTipoRespuesta = document.getElementById('selectTipoRespuesta').value;
    const valorSeccion = document.getElementById('inputSeccion').value;
    const valorObligatoria = document.getElementById('selectObligatoria').value;
    const valorActivo = document.getElementById('selectActivo').value;

    if (!validarFormulario()) {
        return;
    }

    fetch('pregunta_form.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            Id_encuesta: idEncuesta,
            pregunta: valorPregunta,
            tipo_respuesta: valorTipoRespuesta,
            seccion: valorSeccion,
            obligatoria: valorObligatoria,
            activo: valorActivo
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
                lanzarToast("Pregunta guardada correctamente", "exito");
                // Redirige a la lista de preguntas de la encuesta tras guardar exitosamente
                setTimeout(() => {
                    window.location.href = `./preguntas_lista.html?Id_encuesta=${idEncuesta}`;
                }, 2000);
            }
        })
        .catch(function (error) {
            lanzarToast("No se pudo guardar la Pregunta", "error");
        });
}

function cancelarPregunta() {
    const params = new URLSearchParams(window.location.search);
    const idEncuesta = params.get('Id_encuesta');
    window.location.href = `./preguntas_lista.html?Id_encuesta=${idEncuesta}`;
}


// Valida que ningún campo del formulario esté vacío
function validarFormulario() {
    const nombres = {
        "inputPregunta": "Pregunta",
        "selectTipoRespuesta": "Tipo de respuesta",
        "inputSeccion": "Seccion",
        "selectObligatoria": "Obligatoria",
        "selectActivo": "Activo"
    };

    const campos = ["inputPregunta", "selectTipoRespuesta", "inputSeccion", "selectObligatoria", "selectActivo"];

    for (const idCampo of campos) {
        const elCampo = document.getElementById(idCampo);
        if (!elCampo.value.trim()) {
            elCampo.focus();
            lanzarToast(`${nombres[idCampo]} no puede estar vacío`, "error");
            return false;
        }
    }
    return true;
}
// Expone las funciones al scope global para que los botones del HTML puedan invocarlas
window.cancelarPregunta = cancelarPregunta;
window.guardarPregunta = guardarPregunta;
window.validarFormulario = validarFormulario;