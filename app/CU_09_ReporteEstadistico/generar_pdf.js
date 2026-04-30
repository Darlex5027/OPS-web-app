import { lanzarToast } from '../js/lanzar_toast.js';


function imprimirPDF(){
	const { jsPDF } = window.jspdf;
	const doc = new jsPDF();
	doc.autoTable({ html: '#tabla-resultados' });
	doc.save('reporte_alumnos.pdf');	
	lanzarToast("PDF generado correctamente", "exito");
}
