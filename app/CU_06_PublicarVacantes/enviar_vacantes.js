/* 
Daniela Hernandez Hernandez
Fecha de creacion: 20 de abril del 2026
El archivo enviar_vacantes.js se encarga de procesar y enviar los datos del formulario de vacantes
al servidor. Valida la información ingresada, construye un objeto FormData con todos los datos 
(incluyendo archivos si es necesario) y realiza una petición al backend. También muestra mensajes 
de éxito o error según el resultado.
*/
// Se agrega un evento al formulario para interceptar el envío
document.getElementById('miFormulario').addEventListener('submit', function (e) {
    // Evita que el formulario se envíe de forma tradicional (recarga de página)
    e.preventDefault();
    // Obtiene el tipo de registro seleccionado (manual o flayer)
    const eleccion = document.getElementById('opciones').value;
    // Se crea un objeto FormData para enviar los datos al servidor
    let formData = new FormData();
    // Se guarda el tipo de registro
    formData.append('tipo_registro', eleccion);
    // Obtiene la fecha actual
    const hoy = new Date();
    // Formatea la fecha en formato YYYY-MM-DD (compatible con el servidor)
    const formatoServidor = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const fechaFormateada = formatoServidor.format(hoy);
    // ================= REGISTRO MANUAL =================
    if (eleccion === "manual") {
        // Obtiene la fecha de expiración ingresada
        expiracion = document.getElementById('expiracion_manual').value
        // Valida que la fecha de expiración sea mayor a la actual
        if (fechaFormateada < expiracion) {
            // Agrega los datos del formulario manual
            formData.append('titulo', document.getElementById('titulo_manual').value);
            formData.append('Id_servicio', document.getElementById('servicio_manual').value);
            formData.append('nombre_contacto', document.getElementById('nombre_contacto').value);
            formData.append('email', document.getElementById('email').value);
            formData.append('telefono', document.getElementById('telefono').value);
            formData.append('descripcion', document.getElementById('descripcion').value);
            formData.append('requisitos', document.getElementById('requisitos').value);
            // Guarda fecha de publicación y expiración
            formData.append('publicacion', fechaFormateada);
            formData.append('expiracion', document.getElementById('expiracion_manual').value);
            // Obtiene el select de empresa
            select_empresa = document.getElementById('empresa_manual')
            // Si el select está deshabilitado, significa que se está creando una nueva empresa
            if (select_empresa.disabled) {
                // Datos de la nueva empresa
                formData.append('nueva_empresa', 'true');
                formData.append('nombre_empresa', document.getElementById('nombre_empresa').value);
                formData.append('descripcion_empresa', document.getElementById('descripcion_empresa').value);
                formData.append('razon_empresa', document.getElementById('razon_empresa').value);
                formData.append('rfc_empresa', document.getElementById('rfc_empresa').value);
                formData.append('direccion_empresa', document.getElementById('direccion_empresa').value);
                formData.append('web_empresa', document.getElementById('web_empresa').value);
            }
            else {
                // Si no, se usa una empresa existente
                formData.append('nueva_empresa', 'false');
                formData.append('Id_empresa', select_empresa.value);
            }
            // Envía los datos al servidor
            enviarDatos(formData);
        }
        else {
            // Mensaje de error si la fecha no es válida
            lanzarToast("La fecha de expiracion debe de ser mayor que la actual", "error");
        }
        // ================= REGISTRO CON FLAYER =================
    } else {
        // Obtiene la fecha de expiración
        expiracion = document.getElementById('expiracion_flayer').value
        // Valida la fecha
        if (fechaFormateada < expiracion) {
            // Agrega los datos básicos
            formData.append('titulo', document.getElementById('titulo_flayer').value);
            formData.append('Id_empresa', document.getElementById('empresa_flayer').value);
            formData.append('Id_servicio', document.getElementById('servicio_flayer').value);
            formData.append('publicacion', fechaFormateada);
            formData.append('expiracion', document.getElementById('expiracion_flayer').value);
            // Obtiene el archivo seleccionado
            const archivoFlayer = document.getElementById('flayer').files[0];
            // Verifica si se seleccionó un archivo
            if (archivoFlayer) {
                formData.append('archivo_flayer', archivoFlayer);
            } else {
                lanzarToast("No se selecciono ningun flyer", "error");
            }
            // Envía los datos
            enviarDatos(formData);
        } else {
            lanzarToast("La fecha de expiracion debe de ser mayor que la actual", "error");
        }
    }
});


// Función para enviar los datos al servidor (PHP)
function enviarDatos(datosParaEnviar) {
    fetch("guardar_vacante.php", {
        method: "POST",
        body: datosParaEnviar // Se envía el FormData
    })
    // Manejo de la respuesta
        .then(function (texto) {
            // Muestra mensaje de éxito
            lanzarToast("Publicacion exitosa    ", "exito");
             // Limpia el formulario
            document.getElementById('miFormulario').reset();
            // Dispara el evento change para actualizar la vista
            document.getElementById('opciones').dispatchEvent(new Event('change'));
            // Recarga las empresas (probablemente si se agregó una nueva)
            cargarEmpresas();
        })
        // Manejo de errores
        .catch(function (error) {
            lanzarToast("Error", "error");
        })
}

// Función para mostrar mensajes tipo "toast"
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