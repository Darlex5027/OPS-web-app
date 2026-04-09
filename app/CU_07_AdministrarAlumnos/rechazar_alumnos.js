import {cargarAlumnos} from './obtener_alumnos.js';
export {rechazarAlumno};
function rechazarAlumno(matricula){
    fetch("procesar_validacion.php", {
        method: "POST",
        headers:{
            "Content-Type":"application/json"
        },
        body: JSON.stringify({ matricula: matricula, identificador: "Rechazado"})
    })
    .then(function(respuesta){
        return respuesta.json();
    })
    .then(function(datos){
        if(datos.success){
            alert("Alumno rechazado");
            cargarAlumnos();
        }
    })
    .catch(function(error){
        console.error("Error", error);
    })
}