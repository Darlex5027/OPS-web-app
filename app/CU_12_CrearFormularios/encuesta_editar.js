//  Archivo     : encuesta_editar.js
//  Módulo      : CU_12_CrearFormularios
//  Autor       : Daniela Hernandez Hernandez
//  Fecha       : 05/05/2026
//  Descripción : Carga y pre-llena los datos de una encuesta para su edición, permite agregar
//                y eliminar periodos, y guarda los cambios mediante confirmación modal.
import { renderMenu } from "../js/menu.js";
import { lanzarToast } from "../js/lanzar_toast.js";

document.addEventListener('DOMContentLoaded', function () {
    renderMenu();
    const params = new URLSearchParams(window.location.search);
    // Obtiene el ID de la encuesta desde la URL
    const idEncuesta = params.get('Id_encuesta');
    // Primero carga los servicios, luego la encuesta (para que el select ya esté poblado)
    fetchServicios(idEncuesta);
});
// Consulta los datos de la encuesta al servidor y los manda a renderizar
function fetchEncuesta(idEncuesta) {
    fetch('encuesta_editar.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            Id_encuesta: idEncuesta
        })
    })
        .then(function (respuesta) {
            return respuesta.json();
        })
        .then(function (respuesta) {
            console.log(respuesta);
            renderEncuesta(respuesta.data);
        })
        .catch(function (error) {
            console.log(error);
            lanzarToast("La encuesta no se pudo cargar", "error");
        });
}
// Consulta la lista de servicios y una vez cargados llama a fetchEncuesta
function fetchServicios(idEncuesta) {
    fetch('obtener_servicios.php')
        .then(function (respuesta) {
            return respuesta.json();
        })
        .then(function (servicios) {
            renderServicios(servicios);
            fetchEncuesta(idEncuesta);
        })
        .catch(function (error) {
            lanzarToast("No se pudo cargar el Servicio", "error");
        });
}
// Llena el select de servicios con las opciones obtenidas del servidor
function renderServicios(servicios) {
    const elSelectServicio = document.getElementById('selectServicio');
    servicios.forEach(function (servicio) {
        const elOpcion = document.createElement('option');
        elOpcion.value = servicio.Id_servicio;
        elOpcion.textContent = servicio.Servicio;
        elSelectServicio.appendChild(elOpcion);
    });
}

// Pre-llena el formulario con los datos actuales de la encuesta y renderiza sus periodos
function renderEncuesta(encuesta) {
    document.getElementById('inputNombre').value = encuesta[0].Nombre;
    document.getElementById('inputDescripcion').value = encuesta[0].Descripcion;
    document.getElementById('selectServicio').value = encuesta[0].Id_servicio;
    document.getElementById('selectActivo').value = encuesta[0].Activo;
    const elDivPeriodos = document.getElementById('divPeriodos');
    // Renderiza cada periodo con su botón de eliminar
    encuesta[0].periodos.forEach(function (periodo) {
        elDivPeriodos.innerHTML += `
        <div>
            ${periodo.Periodo_tipo} ${periodo['Periodo_año']}
            <button type="button" onclick="eliminarPeriodo(${periodo.Id_periodo_encuesta})" >Eliminar</button>
        </div>  
    `;
    });
    document.getElementById('inputFechaFin').value = encuesta[0].Fecha_fin;
}
// Valida y envía un nuevo periodo para agregarlo a la encuesta
function agregarPeriodo() {
    const params = new URLSearchParams(window.location.search);
    const idEncuesta = params.get('Id_encuesta');
    const valorPeriodoTipo = document.getElementById('selectPeriodoTipo').value;
    const valorPeriodoAnio = document.getElementById('inputPeriodoAnio').value;
    const anioActual = new Date().getFullYear();
    const elAnio = document.getElementById('inputPeriodoAnio');
    // Valida que el año no sea menor al actual
    if (elAnio.value) {
        if (parseInt(elAnio.value) < anioActual) {
            elAnio.focus();
            lanzarToast(`El año no puede ser menor a ${anioActual}`, "error");
            return false;
        }
    }
    // Valida que ambos campos del periodo estén llenos
    if (!valorPeriodoTipo || !valorPeriodoAnio) {
        lanzarToast("Debe de llenar Tipo de periodo y año", "error");
        return;
    }
    fetch('encuesta_editar.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            Id_encuesta: idEncuesta,
            periodo_tipo: valorPeriodoTipo,
            periodo_anio: valorPeriodoAnio
        })
    })
        .then(function (respuesta) {
            return respuesta.json();
        })
        .then(function (respuesta) {
            // Limpia y recarga los periodos para reflejar el nuevo registro
            document.getElementById('divPeriodos').innerHTML = '';
            fetchEncuesta(idEncuesta)
            lanzarToast("Periodo añadido", "exito")
            // Limpia los campos del formulario de periodo
            document.getElementById('selectPeriodoTipo').value = '';
            document.getElementById('inputPeriodoAnio').value = '';
        })
        .catch(function (error) {
            lanzarToast("Error al añadir el periodo", "error")
        });
}
// Muestra un modal de confirmación y elimina el periodo si el usuario confirma
function eliminarPeriodo(Id_periodo_encuesta) {
    const params = new URLSearchParams(window.location.search);
    const idEncuesta = params.get('Id_encuesta');
    renderModalConfirmacion(
        `¿Estás seguro de que deseas eliminar el periodo`, function () {
            fetch("periodo_eliminar.php", {
                // Realiza una petición al servidor (archivo PHP)
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                // Se envían los datos en formato JSON
                body: JSON.stringify({ Id_periodo_encuesta: Id_periodo_encuesta })
            })
                // Convierte la respuesta del servidor a JSON
                .then(function (respuesta) {
                    return respuesta.json();
                })
                // Procesa la respuesta recibida
                .then(function (datos) {
                    if (datos.error) {
                        lanzarToast(datos.error, "error");
                        return
                    }
                    if (datos.success) {
                        lanzarToast("Periodo eliminado", "exito");
                        document.getElementById('divPeriodos').innerHTML = '';
                        fetchEncuesta(idEncuesta);
                    }
                })
                // Captura errores en caso de fallo en la petición
                .catch(function (error) {
                    lanzarToast("No se pudo eliminar el periodo", "error");
                })
        }
    )
}
// Crea y muestra un modal de confirmación con botones de cancelar y confirmar
function renderModalConfirmacion(mensaje, onConfirmar) {
    // Elimina el modal previo si existe
    const elModalPrevio = document.getElementById('modal-confirmacion');
    if (elModalPrevio) elModalPrevio.remove();

    const elFondo = document.createElement('div');
    elFondo.id = 'modal-confirmacion';

    const elContenido = document.createElement('div');

    const elParrafo = document.createElement('p');
    elParrafo.textContent = mensaje;

    const elBtnCancelar = document.createElement('button');
    elBtnCancelar.textContent = 'Cancelar';
    elBtnCancelar.addEventListener('click', function () {
        elFondo.remove();
    });

    const elBtnConfirmar = document.createElement('button');
    elBtnConfirmar.textContent = 'Eliminar';
    elBtnConfirmar.addEventListener('click', function () {
        elFondo.remove();
        onConfirmar();
    });
    // Ensambla el modal y lo agrega al body
    elContenido.appendChild(elParrafo);
    elContenido.appendChild(elBtnCancelar);
    elContenido.appendChild(elBtnConfirmar);
    elFondo.appendChild(elContenido);
    document.body.appendChild(elFondo);
}

// Valida y envía los datos generales de la encuesta para actualizarlos en el servidor
function editarEncuestas() {
    const params = new URLSearchParams(window.location.search);
    const idEncuesta = params.get('Id_encuesta');
    const valorNombre = document.getElementById('inputNombre').value;
    const valorDescripcion = document.getElementById('inputDescripcion').value;
    const valorServicio = document.getElementById('selectServicio').value;
    const valorActivo = document.getElementById('selectActivo').value;
    const valorFechaFin = document.getElementById('inputFechaFin').value;


    if (!validarFormulario()) {
        return;
    }

    fetch('encuesta_editar.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            Id_encuesta: idEncuesta,
            nombre: valorNombre,
            descripcion: valorDescripcion,
            servicio: valorServicio,
            activo: valorActivo,
            fecha_fin: valorFechaFin
        })
    })
        .then(function (respuesta) {
            return respuesta.json();
        })
        .then(function (resultado) {
            lanzarToast("Encuesta guardada correctamente", "exito");
            setTimeout(() => {
                window.location.href = './encuestas_lista.html';
            }, 2000);
        })
        .catch(function (error) {
            lanzarToast("No se pudo guardar la encuesta", "error");
        });
}
// Valida que los campos obligatorios no estén vacíos, que el año sea válido
// y que la fecha de expiración sea mayor a hoy si la encuesta está activa
function validarFormulario() {
    const nombres = {
        "inputNombre": "nombre",
        "inputDescripcion": "descripcion",
        "selectServicio": "servicio",
        "selectActivo": "activo",
        "inputFechaFin": "Fecha de expiración"
    };

    const campos = ["inputNombre", "inputDescripcion", "selectServicio", "selectActivo"];

    for (const idCampo of campos) {
        const elCampo = document.getElementById(idCampo);
        if (!elCampo.value.trim()) {
            elCampo.focus();
            lanzarToast(`${nombres[idCampo]} no puede estar vacío`, "error");
            return false;
        }
    }
    // Valida el año solo si se escribió alg
    const elAnio = document.getElementById('inputPeriodoAnio');
    if (elAnio.value) {
        // solo valida si escribió algo
        if (!/^\d{4}$/.test(elAnio.value)) {
            elAnio.focus();
            lanzarToast("El año debe ser exactamente 4 dígitos numéricos", "error");
            return false;
        }
    }
    // Valida la fecha de expiración solo si la encuesta está activa
    const elActivo = document.getElementById('selectActivo');
    if (elActivo.value == 1) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const elFechaFin = document.getElementById('inputFechaFin');
        const fechaFin = new Date(elFechaFin.value + 'T00:00:00');
        if (fechaFin <= hoy) {
            elFechaFin.focus();
            lanzarToast("La fecha de expiración debe ser mayor a hoy", "error");
            return false;
        }
    }

    return true;
}
// Expone las funciones al scope global para que los botones del HTML puedan invocarlas
window.eliminarPeriodo = eliminarPeriodo;
window.editarEncuestas = editarEncuestas;
window.validarFormulario = validarFormulario;
window.agregarPeriodo = agregarPeriodo;