import { lanzarToast } from '../js/lanzar_toast.js';

window.handleImprimirPDF = function (elTabla) {
	event.preventDefault();
	
	// Obtener la tabla original
	const tablaOriginal = document.getElementById(elTabla);
	
	// Clonar la tabla
	const tablaClonada = tablaOriginal.cloneNode(true);
	
	// Eliminar columna "Acción"
	const thead = tablaClonada.querySelector('thead');
	if (thead) {
		const headerRow = thead.querySelector('tr');
		const ths = headerRow.querySelectorAll('th');
		let indiceAccion = -1;
		
		ths.forEach((th, index) => {
			if (th.textContent.trim() === 'Acción') {
				indiceAccion = index;
				th.remove();
			}
		});
		
		if (indiceAccion !== -1) {
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
	}
	
	// Extraer datos de la tabla para jsPDF (más confiable)
	const { jsPDF } = window.jspdf;
	const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
	
	// Extraer encabezados
	const headers = [];
	const headerThs = tablaClonada.querySelectorAll('thead th');
	headerThs.forEach(th => {
		headers.push(th.textContent.trim());
	});
	
	// Extraer datos de las filas
	const data = [];
	const rows = tablaClonada.querySelectorAll('tbody tr');
	rows.forEach(row => {
		const rowData = [];
		const tds = row.querySelectorAll('td');
		tds.forEach(td => {
			rowData.push(td.textContent.trim());
		});
		data.push(rowData);
	});
	
	// Generar el PDF con autoTable
	doc.autoTable({
		head: [headers],
		body: data,
		startY: 20,
		theme: 'grid',
		styles: {
			fontSize: 8,
			cellPadding: 2,
			overflow: 'linebreak'
		},
		headStyles: {
			fillColor: [41, 128, 185],
			textColor: 255,
			fontStyle: 'bold'
		},
		alternateRowStyles: {
			fillColor: [240, 240, 240]
		},
		margin: { top: 20, left: 10, right: 10 }
	});
	
	// Agregar título
	doc.setFontSize(16);
	doc.text('Reporte de Alumnos', 14, 15);
	
	// Guardar PDF
	doc.save('reporte_alumnos.pdf');
	
	lanzarToast("PDF generado correctamente", "exito");
}