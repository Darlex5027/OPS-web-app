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
window.handleCargarPendientes = handleCargarPendientes;

const elEncuestas = document.getElementById('slctEncuestas');
const elPeriodo_tipo = document.getElementById('slctPeriodoTipo');
const elPeriodo_anio= document.getElementById('slctPeriodoAnio');


// Función para cargar los datos del reporte estadístico y generar la tabla de resultados
function handleCargarPendientes(){
	// Se obtienen los valores seleccionados en los filtros de encuesta, periodo tipo y periodo año
	if(elEncuestas.value === "NINGUNA"){
		// Si no se ha seleccionado ninguna encuesta, se muestra un mensaje de error y se detiene la ejecución
		lanzarToast("Debe seleccionar una encuesta para generar el reporte", "error");
		return;
	}
	// Si no se ha seleccionado un periodo tipo o un periodo año, se muestra un mensaje de error y se detiene la ejecución
	if(elPeriodo_tipo.value === "NINGUNO" || elPeriodo_anio.value === "NINGUNO"){
		lanzarToast("El periodo y el año deben rellenarse","error")
		return;
	}
	// Si se han seleccionado todos los filtros, se procede a cargar la tabla de resultados del reporte estadístico
	fetchRenderTabla();
}

function fetchRenderTabla(){
	//Se obtienen los elementos del DOM para la estructura de la tabla 
	const elTituloTabla = document.getElementById("titulo-tabla");
	//Se colocal el titulo de la tabla
	elTituloTabla.innerHTML="<h2>Alumnos que están pendientes de contestar el formulario</h2>";

	// Se obtienen los elementos del DOM para los títulos de la tabla
	const elTitulos = document.getElementById("Titulos");
	// Se obtienen los elementos del DOM para la tabla de resultados
	const elTablaContenido = document.getElementById("Tabla");
	// Se obtienen los botones para generar Excel y PDF
	const elBtnExcel = document.getElementById("btnGenerarExcel");
	const elBtnPDF = document.getElementById("btnGenerarPDF");
	// Se obtienen los valores seleccionados en los filtros de encuesta
	const id_encuesta = elEncuestas.value;
	// Se obtienen los valores seleccionados en los filtros de periodo tipo
	const periodo_tipo = elPeriodo_tipo.value;
	// Se obtienen los valores seleccionados en los filtros de periodo año
	const periodo_anio = elPeriodo_anio.value;



	// Se limpian las tablas de caulquier contenido que tengan
	elTitulos.innerHTML="";
	elTablaContenido.innerHTML="";

	// Se realiza una petición al servidor para obtener los 
	// datos del reporte estadístico en formato JSON, 
	// enviando los filtros seleccionados como parámetros
	fetch("./generar_tabla_pendientes.php",{
		method: "POST",
		headers:{
			"Content-Type":"application/json"
		},
		body: JSON.stringify({Id_encuesta: id_encuesta, Periodo_tipo: periodo_tipo, Periodo_anio: periodo_anio})
	}) 
		.then(function (respuesta){
			return respuesta.json();
		})
		.then(function (impresion){
			if(impresion.error){
				// Si hay un error al obtener los datos del reporte, 
				// se muestra un mensaje de error y se ocultan los botones de Excel y PDF
				lanzarToast(impresion.error,"error");

				elBtnPDF.style.display="none";
				elBtnExcel.style.display="none";

				return
			}

			//Si la impresión es de tamaño 0 significa que la respuesta es un mensaje
			//por lo que no se encontraron resultados.
			if(impresion.length==0){
				// Si no se encontraron resultados para los filtros seleccionados,
				// se muestra un mensaje de error y se ocultan los botones de Excel y PDF
				lanzarToast("No se encontraron Resultados", "error");
				elBtnExcel.style.display="none";
				elBtnPDF.style.display="none";
				return;
			}
			
			// Renderizado de los títulos de la tabla, se toma el primer elemento de la 
			// impresión para obtener los títulos de las columnas
			Object.keys(impresion[0]).forEach(function(titulo){
				// Por cada título, se agrega una celda de encabezado a la fila de títulos de la tabla
				elTitulos.innerHTML=elTitulos.innerHTML+"<th>"+titulo+"</th>"
			});
			// Renderizado de las filas de la tabla.
			impresion.forEach(function(fila){
				// Se crea una variable para almacenar la estructura HTML de la fila de la tabla
				let table="";

				// Se inicia la estructura de la fila con la etiqueta <tr>
				table=table+"<tr>";
				// Por cada dato en la fila, se agrega una celda a la estructura HTML de la fila
				Object.keys(fila).forEach(function(dato){
					// Se agrega una celda a la estructura HTML de la fila con el valor del dato correspondiente
					table=table+"<td>"+fila[dato]+"</td>";

				});
				
				// Se cierra la estructura de la fila con la etiqueta </tr>
				table=table+"</tr>";
				// Se agrega la estructura HTML de la fila a la tabla de resultados en el DOM
				elTablaContenido.innerHTML+=table;
			});

			// Se muestran los botones para generar Excel y PDF después de cargar la tabla de resultados
			elBtnExcel.style.display="block";
			elBtnPDF.style.display="block";
		});
}
