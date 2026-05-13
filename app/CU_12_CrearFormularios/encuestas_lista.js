//  Archivo     : encuestas_lista.js
//  Módulo      : CU_12_CrearFormularios
//  Autor       : Daniela Hernandez Hernandez
//  Fecha       : 05/05/2026
//  Descripción : Obtiene y renderiza la lista de encuestas desde el servidor,
//                controla la visibilidad del botón "Nueva Encuesta" y "Editar" según el tipo de usuario.

import { renderMenu } from '../js/menu.js';
import { lanzarToast } from '../js/lanzar_toast.js';
import { obtenerCookie } from '../js/cookie.js';

document.addEventListener('DOMContentLoaded', function () {
    renderMenu();
    fetchEncuestas();
    // Controla la visibilidad del botón "Nueva Encuesta" según el tipo de usuario
    const cookieTipoUsuario = obtenerCookie('Id_tipo_usuario');
    if (cookieTipoUsuario == 1) {
        document.getElementById('btnNuevaEncuesta').style.display = 'block';
    } else if (cookieTipoUsuario == 3) {
        document.getElementById('btnNuevaEncuesta').style.display = 'none';
    } else {
        window.location.href = '../CU_03_PerfilGestionable/perfil.html';
    }
});
// Consulta la lista de encuestas al servidor y las manda a renderizar
function fetchEncuestas() {
    fetch('encuestas_lista.php')
        .then(function (respuesta) {
            return respuesta.json();
        })
        .then(function (respuesta) {
            renderEncuestas(respuesta.data);
        })
        .catch(function (error) {
            lanzarToast("La encuesta no se pudo cargar", "error");
        });
}
// Renderiza cada encuesta como una fila en la tabla, con sus periodos y botones de acción
function renderEncuestas(encuestas) {
    const cookieTipoUsuario = obtenerCookie('Id_tipo_usuario');
    const elTbodyEncuestas = document.getElementById('tbodyEncuestas');
    encuestas.forEach(function (encuesta) {
        // Muestra el botón de editar solo si el usuario es administrador
        const btnEditar = cookieTipoUsuario == 1 ? `<button onclick="window.location.href='encuesta_editar.html?Id_encuesta=${encuesta.Id_encuesta}'">Editar</button>` : '';
        const elFila = document.createElement("tr");
        elFila.innerHTML = `
        <td>${encuesta.Id_encuesta}</td>
        <td>${encuesta.Nombre}</td>
        <td>${encuesta.Descripcion}</td>
        <td>${encuesta.Servicio}</td>
        <td>${encuesta.Activo == 1 ? 'Sí' : 'No'}</td>
        <td>${encuesta.periodos.map(p => `${p.Periodo_tipo} ${p['Periodo_año']}`).join('<br>')}</td>
        <td>${encuesta.Fecha_fin}</td>
        <td>${btnEditar}
        <button onclick="window.location.href='preguntas_lista.html?Id_encuesta=${encuesta.Id_encuesta}'">Ver preguntas</button></td>
        `;
        elTbodyEncuestas.appendChild(elFila);
    });
}