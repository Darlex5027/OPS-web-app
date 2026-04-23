/*
Daniela Hernandez Hernandez
Fecha de creacion: 8 de abril del 2026 
El archivo obtener_alumnos.js tiene como propósito cargar y mostrar los alumnos pendientes en 
la tabla. Este script se ejecuta cuando la página termina de cargar y realiza una petición al 
servidor para obtener los datos. Una vez que recibe la información en formato JSON, construye 
dinámicamente las filas de la tabla e inserta los datos de cada alumno, incluyendo los botones 
para aceptar o rechazar. Es el encargado de conectar los datos del backend con la interfaz.
*/
// Exporta la función cargarAlumnos para que pueda usarse en otros archivos
export { cargarAlumnos };
// Importa las funciones para aceptar y rechazar alumnos
import { aceptarAlumno } from './aceptar_alumnos.js';
import { rechazarAlumno } from './rechazar_alumnos.js';

//window lo convierte en objeto global
window.aceptarAlumno = aceptarAlumno;
window.rechazarAlumno = rechazarAlumno;

// Espera a que el DOM (HTML) esté completamente cargado
document.addEventListener("DOMContentLoaded", function () {
    // Llama a la función para cargar los alumnos al iniciar la página
    cargarAlumnos();
});
// Función que obtiene los alumnos pendientes desde el servidor
function cargarAlumnos() {
    // Hace una petición al archivo PHP
    fetch("obtener_alumnos_pendientes.php")
        // Convierte la respuesta a JSON
        .then(function (respuesta) {
            return respuesta.json();
        })
        // Envía los datos a la función que llena la tabla
        .then(function (datos) {
            llenarTabla(datos);
        })
        // Captura errores en caso de fallo
        .catch(function (error) {
            console.error("Error", error);
        })
}

// Función que llena la tabla con los datos recibidos
function llenarTabla(alumnos) {
    // Obtiene el elemento <tbody> donde se insertarán las filas
    const TBODY = document.getElementById("tabla");
    // Limpia la tabla antes de volver a llenarla
    TBODY.innerHTML = "";

    // Si no hay alumnos pendientes
    if (alumnos.length == 0) {
        alert("No hay alumnos pendientes")
    } else {
        // Recorre el arreglo de alumnos
        alumnos.forEach(function (alumno) {
            // Crea una nueva fila
            const FILA = document.createElement("tr");

            // Inserta el contenido de la fila usando template literals
            FILA.innerHTML = `
        <td>${alumno.Nombre_Completo}</td>
        <td>${alumno.Matricula}</td>
        <td>${alumno.Nombre_Carrera}</td>
        <td>${alumno.Fecha_registro}</td>
        <td>${alumno.Servicio}</td>
        <!-- Botón para aceptar alumno -->
        <td><button onclick="aceptarAlumno('${alumno.Matricula}')">Aceptar</button> 
        <!-- Botón para rechazar alumno -->
        <button onclick="rechazarAlumno('${alumno.Matricula}')">Rechazar</button></td>
        `;
        // Agrega la fila al tbody
            TBODY.appendChild(FILA);
        });
    }
}
