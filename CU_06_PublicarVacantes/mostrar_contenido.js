document.addEventListener('DOMContentLoaded', function() {  
    cambiarContenido();  
});
function cargarFecha(){
    // Obtenemos el elemento
    inputFecha = document.getElementById('fecha_Manual');
    // Creamos el objeto de fecha de hoy
    hoy = new Date();
    // Formateamos a YYYY-MM-DD (que es lo que requiere el input de HTML5)
    fechaFormateada = hoy.toISOString().split('T')[0];
    // Asignamos el valor
    inputFecha.innerHTML = "Fecha de registro: "+ fechaFormateada;

    inputFecha = document.getElementById('fecha_flayer');
    // Creamos el objeto de fecha de hoy
    hoy = new Date();
    // Formateamos a YYYY-MM-DD (que es lo que requiere el input de HTML5)
    fechaFormateada = hoy.toISOString().split('T')[0];
    // Asignamos el valor
    inputFecha.innerHTML = "Fecha de registro: "+ fechaFormateada;
}

function cargarEmpresas(){
    fetch('obtener_empresas.php')
    .then(function(respuesta) {
        return respuesta.json();
    })
    .then(function(empresas) {  
        const seleccion = document.getElementById("opciones").value;
        if(seleccion==="manual"){
            id = "empresa_manual";
        }else{
            id = "empresa_flayer";
        }
        const select = document.getElementById(id);
        select.innerHTML = '<option value="">-- Selecciona una empresa --</option>';

        empresas.forEach(function(empresa) {
            const opcion = document.createElement('option');
            opcion.value = empresa.Id_empresa;   // ID que se manda a la BD
            opcion.textContent = empresa.Nombre; // Texto que ve el usuario
            select.appendChild(opcion);
        });
        //document.getElementById('btnEnviar').disabled = false;
        //console.log("Botón habilitado"); // 👈 ¿Aparece esto?
    })
    .catch(function(error) {
        console.error('Error al cargar empresas:', error);
    });
}

function cambiarContenido() {
    // 1. Obtenemos el valor actual del select
    const seleccion = document.getElementById("opciones").value;
    
    // 2. Obtenemos las referencias a los dos contenedores
    const divManual = document.getElementById("registro_manual");
    const divFlayer = document.getElementById("registro_flayer");

    // 3. Lógica IF/ELSE para mostrar u ocultar
    if (seleccion === "manual") {
        divManual.style.display = "block";  // Muestra manual
        divFlayer.style.display = "none";   // Oculta flayer
    } else if (seleccion === "flayer") {
        divManual.style.display = "none";   // Oculta manual
        divFlayer.style.display = "block";  // Muestra flayer
    } else {
        // Por si acaso no hay nada seleccionado
        divManual.style.display = "none";
        divFlayer.style.display = "none";
    }

    cargarEmpresas();
    cargarFecha();
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

    // 4. Desvanecemos en 3 segundos
    setTimeout(() => {
        toast.classList.add('oculto');
    }, 3000);
}