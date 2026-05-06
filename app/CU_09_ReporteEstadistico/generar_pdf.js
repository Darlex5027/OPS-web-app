/*
  Archivo     : generar_pdf.js
  Módulo      : CU_09_ReporteEstadistico
  Autor       : Alejandro Resendiz Reyes
  Fecha       : 29/04/2026		
  Descripción : Este archivo se encarga de generar el PDF del reporte estadístico.
				Se utiliza la librería jsPDF para crear el documento PDF a partir de la tabla de resultados.
*/

// Se importa la función lanzarToast desde el archivo lanzar_toast.js	
import { lanzarToast } from '../js/lanzar_toast.js';

// Se define la función imprimirPDF que se ejecuta al hacer clic en el botón de imprimir PDF
window.imprimirPDF = function (){
	// Se previene el comportamiento por defecto del evento para evitar que se recargue la página
	const { jsPDF } = window.jspdf;
	const doc = new jsPDF();
	doc.autoTable({ html: '#tabla-resultados' });
	// Se utiliza la función save de la librería jsPDF para guardar el documento PDF con el nombre "reporte_alumnos.pdf"
	doc.save('reporte_alumnos.pdf');	
	// Se muestra un mensaje de éxito utilizando la función lanzarToast para indicar que el archivo PDF se generó correctamente
	lanzarToast("PDF generado correctamente", "exito");
}
