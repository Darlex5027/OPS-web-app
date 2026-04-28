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
import { cargarInformacion } from './obtener_alumnos.js';
// Exporta la función aceptarAlumno para que pueda usarse en otros archivos
export { aceptarAlumno };
export { aceptarCoordinador };
export { lanzarToast };
// Función para aceptar a un alumno, recibe la matrícula como parámetro
function aceptarAlumno(matricula) {
    mostrarModal(
        'Añadir No. de expediente', matricula, function (expediente) {
            console.log(expediente);
            fetch("cargar_expediente.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    matricula: matricula,
                    no_expediente: expediente
                })
                
            })
            .then(function (res) {
                console.log("Status:", res.status);
                return res.json();
            })
                .then(function (dataExp) {
                    
                if (dataExp.success) {
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
                if (!datos) return;
                if (datos.success) {
                    lanzarToast("¡Expediente guardado y alumno aceptado!", "exito");
                    cargarInformacion();
                }
            })
                // Captura errores en caso de que falle la petición
                .catch(function (error) {
                    console.error("Error", error);
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
            console.error("Error", error);
        })
}

function mostrarModal(mensaje, matricula, onConfirmar) {
    const previo = document.getElementById('modal-confirmacion');
    if (previo) previo.remove();

    const fondo = document.createElement('div');
    fondo.id = 'modal-confirmacion';

    const contenido = document.createElement('div');
    contenido.id = 'modal-contenido';

    const parrafo = document.createElement('p');
    parrafo.textContent = mensaje;

    const intputExp = document.createElement('input');
    intputExp.type = 'text';
    intputExp.id = 'intput_expediente';

    const btsEnviar = document.createElement('button');
    btsEnviar.textContent = 'Enviar';

    btsEnviar.onclick = function () {
        const valor = intputExp.value;
        if (valor !== "") {
            onConfirmar(valor);
            fondo.remove();
        }
    }

    const btnCancelar = document.createElement('button');
    btnCancelar.textContent = 'Cancelar';
    btnCancelar.onclick = function () {
        fondo.remove();
    };

    contenido.appendChild(parrafo);
    contenido.appendChild(btnCancelar);
    contenido.appendChild(btsEnviar);
    contenido.appendChild(intputExp);
    fondo.appendChild(contenido); 
    document.body.appendChild(fondo);
}

// Función para mostrar mensajes emergentes (toast)
function lanzarToast(texto, tipo) {
    // Obtiene el elemento del DOM donde se mostrará el mensaje
    const toast = document.getElementById('toast-mensaje');

    // 1. Limpiamos clases previas y ponemos la nueva
    toast.className = 'toast'; // Resetea a la base
    toast.classList.add(tipo); // Agrega 'exito' o 'error'

    // 2. Insertamos el texto
    toast.innerText = texto;

    // 3. Mostramos el toast
    toast.classList.remove('oculto');

    // 4. Desvanecemos en 3 segundos
    setTimeout(() => {
        toast.classList.add('oculto');
    }, 3000);
}