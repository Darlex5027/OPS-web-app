//  Archivo     : preguntas_lista.js
//  Módulo      : CU_12_CrearFormularios
//  Autor       : Daniela Hernandez Hernandez
//  Fecha       : 05/05/2026
//  Descripción : Obtiene y renderiza las preguntas de una encuesta, controla la visibilidad
//                del botón de nueva pregunta y la columna de acción según respuestas registradas.

import { renderMenu } from '../js/menu.js';
import { lanzarToast } from '../js/lanzar_toast.js';
import { obtenerCookie } from '../js/cookie.js';

document.addEventListener('DOMContentLoaded', function () {
    renderMenu();
    const params = new URLSearchParams(window.location.search);
    const idEncuesta = params.get('Id_encuesta');
    fetchPreguntas(idEncuesta);
    // Asigna el evento al botón de nueva pregunta con el ID de encuesta en la URL
    document.getElementById('btnNuevaPregunta').onclick = function () {
        window.location.href = `pregunta_form.html?Id_encuesta=${idEncuesta}`;
    };
    // Controla la visibilidad del botón y columna de acción según el tipo de usuario
    const cookieTipoUsuario = obtenerCookie('Id_tipo_usuario');
    if (cookieTipoUsuario == 1) {
        document.getElementById('btnNuevaPregunta').style.display = 'block';
        document.getElementById('elAccion').style.display = 'block';
    } else if (cookieTipoUsuario == 3) {
        document.getElementById('btnNuevaPregunta').style.display = 'none';
        document.getElementById('elAccion').style.display = 'none';
    }
});
// Consulta las preguntas de la encuesta al servidor y las manda a renderizar
function fetchPreguntas(idEncuesta) {
    fetch('preguntas_lista.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            Id_encuesta: idEncuesta
        })
    })
        .then(function (respuesta) {
            return respuesta.json();
        })
        .then(function (respuesta) {
            renderPreguntas(respuesta.data, idEncuesta);
        })
        .catch(function (error) {
            lanzarToast("La encuesta no se pudo cargar", "error");
        });
}
// Renderiza las preguntas en la tabla y controla visibilidad según respuestas registradas
function renderPreguntas(preguntas, idEncuesta) {
    const cookieTipoUsuario = obtenerCookie('Id_tipo_usuario');
    const elTbodyPreguntas = document.getElementById('tbodyPreguntas');
    // Si alguna pregunta tiene respuestas, oculta el botón y la columna de acción
    const tieneRespuestas = preguntas.some(function (pregunta) {
        return pregunta.total_respuestas > 0;
    });
    if (tieneRespuestas) {
        document.getElementById('btnNuevaPregunta').style.display = 'none';
        document.getElementById('elAccion').style.display = 'none';
    }
    else {
        document.getElementById('btnNuevaPregunta').style.display = 'block';
        document.getElementById('elAccion').style.display = 'block';
    }
    preguntas.forEach(function (pregunta) {
        // Muestra el botón de editar solo si es admin y la pregunta no tiene respuestas
        const btnEditar = cookieTipoUsuario == 1 && pregunta.total_respuestas == 0 ? `<td><button onclick="window.location.href='pregunta_editar.html?Id_pregunta=${pregunta.Id_pregunta}&Id_encuesta=${idEncuesta}'">Editar</button></td>` : '';
        const elFila = document.createElement("tr");
        elFila.innerHTML = `
        <td>${pregunta.Seccion}</td>
        <td>${pregunta.Orden}</td>
        <td>${pregunta.Pregunta}</td>
        <td>${pregunta.Tipo_respuesta}</td>
        <td>${pregunta.Obligatoria == 1 ? 'Sí' : 'No'}</td>
        <td>${pregunta.Activo == 1 ? 'Sí' : 'No'}</td>
        ${btnEditar}
        `;
        elTbodyPreguntas.appendChild(elFila);
    });
}