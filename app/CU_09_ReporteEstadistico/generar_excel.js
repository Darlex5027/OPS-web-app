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
window.exportarExcel = function (){
	// Se previene el comportamiento por defecto del evento para evitar que se recargue la página
	event.preventDefault();
	// Se utiliza la función table_to_book de la librería SheetJS para convertir la tabla de resultados en un libro de Excel
	const workbook=XLSX.utils.table_to_book(document.getElementById('tabla-resultados'));
	// Se utiliza la función writeFile de la librería SheetJS para guardar el libro de Excel con el nombre "reporte_alumnos.xlsx"
	XLSX.writeFile(workbook, 'reporte_alumnos.xlsx');
	// Se muestra un mensaje de éxito utilizando la función lanzarToast para indicar que el archivo Excel se generó correctamente
	lanzarToast("Excel generado correctamente","exito")
}
