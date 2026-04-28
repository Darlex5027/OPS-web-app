/* 
Daniela Hernandez Hernandez
Fecha de creacion: 20 de abril del 2026
El archivo enviar_vacantes.js se encarga de procesar y enviar los datos del formulario de vacantes
al servidor. Valida la información ingresada, construye un objeto FormData con todos los datos 
(incluyendo archivos si es necesario) y realiza una petición al backend. También muestra mensajes 
de éxito o error según el resultado.
*/
document.getElementById('miFormulario').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validarFormulario()) {
        return;
    }
    const eleccion = document.getElementById('opciones').value;
    let formData = new FormData();
    formData.append('tipo_registro', eleccion);
    const hoy = new Date();
    const formatoServidor = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const fechaFormateada = formatoServidor.format(hoy);
    // ================= REGISTRO MANUAL =================
    if (eleccion === "manual") {
        expiracion = document.getElementById('expiracion_manual').value
        if (fechaFormateada < expiracion) {
            formData.append('titulo', document.getElementById('titulo_manual').value);
            formData.append('Id_servicio', document.getElementById('servicio_manual').value);
            formData.append('nombre_contacto', document.getElementById('nombre_contacto').value);
            formData.append('email', document.getElementById('email').value);
            formData.append('telefono', document.getElementById('telefono').value);
            formData.append('descripcion', document.getElementById('descripcion').value);
            formData.append('requisitos', document.getElementById('requisitos').value);
            formData.append('publicacion', fechaFormateada);
            formData.append('expiracion', document.getElementById('expiracion_manual').value);
            select_empresa = document.getElementById('empresa_manual')
            if (select_empresa.disabled) {
                formData.append('nueva_empresa', 'true');
                formData.append('nombre_empresa', document.getElementById('nombre_empresa').value);
                formData.append('descripcion_empresa', document.getElementById('descripcion_empresa').value);
                formData.append('razon_empresa', document.getElementById('razon_empresa').value);
                formData.append('rfc_empresa', document.getElementById('rfc_empresa').value);
                formData.append('direccion_empresa', document.getElementById('direccion_empresa').value);
                formData.append('web_empresa', document.getElementById('web_empresa').value);
            }
            else {
                formData.append('nueva_empresa', 'false');
                formData.append('Id_empresa', select_empresa.value);
            }
            enviarDatos(formData);
        }
        else {
            lanzarToast("La fecha de expiracion debe de ser mayor que la actual", "error");
        }
        // ================= REGISTRO CON FLAYER =================
    } else {
        expiracion = document.getElementById('expiracion_flayer').value
        if (fechaFormateada < expiracion) {
            formData.append('titulo', document.getElementById('titulo_flayer').value);
            formData.append('Id_servicio', document.getElementById('servicio_flayer').value);
            formData.append('publicacion', fechaFormateada);
            formData.append('expiracion', document.getElementById('expiracion_flayer').value);
            const archivoFlayer = document.getElementById('flayer').files[0];
            if (archivoFlayer) {
                formData.append('archivo_flayer', archivoFlayer);
            } else {
                lanzarToast("No se selecciono ningun flyer", "error");
                return;
            }
            const select_empresa = document.getElementById('empresa_flayer')
            if (select_empresa.disabled) {
                formData.append('nueva_empresa', 'true');
                formData.append('nombre_empresa', document.getElementById('nombre_empresa').value);
                formData.append('descripcion_empresa', document.getElementById('descripcion_empresa').value);
                formData.append('razon_empresa', document.getElementById('razon_empresa').value);
                formData.append('rfc_empresa', document.getElementById('rfc_empresa').value);
                formData.append('direccion_empresa', document.getElementById('direccion_empresa').value);
                formData.append('web_empresa', document.getElementById('web_empresa').value);
            }
            else {
                formData.append('nueva_empresa', 'false');
                formData.append('Id_empresa', select_empresa.value);
            }
            // Envía los datos
            enviarDatos(formData);
        } else {
            lanzarToast("La fecha de expiracion debe de ser mayor que la actual", "error");
        }
    }
});

function enviarDatos(datosParaEnviar) {
    const btnEnviar = document.getElementById('btnEnviar');
    btnEnviar.disabled = true;
    const esNuevaEmpresa = datosParaEnviar.get('nueva_empresa') === 'true';
    fetch("guardar_vacante.php", {
        method: "POST",
        body: datosParaEnviar // Se envía el FormData
    })
        .then(response => {
            if (response.status === 401) {
                lanzarToast("La sesión expiró", "error");
                setTimeout(() => {
                    window.location.href = '../CU_01_Login/login.html';
                }, 3000); // Espera 3 segundos (el mismo tiempo que dura el toast)
                return null;
            }
            if (!response.ok) {
                return response.text().then(texto => {
                    throw new Error(texto);
                });
            }
            return response.text();
        })
        .then(function (texto) {
            if (texto === null) {
                return;
            }
            if (esNuevaEmpresa) {
                lanzarToast("Empresa creada exitosamente", "exito");
                setTimeout(() => {
                    lanzarToast("Publicacion exitosa    ", "exito");
                }, 3500)
            }
            const modoActual = document.getElementById('opciones').value;
            document.getElementById('miFormulario').reset();
            document.getElementById('flayer').value = '';
            document.getElementById('opciones').value = modoActual;
            cambiarContenido();
            cargarEmpresas();
            cargarServicio();
            btnEnviar.disabled = false;
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
    }, 5000);
}