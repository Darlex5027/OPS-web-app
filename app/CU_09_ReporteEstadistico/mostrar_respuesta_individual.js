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

const elTablaRespuestaIndividual = document.getElementById('Tabla-respuesta-individuale');
const elTitulosRespuestaIndividual = document.getElementById('Titulos-respuesta-individual');
const elCuerpoRespuestaIndividual = document.getElementById('Cuerpo-respuesta-individual');
const elTituloRespuestaIndividual = document.getElementById('Titulo-respuesta-individual');
const elDivTablaRespuestaIndividual = document.getElementById('div-respuesta-individual');


const elEncuestas = document.getElementById('slctEncuestas');

// Se obtienen los botones para generar Excel y PDF
const elBtnExcel = document.getElementById("btnGenerarExcel");
const elBtnPDF = document.getElementById("btnGenerarPDF");
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


    elTituloRespuestaIndividual.innerHTML = "<h2>Nombre de la encuesta: " + nombre_encuesta + "</h2>";
    elTituloRespuestaIndividual.innerHTML = elTituloRespuestaIndividual.innerHTML + "<h2>Respuesta individual del alumno: " + nombre_alumno + "</h2>";

    //Si la impresión es de tamaño 0 significa que la respuesta es un mensaje
    //por lo que no se encontraron resultados.
    if (respuesta.length == 0) {
        // Si no se encontraron resultados para los filtros seleccionados,
        // se muestra un mensaje de error y se ocultan los botones de Excel y PDF
        lanzarToast("No se encontraron Resultados", "error");
        elBtnExcel.style.display = "none";
        elBtnPDF.style.display = "none";
        return;
    }

    // Renderizado de los títulos de la tabla, se toma el primer elemento de la 
    // impresión para obtener los títulos de las columnas
    Object.keys(respuesta[0]).forEach(function (titulo) {
        // Por cada título, se agrega una celda de encabezado a la fila de títulos de la tabla
        elTitulosRespuestaIndividual.innerHTML = elTitulosRespuestaIndividual.innerHTML + "<th>" + titulo + "</th>"
    });
    // Renderizado de las filas de la tabla.
    respuesta.forEach(function (fila) {
        // Se crea una variable para almacenar la estructura HTML de la fila de la tabla
        let HtmlFila = "";

        // Se inicia la estructura de la fila con la etiqueta <tr>
        HtmlFila = HtmlFila + "<tr>";
        // Por cada dato en la fila, se agrega una celda a la estructura HTML de la fila
        Object.keys(fila).forEach(function (dato) {
            // Se agrega una celda a la estructura HTML de la fila con el valor del dato correspondiente

            // Escala de respuestas: 1=Deficiente, 2=Suficiente, 3=Bien, 4=Muy bien, 5=Excelente
            let respuesta_texto = "";   
            switch (fila[dato]) {
                case "1":
                    respuesta_texto = "Deficiente";
                    break;
                case "2":
                    respuesta_texto = "Suficiente";
                    break;
                case "3":
                    respuesta_texto = "Bien";
                    break;
                case "4":
                    respuesta_texto = "Muy bien";
                    break;
                case "5":
                    respuesta_texto = "Excelente";
                    break;
                default:
                    respuesta_texto = fila[dato];
            }
            HtmlFila = HtmlFila + "<td>" + respuesta_texto + "</td>";
        });

        // Se cierra la estructura de la fila con la etiqueta </tr>
        elCuerpoRespuestaIndividual.innerHTML += HtmlFila + "</tr>";
    });

    // Se muestran los botones para generar Excel y PDF después de cargar la tabla de resultados

}

function ocultarBotones() {
    elBtnExcel.style.display = "none";
    elBtnPDF.style.display = "none";
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
