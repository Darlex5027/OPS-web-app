/*
Daniela Hernandez Hernandez
Fecha de creacion: 8 de abril del 2026 
El archivo rechazar_alumnos.js cumple una función muy similar al anterior, pero en este caso para 
rechazar alumnos. Cuando se presiona el botón correspondiente, envía la información al servidor 
indicando que el alumno fue rechazado. Después muestra un mensaje al usuario y actualiza la tabla. 
Básicamente, permite eliminar o descartar a los alumnos que no cumplen con los requisitos.
*/
// Importa la función para recargar la tabla de alumnos
import {cargarInformacion} from './obtener_alumnos.js';
// Exporta la función rechazarAlumno para usarla en otros archivos
export {rechazarAlumno};
export {rechazarCoordinador};
// Función para rechazar a un alumno, recibe la matrícula como parámetro
function rechazarAlumno(matricula){
    fetch("procesar_validacion.php", {
        // Realiza una petición al servidor (archivo PHP)
        method: "POST",
        headers:{
            "Content-Type":"application/json"
        },
        // Se envían los datos en formato JSON
        body: JSON.stringify({ matricula: matricula, identificador: "Rechazado"})
    })
    // Convierte la respuesta del servidor a JSON
    .then(function(respuesta){
        return respuesta.json();
    })
    // Procesa la respuesta recibida
    .then(function(datos){
        // Si la operación fue exitosa
        if(datos.success){
            // Muestra un mensaje tipo "toast" indicando rechazo
            lanzarToast("Alumno rechazado con éxito", "error");
            // Recarga la lista de alumnos (actualiza la tabla)
            cargarInformacion();
        }
    })
    // Captura errores en caso de fallo en la petición
    .catch(function(error){
        console.error("Error", error);
    })
}


function rechazarCoordinador(matricula){
    fetch("procesar_validacion.php", {
        // Realiza una petición al servidor (archivo PHP)
        method: "POST",
        headers:{
            "Content-Type":"application/json"
        },
        // Se envían los datos en formato JSON
        body: JSON.stringify({ matricula: matricula, identificador: "Rechazado"})
    })
    // Convierte la respuesta del servidor a JSON
    .then(function(respuesta){
        return respuesta.json();
    })
    // Procesa la respuesta recibida
    .then(function(datos){
        // Si la operación fue exitosa
        if(datos.success){
            // Muestra un mensaje tipo "toast" indicando rechazo
            lanzarToast("Coordinador rechazado con éxito", "error");
            // Recarga la lista de alumnos (actualiza la tabla)
            cargarInformacion();
        }
    })
    // Captura errores en caso de fallo en la petición
    .catch(function(error){
        console.error("Error", error);
    })
}

// Función para mostrar notificaciones tipo "toast"
function lanzarToast(texto, tipo) {
    const toast = document.getElementById('toast-mensaje');
    
    // 1. Limpiamos clases previas y ponemos la nueva
    toast.className = 'toast'; // Resetea a la base
    toast.classList.add(tipo); // Agrega 'exito' o 'error'
    
    // 2. Insertamos el texto
    toast.innerText = texto;
    
    // 3. Mostramos
    toast.classList.remove('oculto');

    // 4. Desvanecemos en 3 segundos
    setTimeout(() => {
        toast.classList.add('oculto');
    }, 3000);
}