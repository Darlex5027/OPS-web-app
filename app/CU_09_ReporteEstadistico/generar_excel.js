import { lanzarToast } from '../js/lanzar_toast.js';


window.exportarExcel = function (){
	event.preventDefault();
	const workbook=XLSX.utils.table_to_book(document.getElementById('tabla-resultados'));
	XLSX.writeFile(workbook, 'reporte_alumnos.xlsx');
	lanzarToast("Excel generado correctamente","exito")
}
