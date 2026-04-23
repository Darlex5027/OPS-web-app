export {cargarAlumnos};
import {aceptarAlumno} from './aceptar_alumnos.js';
import {rechazarAlumno} from './rechazar_alumnos.js';

//window lo convierte en objeto global
window.aceptarAlumno=aceptarAlumno;
window.rechazarAlumno=rechazarAlumno;

document.addEventListener("DOMContentLoaded", function () {
  cargarAlumnos();
});

function cargarAlumnos(){
    fetch("obtener_alumnos_pendientes.php")
    .then(function(respuesta){
        return respuesta.json();
    })
    .then(function(datos){
        llenarTabla(datos);
    })
    .catch(function(error){
        console.error("Error", error);
    })
}

function llenarTabla(alumnos){
    const TBODY = document.getElementById("tabla");
    TBODY.innerHTML="";
    
    if(alumnos.length==0){
        alert("No hay alumnos pendientes")
    }else{
        alumnos.forEach(function(alumno) {
        const FILA = document.createElement("tr"); 

        FILA.innerHTML=`
        <td>${alumno.Nombre_Completo}</td>
        <td>${alumno.Matricula}</td>
        <td>${alumno.Nombre_Carrera}</td>
        <td>${alumno.Fecha_registro}</td>
        <td>${alumno.Servicio}</td>
        <td><button onclick="aceptarAlumno('${alumno.Matricula}')">Aceptar</button> 
            <button onclick="rechazarAlumno('${alumno.Matricula}')">Rechazar</button></td>
        `;

        TBODY.appendChild(FILA);
    });   
    }
}
