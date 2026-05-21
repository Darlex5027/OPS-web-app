/**
 * Archivo:     reporte_alumnos.js
 * Autor:      	Alejandro Resendiz Reyes
 * Fecha:       15-03-2026
 * Descripción: Logica del cliente para el modulo CU08 - Reporte de Alumnado.
 * 				Carga los catalogos de filtros (actividad, estado, periodo) en los
 *              elementos select del formulario, construye y renderiza la tabla de
 *              resultados consultando reporte_alumnos.php, y permite exportar el
 *              reporte generado en formato Excel (.xlsx) o PDF.
 */


// Se importan las funciones obtenerCookie y renderMenu desde sus respectivos archivos para manejar las cookies de sesión y renderizar el menú de navegación.
import { obtenerCookie } from '../js/cookie.js';
import { lanzarToast } from '../js/lanzar_toast.js';
import { renderMenu } from '../js/menu.js';

// Se exponen las funciones cargar_tabla, exportarExcel e imprimirPDF al ámbito global para que puedan ser llamadas desde el HTML
window.cargar_tabla = cargar_tabla;
window.exportarExcel = exportarExcel;
window.imprimirPDF = imprimirPDF;

// Se cargan los elemento a usar desde el HTML
const elActividad = document.getElementById("actividad");
const elEstado = document.getElementById("estado");
const elPeriodoTipo = document.getElementById("periodo_tipo");
const elPeriodoAnio = document.getElementById("periodo_anio");

// Elementos para cargar la tabla de resultados
const elTitulosTabla = document.getElementById("titulos-tabla");
const elCuerpoTabla = document.getElementById("Tabla");
const elExcel = document.getElementById("btnGenerarExcel");
const elPDF = document.getElementById("btnGenerarPDF");



/*
* Al cargar la página se revisa que el usuario tenga una sesión iniciada
* Posterior a tener una sesión iniciada se cargan los catalogos para los
* select.
*/


document.addEventListener("DOMContentLoaded", function () {
	// Se obtiene el tipo de usuario de las cookies para verificar que el usuario tenga una sesión iniciada y redirigirlo a su perfil si es un usuario de tipo 2 (estudiante).
	const tipoUsuario = obtenerCookie('Id_tipo_usuario');
	// Si el tipo de usuario es 2, se redirige al perfil del estudiante.
	if (tipoUsuario == '2') {
		const tipoUsuario = obtenerCookie('Id_tipo_usuario');
		window.location.href = '../CU_03_PerfilGestionable/perfil.html';
		return;
	}

	// Se renderiza el menú de navegación y se redirige al inicio de sesión si no hay cookies de sesión, y se cargan los catálogos para los filtros.
	renderMenu();
	cargar_catalogos();
});


/*
* CARGAR CATALOGOS EN LOS SELECT
*/

function cargar_catalogos() {

	fetch("./obtener_catalogos.php")

		//Formatear el resultados a JSON para poder manipularlo
		.then(function (respuesta) {
			if (!respuesta.ok) {  // Captura errores HTTP (404, 500, etc.)
				lanzarToast(`Fallo en la solicitud de catálogos`, "error");
			}
			return respuesta.json();
		})


		// Se obtiene un objeto con los catalogos de servicios, estados y periodos
		.then(function (catalogos) {
			if (catalogos.error) {
				lanzarToast(catalogos.error, "error");
				return;
			}
			// Se cargan los servicios disponibles para el filtro de actividades.
			catalogos.servicios.forEach(function (servicio) {
				//Se crea una opción con value como el Id_servicio de la actividad a cargar
				const option = document.createElement('option');
				option.value = servicio.Id_servicio;
				//A la opción se le da el texto de Servicio (nombre del servicio)
				option.textContent = servicio.Servicio;
				elActividad.appendChild(option)
			});

			// Se cargan los estados disponibles para el filtro de estado de la actividad.
			catalogos.estados.forEach(function (estado) {
				// Se cargan los estados disponibles que puede tener un servicio.
				// PENDIENTE, EN_CURSO, COMPLETADO
				const option = document.createElement('option');
				option.value = estado.Estado;
				option.textContent = estado.Estado;
				elEstado.appendChild(option)
			});

			// Se cargan los tipos de periodos disponibles para el filtro de periodos.
			catalogos.periodo_tipo.forEach(function (periodo_tipo) {
				// Se cargan los tipos de periodos disponibles.
				// SEMESTRE, CUATRIMESTRE, ANUAL
				const option = document.createElement('option');
				option.value = periodo_tipo.periodo_tipo;
				option.textContent = periodo_tipo.periodo_tipo;
				elPeriodoTipo.appendChild(option)
			});

			// Se cargan los años de periodos disponibles para el filtro de periodos.
			catalogos.periodo_anio.forEach(function (periodo_año) {
				// Se cargan los años de periodos disponibles.
				const option = document.createElement('option');
				option.value = periodo_año.periodo_año;
				option.textContent = periodo_año.periodo_año;
				elPeriodoAnio.appendChild(option)
			});
		});
}


function fetchDatosTabla() {
	// Se hace la consulta al php para obtener los resultados de acuerdo a los filtros seleccionados
	return fetch("./reporte_alumnos.php", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		// Se cargan los filtros seleccionado por el usuario
		body: JSON.stringify({
			actividad: elActividad.value,
			estado: elEstado.value,
			periodo_tipo: elPeriodoTipo.value,
			periodo_anio: elPeriodoAnio.value
		})
		// No es necesario enviar el Id_usuario o Id_carrera porque ese se obtiene dentro del php

	})

		// Se obtiene la respuesta del php y se formatea a JSON para poder manipularlo
		.then(function (respuesta) {
			if (!respuesta.ok) {  // Captura errores HTTP (404, 500, etc.)
				lanzarToast(`Fallo en la solicitud del reporte`, "error");
			}
			//Se obtiene la respuesta del php
			return respuesta.json();
		});
}

function ocultarBotones() {
	// Se ocultan los botones de exportar a Excel y PDF al cargar la página o al generar una nueva consulta para evitar que el usuario intente exportar un reporte sin resultados.
	elExcel.style.display = "none";
	elPDF.style.display = "none";
}

function mostrarBotones() {
	// Se muestran los botones de exportar a Excel y PDF al generar una consulta con resultados para permitir que el usuario exporte el reporte generado.
	elExcel.style.display = "block";
	elPDF.style.display = "block";
}

/*
* CARGAR TABLA
*/

function cargar_tabla() {
	// Se limpian las tablas de caulquier contenido que tengan
	elTitulosTabla.innerHTML = ""
	elCuerpoTabla.innerHTML = "";


	fetchDatosTabla()
		// Se obtiene un arreglo de objetos con los resultados de la consulta
		.then(function (resultadoReporte) {
			//Si la impresión es de tamaño 0 significa que la respuesta es un mensaje
			//por lo que no se encontraron resultados.
			if (resultadoReporte.error) {
				lanzarToast(resultadoReporte.error, "error");
				ocultarBotones();
				return;
			}

			if (resultadoReporte.length == 0) {
				lanzarToast("No se encontraron Resultados", "error");
				ocultarBotones();
				return;
			}


			//Renderizado de los titulos obtenidos
			Object.keys(resultadoReporte[0]).forEach(function (titulo) {
				elTitulosTabla.innerHTML = elTitulosTabla.innerHTML + "<th>" + titulo + "</th>"
			});

			// Renderizado de el contenido de la tabla
			resultadoReporte.forEach(function (fila) {
				//Variable para guardar la fila temporal
				let htmlFila = "";

				htmlFila = htmlFila + "<tr>";
				// Por cada titulo (celda) se agrega la celda a la estructura de la fila	
				Object.keys(fila).forEach(function (dato) {


					/** Si el dato es nulo, se muestra un guion para indicar 
					* que no hay información disponible en lugar de dejar la celda vacía.
					* Esto mejora la legibilidad de la tabla y evita confusiones sobre 
					* si el dato no se cargó correctamente o simplemente no existe.
					*/
					if (fila[dato] === null) {
						fila[dato] = "—";
					}
					//Se concatena el dato de la fila dentro de la celda
					htmlFila = htmlFila + "<td>" + fila[dato] + "</td>";

				});
				// Se cierra la fila y se agrega a la tabla
				elCuerpoTabla.innerHTML += htmlFila + "</tr>";
			});
			// Se muestran los botones de exportar a Excel y PDF
			mostrarBotones();

			lanzarToast("Reporte generado correctamente", "exito");

		});
}

function exportarExcel() {
	try {
		// Se obtiene la tabla de resultados y se convierte a un libro de Excel usando SheetJS
		event.preventDefault();
		const workbook = XLSX.utils.table_to_book(document.getElementById('tabla-resultados'));
		XLSX.writeFile(workbook, 'reporte_alumnos.xlsx');
	} catch (error) {
		lanzarToast("Error al exportar a Excel", "error");
	}
}

function imprimirPDF() {
	try {
		// Se obtiene la tabla de resultados y se convierte a un PDF usando jsPDF y jsPDF-AutoTable
		const { jsPDF } = window.jspdf;
		const doc = new jsPDF({
			orientation: 'landscape',
			unit: 'mm',
			format: 'letter' // o 'a4' según prefieras
		});
		doc.autoTable({ html: '#tabla-resultados' });
		doc.save('reporte_alumnos.pdf');
	} catch (error) {
		lanzarToast("Error al exportar a PDF", "error");
	}
}

