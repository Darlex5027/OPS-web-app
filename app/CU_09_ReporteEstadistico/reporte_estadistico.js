const encuestas = document.getElementById('encuestas');
const periodo_tipo = document.getElementById('slctPeriodoTipo');
const periodo_año = document.getElementById('slctPeriodoAño');

periodo_tipo.style.visibility="hidden";
periodo_año.style.visibility="hidden";


document.addEventListener('DOMContenLoaded', cargarEncuestas());

function cargarEncuestas(){
	fetch('./obtener_encuestas.php')
		.then(res => res.json())
		.then( encuestas => {
			encuestas.forEach(function (encuesta){
				const option = document.createElement('option');
				option.value = encuesta.Id_encuesta;
				option.textContent = encuesta.Nombre;
				document.getElementById('encuestas').appendChild(option);
			})
		});
}

encuestas.addEventListener('change', (event) => {
	if(encuestas.value === "NINGUNA"){
		periodo_tipo.style.visibility="hidden";
		periodo_año.style.visibility="hidden";

	}else{
		periodo_tipo.style.visibility="visible";
		periodo_año.style.visibility="visible";
		fetch('./obtener_periodos.php')
			.then( res => res.json())
			.then( function(respuesta){
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
