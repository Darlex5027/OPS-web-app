/*
    Archivo: mostrar_respuesta_individual.js
    Módulo: CU_09_ReporteEstadistico
    Autor: Alejandro Resendiz Reyes
    Fecha: 29/04/2026
    Descripción: Este archivo se encarga de mostrar la respuesta individual de un alumno a una encuesta específica.
                 Se obtiene la respuesta individual a través de una petición al servidor y se renderiza en una tabla.
                 También se manejan los casos en los que no se encuentran resultados para los filtros seleccionados, 
                 mostrando un mensaje de error y ocultando los botones de Excel y PDF.
*/

import { lanzarToast } from "../js/lanzar_toast.js";

window.handleRespuestaIndividual = handleRespuestaIndividual;

const elTablaRespuestaIndividual = document.getElementById('Tabla-respuesta-individual');
const elTitulosRespuestaIndividual = document.getElementById('Titulos-respuesta-individual');
const elCuerpoRespuestaIndividual = document.getElementById('Cuerpo-respuesta-individual');
const elTituloRespuestaIndividual = document.getElementById('Titulo-respuesta-individual');
const elDivTablaRespuestaIndividual = document.getElementById('div-respuesta-individual');


const elEncuestas = document.getElementById('slctEncuestas');

// Se obtienen los botones para generar Excel y PDF
const elBtnExcelIndividual = document.getElementById("btnGenerarExcelIndividual");
const elBtnPDFIndividual = document.getElementById("btnGenerarPDFIndividual");
const elPeriodo_tipo = document.getElementById('slctPeriodoTipo');
const elPeriodo_anio = document.getElementById('slctPeriodoAnio');

const elBtnCargarPendientes = document.getElementById('btnCargarPendientes');   
const elBtnCargarResumen = document.getElementById('btnCargarResumen');
const elBtnCargarEntregados = document.getElementById('btnCargarEntregados');

elBtnCargarEntregados.addEventListener("click", function() {
    elDivTablaRespuestaIndividual.style.display = "none";
    limpiarTablaRespuestaIndividual();  
});

elBtnCargarResumen.addEventListener("click", function() {
    elDivTablaRespuestaIndividual.style.display = "none";
    limpiarTablaRespuestaIndividual();  
});


elBtnCargarPendientes.addEventListener("click", function() {
    elDivTablaRespuestaIndividual.style.display = "none";
    limpiarTablaRespuestaIndividual();  
});

elEncuestas.addEventListener("change", function() {
    elDivTablaRespuestaIndividual.style.display = "none";
    limpiarTablaRespuestaIndividual();  
});



function fetchRespuestaIndividual(matricula_alumno) {
    const id_encuesta = elEncuestas.value;
    return fetch("./obtener_respuesta_individual.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ Id_encuesta: id_encuesta, Matricula_alumno: matricula_alumno })
    })
        .then(function (respuesta) {
            return respuesta.json();
        });
};

function limpiarTablaRespuestaIndividual() {
    elTitulosRespuestaIndividual.innerHTML = "";
    elCuerpoRespuestaIndividual.innerHTML = "";
    elTituloRespuestaIndividual.innerHTML = "";
}

function renderTabla(nombre_alumno, nombre_encuesta, respuesta) {
    mostrarBotones();
    elTituloRespuestaIndividual.innerHTML = "<h2>Nombre de la encuesta: " + nombre_encuesta + "</h2>";
    elTituloRespuestaIndividual.innerHTML = elTituloRespuestaIndividual.innerHTML + "<h2>Respuesta individual del alumno: " + nombre_alumno + "</h2>";

    // Si la impresión es de tamaño 0 significa que la respuesta es un mensaje
    // por lo que no se encontraron resultados.
    if (respuesta.length == 0) {
        // Si no se encontraron resultados para los filtros seleccionados,
        // se muestra un mensaje de error y se ocultan los botones de Excel y PDF
        lanzarToast("No se encontraron Resultados", "error");
        ocultarBotones();
        return;
    }

    // Renderizado de los títulos de la tabla
    // Definimos los títulos fijos para las columnas
    const titulos = Object.keys(respuesta[0]);
    titulos.forEach(function (titulo) {
        elTitulosRespuestaIndividual.innerHTML = elTitulosRespuestaIndividual.innerHTML + "<th>" + titulo + "</th>";
    });

    // Renderizado de las filas de la tabla.
    respuesta.forEach(function (fila) {
        // Verificar si es una respuesta de texto (tiene el texto en Deficiente y las demás columnas vacías)
        const esRespuestaTexto = fila.Deficiente && !fila.Suficiente && !fila.Bien && !fila["Muy bien"] && !fila.Excelente;
        
        if (esRespuestaTexto && fila.Deficiente !== "Deficiente") {
            // Para respuestas de texto: una sola celda que abarca las 5 columnas de respuestas
            let htmlFila = "<tr>";
            htmlFila += "<td>" + fila.seccion + "</td>";
            htmlFila += "<td>" + fila.pregunta + "</td>";
            
            // Celda combinada para las 5 columnas de calificaciones
            htmlFila += "<td colspan='5'>" + fila.Deficiente + "</td>";
            htmlFila += "</tr>";
            elCuerpoRespuestaIndividual.innerHTML += htmlFila;
        } else {
            // Para respuestas numéricas: mostrar normal con 6 columnas
            let htmlFila = "<tr>";
            htmlFila += "<td>" + fila.seccion + "</td>";
            htmlFila += "<td>" + fila.pregunta + "</td>";
            htmlFila += "<td>" + (fila.Deficiente || "") + "</td>";
            htmlFila += "<td>" + (fila.Suficiente || "") + "</td>";
            htmlFila += "<td>" + (fila.Bien || "") + "</td>";
            htmlFila += "<td>" + (fila["Muy bien"] || "") + "</td>";
            htmlFila += "<td>" + (fila.Excelente || "") + "</td>";
            htmlFila += "</tr>";
            elCuerpoRespuestaIndividual.innerHTML += htmlFila;
        }
    });

    // Se muestran los botones para generar Excel y PDF después de cargar la tabla de resultados
    mostrarBotones();
}

function ocultarBotones() {
    elBtnExcelIndividual.style.display = "none";
    elBtnPDFIndividual.style.display = "none";
}

function mostrarBotones() {
    elBtnExcelIndividual.style.display = "block";
    elBtnPDFIndividual.style.display = "block";
}

function mostrarTabla() {
    elDivTablaRespuestaIndividual.style.display = "block";
}


function handleRespuestaIndividual(matricula_alumno) {
    limpiarTablaRespuestaIndividual();  
    fetchRespuestaIndividual(matricula_alumno)
        // Se obtiene un arreglo de objetos con los resultados de la consulta
        .then(function (respuesta) {
            if (respuesta.error) {
                // Si hay un error al obtener los datos del reporte, 
                // se muestra un mensaje de error y se ocultan los botones de Excel y PDF
                lanzarToast(respuesta.error, "error");

                ocultarBotones();
                return
            }
    
            renderTabla(respuesta.nombre_alumno, respuesta.nombre_encuesta, respuesta.respuesta_individual);
        });
    // Procesar la respuesta y renderizar la tabla


    mostrarTabla();
}
