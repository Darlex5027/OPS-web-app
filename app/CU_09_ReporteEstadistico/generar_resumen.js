/*
  Archivo     : reporte_estadistico.js
  Módulo      : CU_09_ReporteEstadistico
  Autor       : Alejandro Resendiz Reyes
  Fecha       : 23/04/2026		
  Descripción : Archivo JS para el reporte estadístico,
					se encarga de cargar los datos de las
				encuestas, periodos y generar la tabla
				con los resultados obtenidos del php, 
				ademas de generar los Excel y PDF sobre 
				la tabla generada.

*/
import { lanzarToast } from '../js/lanzar_toast.js';


window.handleCargarResumen = handleCargarResumen;

// Se obtienen los elementos del DOM para los filtros de encuesta, periodo tipo y periodo año
const elEncuestas = document.getElementById('slctEncuestas');
const elPeriodo_tipo = document.getElementById('slctPeriodoTipo');
const elPeriodo_anio = document.getElementById('slctPeriodoAnio');

// Se obtienen los elementos del DOM para la estructura de la tabla
const elTitulos = document.getElementById("Titulos");
const elTabla = document.getElementById("Tabla");

// Se obtienen los botones para generar Excel y PDF
const elBtnExcel = document.getElementById("btnGenerarExcel");
const elBtnPDF = document.getElementById("btnGenerarPDF");


//Al iniciar la página, se ocultan los filtros de periodo y año hasta que se seleccione una encuesta
elPeriodo_tipo.style.display = "none";
elPeriodo_anio.style.display = "none";


// Se agrega un event listener al select de encuestas para cargar los periodos disponibles cuando se seleccione una encuesta
elEncuestas.addEventListener('change', (event) => {
	// Se limpian los selects de periodo y año cada vez que se selecciona una encuesta diferente
	elPeriodo_tipo.innerHTML = "<option value ='NINGUNO'>-- Seleccionar una periodo--</option>";
	elPeriodo_anio.innerHTML = "<option value ='NINGUNO'>-- Seleccionar una año--</option>";

	// Si no se selecciona ninguna encuesta, se ocultan los filtros de periodo y año
	if (elEncuestas.value === "NINGUNA") {
		elPeriodo_tipo.style.display = "none";
		elPeriodo_anio.style.display = "none";
	} else {
		// Si se selecciona una encuesta, se muestran los filtros de periodo 
		// y año y se cargan los periodos disponibles para esa encuesta desde el servidor
		elPeriodo_tipo.style.display = "block";
		elPeriodo_anio.style.display = "block";


		fetch('./obtener_periodos.php')
			.then(res => res.json())
			.then(function (respuesta) {
				console.log(respuesta);
				if (respuesta.error) {
					// Si hay un error al obtener los periodos, se muestra un mensaje de error y se detiene la ejecución
					lanzarToast(respuesta.error, "error");
					return
				}
				// Por cada tipo de periodo obtenido, se crea una opción en el select de periodo tipo
				respuesta.tipo.forEach(function (tipo) {
					const option = document.createElement('option');
					// Se asigna el valor de la opción al tipo de periodo y el texto al tipo de periodo
					option.value = tipo.Periodo_tipo;
					option.textContent = tipo.Periodo_tipo;
					// Se agrega la opción al select de periodo tipo
					elPeriodo_tipo.appendChild(option);
				});

				// Por cada año obtenido, se crea una opción en el select de periodo año
				respuesta.anio.forEach(function (anio) {
					const option = document.createElement('option');
					// Se asigna el valor de la opción al año y el texto al año
					option.value = anio.Periodo_anio;
					option.textContent = anio.Periodo_anio;
					// Se agrega la opción al select de periodo año
					elPeriodo_anio.appendChild(option);
				})
			});

	}
});

function mostrarBotones() {
	elBtnExcel.style.display = "block";
	elBtnPDF.style.display = "block";
}

function ocultarBotones() {
	elBtnExcel.style.display = "none";
	elBtnPDF.style.display = "none";
}

// Función para cargar los datos del reporte estadístico y generar la tabla de resultados
function handleCargarResumen() {
	// Se obtienen los valores seleccionados en los filtros de encuesta, periodo tipo y periodo año
	if (elEncuestas.value === "NINGUNA") {
		// Si no se ha seleccionado ninguna encuesta, se muestra un mensaje de error y se detiene la ejecución
		lanzarToast("Debe seleccionar una encuesta para generar el reporte", "error");
		return;
	}
	// Si no se ha seleccionado un periodo tipo o un periodo año, se muestra un mensaje de error y se detiene la ejecución
	if (elPeriodo_tipo.value === "NINGUNO" || elPeriodo_anio.value === "NINGUNO") {
		lanzarToast("El periodo y el año deben rellenarse", "error")
		return;
	}
	// Si se han seleccionado todos los filtros, se procede a cargar la tabla de resultados del reporte estadístico
	buildTabla();
}


function fetchResumen(id_encuesta, periodo_tipo, periodo_anio) {
	return fetch("./generar_tabla_resumen.php", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({ Id_encuesta: id_encuesta, Periodo_tipo: periodo_tipo, Periodo_anio: periodo_anio })
	})
		.then(function (respuesta) {
			return respuesta.json();
		});
}

function buildTabla() {

	const id_encuesta = elEncuestas.value;
	const periodo_tipo = elPeriodo_tipo.value;
	const periodo_anio = elPeriodo_anio.value;
	
	//Se realiza una petición al servidor para obtener los datos del reporte estadístico en formato JSON,
	fetchResumen(id_encuesta, periodo_tipo, periodo_anio)

	/* Después de obtener los datos del reporte estadístico, se procesa la respuesta para generar la tabla de resultados.
	 Si hay un error al obtener los datos, se muestra un mensaje de error y se ocultan los botones de Excel y PDF. */
		.then(function (resumen) {
			if (resumen.error) {
				// Si hay un error al obtener los datos del reporte, 
				// se muestra un mensaje de error y se ocultan los botones de Excel y PDF
				lanzarToast(resumen.error, "error");

				ocultarBotones();
				return
			}

	/* Si se obtienen los datos del reporte estadístico correctamente, se verifica si el resultado está vacío.*/
			if (resumen.length == 0) {
				// Si no se encontraron resultados para los filtros seleccionados,
				// se muestra un mensaje de error y se ocultan los botones de Excel y PDF
				lanzarToast("No se encontraron resultados", "error");
				ocultarBotones();
				return;
			}
	// Si se obtienen los datos del reporte estadístico correctamente y no están vacíos, 
	// se procede a renderizar la tabla de resultados en el DOM utilizando la función renderTabla, 
	// se muestran los botones de Excel y PDF y se carga el promedio del reporte estadístico utilizando la función fetchPromedio.
			renderTabla(resumen);
			mostrarBotones();
			fetchPromedio();

		});
}

function renderTabla(resumen) {

	// Se limpian las tablas de caulquier contenido que tengan
	elTitulos.innerHTML = "";
	elTabla.innerHTML = "";


	/*	Se obtiene la estructura de los datos del reporte estadístico a partir 
	de la primera fila del resultado, para generar los títulos de la tabla de
	resultados. Por cada título obtenido, se agrega una celda al encabezado 
	de la tabla en el DOM. */

	Object.keys(resumen[0]).forEach(function (titulo) {
		elTitulos.innerHTML = elTitulos.innerHTML + "<th>" + titulo + "</th>"
	});


	/*	Renderizado de las filas de la tabla. Por cada fila del resultado del 
	reporte estadístico, se genera una estructura HTML para representar la fila de la tabla, 
	agregando una celda por cada dato en la fila. Después de generar la estructura HTML de 
	la fila, se agrega al cuerpo de la tabla en el DOM. */
	resumen.forEach(function (fila) {
		// Se crea una variable para almacenar la estructura HTML de la fila de la tabla
		let htmlFila = "";

		// Se inicia la estructura de la fila con la etiqueta <tr>
		htmlFila = htmlFila + "<tr>";

		/* Se genera la estructura HTML de la fila de la tabla iterando sobre cada dato de la fila,
		agregando una celda por cada dato en la fila.*/
		Object.keys(fila).forEach(function (dato) {
			htmlFila = htmlFila + "<td>" + fila[dato] + "</td>";
		});

		// Se cierra la estructura de la fila con la etiqueta </tr> y se agrega al cuerpo de la tabla en el DOM.
		htmlFila = htmlFila + "</tr>";
		elTabla.innerHTML += htmlFila;
	});
}


// Función para cargar el promedio del reporte estadístico y mostrarlo en la tabla de resultados
function fetchPromedio() {

	//Se agrega una fila adicional a la tabla para mostrar el promedio del reporte estadístico.
	elTabla.innerHTML += "<tr><td><h2>Promedio:</h2><label id='lblPromedio'></label></td><tr>"

	// Se obtiene el elemento del DOM para mostrar el promedio del reporte estadístico
	const elPromedio = document.getElementById("lblPromedio");

	// Se obtienen los valores seleccionados en los filtros de encuesta, periodo tipo y periodo año
	const id_encuesta = document.getElementById("slctEncuestas").value;
	const periodo_tipo = document.getElementById("slctPeriodoTipo").value;
	const periodo_anio = document.getElementById("slctPeriodoAnio").value;

	// Se realiza una petición al servidor para obtener el promedio del reporte estadístico en formato JSON,
	// enviando los filtros seleccionados como parámetros
	fetch("./generar_promedio_resumen.php", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		// Se envían los filtros seleccionados como parámetros en el cuerpo de la petición
		body: JSON.stringify({ Id_encuesta: id_encuesta, Periodo_tipo: periodo_tipo, Periodo_anio: periodo_anio })
	}).then(function (promedio) {
		return promedio.json();
	})
		.then(function (promedio) {
			if (promedio.error) {
				// Si hay un error al obtener el promedio, se muestra un mensaje de error y se detiene la ejecución
				lanzarToast(promedio.error, "error");
				return
			}
			// Si se obtiene el promedio correctamente, se muestra el valor del promedio en el elemento del DOM correspondiente
			elPromedio.innerHTML = promedio;
		});
	// Después de cargar los resultados y el promedio, se muestra un mensaje de éxito indicando que los resultados se cargaron correctamente
	lanzarToast("Resultados cargados correctamente", "exito");
}	
