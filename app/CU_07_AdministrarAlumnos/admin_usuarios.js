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
export { cargarInformacion };
// Importa las funciones para aceptar y rechazar alumnos
import { aceptarAlumno } from './aceptar_usuarios.js';
import { rechazarAlumno } from './rechazar_usuarios.js';
import { rechazarCoordinador } from './rechazar_usuarios.js';
import { aceptarCoordinador } from './aceptar_usuarios.js';
import { obtenerCookie } from '../js/cookie.js';
import { lanzarToast } from '../js/lanzar_toast.js';

import { renderMenu } from '../js/menu.js';
//window lo convierte en objeto global
window.aceptarCoordinador = aceptarCoordinador;
window.rechazarCoordinador = rechazarCoordinador;
window.aceptarAlumno = aceptarAlumno;
window.rechazarAlumno = rechazarAlumno;
//------------------window.obtenerCookie = obtenerCookie;

// Espera a que el DOM (HTML) esté completamente cargado
document.addEventListener("DOMContentLoaded", function () {
    renderMenu();
    // Llama a la función para cargar los usuarios al iniciar la página
    if (obtenerCookie('Id_tipo_usuario') == "1") {
        console.log(obtenerCookie('Id_tipo_usuario'))
        document.getElementById("div-coordinadores").style.display = "block"
        document.getElementById("div-alumnos").style.display = "block"
        cargarInformacion();
    } else if (obtenerCookie('Id_tipo_usuario') == "2") {
        document.getElementById("div-coordinadores").style.display = "none"
        document.getElementById("div-alumnos").style.display = "none"
        cargarInformacion();
    } else if (obtenerCookie('Id_tipo_usuario') == "3") {
        document.getElementById("div-coordinadores").style.display = "none"
        document.getElementById("div-alumnos").style.display = "block"
        cargarInformacion();
    }
});

// Función que obtiene los coordinadores pendientes desde el servidor
function cargarInformacion() {
    const tipoUsuario = obtenerCookie('Id_tipo_usuario');
    // Hace una petición al archivo PHP
    fetch("obtener_usuarios_pendientes.php")
        // Convierte la respuesta a JSON
        .then(function (respuesta) {
            return respuesta.json();
        })
        // Envía los datos a la función que llena la tabla
        .then(function (datos) {
            if (datos.error) {
                lanzarToast(datos.error, "error");
                return
            }
            if (tipoUsuario == '1') {
                renderTablaAlumnos(datos.alumnos);
                renderTablaCoordinadores(datos.coordinadores);
            } else if (tipoUsuario == '3') {
                renderTablaAlumnos(datos.alumnos);
            } else if (tipoUsuario == '2') {
                window.location.href = '../CU_03_PerfilGestionable/perfil.html'
            }
        })
        // Captura errores en caso de fallo
        .catch(function (error) {
            lanzarToast("No se pudieron cargar", "error");
        })
}


// Función que llena la tabla con los datos recibidos
function renderTablaAlumnos(alumnos) {
    // Obtiene el elemento <tbody> donde se insertarán las filas
    const elTbodyAlumnos = document.getElementById("tabla-alumnos");
    // Limpia la tabla antes de volver a llenarla
    elTbodyAlumnos.innerHTML = "";

    // Si no hay alumnos pendientes
    if (alumnos.length == 0) {
        
        setTimeout(() => {
            lanzarToast("¡No hay alumnos pendientes!    ", "error");
        }, 3000);
    } else {
        // Recorre el arreglo de alumnos
        alumnos.forEach(function (alumno) {
            // Crea una nueva fila
            const elFila = document.createElement("tr");

            // Inserta el contenido de la fila usando template literals
            elFila.innerHTML = `
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
            elTbodyAlumnos.appendChild(elFila);
        });
    }
}

// Función que llena la tabla con los datos recibidos
function renderTablaCoordinadores(coordinador) {
    // Obtiene el elemento <tbody> donde se insertarán las filas
    const elTbodyCoordinadores = document.getElementById("tabla-coordinadores");
    // Limpia la tabla antes de volver a llenarla
    elTbodyCoordinadores.innerHTML = "";

    // Si no hay alumnos pendientes
    if (coordinador.length == 0) {
        lanzarToast("No hay coordinadores pendientes", "error");
    } else {
        // Recorre el arreglo de alumnos
        coordinador.forEach(function (coordinador) {
            // Crea una nueva fila
            const elFila = document.createElement("tr");

            // Inserta el contenido de la fila usando template literals
            elFila.innerHTML = `
        <td>${coordinador.Nombre_Completo}</td>
        <td>${coordinador.Matricula}</td>
        <td>${coordinador.Nombre_Carrera}</td>
        <td>${coordinador.Fecha_registro}</td>
        <td>${coordinador.Telefono}</td>
        <td>${coordinador.Correo}</td>
        <!-- Botón para aceptar alumno -->
        <td><button onclick="aceptarCoordinador('${coordinador.Matricula}')">Aceptar</button> 
        <!-- Botón para rechazar alumno -->
        <button onclick="rechazarCoordinador('${coordinador.Matricula}')">Rechazar</button></td>
        `;
            // Agrega la fila al tbody
            elTbodyCoordinadores.appendChild(elFila);
        });
    }
}
