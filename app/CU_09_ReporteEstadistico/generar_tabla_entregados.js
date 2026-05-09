/*
  Archivo     : reporte_estadistico.js
  Módulo      : CU_09_ReporteEstadistico
  Autor       : Alejandro Resendiz Reyes
  Fecha       : 23/04/2026		
  Descripción : Archivo JS para el reporte estadístico, genera la lista de alumnos que han completado el cuestionario
		filtrando por nombre de cuestionario, periodo y carrera.
		*/
import { lanzarToast } from '../js/lanzar_toast.js';

// Al final del archivo
window.handleCargarEntregados = handleCargarEntregados;

// Se obtienen los elementos del DOM para los filtros de encuesta, periodo tipo y periodo año
const elEncuestas = document.getElementById('slctEncuestas');
const elPeriodo_tipo = document.getElementById('slctPeriodoTipo');
const elPeriodo_anio = document.getElementById('slctPeriodoAnio');

// Se obtienen los elementos del DOM para la estructura de la tabla
const elTitulos = document.getElementById("Titulos");
const elTabla = document.getElementById("Tabla");
const elTituloTabla = document.getElementById("titulo-tabla");

// Se obtienen los botones para generar Excel y PDF
const elBtnExcel = document.getElementById("btnGenerarExcel");
const elBtnPDF = document.getElementById("btnGenerarPDF");

// Se obtiene el contenedor de la tabla para mostrar u ocultar según sea necesario
const elDivTabla = document.getElementById('div-tabla');
const elBtnCargarEntregados = document.getElementById('btnCargarEntregados');

// Se agrega un evento al botón de cargar entregados para limpiar la tabla
elBtnCargarEntregados.addEventListener("click", function () {
	limpiarTabla();
});

// Función para limpiar la tabla de resultados y los títulos
function limpiarTabla() {
	elTitulos.innerHTML = "";
	elTabla.innerHTML = "";
}

// Función para cargar los datos del reporte estadístico y generar la tabla de resultados
function handleCargarEntregados() {
	// Se obtienen los valores seleccionados en los filtros de encuesta, periodo tipo y periodo año
	// Si no se ha seleccionado una encuesta, se muestra un mensaje de error y se detiene la ejecución
	if (elEncuestas.value === "NINGUNA") {
		lanzarToast("Debe seleccionar una encuesta para generar el reporte", "error");
		return;
	}

	// Si no se ha seleccionado un periodo tipo o un periodo año, se muestra un mensaje de error y se detiene la ejecución
	if (elPeriodo_tipo.value === "NINGUNO" || elPeriodo_anio.value === "NINGUNO") {
		lanzarToast("El periodo y el año deben rellenarse", "error")
		return;
	}

	// Si se han seleccionado todos los filtros, se procede a cargar la tabla de resultados del reporte estadístico
	fetchRenderTabla();
}

// Función para mostrar los botones de generar Excel y PDF
function mostrarBotones() {
	
	elBtnExcel.style.display = "block";
	elBtnPDF.style.display = "block";
}

// Función para ocultar los botones de generar Excel y PDF
function ocultarBotones() {
	elBtnExcel.style.display = "none";
	elBtnPDF.style.display = "none";
}
function fetchRenderTabla() {

	// Se limpian las tablas de caulquier contenido que tengan
	limpiarTabla();

	// Se colocal el titulo de la tabla
	elTituloTabla.innerHTML = "<h2>Alumnos que han contestado la encuesta</h2>";



	// Se obtienen los valores seleccionados en los filtros de encuesta, periodo tipo y periodo año
	const id_encuesta = elEncuestas.value;
	const periodo_tipo = elPeriodo_tipo.value;
	const periodo_anio = elPeriodo_anio.value;


	/*	Se realiza una petición al servidor para obtener los datos del reporte estadístico en formato JSON, 
		enviando los filtros seleccionados como parámetros. La respuesta se procesa para generar la tabla de resultados. */
	fetch("./generar_tabla_entregados.php", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({ Id_encuesta: id_encuesta, Periodo_tipo: periodo_tipo, Periodo_anio: periodo_anio })
	})

		// Se procesa la respuesta del servidor, primero convirtiéndola a formato JSON
		.then(function (respuesta) {
			return respuesta.json();
		})

		// Se procesa la respuesta JSON para generar la tabla de resultados o mostrar mensajes de error según corresponda
		.then(function (tabla) {

			// Si la respuesta contiene un error, se muestra un mensaje de error y se ocultan los botones de Excel y PDF
			if (tabla.error) {
				lanzarToast(tabla.error, "error");

				ocultarBotones();

				return
			}

			//Si la impresión es de tamaño 0 significa que la respuesta es un mensaje
			//por lo que no se encontraron resultados.
			if (tabla.length == 0) {
				// Si no se encontraron resultados para los filtros seleccionados,
				// se muestra un mensaje de error y se ocultan los botones de Excel y PDF
				lanzarToast("No se encontraron resultados", "error");
				ocultarBotones();
				return;
			}

			/* Renderizado de los títulos de la tabla, se toma el primer elemento de la 
			impresión para obtener los títulos de las columnas y se generan las celdas 
			correspondientes en el encabezado de la tabla. */
			Object.keys(tabla[0]).forEach(function (titulo) {
				elTitulos.innerHTML = elTitulos.innerHTML + "<th>" + titulo + "</th>"
			});

			// Renderizado de las filas de la tabla.
			tabla.forEach(function (fila) {

				// Se crea una variable para almacenar la estructura HTML de la fila de la tabla
				let table = "";

				// Se genera la estructura HTML de la fila de la tabla iterando sobre cada dato de la fila
				table = table + "<tr>";
				Object.keys(fila).forEach(function (dato) {
					table = table + "<td>" + fila[dato] + "</td>";

				});

				// Se agrega un botón para ver la respuesta individual del alumno, pasando su matrícula como parámetro
				table = table + "<td><button onClick='handleRespuestaIndividual(\"" + fila.Matricula + "\")'>Ver respuesta</button></td>";


				/* Se cierra la estructura de la fila con la etiqueta </tr> y se agrega al cuerpo de la tabla en el DOM. */
				table = table + "</tr>";
				elTabla.innerHTML += table;
			});

			mostrarBotones();

		});
}
