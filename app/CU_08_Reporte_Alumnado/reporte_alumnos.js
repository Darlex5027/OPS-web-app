function cargar_catalogos(){
	fetch("./obtener_catalogos.php")
	.then(function (respuesta){
		return respuesta.json();
	})
	.then(function(catalogos){
		catalogos.servicios.forEach(function (servicio){
			option = document.createElement('option');
			option.value = servicio.Id_servicio;
			option.textContent = servicio.Servicio;
			document.getElementById('actividad').appendChild(option)
		});	
		catalogos.estados.forEach(function (estado){
			option = document.createElement('option');
			option.value = estado.Estado;
			option.textContent = estado.Estado;
			document.getElementById('estado').appendChild(option)
		});	
	});	
}

document.addEventListener("DOMContentLoaded", function(){
	cargar_catalogos();
	redireccionar();
});


function redireccionar(){
	if(!document.cookie){
		window.location.href = "../CU_01_Login/login.html";
	}
}

function cargar_tabla(){
	actividad = document.getElementById("actividad").value;
	estado = document.getElementById("estado").value;
	titulos = document.getElementById("Titulos");
	tabla = document.getElementById("Tabla");
	fetch("./reporte_alumnos.php",{
		method: "POST",
	        headers:{
        	    "Content-Type":"application/json"
	        },
		body: JSON.stringify({ actividad: actividad, estado:estado})
	})
	.then(function (respuesta){
		return respuesta.json();
	})
	.then(function (impresion){
		if(impresion.length==0){
           		lanzarToast("No se encontraron Resultados", "error");
			return;
		}

		titulos.innerHTML=""
		tabla.innerHTML="";


		
		Object.keys(impresion[0]).forEach(function(titulo){
			titulos.innerHTML=titulos.innerHTML+"<th>"+titulo+"</th>"
		});
		impresion.forEach(function(fila){
			table="";
			
			table=table+"<tr>";
			Object.keys(fila).forEach(function(dato){
				table=table+"<td>"+fila[dato]+"</td>";

			});
			table=table+"</tr>";
			tabla.innerHTML+=table;
		});
	});
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
