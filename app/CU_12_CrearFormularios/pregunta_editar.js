//  Archivo     : pregunta_editar.js
//  Módulo      : CU_12_CrearFormularios
//  Autor       : Daniela Hernandez Hernandez
//  Fecha       : 05/05/2026
//  Descripción : Carga y pre-llena los datos de una pregunta para su edición,
//                valida el formulario y envía los cambios al servidor.
import { renderMenu } from "../js/menu.js";
import { lanzarToast } from "../js/lanzar_toast.js";
import { obtenerCookie } from '../js/cookie.js';

document.addEventListener('DOMContentLoaded', function () {
    const cookieTipoUsuario = obtenerCookie('Id_tipo_usuario');
    if (cookieTipoUsuario == 2) {
        window.location.href = '../CU_03_PerfilGestionable/perfil.html';
    }
    renderMenu();
    const params = new URLSearchParams(window.location.search);
    // Obtiene el ID de la pregunta desde la URL
    const idPregunta = params.get('Id_pregunta');
    fetchPregunta(idPregunta);
});
// Consulta los datos de la pregunta al servidor y los manda a renderizar
function fetchPregunta(idPregunta) {
    fetch('pregunta_editar.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            Id_pregunta: idPregunta
        })
    })
        .then(function (respuesta) {
            return respuesta.json();
        })
        .then(function (respuesta) {
            if (respuesta.error) {
                lanzarToast(respuesta.error, "error");
                return
            }
            if (respuesta.success) {
                renderPregunta(respuesta.data);
            }
        })
        .catch(function (error) {
            console.log(error);
            lanzarToast("La pregunta no se pudo cargar", "error");
        });
}
// Pre-llena el formulario con los datos actuales de la pregunta
function renderPregunta(pregunta) {
    document.getElementById('outputOrden').textContent = pregunta[0].Orden;
    document.getElementById('inputPregunta').value = pregunta[0].Pregunta;
    document.getElementById('selectTipoRespuesta').value = pregunta[0].Tipo_respuesta;
    document.getElementById('inputSeccion').value = pregunta[0].Seccion;
    document.getElementById('selectObligatoria').value = pregunta[0].Obligatoria;
    document.getElementById('selectActivo').value = pregunta[0].Activo;
    console.log(pregunta[0])
}
// Valida el formulario y envía los datos actualizados de la pregunta al servidor
function editarPregunta() {
    const params = new URLSearchParams(window.location.search);
    const idPregunta = params.get('Id_pregunta');
    const idEncuesta = params.get('Id_encuesta');
    const valorPregunta = document.getElementById('inputPregunta').value;
    const valorTipoRespuesta = document.getElementById('selectTipoRespuesta').value;
    const valorSeccion = document.getElementById('inputSeccion').value;
    const valorObligatoria = document.getElementById('selectObligatoria').value;
    const valorActivo = document.getElementById('selectActivo').value;

    if (!validarFormulario()) {
        return;
    }

    fetch('pregunta_editar.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            Id_pregunta: idPregunta,
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
            lanzarToast("Pregunta guardada correctamente", "exito");
            // Redirige a la lista de preguntas de la encuesta tras guardar exitosamente
            setTimeout(() => {
                window.location.href = `./preguntas_lista.html?Id_encuesta=${idEncuesta}`;
            }, 2000);
        })
        .catch(function (error) {
            lanzarToast("No se pudo guardar la pregunta", "error");
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
window.editarPregunta = editarPregunta;
window.validarFormulario = validarFormulario;