/*
 * Archivo     : mostrar_contenido.js
 * Módulo      : Modulo 6 CU_06_PublicarVacantes
 * Autor       : Daniela Hernandez Hernandez
 * Fecha       : 20 de abril del 2026
 * Descripción : Este archivo controla la parte visual y validación del formulario de vacantes. 
 *               Cambia entre modo manual y flyer, carga empresas y servicios, muestra u oculta 
 *               secciones y verifica que todos los datos estén correctos antes de enviarse.
 */
import { lanzarToast } from '../js/lanzar_toast.js';
import { obtenerCookie } from '../js/cookie.js';
import { renderMenu } from '../js/menu.js';
// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', function () {
    renderMenu();
    const tipoUsuario = obtenerCookie('Id_tipo_usuario');
    if (tipoUsuario == '2') {
        const tipoUsuario = obtenerCookie('Id_tipo_usuario');
        window.location.href = '../CU_03_PerfilGestionable/perfil.html';
        return;
    }
    // Configura el contenido inicial según el modo seleccionado
    handleCambioContenido();
    // Oculta el formulario de nueva empresa al iniciar
    const elDivNuevaEmpresa = document.getElementById('nueva_empresa');
    if (elDivNuevaEmpresa) {
        elDivNuevaEmpresa.style.display = 'none';
    }

    document.getElementById('nueva_empresa').style.display = 'none';
    // Al terminar de cargar completamente la página
    window.addEventListener('load', function () {
        document.getElementById('miFormulario').reset();
        handleCambioContenido();
    });
});

// ================= MOSTRAR FECHA ACTUAL =================
function renderFecha() {
    // Fecha para modo manual
    let elFechaManual = document.getElementById('fecha_Manual');
    let hoy = new Date();
    // Formato YYYY-MM-DD
    let formatoServidor = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    let fechaFormateada = formatoServidor.format(hoy);
    elFechaManual.innerHTML = "Fecha de registro: " + fechaFormateada;
    // Fecha para modo flyer (se repite el mismo proceso)
    let elFechaFlayer = document.getElementById('fecha_flayer');
    hoy = new Date();
    formatoServidor = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    fechaFormateada = formatoServidor.format(hoy);
    elFechaFlayer.innerHTML = "Fecha de registro: " + fechaFormateada;
}
// ================= OBTENER EMPRESAS =================
export function fetchEmpresas() {
    fetch('obtener_empresas.php')
        .then(function (respuesta) {
            return respuesta.json();
        })
        .then(function (empresas) {
            // Llena ambos selects (manual y flyer)
            ['empresa_manual', 'empresa_flayer'].forEach(function (idSelect) {
                const elSelectEmpresa = document.getElementById(idSelect);
                // Opción por defecto
                elSelectEmpresa.innerHTML = '<option value="">-- Selecciona una empresa --</option>';
                // Agrega opciones dinámicamente
                empresas.forEach(function (empresa) {
                    const opcion = document.createElement('option');
                    opcion.value = empresa.Id_empresa;
                    opcion.textContent = empresa.Nombre;
                    elSelectEmpresa.appendChild(opcion);
                });
            });
        })
        .catch(function (error) {
            lanzarToast("La empresa no se pudo cargar", "error");
        });
}
// ================= OBTENER SERVICIOS =================
export function fetchServicios() {
    fetch('obtener_servicios.php')
        .then(function (respuesta) {
            return respuesta.json();
        })
        .then(function (servicios) {
            // Llena ambos selects (manual y flyer)
            ['servicio_manual', 'servicio_flayer'].forEach(function (idSelect) {
                const elSelectServicio = document.getElementById(idSelect); // ← usa idSelect, no idSelectActivo
                elSelectServicio.innerHTML = '<option value="">-- Selecciona un Servicio --</option>';
                servicios.forEach(function (servicio) {
                    const opcion = document.createElement('option');
                    opcion.value = servicio.Id_servicio;
                    opcion.textContent = servicio.Servicio;
                    elSelectServicio.appendChild(opcion);
                });
            });
        })
        .catch(function (error) {
            lanzarToast("El servicio no se pudo cargar", "error");
        });
}
// ================= CAMBIO DE MODO (MANUAL / FLYER) =================
export function handleCambioContenido() {
    const modoRegistro = document.getElementById("opciones").value;
    const elDivManual = document.getElementById("registro_manual");
    const elDivFlayer = document.getElementById("registro_flayer");

    // Muestra u oculta secciones según el modo seleccionado
    if (modoRegistro === "manual") {
        elDivManual.style.display = "block";  // Muestra manual
        elDivFlayer.style.display = "none";   // Oculta flayer
    } else if (modoRegistro === "flayer") {
        elDivManual.style.display = "none";   // Oculta manual
        elDivFlayer.style.display = "block";  // Muestra flayer
    } else {
        elDivManual.style.display = "none";
        elDivFlayer.style.display = "none";
    }

    // Reinicia el estado del formulario de empresa
    document.getElementById('nueva_empresa').style.display = 'none';
    document.getElementById('btn-activar-nueva-manual').style.display = 'inline-block';
    document.getElementById('btn-activar-nueva-flayer').style.display = 'inline-block';
    document.getElementById('empresa_manual').disabled = false;
    document.getElementById('empresa_flayer').disabled = false;
    // Recarga datos dinámicos
    fetchEmpresas();
    renderFecha();
    fetchServicios();
}

// ================= VALIDACIÓN DE ARCHIVO =================
const elInputFlayer = document.getElementById("flayer");

elInputFlayer.onchange = function () {
    // Valida tamaño máximo (20MB)
    if (this.files[0].size > 20971520) {
        lanzarToast("El archivo no puede ser mayor a 20 MB", "error")
        this.value = "";
    }
};
// ================= VALIDACIÓN GENERAL DEL FORMULARIO =================
export function validarFormulario() {
    const modoRegistro = document.getElementById("opciones").value;
    // Diccionario para mostrar nombres amigables en errores
    const nombres = {
        "titulo_manual": "Título",
        "empresa_manual": "Empresa",
        "servicio_manual": "Servicio",
        "nombre_contacto": "Nombre del contacto",
        "email": "Email",
        "telefono": "Teléfono",
        "descripcion": "Descripción",
        "requisitos": "Requisitos",
        "expiracion_manual": "Fecha de expiración",
        "titulo_flayer": "Título",
        "flayer": "Flyer",
        "empresa_flayer": "Empresa",
        "servicio_flayer": "Servicio",
        "expiracion_flayer": "Fecha de expiración",
        "nombre_empresa": "Nombre de la empresa",
        "descripcion_empresa": "Descripción de la empresa",
        "razon_empresa": "Razón social",
        "rfc_empresa": "RFC",
        "direccion_empresa": "Dirección",
        "web_empresa": "Sitio web"
    };

    // Campos requeridos para nueva empresa
    const camposNuevaEmpresa = ["nombre_empresa", "descripcion_empresa", "razon_empresa", "rfc_empresa", "direccion_empresa", "web_empresa"];

    // -------- VALIDACIÓN MODO MANUAL --------
    if (modoRegistro === "manual") {
        const campos = ["titulo_manual", "servicio_manual", "nombre_contacto", "email", "telefono", "descripcion", "requisitos", "expiracion_manual"];
        // Recorre cada campo obligatorio
        for (const idCampo of campos) {
            const elCampo = document.getElementById(idCampo);
            if (!elCampo.value.trim()) {
                elCampo.focus();
                lanzarToast(`${nombres[idCampo]} no puede estar vacío`, "error");
                return false;
            }
        }
        const elSelectEmpresaManual = document.getElementById('empresa_manual');
        // Si se crea nueva empresa, valida sus campos
        if (elSelectEmpresaManual.disabled) {
            for (const idCampo of camposNuevaEmpresa) {
                const elCampo = document.getElementById(idCampo);
                if (!elCampo.value.trim()) {
                    elCampo.focus();
                    lanzarToast(`${nombres[idCampo]} no puede estar vacío`, "error");
                    return false;
                }
            }
        } else if (!elSelectEmpresaManual.value) {
            // Si no seleccionó empresa existente
            elSelectEmpresaManual.focus();
            lanzarToast("Empresa no puede estar vacío", "error");
            return false;
        }
        // -------- VALIDACIÓN MODO FLYER --------
    } else if (modoRegistro === "flayer") {
        const archivoFlayer = document.getElementById('flayer').files[0];
         // Valida que exista archivo
        if (!archivoFlayer) {
            lanzarToast("Flyer no puede estar vacío", "error");
            return false;
        }
        // Valida tipo de archivo
        const tiposPermitidos = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!tiposPermitidos.includes(archivoFlayer.type)) {
            lanzarToast("Solo se permiten archivos JPG, PNG o PDF", "error");
            return false;
        }

        const campos = ["titulo_flayer", "servicio_flayer", "expiracion_flayer"];
        
        for (const idCampo of campos) {
            const elCampo = document.getElementById(idCampo);
            if (!elCampo.value.trim()) {
                elCampo.focus();
                lanzarToast(`${nombres[idCampo]} no puede estar vacío`, "error");
                return false;
            }
        }

        const elSelectEmpresaFlayer = document.getElementById('empresa_flayer');
        if (elSelectEmpresaFlayer.disabled) {
            for (const idCampo of camposNuevaEmpresa) {
                const elCampo = document.getElementById(idCampo);
                if (!elCampo.value.trim()) {
                    elCampo.focus();
                    lanzarToast(`${nombres[idCampo]} no puede estar vacío`, "error");
                    return false;
                }
            }
        } else if (!elSelectEmpresaFlayer.value) {
            elSelectEmpresaFlayer.focus();
            lanzarToast("Empresa no puede estar vacío", "error");
            return false;
        }
    }
    return true;
}

// ================= FUNCIONES AUXILIARES =================

// Obtiene el select activo según el modo
function handleObtenerSelectEmpresaActivo() {
    const modoRegistro = document.getElementById('opciones').value;
    return document.getElementById(modoRegistro === 'manual' ? 'empresa_manual' : 'empresa_flayer');
}
// Obtiene el ID del botón correspondiente
function handleObtenerIdBoton() {
    const modoRegistro = document.getElementById('opciones').value;
    return modoRegistro === 'manual' ? 'btn-activar-nueva-manual' : 'btn-activar-nueva-flayer';
}
// Muestra el formulario para registrar nueva empresa
function handleMostrarFormularioNuevaEmpresa() {
    const elSelectEmpresa = handleObtenerSelectEmpresaActivo();
    elSelectEmpresa.disabled = true;
    elSelectEmpresa.value = "";
    document.getElementById(handleObtenerIdBoton()).style.display = 'none';
    document.getElementById('nueva_empresa').style.display = 'block';
}
// Cancela el registro de nueva empresa
function handleCancelarRegistro() {
    const elSelectEmpresa = handleObtenerSelectEmpresaActivo();
    elSelectEmpresa.disabled = false;
    document.getElementById('nueva_empresa').style.display = 'none';
    document.getElementById(handleObtenerIdBoton()).style.display = 'inline-block';
    // Quita el required de los campos
    document.getElementById('nombre_empresa').required = false;
    document.getElementById('descripcion_empresa').required = false;
    document.getElementById('razon_empresa').required = false;
    document.getElementById('rfc_empresa').required = false;
    document.getElementById('direccion_empresa').required = false;
}

// ================= EXPOSICIÓN GLOBAL =================
// Permite usar estas funciones desde HTML
window.handleCambioContenido = handleCambioContenido;
window.handleMostrarFormularioNuevaEmpresa = handleMostrarFormularioNuevaEmpresa;
window.handleCancelarRegistro = handleCancelarRegistro;
window.validarFormulario = validarFormulario;
