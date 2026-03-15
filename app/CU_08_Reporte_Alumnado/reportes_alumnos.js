function cargarCatalogos(){
	fetch('obtener_catalogos_reportes.php',{
		method: 'GET',
	})
	.then(response => response.json())
	.then(data => {
		console.log(data);
		data.carreras.forEach(element =>{
			console.log(element.Id_carrera, element.Nombre_carrera);
			const option = document.createElement('option');
			option.value = element.Id_carrera;
			option.textContent = element.Nombre_carrera;
			document.getElementById('carrera').appendChild(option);
		});
		data.servicios.forEach(element =>{
			console.log(element.Id_servicio, element.Servicio);
			const option = document.createElement('option');
			option.value = element.Id_servicio;
			option.textContent = element.Servicio;
			document.getElementById('servicio').appendChild(option);
		});
		data.estados.forEach(element =>{
			console.log(element.Estado);
			const option = document.createElement('option');
			option.value = element.Estado;
			option.textContent = element.Estado;
			document.getElementById('estado').appendChild(option);
		});

	})

}

function generarReporte(){
	event.preventDefault();
	carrera = document.getElementById('carrera').value;
	servicio =document.getElementById('servicio').value;
	estado = document.getElementById('estado').value;
	f_Inicio = document.getElementById('fecha_inicio').value;
	f_Fin = document.getElementById('fecha_fin').value;

	const formData= new FormData();
	formData.append('carrera', carrera);
	formData.append('servicio', servicio);
	formData.append('estado', estado);
	formData.append('fecha_inicio', f_Inicio);
	formData.append('fecha_fin', f_Fin);

	fetch ('generar_reporte.php', {
		method: 'POST',
		body: formData
	})
	.then(response => response.json())
	.then(data => {

		const tablaBody = document.getElementById('cuerpo-tabla');
		const tabla = document.getElementById('tabla-resultados');
		tablaBody.innerHTML = '';
		if(data.total == 0){
			tabla.style.display = 'none';
			document.getElementById('btn-excel').style.display = 'none';
			document.getElementById('mensaje').innerHTML = '<h2>No se encontraron resultados</h2>';
		}else{
			tabla.style.display = 'table';
			document.getElementById('btn-excel').style.display = 'block';
			data.data.forEach(element => {
				nuevaFila=tablaBody.insertRow(-1);
				
				nuevaCelda=nuevaFila.insertCell();
				nuevaCelda.textContent=element.Matricula;
				nuevaCelda=nuevaFila.insertCell();
				nuevaCelda.textContent=element.No_Expediente;
				nuevaCelda=nuevaFila.insertCell();
				nuevaCelda.textContent=element.Nombre+" "+element.Apellido_P+" "+element.Apellido_M;
				nuevaCelda=nuevaFila.insertCell();
				nuevaCelda.textContent=element.Nombre_carrera;
				nuevaCelda=nuevaFila.insertCell();
				nuevaCelda.textContent=element.Servicio;
				nuevaCelda=nuevaFila.insertCell();
				nuevaCelda.textContent=element.Estado;
				nuevaCelda=nuevaFila.insertCell();
				nuevaCelda.textContent=element.Fecha_inicio;
				nuevaCelda=nuevaFila.insertCell();
				nuevaCelda.textContent=element.Fecha_fin;
				nuevaCelda=nuevaFila.insertCell();
				nuevaCelda.textContent=element.Horas_totales;
				nuevaCelda=nuevaFila.insertCell();
				nuevaCelda.textContent=element.Horas_completadas;
			})
		}
	})


}

function exportarExcel(){
	event.preventDefault();
	workbook=XLSX.utils.table_to_book(document.getElementById('tabla-resultados'));
	XLSX.writeFile(workbook, 'reporte_alumnos.xlsx');
}
document.addEventListener('DOMContentLoaded', cargarCatalogos);
document.getElementById('btn-generar').addEventListener('click',generarReporte); 
document.getElementById('btn-excel').addEventListener('click',exportarExcel); 
