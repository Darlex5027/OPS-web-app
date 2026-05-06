/*
Daniela Hernandez Hernandez
Fecha de creacion: 8 de abril del 2026 
El archivo rechazar_alumnos.js cumple una función muy similar al anterior, pero en este caso para 
rechazar alumnos. Cuando se presiona el botón correspondiente, envía la información al servidor 
indicando que el alumno fue rechazado. Después muestra un mensaje al usuario y actualiza la tabla. 
Básicamente, permite eliminar o descartar a los alumnos que no cumplen con los requisitos.
*/
// Importa la función para recargar la tabla de alumnos
import { cargarInformacion } from './admin_usuarios.js';
import { lanzarToast } from '../js/lanzar_toast.js';
// Exporta la función rechazarAlumno para usarla en otros archivos
export { rechazarAlumno };
export { rechazarCoordinador };
// Función para rechazar a un alumno, recibe la matrícula como parámetro
function rechazarAlumno(matricula) {
    renderModalConfirmacion(
        `¿Estás seguro de que deseas rechazar al alumno con matrícula ${matricula}?`,
        function () {
            fetch("procesar_validacion.php", {
                // Realiza una petición al servidor (archivo PHP)
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                // Se envían los datos en formato JSON
                body: JSON.stringify({ matricula: matricula, identificador: "Rechazado" })
            })
                // Convierte la respuesta del servidor a JSON
                .then(function (respuesta) {
                    return respuesta.json();
                })
                // Procesa la respuesta recibida
                .then(function (datos) {
                    if (datos.error) {
                        lanzarToast(datos.error, "error");
                        return
                    }
                    // Si la operación fue exitosa
                    if (datos.success) {
                        // Muestra un mensaje tipo "toast" indicando rechazo
                        lanzarToast("Alumno rechazado con éxito", "error");
                        // Recarga la lista de alumnos (actualiza la tabla)
                        cargarInformacion();
                    }
                })
                // Captura errores en caso de fallo en la petición
                .catch(function (error) {
                    lanzarToast("No se pudo rechazar al alumno", "error");
                })
        }
    )
}


function rechazarCoordinador(matricula) {
    renderModalConfirmacion(
        `¿Estás seguro de que deseas rechazar al docente con matrícula ${matricula}?`, function () {
            fetch("procesar_validacion.php", {
                // Realiza una petición al servidor (archivo PHP)
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                // Se envían los datos en formato JSON
                body: JSON.stringify({ matricula: matricula, identificador: "Rechazado" })
            })
                // Convierte la respuesta del servidor a JSON
                .then(function (respuesta) {
                    return respuesta.json();
                })
                // Procesa la respuesta recibida
                .then(function (datos) {
                    if (datos.error) {
                        lanzarToast(datos.error, "error");
                        return
                    }
                    // Si la operación fue exitosa
                    if (datos.success) {
                        // Muestra un mensaje tipo "toast" indicando rechazo
                        lanzarToast("Coordinador rechazado con éxito", "error");
                        // Recarga la lista de alumnos (actualiza la tabla)
                        cargarInformacion();
                    }
                })
                // Captura errores en caso de fallo en la petición
                .catch(function (error) {
                    lanzarToast("No se pudo rechazar al coordinador", "error");
                })
        }
    )
}

function renderModalConfirmacion(mensaje, onConfirmar) {
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
    elBtnConfirmar.textContent = 'Rechazar';
    elBtnConfirmar.addEventListener('click', function () {
        elFondo.remove();
        onConfirmar();
    });

    elContenido.appendChild(elParrafo);
    elContenido.appendChild(elBtnCancelar);
    elContenido.appendChild(elBtnConfirmar);
    elFondo.appendChild(elContenido);
    document.body.appendChild(elFondo);
}
