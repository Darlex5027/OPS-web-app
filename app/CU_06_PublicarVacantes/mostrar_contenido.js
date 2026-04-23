/* 
Daniela Hernandez Hernandez
Fecha de creacion: 20 de abril del 2026
El archivo mostrar_contenido.js controla la lógica visual del formulario de vacantes. 
Permite cambiar entre los tipos de registro (manual o flayer), carga la fecha actual, 
obtiene la lista de empresas desde el servidor y gestiona la opción de crear una nueva empresa
o seleccionar una existente.
*/
// Se ejecuta cuando el HTML ya cargó completamente
document.addEventListener('DOMContentLoaded', function () {
    // Muestra el contenido inicial según la opción seleccionada
    cambiarContenido();
    // Oculta el formulario de nueva empresa al iniciar
    const divNueva = document.getElementById('nueva_empresa');
    if (divNueva) {
        divNueva.style.display = 'none';
    }
    // Crea una cookie con el Id del usuario (simulación o prueba)
    document.cookie = "Id_usuario=24"
});
function cargarFecha() {
    // Obtenemos el elemento
    inputFecha = document.getElementById('fecha_Manual');
    // Creamos el objeto de fecha de hoy
    hoy = new Date();
    formatoServidor = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    // Formateamos a YYYY-MM-DD (que es lo que requiere el input de HTML5)
    fechaFormateada = formatoServidor.format(hoy);
    // Asignamos el valor
    inputFecha.innerHTML = "Fecha de registro: " + fechaFormateada;

    inputFecha = document.getElementById('fecha_flayer');
    // Creamos el objeto de fecha de hoy
    hoy = new Date();
    formatoServidor = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    // Formateamos a YYYY-MM-DD (que es lo que requiere el input de HTML5)
    fechaFormateada = formatoServidor.format(hoy);
    // Asignamos el valor
    inputFecha.innerHTML = "Fecha de registro: " + fechaFormateada;
}

// Función para cargar las empresas desde el servidor
function cargarEmpresas() {
    fetch('obtener_empresas.php')
    // Convierte la respuesta a JSON
        .then(function (respuesta) {
            return respuesta.json();
        })
        // Procesa la lista de empresas
        .then(function (empresas) {
            // Detecta qué tipo de formulario está activo
            const seleccion = document.getElementById("opciones").value;
            // Define el select correspondiente
            if (seleccion === "manual") {
                id = "empresa_manual";
            } else {
                id = "empresa_flayer";
            }
            // Obtiene el elemento select
            const select = document.getElementById(id);
            // Limpia las opciones anteriores
            select.innerHTML = '<option value="">-- Selecciona una empresa --</option>';
             // Recorre las empresas y las agrega como opciones
            empresas.forEach(function (empresa) {
                const opcion = document.createElement('option');
                opcion.value = empresa.Id_empresa;   // ID que se manda a la BD
                opcion.textContent = empresa.Nombre; // Texto que ve el usuario
                select.appendChild(opcion);
            });
        })
        // Manejo de errores
        .catch(function (error) {
            console.error('Error al cargar empresas:', error);
        });
}
// Función que cambia entre formulario manual y flayer
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
    // Carga empresas y fecha cada vez que cambia la vista
    cargarEmpresas();
    cargarFecha();
}
// Función para mostrar mensajes tipo toast
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

// Función para mostrar el formulario de nueva empresa
function mostrarFormularioNuevo() {
    // Mostramos el contenedor
    const divNueva = document.getElementById('nueva_empresa');
    divNueva.style.display = 'block';
    
    // Deshabilitamos el select de empresas existentes
    const select = document.getElementById('empresa_manual');
    select.disabled = true;
    select.value = ""; 
    
    // Ocultamos el botón de "+ Crear Nueva"
    document.getElementById('btn-activar-nueva').style.display = 'none';

    // Hace obligatorios los campos de nueva empresa
    document.getElementById('nombre_empresa').required = true;
    document.getElementById('descripcion_empresa').required = true;
    document.getElementById('razon_empresa').required = true;
    document.getElementById('rfc_empresa').required = true;
    document.getElementById('direccion_empresa').required = true;
}
// Función para cancelar el registro de nueva empresa
function cancelarRegistro() {
    // Oculta el formulario de nueva empresa
    document.getElementById('nueva_empresa').style.display = 'none';
    // Reactiva el select de empresas existentes
    document.getElementById('empresa_manual').disabled = false;
    // Muestra nuevamente el botón
    document.getElementById('btn-activar-nueva').style.display = 'inline-block';
    // Quita el atributo requerido a los campos
    document.getElementById('nombre_empresa').required = false;
    document.getElementById('descripcion_empresa').required = false;
    document.getElementById('razon_empresa').required = false;
    document.getElementById('rfc_empresa').required = false;
    document.getElementById('direccion_empresa').required = false;
}