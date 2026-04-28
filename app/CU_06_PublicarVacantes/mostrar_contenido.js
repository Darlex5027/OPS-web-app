/* 
Daniela Hernandez Hernandez
Fecha de creacion: 20 de abril del 2026
El archivo mostrar_contenido.js controla la lógica visual del formulario de vacantes. 
Permite cambiar entre los tipos de registro (manual o flayer), carga la fecha actual, 
obtiene la lista de empresas desde el servidor y gestiona la opción de crear una nueva empresa
o seleccionar una existente.
*/
document.addEventListener('DOMContentLoaded', function () {
    cambiarContenido();
    const divNueva = document.getElementById('nueva_empresa');
    if (divNueva) {
        divNueva.style.display = 'none';
    }
    document.getElementById('nueva_empresa').style.display = 'none';
    window.addEventListener('load', function () {
        document.getElementById('miFormulario').reset();
    });
});
function cargarFecha() {
    inputFecha = document.getElementById('fecha_Manual');
    hoy = new Date();
    formatoServidor = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    fechaFormateada = formatoServidor.format(hoy);
    inputFecha.innerHTML = "Fecha de registro: " + fechaFormateada;

    inputFecha = document.getElementById('fecha_flayer');
    hoy = new Date();
    formatoServidor = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    fechaFormateada = formatoServidor.format(hoy);
    inputFecha.innerHTML = "Fecha de registro: " + fechaFormateada;
}

function cargarEmpresas() {
    fetch('obtener_empresas.php')
        .then(function (respuesta) {
            return respuesta.json();
        })
        .then(function (empresas) {
            const seleccion = document.getElementById("opciones").value;
            if (seleccion === "manual") {
                id = "empresa_manual";
            } else {
                id = "empresa_flayer";
            }
            const select = document.getElementById(id);
            select.innerHTML = '<option value="">-- Selecciona una empresa --</option>';
            empresas.forEach(function (empresa) {
                const opcion = document.createElement('option');
                opcion.value = empresa.Id_empresa;   // ID que se manda a la BD
                opcion.textContent = empresa.Nombre; // Texto que ve el usuario
                select.appendChild(opcion);
            });
        })
        .catch(function (error) {
            lanzarToast("La empresa no se pudo cargar", "error");
        });
}


function cargarServicio() {
    fetch('obtener_servicios.php')
        .then(function (respuesta) {
            return respuesta.json();
        })
        .then(function (servicios) {
            const seleccion = document.getElementById("opciones").value;
            if (seleccion === "manual") {
                id = "servicio_manual";
            } else {
                id = "servicio_flayer";
            }
            const select = document.getElementById(id);
            select.innerHTML = '<option value="">-- Selecciona un Servicio --</option>';
            servicios.forEach(function (servicio) {
                const opcion = document.createElement('option');
                opcion.value = servicio.Id_servicio;
                opcion.textContent = servicio.Servicio;
                select.appendChild(opcion);
            });
        })
        .catch(function (error) {
            lanzarToast("El servicio no se pudo cargar", "error");
        });
}


function cambiarContenido() {
    const seleccion = document.getElementById("opciones").value;
    const divManual = document.getElementById("registro_manual");
    const divFlayer = document.getElementById("registro_flayer");

    if (seleccion === "manual") {
        divManual.style.display = "block";  // Muestra manual
        divFlayer.style.display = "none";   // Oculta flayer
    } else if (seleccion === "flayer") {
        divManual.style.display = "none";   // Oculta manual
        divFlayer.style.display = "block";  // Muestra flayer
    } else {
        divManual.style.display = "none";
        divFlayer.style.display = "none";
    }

    document.getElementById('nueva_empresa').style.display = 'none';
    document.getElementById('btn-activar-nueva-manual').style.display = 'inline-block';
    document.getElementById('btn-activar-nueva-flayer').style.display = 'inline-block';
    document.getElementById('empresa_manual').disabled = false;
    document.getElementById('empresa_flayer').disabled = false;

    cargarEmpresas();
    cargarFecha();
    cargarServicio();
}

const uploadField = document.getElementById("flayer");

uploadField.onchange = function() {
    if(this.files[0].size > 20971) {
       lanzarToast("El archivo no puede ser mayor a 20 MB", "error")
       this.value = "";
    }
};

function validarFormulario() {
    const eleccion = document.getElementById("opciones").value;

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

    const camposNuevaEmpresa = ["nombre_empresa", "descripcion_empresa", "razon_empresa", "rfc_empresa", "direccion_empresa", "web_empresa"];

    if (eleccion === "manual") {
        const campos = ["titulo_manual", "servicio_manual", "nombre_contacto", "email", "telefono", "descripcion", "requisitos", "expiracion_manual"];
        for (const id of campos) {
            const campo = document.getElementById(id);
            if (!campo.value.trim()) {
                campo.focus();
                lanzarToast(`${nombres[id]} no puede estar vacío`, "error");
                return false;
            }
        }
        const selectManual = document.getElementById('empresa_manual');
        if (selectManual.disabled) {
            for (const id of camposNuevaEmpresa) {
                const campo = document.getElementById(id);
                if (!campo.value.trim()) {
                    campo.focus();
                    lanzarToast(`${nombres[id]} no puede estar vacío`, "error");
                    return false;
                }
            }
        } else if (!selectManual.value) {
            selectManual.focus();
            lanzarToast("Empresa no puede estar vacío", "error");
            return false;
        }

    } else if (eleccion === "flayer") {
        // Validar archivo
        const archivo = document.getElementById('flayer').files[0]; // ← variable declarada
        if (!archivo) {
            lanzarToast("Flyer no puede estar vacío", "error");
            return false;
        }
        const tiposPermitidos = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!tiposPermitidos.includes(archivo.type)) {
            lanzarToast("Solo se permiten archivos JPG, PNG o PDF", "error");
            return false;
        }
        
        ////////////////////

        const campos = ["titulo_flayer", "servicio_flayer", "expiracion_flayer"];
        for (const id of campos) {
            const campo = document.getElementById(id);
            if (!campo.value.trim()) {
                campo.focus();
                lanzarToast(`${nombres[id]} no puede estar vacío`, "error");
                return false;
            }
        }

        const selectFlayer = document.getElementById('empresa_flayer');
        if (selectFlayer.disabled) {
            for (const id of camposNuevaEmpresa) {
                const campo = document.getElementById(id);
                if (!campo.value.trim()) {
                    campo.focus();
                    lanzarToast(`${nombres[id]} no puede estar vacío`, "error");
                    return false;
                }
            }
        } else if (!selectFlayer.value) {
            selectFlayer.focus();
            lanzarToast("Empresa no puede estar vacío", "error");
            return false;
        }
    }
    return true;
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
    }, 5000);
}

function obtenerSelectEmpresaActivo() {
    const modo = document.getElementById('opciones').value;
    return document.getElementById(modo === 'manual' ? 'empresa_manual' : 'empresa_flayer');
}
function obtenerIdBoton() {
    const modo = document.getElementById('opciones').value;
    return modo === 'manual' ? 'btn-activar-nueva-manual' : 'btn-activar-nueva-flayer';
}

function mostrarFormularioNuevo() {
    const select = obtenerSelectEmpresaActivo();
    select.disabled = true;
    select.value = "";
    document.getElementById(obtenerIdBoton()).style.display = 'none';
    document.getElementById('nueva_empresa').style.display = 'block';

    document.getElementById('nombre_empresa');
    document.getElementById('descripcion_empresa');
    document.getElementById('razon_empresa');
    document.getElementById('rfc_empresa');
    document.getElementById('direccion_empresa');
}

function cancelarRegistro() {
    const select = obtenerSelectEmpresaActivo();
    select.disabled = false;
    document.getElementById('nueva_empresa').style.display = 'none';
    document.getElementById(obtenerIdBoton()).style.display = 'inline-block';

    document.getElementById('nombre_empresa').required = false;
    document.getElementById('descripcion_empresa').required = false;
    document.getElementById('razon_empresa').required = false;
    document.getElementById('rfc_empresa').required = false;
    document.getElementById('direccion_empresa').required = false;
}