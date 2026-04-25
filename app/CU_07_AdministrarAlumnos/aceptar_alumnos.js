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
import {cargarInformacion} from './obtener_alumnos.js';
// Exporta la función aceptarAlumno para que pueda usarse en otros archivos
export {aceptarAlumno};
export {aceptarCoordinador};
export {lanzarToast};
// Función para aceptar a un alumno, recibe la matrícula como parámetro
function aceptarAlumno(matricula){
    // Se hace una petición al servidor (PHP) usando fetch
    fetch("procesar_validacion.php", {
        method: "POST",// Método de envío
        headers:{
            "Content-Type":"application/json"
        },
        // Convertimos los datos a formato JSON
        body: JSON.stringify({ matricula: matricula, identificador:"Aceptado" })
    })
    // Convertimos la respuesta a formato JSON
    .then(function(respuesta){
        return respuesta.json();
    })
    // Procesamos los datos recibidos del servidor
    .then(function(datos){
        // Si la operación fue exitosa
        if(datos.success){
            // Mostramos un mensaje tipo "toast"
            lanzarToast("¡Alumno aceptado correctamente!    ", "exito");
             // Volvemos a cargar la lista de alumnos (actualiza la tabla)
            cargarInformacion();
        }
    })
    // Captura errores en caso de que falle la petición
    .catch(function(error){
        console.error("Error", error);
    })
}

function aceptarCoordinador(matricula){
    // Se hace una petición al servidor (PHP) usando fetch
    fetch("procesar_validacion.php", {
        method: "POST",// Método de envío
        headers:{
            "Content-Type":"application/json"
        },
        // Convertimos los datos a formato JSON
        body: JSON.stringify({ matricula: matricula, identificador:"Aceptado" })
    })
    // Convertimos la respuesta a formato JSON
    .then(function(respuesta){
        return respuesta.json();
    })
    // Procesamos los datos recibidos del servidor
    .then(function(datos){
        // Si la operación fue exitosa
        if(datos.success){
            // Mostramos un mensaje tipo "toast"
            lanzarToast("¡Coordinador aceptado correctamente!    ", "exito");
             // Volvemos a cargar la lista de alumnos (actualiza la tabla)
            cargarInformacion();
        }
    })
    // Captura errores en caso de que falle la petición
    .catch(function(error){
        console.error("Error", error);
    })
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