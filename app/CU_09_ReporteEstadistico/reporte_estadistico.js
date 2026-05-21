/*
  Archivo     : reporte_estadistico.js
  Módulo      : CU_09_ReporteEstadistico
  Autor       : Alejandro Resendiz Reyes
  Fecha       : 23/04/2026		
  Descripción : Archivo JS para el reporte estadístico se encarga de renderizar el menu y cargar las encuestas en el select.

*/
import { renderMenu } from '../js/menu.js';
import { lanzarToast } from '../js/lanzar_toast.js';

const elEncuestas = document.getElementById('slctEncuestas');

document.addEventListener('DOMContentLoaded', function () {
	// Si el tipo de usuario es diferente de 2, se renderiza el menú y se cargan las encuestas disponibles
	renderMenu();
	cargarEncuestas();
});


// Función para cargar las encuestas disponibles desde el servidor
function cargarEncuestas() {
	fetch('./obtener_encuestas.php')
		.then(function (respuesta) {
			if (!respuesta.ok) {
				lanzarToast(`Fallo en la solicitud del catalogo de encuestas`, "error");
				return Promise.reject(new Error('HTTP error'));
			}
			return respuesta.json();
		})
		.then(encuestas => {
			if (encuestas.error) {
				// Si hay un error al obtener las encuestas, se muestra un mensaje de error y se detiene la ejecución
				lanzarToast(encuestas.error, "error");
				return
			}
			encuestas.forEach(function (encuesta) {

				// Por cada encuesta obtenida, se crea una opción en el select de encuestas
				const option = document.createElement('option');

				// Se asigna el valor de la opción al ID de la encuesta y el texto al nombre de la encuesta
				option.value = encuesta.Id_encuesta;
				option.textContent = encuesta.Nombre;

				// Se agrega la opción al select de encuestas
				document.getElementById('slctEncuestas').appendChild(option);
			})
			lanzarToast("Encuestas cargadas. Seleccione una encuesta para cargar los periodos disponibles", "exito");
		})

}
