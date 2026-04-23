document.getElementById('miFormulario').addEventListener('submit', function(e) {
    e.preventDefault();

    
    const eleccion = document.getElementById('opciones').value;
    let formData = new FormData();
    formData.append('tipo_registro', eleccion);
    const hoy = new Date();
    const fechaFormateada = hoy.toISOString().split('T')[0];
    if(eleccion === "manual"){
        expiracion = document.getElementById('expiracion_manual').value
        if(fechaFormateada<expiracion){
            formData.append('titulo', document.getElementById('titulo_manual').value);
            formData.append('Id_empresa', document.getElementById('empresa_manual').value);
            formData.append('Id_servicio', document.getElementById('servicio_manual').value);
            formData.append('nombre_contacto', document.getElementById('nombre_contacto').value);
            formData.append('email', document.getElementById('email').value);
            formData.append('telefono', document.getElementById('telefono').value);
            formData.append('descripcion', document.getElementById('descripcion').value);
            formData.append('requisitos', document.getElementById('requisitos').value);
            formData.append('publicacion', fechaFormateada);
            formData.append('expiracion', document.getElementById('expiracion_manual').value);
        }
        else{
            lanzarToast("La fecha de expiracion debe de ser mayor que la actual", "error");
        }
    }else{
        expiracion = document.getElementById('expiracion_flayer').value
        if(fechaFormateada<expiracion){
            formData.append('titulo', document.getElementById('titulo_flayer').value);
            formData.append('Id_empresa', document.getElementById('empresa_flayer').value);
            formData.append('Id_servicio', document.getElementById('servicio_flayer').value);
            formData.append('publicacion', fechaFormateada);
            formData.append('expiracion', document.getElementById('expiracion_flayer').value);

            const archivoFlayer = document.getElementById('flayer').files[0];
            if (archivoFlayer) {
                formData.append('archivo_flayer', archivoFlayer);
            } else {
                console.warn("No se seleccionó ningún flayer");
            }
        }else{
            lanzarToast("La fecha de expiracion debe de ser mayor que la actual", "error");
        }
        
    }
    enviarDatos(formData);
});
/*function enviarDatos(datosParaEnviar){
    fetch("guardar_vacante.php", {
        method: "POST",
        body: datosParaEnviar
    })
    .then(function(respuesta){
        console.log(respuesta);
        document.getElementById('miFormulario').reset();
        document.getElementById('opciones').dispatchEvent(new Event('change'));
        cargarEmpresas();
    })
    .catch(function(error){
        console.error("Error", error);
    })
}*/


//Cambiar al otro enviar datos
function enviarDatos(datosParaEnviar){
    fetch("guardar_vacante.php", {
        method: "POST",
        body: datosParaEnviar
    })
    .then(function(respuesta){
        return respuesta.text(); // 👈 Agrega esto
    })
    .then(function(texto){
        console.log("Respuesta PHP:", texto); // 👈 Y esto
        document.getElementById('miFormulario').reset();
        document.getElementById('opciones').dispatchEvent(new Event('change'));
        cargarEmpresas();
    })
    .catch(function(error){
        console.error("Error", error);
    })
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