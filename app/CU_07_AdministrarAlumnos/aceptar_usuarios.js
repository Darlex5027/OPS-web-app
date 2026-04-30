/*
Daniela Hernandez Hernandez
Fecha de creacion: 8 de abril del 2026 
El archivo aceptar_alumnos.js se encarga de gestionar la acción de aceptar a un alumno. 
Cuando el usuario presiona el botón de aceptar, este script envía la matrícula del alumno 
al servidor junto con un identificador que indica que fue aceptado. Si el proceso se realiza 
correctamente, muestra un mensaje de confirmación y vuelve a cargar la tabla para reflejar los 
cambios. Su función principal es actualizar el estado del alumno a aceptado.
*/

// Importa la función cargarAlumnos desde otro archivo JS
import { cargarInformacion } from './admin_usuarios.js';
import { lanzarToast } from '../js/lanzar_toast.js';
// Exporta la función aceptarAlumno para que pueda usarse en otros archivos
export { aceptarAlumno };
export { aceptarCoordinador };
// Función para aceptar a un alumno, recibe la matrícula como parámetro
function aceptarAlumno(matricula) {
    renderModalExpediente(
        'Añadir No. de expediente', matricula, function (expediente) {
            fetch("cargar_expediente.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    matricula: matricula,
                    no_expediente: expediente
                })

            })
                .then(function (respuesta) {
                    return respuesta.json();
                })
                .then(function (datosExp) {
                    if (datosExp.error) {
                        lanzarToast(datosExp.error, "error");
                        return
                    }
                    if (datosExp.success) {
                        // Se hace una petición al servidor (PHP) usando fetch
                        return fetch("procesar_validacion.php", {
                            method: "POST",// Método de envío
                            headers: {
                                "Content-Type": "application/json"
                            },
                            // Convertimos los datos a formato JSON
                            body: JSON.stringify({ matricula: matricula, identificador: "Aceptado" })
                        });
                    } else {
                        lanzarToast("error al guardar el expediente", "error");
                    }
                })
                .then(function (respuesta) {
                    if (!respuesta) return; // Si hubo error antes, no continuar
                    return respuesta.json();
                })
                // Procesamos los datos recibidos del servidor
                .then(function (datos) {
                    if (datos.error) {
                        lanzarToast(datos.error, "error");
                        return
                    }
                    if (datos.success) {
                        lanzarToast("¡Expediente guardado y alumno aceptado!", "exito");
                        cargarInformacion();
                    }
                })
                // Captura errores en caso de que falle la petición
                .catch(function (error) {
                    lanzarToast("No se pudo aceptar al alumno", "error");
                })
        }
    )
}

function aceptarCoordinador(matricula) {
    // Se hace una petición al servidor (PHP) usando fetch
    fetch("procesar_validacion.php", {
        method: "POST",// Método de envío
        headers: {
            "Content-Type": "application/json"
        },
        // Convertimos los datos a formato JSON
        body: JSON.stringify({ matricula: matricula, identificador: "Aceptado" })
    })
        // Convertimos la respuesta a formato JSON
        .then(function (respuesta) {
            return respuesta.json();
        })
        // Procesamos los datos recibidos del servidor
        .then(function (datos) {
            // Si la operación fue exitosa
            if (datos.success) {
                // Mostramos un mensaje tipo "toast"
                lanzarToast("¡Coordinador aceptado correctamente!    ", "exito");
                // Volvemos a cargar la lista de alumnos (actualiza la tabla)
                cargarInformacion();
            }
        })
        // Captura errores en caso de que falle la petición
        .catch(function (error) {
            lanzarToast("No se pudo aceptar al coordinador", "error");
        })
}

function renderModalExpediente(mensaje, matricula, onConfirmar) {
    const elModalPrevio = document.getElementById('modal-confirmacion');
    if (elModalPrevio) elModalPrevio.remove();

    const elFondo = document.createElement('div');
    elFondo.id = 'modal-confirmacion';

    const elContenido = document.createElement('div');
    elContenido.id = 'modal-contenido';

    const elParrafo = document.createElement('p');
    elParrafo.textContent = mensaje;

    const elInputExpediente = document.createElement('input');
    elInputExpediente.type = 'text';
    elInputExpediente.id = 'intput_expediente';

    const elBtnEnviar = document.createElement('button');
    elBtnEnviar.textContent = 'Enviar';

    elBtnEnviar.onclick = function () {
        const valor = elInputExpediente.value;
        if (valor !== "") {
            onConfirmar(valor);
            elFondo.remove();
        }
    }

    const elBtnCancelar = document.createElement('button');
    elBtnCancelar.textContent = 'Cancelar';
    elBtnCancelar.onclick = function () {
        elFondo.remove();
    };

    elContenido.appendChild(elParrafo);
    elContenido.appendChild(elBtnCancelar);
    elContenido.appendChild(elBtnEnviar);
    elContenido.appendChild(elInputExpediente);
    elFondo.appendChild(elContenido);
    document.body.appendChild(elFondo);
}
