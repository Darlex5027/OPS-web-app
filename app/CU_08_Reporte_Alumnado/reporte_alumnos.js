
import {dirigirPerfil} from '../manejo_perfil.js';

window.dirigirPerfil=dirigirPerfil;
window.cargar_tabla=cargar_tabla;
window.exportarExcel=exportarExcel;
/*
 * Al cargar la página se revisa que el usuario tenga una sesión iniciada
 * Posterior a tener una sesión iniciada se cargan los catalogos para los
 * select.
 */


document.addEventListener("DOMContentLoaded", function(){
	redireccionar();
	cargar_catalogos();
});

/*
 * Si no hay cookies, se redirige al inicio de sesión automaticamente.
 */
function redireccionar(){
	if(!document.cookie){
		window.location.href = "../CU_01_Login/login.html";
	}
}


/*
 * CARGAR CATALOGOS EN LOS SELECT
 */

function cargar_catalogos(){
	fetch("./obtener_catalogos.php")
	.then(function (respuesta){
		return respuesta.json();
	})
	.then(function(catalogos){
		catalogos.servicios.forEach(function (servicio){
			//Se crea una opción con value como el Id_servicio de la actividad a cargar
			const option = document.createElement('option');
			option.value = servicio.Id_servicio;
			//A la opción se le da el texto de Servicio (nombre del servicio)
			option.textContent = servicio.Servicio;
			document.getElementById('actividad').appendChild(option)
		});	
		catalogos.estados.forEach(function (estado){
			// Se cargan los estados disponibles que puede tener un servicio.
			// PENDIENTE, EN_CURSO, COMPLETADO
			const option = document.createElement('option');
			option.value = estado.Estado;
			option.textContent = estado.Estado;
			document.getElementById('estado').appendChild(option)
		});	
	});	
}


/*
 * CARGAR TABLA
 */

function cargar_tabla(){

	// Se cargan los elemento a usar desde el HTML
	const actividad = document.getElementById("actividad").value;
	const estado = document.getElementById("estado").value;
	const titulos = document.getElementById("Titulos");
	const tabla = document.getElementById("Tabla");

	// Se limpian las tablas de caulquier contenido que tengan
	titulos.innerHTML=""
	tabla.innerHTML="";


	fetch("./reporte_alumnos.php",{
		method: "POST",
	        headers:{
        	    "Content-Type":"application/json"
	        },
		// Se cargan los filtros seleccionado por el usuario
		body: JSON.stringify({ actividad: actividad, estado:estado})
		// No es necesario enviar el Id_usuario o Id_carrera porque ese se obtiene dentro del php
	}) 
	.then(function (respuesta){
		//Se obtiene la respuesta del php
		return respuesta.json();
	})
	.then(function (impresion){
		//Si la impresión es de tamaño 0 significa que la respuesta es un mensaje
		//por lo que no se encontraron resultados.
		if(impresion.length==0){
           		lanzarToast("No se encontraron Resultados", "error");
			return;
		}

	
		//Renderizado de los titulos obtenidos
		Object.keys(impresion[0]).forEach(function(titulo){
			titulos.innerHTML=titulos.innerHTML+"<th>"+titulo+"</th>"
		});
		// Renderizado de el contenido de la tabla
		impresion.forEach(function(fila){
			//Variable para guardar la fila temporal
			let table="";
			
			table=table+"<tr>";
			// Por cada titulo (celda) se agrega la celda a la estructura de la fila	
			Object.keys(fila).forEach(function(dato){
				//Se concatena el dato de la fila dentr
				table=table+"<td>"+fila[dato]+"</td>";

			});
			table=table+"</tr>";
			tabla.innerHTML+=table;
		});
	});
}

function exportarExcel(){
	event.preventDefault();
	workbook=XLSX.utils.table_to_book(document.getElementById('tabla-resultados'));
	XLSX.writeFile(workbook, 'reporte_alumnos.xlsx');
}

function lanzarToast(texto, tipo) {
    const toast = document.getElementById('toast-mensaje');
   
    // 1. Limpiamos clases previas y ponemos la nueva
    toast.className = 'toast'; // Resetea a la base
    toast.classList.add(tipo); // Agrega 'exito' o 'error'
    
    // 2. Insertamos el texto
    toast.innerText = texto;
    
    // 3. Mostramos
    toast.classList.remove('oculto');

    // 4. Desvanecemos en 3 segundos␍
    setTimeout(() => {
        toast.classList.add('oculto');
    }, 3000);
}
