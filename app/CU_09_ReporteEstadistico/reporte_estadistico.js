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
import { obtenerCookie } from '../js/cookie.js';
import { lanzarToast } from '../js/lanzar_toast.js';
import { renderMenu } from '../js/menu.js';

// Al final del archivo
window.handleCargarDatos = handleCargarDatos;

const elEncuestas = document.getElementById('slctEncuestas');
const elPeriodo_tipo = document.getElementById('slctPeriodoTipo');
const elPeriodo_anio= document.getElementById('slctPeriodoAnio');

//Al iniciar la página, se ocultan los filtros de periodo y año hasta que se seleccione una encuesta
elPeriodo_tipo.style.visibility="hidden";
elPeriodo_anio.style.visibility="hidden";


document.addEventListener('DOMContentLoaded', function(){
	// Si el tipo de usuario es diferente de 2, se renderiza el menú y se cargan las encuestas disponibles
	renderMenu();
	cargarEncuestas();
});

// Función para cargar las encuestas disponibles desde el servidor
function cargarEncuestas(){
	fetch('./obtener_encuestas.php')
		.then(res => res.json())
		.then( encuestas => {
			if(encuestas.error){
				// Si hay un error al obtener las encuestas, se muestra un mensaje de error y se detiene la ejecución
				lanzarToast(encuestas.error,"error");
				return
			}
			encuestas.forEach(function (encuesta){

				// Por cada encuesta obtenida, se crea una opción en el select de encuestas
				const option = document.createElement('option');
				
				// Se asigna el valor de la opción al ID de la encuesta y el texto al nombre de la encuesta
				option.value = encuesta.Id_encuesta;
				option.textContent = encuesta.Nombre;
				
				// Se agrega la opción al select de encuestas
				document.getElementById('slctEncuestas').appendChild(option);
			})

		})
}

// Se agrega un event listener al select de encuestas para cargar los periodos disponibles cuando se seleccione una encuesta
elEncuestas.addEventListener('change', (event) => {
	// Se limpian los selects de periodo y año cada vez que se selecciona una encuesta diferente
	elPeriodo_tipo.innerHTML="<option value ='NINGUNO'>-- Seleccionar una periodo--</option>";
	elPeriodo_anio.innerHTML="<option value ='NINGUNO'>-- Seleccionar una año--</option>";

	// Si no se selecciona ninguna encuesta, se ocultan los filtros de periodo y año
	if(elEncuestas.value === "NINGUNA"){
		elPeriodo_tipo.style.visibility="hidden";
		elPeriodo_anio.style.visibility="hidden";
	}else{
		// Si se selecciona una encuesta, se muestran los filtros de periodo 
		// y año y se cargan los periodos disponibles para esa encuesta desde el servidor
		elPeriodo_tipo.style.visibility="visible";
		elPeriodo_anio.style.visibility="visible";


		fetch('./obtener_periodos.php')
			.then( res => res.json())
			.then( function(respuesta){
				console.log(respuesta);
				if(respuesta.error){
					// Si hay un error al obtener los periodos, se muestra un mensaje de error y se detiene la ejecución
					lanzarToast(respuesta.error,"error");
					return
				}
				// Por cada tipo de periodo obtenido, se crea una opción en el select de periodo tipo
				respuesta.tipo.forEach(function(tipo){
					const option = document.createElement('option');
					// Se asigna el valor de la opción al tipo de periodo y el texto al tipo de periodo
					option.value = tipo.Periodo_tipo;
					option.textContent = tipo.Periodo_tipo;
					// Se agrega la opción al select de periodo tipo
					elPeriodo_tipo.appendChild(option);
				});

				// Por cada año obtenido, se crea una opción en el select de periodo año
				respuesta.anio.forEach(function(anio){
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

// Función para cargar los datos del reporte estadístico y generar la tabla de resultados
function handleCargarDatos(){
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

	// Se obtienen los elementos del DOM para los títulos de la tabla
	const elTitulos = document.getElementById("Titulos");
	// Se obtienen los elementos del DOM para la tabla de resultados
	const elTabla = document.getElementById("Tabla");
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
	elTitulos.innerHTML=""
	elTabla.innerHTML="";

	// Se realiza una petición al servidor para obtener los 
	// datos del reporte estadístico en formato JSON, 
	// enviando los filtros seleccionados como parámetros
	fetch("./generar_tabla.php",{
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

				elBtnPDF.style.visibility="hidden";
				elBtnExcel.style.visibility="hidden";

				return
			}

			//Si la impresión es de tamaño 0 significa que la respuesta es un mensaje
			//por lo que no se encontraron resultados.
			if(impresion.length==0){
				// Si no se encontraron resultados para los filtros seleccionados,
				// se muestra un mensaje de error y se ocultan los botones de Excel y PDF
				lanzarToast("No se encontraron Resultados", "error");
				elBtnExcel.style.visibility="hidden";
				elBtnPDF.style.visibility="hidden";
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
				elTabla.innerHTML+=table;
			});

			// Después de renderizar la tabla, se agrega una fila adicional para mostrar el promedio del reporte estadístico
			elTabla.innerHTML+="<tr><td><h2>Promedio:</h2><label id='lblPromedio'></label></td><tr>"
			// Se muestran los botones para generar Excel y PDF después de cargar la tabla de resultados
			elBtnExcel.style.visibility="visible";
			elBtnPDF.style.visibility="visible";
			// Se carga el promedio del reporte estadístico después de renderizar la tabla de resultados
			fetchPromedio();
		});
}


// Función para cargar el promedio del reporte estadístico y mostrarlo en la tabla de resultados
function fetchPromedio(){
	// Se obtiene el elemento del DOM para mostrar el promedio
	const promedio=document.getElementById("lblPromedio");
	// Se obtienen los valores seleccionados en el filtro de encuesta
	const id_encuesta = document.getElementById("slctEncuestas").value;
	// Se obtienen los valores seleccionados en el filtro de periodo tipo
	const periodo_tipo = document.getElementById("slctPeriodoTipo").value;
	// Se obtienen los valores seleccionados en el filtro de periodo año
	const periodo_anio = document.getElementById("slctPeriodoAnio").value;

	// Se realiza una petición al servidor para obtener el promedio del reporte estadístico en formato JSON,
	// enviando los filtros seleccionados como parámetros
	fetch("./generar_promedio.php",{
		method: "POST",
		headers:{
			"Content-Type":"application/json"
		},
		// Se envían los filtros seleccionados como parámetros en el cuerpo de la petición
		body: JSON.stringify({Id_encuesta: id_encuesta, Periodo_tipo: periodo_tipo, Periodo_anio: periodo_anio})
	}).then(function (respuesta){
		return respuesta.json();
	})
		.then(function (impresion){
			if(impresion.error){
				// Si hay un error al obtener el promedio, se muestra un mensaje de error y se detiene la ejecución
				lanzarToast(impresion.error,"error");
				return
			}
			// Si se obtiene el promedio correctamente, se muestra el valor del promedio en el elemento del DOM correspondiente
			promedio.innerHTML=impresion;		
		})
	
	// Después de cargar el promedio, se muestra un mensaje de éxito indicando que los resultados se cargaron correctamente
	lanzarToast("Resultados cargados correctamente", "exito");
}	
