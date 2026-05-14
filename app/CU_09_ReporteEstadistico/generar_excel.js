/*
  Archivo     : generar_excel.js
  Módulo      : CU_09_ReporteEstadistico
  Autor       : Alejandro Resendiz Reyes
  Fecha       : 29/04/2026		
  Descripción : Este archivo se encarga de generar el archivo Excel del reporte estadístico.
				Se utiliza la librería SheetJS para crear el documento Excel a partir de la tabla de resultados.
*/


// Se importa la función lanzarToast desde el archivo lanzar_toast.js
// para mostrar mensajes de éxito o error al generar el archivo Excel
import { lanzarToast } from '../js/lanzar_toast.js';

// Se define la función exportarExcel que se ejecuta al hacer clic en el botón de exportar a Excel
window.handleExportarExcel = function (elTabla){

	/* Se previene el comportamiento por defecto del evento para evitar 
	que se recargue la página y se pierda la tabla de resultados al generar el archivo Excel*/
	event.preventDefault();

	// Obtener la tabla original
	const tablaOriginal = document.getElementById(elTabla);
	
	// Clonar la tabla para no afectar la visualización original
	const tablaClonada = tablaOriginal.cloneNode(true);
	
	// Buscar y eliminar la columna "Acción" completa (tanto en encabezados como en cuerpo)
	
	// 1. Eliminar el encabezado de la columna "Acción"
	const thead = tablaClonada.querySelector('thead');
	if (thead) {
		const headerRows = thead.querySelectorAll('tr');
		headerRows.forEach(row => {
			const ths = row.querySelectorAll('th');
			// Buscar el índice de la columna "Acción"
			let indiceAccion = -1;
			ths.forEach((th, index) => {
				if (th.textContent.trim() === 'Acción') {
					indiceAccion = index;
					th.remove(); // Eliminar el th directamente
				}
			});
			
			// Si encontramos la columna "Acción", también necesitamos eliminar las celdas correspondientes en el cuerpo
			if (indiceAccion !== -1) {
				// 2. Eliminar las celdas de la columna "Acción" en cada fila del cuerpo
				const tbody = tablaClonada.querySelector('tbody');
				if (tbody) {
					const rows = tbody.querySelectorAll('tr');
					rows.forEach(row => {
						const tds = row.querySelectorAll('td');
						if (tds[indiceAccion]) {
							tds[indiceAccion].remove();
						}
					});
				}
			}
		});
	}
	// Se utiliza la función table_to_book de la librería SheetJS para convertir la tabla de resultados en un libro de Excel
	const workbook=XLSX.utils.table_to_book(tablaClonada);
	// Se utiliza la función writeFile de la librería SheetJS para guardar el libro de Excel con el nombre "reporte_alumnos.xlsx"
	XLSX.writeFile(workbook, 'reporte_alumnos.xlsx');
	// Se muestra un mensaje de éxito utilizando la función lanzarToast para indicar que el archivo Excel se generó correctamente
	lanzarToast("Excel generado correctamente","exito")
}
