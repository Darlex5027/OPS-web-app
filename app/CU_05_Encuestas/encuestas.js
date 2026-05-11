// --- utilidades para Cookies ---
const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
};

const idAlumno = getCookie('Id_alumno');
let encuestaActualId = null;

document.addEventListener('DOMContentLoaded', () => {
    /* COMENTA ESTO TEMPORALMENTE
    if (!idAlumno) {
        // Redirigir si no hay sesión para cumplir con el permiso de ALUMNO
        window.location.href = '../CU_01_Login/login.html';
        return;
    }
    */
    cargarEncuestas();
});

async function cargarEncuestas() {
    try {
        const resp = await fetch(`obtener_encuestas.php?alumno=${idAlumno}`);
        const data = await resp.json();
        const encuestas = data.pendientes; // accede a la clave 'pendientes' solicitada

        const listaDiv = document.getElementById('lista-encuestas');
        const contenedorForm = document.getElementById('contenedor-preguntas');
        const contador = document.getElementById('contador-encuestas');

        // Reset de vistas
        document.getElementById('seccion-lista').style.display = 'block';
        contenedorForm.style.display = 'none';

        if (encuestas.length === 0) {
            contador.innerText = "0";
            listaDiv.innerHTML = `
                <div class="exito-msg" style="text-align:center; padding: 20px;">
                    <i class="fas fa-check-circle" style="color:green; font-size: 3rem;"></i>
                    <p>¡No tienes encuestas pendientes!</p>
                </div>`;
        } else {
            // Actualizar indicador de cuántas quedan
            contador.innerText = `${encuestas.length} pendientes`;

            listaDiv.innerHTML = encuestas.map(e => `
                <div class="card-encuesta" onclick="abrirEncuesta(${e.Id_encuesta}, '${e.Nombre}', '${e.Descripcion}')">
                    <div class="card-body">
                        <h4>${e.Nombre}</h4>
                        <p>${e.Descripcion}</p>
                        <small class="badge">Pendiente</small>
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error("Error al cargar encuestas:", err);
    }
}

async function abrirEncuesta(id, nombre, desc) {
    encuestaActualId = id;
    try {
        const resp = await fetch(`obtener_preguntas.php?encuesta=${id}`);
        const data = await resp.json(); // Obtiene el objeto completo
        const preguntas = data.preguntas; // Accede a la lista de preguntas

        document.getElementById('seccion-lista').style.display = 'none';
        document.getElementById('contenedor-preguntas').style.display = 'block';
        document.getElementById('titulo-encuesta').innerText = nombre;
        document.getElementById('descripcion-encuesta').innerText = desc;

        const contenedor = document.getElementById('preguntas-dinamicas');
        contenedor.innerHTML = preguntas.map(p => renderizarPregunta(p)).join('');
    } catch (err) {
        console.error("Error al obtener preguntas:", err);
    }
}

function renderizarPregunta(p) {
    const obligatoriaAttr = p.Obligatoria ? 'data-required="true"' : 'data-required="false"';
    const asterisco = p.Obligatoria ? '<span class="obligatorio">*</span>' : '';

    let htmlInput = '';
    switch (p.Tipo_respuesta) {
        case 'ESCALA_1_5':
            // Usando sliders como permite el requerimiento
            htmlInput = `<div class="range-container">
                            <span>1</span>
                            <input type="range" name="q_${p.Id_pregunta}" min="1" max="5" value="3">
                            <span>5</span>
                         </div>`;
            break;
        case 'ESCALA_1_10':
            htmlInput = `<div class="range-container">
                            <span>1</span>
                            <input type="range" name="q_${p.Id_pregunta}" min="1" max="10" value="5">
                            <span>10</span>
                         </div>`;
            break;
        case 'TEXTO':
            htmlInput = `<textarea name="q_${p.Id_pregunta}" placeholder="Escribe tu respuesta aquí..." class="form-control"></textarea>`;
            break;
        case 'BOOLEANO':
            htmlInput = `
                <label><input type="radio" name="q_${p.Id_pregunta}" value="Si"> Sí</label>
                <label><input type="radio" name="q_${p.Id_pregunta}" value="No"> No</label>`;
            break;
    }

    return `
        <div class="pregunta-wrapper" id="wrapper_${p.Id_pregunta}" ${obligatoriaAttr} style="margin-bottom: 20px;">
            <p><strong>${p.Texto}</strong> ${asterisco}</p>
            ${htmlInput}
        </div>
    `;
}

document.getElementById('form-encuesta').addEventListener('submit', async (e) => {
    e.preventDefault();

    const wrappers = document.querySelectorAll('.pregunta-wrapper');
    let respuestas = [];
    let errores = false;

    wrappers.forEach(div => {
        const idPregunta = div.id.replace('wrapper_', '');
        const esObligatoria = div.getAttribute('data-required') === 'true';
        let valor = null;

        const radioChecked = div.querySelector('input[type="radio"]:checked');
        const textarea = div.querySelector('textarea');
        const range = div.querySelector('input[type="range"]');

        if (radioChecked) valor = radioChecked.value;
        else if (textarea) valor = textarea.value.trim();
        else if (range) valor = range.value;

        if (esObligatoria && (!valor || valor === "")) {
            div.style.borderLeft = "4px solid red"; // Resaltado visual simple
            div.style.paddingLeft = "10px";
            errores = true;
        } else {
            div.style.borderLeft = "none";
            if (valor) respuestas.push({ Id_pregunta: idPregunta, Respuesta: valor });
        }
    });

    if (errores) {
        alert("Por favor, responda las preguntas obligatorias marcadas.");
        return;
    }

    try {
        const payload = {
            respuestas: respuestas,
            Id_alumno: idAlumno,
            Id_encuesta: encuestaActualId
        };

        const response = await fetch('procesar_encuesta.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            alert('¡Encuesta completada! ✅');
            cargarEncuestas(); // Actualización inmediata de la lista
        } else {
            // Muestra error sin limpiar el formulario (cumple requerimiento)
            const msg = document.getElementById('mensaje-feedback');
            msg.innerText = "Error: " + data.message;
            msg.style.display = 'block';
            msg.style.color = 'red';
        }
    } catch (err) {
        alert('Error de conexión con el servidor.');
    }
});

function volverALista() {
    cargarEncuestas();
}