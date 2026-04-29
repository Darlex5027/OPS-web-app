
/*
 * Archivo     : enviar_vacantes.js
 * Módulo      : Modulo 6 CU_06_PublicarVacantes
 * Autor       : Daniela Hernandez Hernandez
 * Fecha       : 20 de abril del 2026
 * Descripción : Este archivo gestiona el envío del formulario de vacantes.
                - Valida los datos ingresados por el usuario
                - Construye un objeto FormData con la información
                - Maneja dos tipos de registro: manual y con flyer
                - Envía los datos al servidor (PHP)
                - Muestra mensajes de éxito o error según la respuesta
 */
// Importación de funciones auxiliares
import { lanzarToast } from '../js/lanzar_toast.js';
import { fetchEmpresas, fetchServicios, handleCambioContenido } from './mostrar_contenido.js';

// Evento que se ejecuta al enviar el formulario
document.getElementById('miFormulario').addEventListener('submit', function (e) {
    e.preventDefault(); // Evita el envío tradicional del formulario (recarga de página)
    // Validación del formulario antes de continua
    if (!validarFormulario()) {
        return;
    }
    // Obtiene el tipo de registro (manual o flyer)
    const modoRegistro = document.getElementById('opciones').value;
    // Se crea el objeto FormData para enviar datos al servidor
    let formData = new FormData();
    formData.append('tipo_registro', modoRegistro);
    // Obtiene la fecha actual en formato YYYY-MM-DD (compatible con servidor)
    const hoy = new Date();
    const formatoServidor = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const fechaFormateada = formatoServidor.format(hoy);
    // ================= REGISTRO MANUAL =================
    if (modoRegistro === "manual") {
        // Obtiene la fecha de expiración ingresada por el usuario
        const fechaExpiracion = document.getElementById('expiracion_manual').value;
        // Valida que la fecha de expiración sea mayor a la actual
        if (fechaFormateada < fechaExpiracion) {
             // Agrega datos de la vacante al FormData
            formData.append('titulo', document.getElementById('titulo_manual').value);
            formData.append('Id_servicio', document.getElementById('servicio_manual').value);
            formData.append('nombre_contacto', document.getElementById('nombre_contacto').value);
            formData.append('email', document.getElementById('email').value);
            formData.append('telefono', document.getElementById('telefono').value);
            formData.append('descripcion', document.getElementById('descripcion').value);
            formData.append('requisitos', document.getElementById('requisitos').value);
            formData.append('publicacion', fechaFormateada);
            formData.append('expiracion', document.getElementById('expiracion_manual').value);
            // Verifica si se está creando una nueva empresa o seleccionando una existente
            const elSelectEmpresa = document.getElementById('empresa_manual');
            if (elSelectEmpresa.disabled) {
                // Se registrará una nueva empresa
                formData.append('nueva_empresa', 'true');
                formData.append('nombre_empresa', document.getElementById('nombre_empresa').value);
                formData.append('descripcion_empresa', document.getElementById('descripcion_empresa').value);
                formData.append('razon_empresa', document.getElementById('razon_empresa').value);
                formData.append('rfc_empresa', document.getElementById('rfc_empresa').value);
                formData.append('direccion_empresa', document.getElementById('direccion_empresa').value);
                formData.append('web_empresa', document.getElementById('web_empresa').value);
            }
            else {
                // Se usa una empresa ya existente
                formData.append('nueva_empresa', 'false');
                formData.append('Id_empresa', elSelectEmpresa.value);
            }
            // Envía los datos al servidor
            fetchGuardarVacante(formData);
        }
        else {
            lanzarToast("La fecha de expiracion debe de ser mayor que la actual", "error");
        }
        // ================= REGISTRO CON FLAYER =================
    } else {
        const fechaExpiracion = document.getElementById('expiracion_flayer').value;
        if (fechaFormateada < fechaExpiracion) {
            // Agrega datos básicos
            formData.append('titulo', document.getElementById('titulo_flayer').value);
            formData.append('Id_servicio', document.getElementById('servicio_flayer').value);
            formData.append('publicacion', fechaFormateada);
            formData.append('expiracion', document.getElementById('expiracion_flayer').value);
            // Obtiene el archivo flyer
            const archivoFlayer = document.getElementById('flayer').files[0];
            // Verifica que se haya seleccionado un archivo
            if (archivoFlayer) {
                formData.append('archivo_flayer', archivoFlayer);
            } else {
                lanzarToast("No se selecciono ningun flyer", "error");
                return;
            }
            // Manejo de empresa (igual que en modo manual)
            const elSelectEmpresa = document.getElementById('empresa_flayer');
            if (elSelectEmpresa.disabled) {
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
                formData.append('Id_empresa', elSelectEmpresa.value);
            }
            // Envía los datos
            fetchGuardarVacante(formData);
        } else {
            lanzarToast("La fecha de expiracion debe de ser mayor que la actual", "error");
        }
    }
});
// ================= FUNCIÓN PARA ENVIAR DATOS =================
function fetchGuardarVacante(formData) {
    const elBtnEnviar = document.getElementById('btnEnviar');
    elBtnEnviar.disabled = true; // Evita múltiples envíos
    const esNuevaEmpresa = formData.get('nueva_empresa') === 'true';
    // Petición al servidor
    fetch("guardar_vacante.php", {
        method: "POST",
        body: formData // Se envía el FormData
    })
        .then(response => {
            // Manejo de sesión expirada
            if (response.status === 401) {
                lanzarToast("La sesión expiró", "error");
                setTimeout(() => {
                    window.location.href = '../CU_01_Login/login.html';
                }, 3000); // Espera 3 segundos (el mismo tiempo que dura el toast)
                return null;
            }
            // Manejo de errores HTTP
            if (!response.ok) {
                return response.text().then(textoRespuesta => {
                    throw new Error(textoRespuesta);
                });
            }
            return response.text();
        })
        .then(function (textoRespuesta) {
            if (textoRespuesta === null) {
                return;
            }
            // Mensajes según el caso
            if (esNuevaEmpresa) {
                lanzarToast("Empresa creada exitosamente", "exito");
                setTimeout(() => {
                    lanzarToast("Publicacion exitosa", "exito");
                }, 3500);
            } else {
                lanzarToast("Publicacion exitosa", "exito");
            }
            // Limpia y restablece el formulario
            const modoActual = document.getElementById('opciones').value;
            document.getElementById('miFormulario').reset();
            document.getElementById('flayer').value = '';
            document.getElementById('opciones').value = modoActual;
             // Recarga contenido dinámico
            handleCambioContenido();
            fetchEmpresas();
            fetchServicios();
            elBtnEnviar.disabled = false;
        })
        // Manejo de errores
        .catch(function (error) {
            lanzarToast(error.message || "Ocurrió un error al guardar", "error");
            elBtnEnviar.disabled = false;
        })
}

