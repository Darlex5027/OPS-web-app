import { obtenerCookie } from '../js/cookie.js';
import { lanzarToast } from '../js/lanzar_toast.js';
import { renderMenu } from '../js/menu.js';

// Al final del archivo
window.cargar_datos = cargar_datos;

const encuestas = document.getElementById('slctEncuestas');
const periodo_tipo = document.getElementById('slctPeriodoTipo');
const periodo_año = document.getElementById('slctPeriodoAño');

periodo_tipo.style.visibility="hidden";
periodo_año.style.visibility="hidden";


document.addEventListener('DOMContentLoaded', function(){
	const tipoUsuario = obtenerCookie('Id_tipo_usuario');
	if (tipoUsuario == '2') {
		const tipoUsuario = obtenerCookie('Id_tipo_usuario');
		window.location.href = '../CU_03_PerfilGestionable/perfil.html';
		return;
	}
	renderMenu();
	cargarEncuestas();
});

function cargarEncuestas(){
	fetch('./obtener_encuestas.php')
		.then(res => res.json())
		.then( encuestas => {
			if(encuestas.error){
				lanzarToast(encuestas.error,"error");
				return
			}
			encuestas.forEach(function (encuesta){
				const option = document.createElement('option');
				option.value = encuesta.Id_encuesta;
				option.textContent = encuesta.Nombre;
				document.getElementById('slctEncuestas').appendChild(option);
			})

		})
}
encuestas.addEventListener('change', (event) => {

	periodo_tipo.innerHTML="<option value ='NINGUNO'>-- Seleccionar una periodo--</option>";
	periodo_año.innerHTML="<option value ='NINGUNO'>-- Seleccionar una año--</option>";
	if(encuestas.value === "NINGUNA"){
		periodo_tipo.style.visibility="hidden";
		periodo_año.style.visibility="hidden";
	}else{
		periodo_tipo.style.visibility="visible";
		periodo_año.style.visibility="visible";
		fetch('./obtener_periodos.php')
			.then( res => res.json())
			.then( function(respuesta){
				if(respuesta.error){
					lanzarToast(encuestas.error,"error");
					return
				}
				respuesta.tipo.forEach(function(tipo){
					const option = document.createElement('option');
					option.value = tipo.Periodo_tipo;
					option.textContent = tipo.Periodo_tipo;
					periodo_tipo.appendChild(option);
				});
				console.log(respuesta.año);
				respuesta.año.forEach(function(año){
					const option = document.createElement('option');
					option.value = año.Periodo_año;
					option.textContent = año.Periodo_año;
					periodo_año.appendChild(option);
				})
			});

	}
});

/*
 * CARGAR TABLA
 */
function cargar_datos(){
	if(encuestas.value === "NINGUNA"){
		lanzarToast("Debe seleccionar una encuesta para generar el reporte", "error");
		return;
	}
	if(periodo_tipo.value === "NINGUNO" || periodo_año.value === "NINGUNO"){
		lanzarToast("El periodo y el año deben rellenarse","error")
		return;
	}

	cargarTabla();
}
function cargarTabla(){

	// Se cargan los elemento a usar desde el HTML
	const titulos = document.getElementById("Titulos");
	const tabla = document.getElementById("Tabla");
	const bExcel = document.getElementById("btnGenerarExcel");
	const bPDF = document.getElementById("btnGenerarPDF");
	const id_encuesta = document.getElementById("slctEncuestas").value;
	const periodo_tipo = document.getElementById("slctPeriodoTipo").value;
	const periodo_año = document.getElementById("slctPeriodoAño").value;

	// Se limpian las tablas de caulquier contenido que tengan
	titulos.innerHTML=""
	tabla.innerHTML="";


	fetch("./generar_tabla.php",{
		method: "POST",
		headers:{
			"Content-Type":"application/json"
		},
		body: JSON.stringify({Id_encuesta: id_encuesta, Periodo_tipo: periodo_tipo, Periodo_año: periodo_año})
	}) 
		.then(function (respuesta){
			//Se obtiene la respuesta del php
			return respuesta.json();
		})
		.then(function (impresion){
			if(impresion.error){
				lanzarToast(impresion.error,"error");

				bPDF.style.visibility="hidden";
				bExcel.style.visibility="hidden";

				return
			}

			//Si la impresión es de tamaño 0 significa que la respuesta es un mensaje
			//por lo que no se encontraron resultados.
			if(impresion.length==0){
				lanzarToast("No se encontraron Resultados", "error");
				bExcel.style.visibility="hidden";
				bPDF.style.visibility="hidden";
				return;
			}

			console.log(impresion);	
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
			tabla.innerHTML+="<tr><td><h2>Promedio:</h2><label id='lblPromedio'></label></td><tr>"
			bExcel.style.visibility="visible";
			bPDF.style.visibility="visible";
			cargarPromedio();
		});
}

function cargarPromedio(){
	const promedio=document.getElementById("lblPromedio");
	const id_encuesta = document.getElementById("slctEncuestas").value;
	const periodo_tipo = document.getElementById("slctPeriodoTipo").value;
	const periodo_año = document.getElementById("slctPeriodoAño").value;


	fetch("./generar_promedio.php",{
		method: "POST",
		headers:{
			"Content-Type":"application/json"
		},
		body: JSON.stringify({Id_encuesta: id_encuesta, Periodo_tipo: periodo_tipo, Periodo_año: periodo_año})
	}).then(function (respuesta){
		return respuesta.json();
	})
		.then(function (impresion){
			if(encuestas.error){
				lanzarToast(encuestas.error,"error");
				return
			}

			promedio.innerHTML=impresion;		
		})
	lanzarToast("Resultados cargados correctamente", "exito");
}	
