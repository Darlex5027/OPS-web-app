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
            alert("Alumno aceptado");
            cargarAlumnos();
        }
    })
    .catch(function(error){
        console.error("Error", error);
    })
}