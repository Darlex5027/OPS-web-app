import {cargarAlumnos} from './obtener_alumnos.js';
export {aceptarAlumno};
function aceptarAlumno(matricula){
    fetch("procesar_validacion.php", {
        method: "POST",
        headers:{
            "Content-Type":"application/json"
        },
        body: JSON.stringify({ matricula: matricula, identificador:"Aceptado" })
    })
    .then(function(respuesta){
        return respuesta.json();
    })
    .then(function(datos){
        if(datos.success){
            lanzarToast("¡Alumno aceptado correctamente!    ", "exito");
            cargarAlumnos();
        }
    })
    .catch(function(error){
        console.error("Error", error);
    })
}

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