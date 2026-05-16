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
            if (respuesta.error) {
                lanzarToast(respuesta.error, "error");
                return
            }
            if (respuesta.success) {
                renderEncuestas(respuesta.data);
            }
        })
        .catch(function (error) {
            lanzarToast("La encuesta no se pudo cargar", "error");
        });
}

function eliminarEncuesta(Id_encuesta) {
    renderModalConfirmacion(
        `¿Estás seguro de que deseas eliminar la encuesta`, function () {
            fetch(`eliminar.php?Id_encuesta=${Id_encuesta}`, {
                method: "DELETE"
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
                        lanzarToast("Encuesta eliminada", "exito");
                        document.getElementById('tbodyEncuestas').innerHTML = '';
                        fetchEncuestas();
                    }
                })
                .catch(function (error) {
                    lanzarToast("La encuesta no se pudo eliminar", "error");
                });
        }
    )
}
// Crea y muestra un modal de confirmación con botones de cancelar y confirmar
function renderModalConfirmacion(mensaje, onConfirmar) {
    // Elimina el modal previo si existe
    const elModalPrevio = document.getElementById('modal-confirmacion');
    if (elModalPrevio) elModalPrevio.remove();

    const elFondo = document.createElement('div');
    elFondo.id = 'modal-confirmacion';

    const elContenido = document.createElement('div');

    const elParrafo = document.createElement('p');
    elParrafo.textContent = mensaje;

    const elBtnCancelar = document.createElement('button');
    elBtnCancelar.textContent = 'Cancelar';
    elBtnCancelar.addEventListener('click', function () {
        elFondo.remove();
    });

    const elBtnConfirmar = document.createElement('button');
    elBtnConfirmar.textContent = 'Eliminar';
    elBtnConfirmar.addEventListener('click', function () {
        elFondo.remove();
        onConfirmar();
    });
    // Ensambla el modal y lo agrega al body
    elContenido.appendChild(elParrafo);
    elContenido.appendChild(elBtnCancelar);
    elContenido.appendChild(elBtnConfirmar);
    elFondo.appendChild(elContenido);
    document.body.appendChild(elFondo);
}

// Renderiza cada encuesta como una fila en la tabla, con sus periodos y botones de acción
function renderEncuestas(encuestas) {
    const cookieTipoUsuario = obtenerCookie('Id_tipo_usuario');
    const elTbodyEncuestas = document.getElementById('tbodyEncuestas');
    encuestas.forEach(function (encuesta) {
        // Muestra el botón de editar solo si el usuario es administrador
        const btnEditar = cookieTipoUsuario == 1 ? `<button onclick="window.location.href='encuesta_editar.html?Id_encuesta=${encuesta.Id_encuesta}'">Editar</button>` : '';
        const btnEliminar = cookieTipoUsuario == 1 ? `<button onclick="eliminarEncuesta(${encuesta.Id_encuesta})">Eliminar</button>` : '';
        const elFila = document.createElement("tr");
        elFila.innerHTML = `
        <td>${encuesta.Id_encuesta}</td>
        <td>${encuesta.Nombre}</td>
        <td>${encuesta.Descripcion}</td>
        <td>${encuesta.Servicio}</td>
        <td>${encuesta.Activo == 1 ? 'Sí' : 'No'}</td>
        <td>${encuesta.Contestador == 1 ? 'Docentes como alumnos' : 'Alumnos'}</td>
        <td>${encuesta.periodos.map(p => `${p.Periodo_tipo} ${p['Periodo_año']}`).join('<br>')}</td>
        <td>${encuesta.Fecha_fin}</td>
        <td>
            ${btnEditar} 
            ${btnEliminar}
            <button onclick="window.location.href='preguntas_lista.html?Id_encuesta=${encuesta.Id_encuesta}'">Ver preguntas</button>
        </td>
        `;
        elTbodyEncuestas.appendChild(elFila);
    });
}
window.eliminarEncuesta = eliminarEncuesta