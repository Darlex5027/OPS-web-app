// ================================
// Archivo : modal_dinamico.js
// Desc.   : Modales creados con JS, mismo estilo que renderModalExpediente
//           (ids #modal-confirmacion y #modal-contenido, así aplica el CSS
//           que ya tengan para ese modal).
//
//   confirmarModal(mensaje, opciones)  → Promise<boolean>
//   formularioModal(config)            → Promise<objeto | null>
//
// Los errores se muestran DENTRO del modal (el toast quedaría detrás).
// Sin estilos aquí: todo el aspecto está en styleCaso_3.css
// (sección "MODAL DINÁMICO").
// Se cierra con Cancelar o Esc.
// ================================

const ID_FONDO     = "modal-confirmacion";
const ID_CONTENIDO = "modal-contenido";

/** Crea el fondo y el contenido (quita un modal previo si existía). */
function crearModal(titulo, mensaje) {
    document.getElementById(ID_FONDO)?.remove();

    const elFondo = document.createElement("div");
    elFondo.id = ID_FONDO;

    const elContenido = document.createElement("div");
    elContenido.id = ID_CONTENIDO;
    elContenido.setAttribute("role", "dialog");
    elContenido.setAttribute("aria-modal", "true");

    if (titulo) {
        const elTitulo = document.createElement("h2");
        elTitulo.textContent = titulo;
        elContenido.appendChild(elTitulo);
    }
    if (mensaje) {
        const elParrafo = document.createElement("p");
        elParrafo.textContent = mensaje;
        elContenido.appendChild(elParrafo);
    }

    elFondo.appendChild(elContenido);
    return { elFondo, elContenido };
}

function crearBoton(texto, clases) {
    const elBtn = document.createElement("button");
    elBtn.type = "button";
    elBtn.textContent = texto;
    elBtn.className = clases;
    return elBtn;
}

/**
 * Pide confirmación al usuario.
 * @returns {Promise<boolean>} true si confirmó
 */
export function confirmarModal(mensaje, {
    titulo = "Confirmar",
    textoConfirmar = "Confirmar",
    textoCancelar = "Cancelar"
} = {}) {
    return new Promise((resolve) => {
        const { elFondo, elContenido } = crearModal(titulo, mensaje);

        const elAcciones    = document.createElement("div");
        elAcciones.className = "botones";
        const elBtnCancelar  = crearBoton(textoCancelar,  "btn cancelar");
        const elBtnConfirmar = crearBoton(textoConfirmar, "btn guardar");

        const cerrar = (resultado) => {
            document.removeEventListener("keydown", alPresionarTecla);
            elFondo.remove();
            resolve(resultado);
        };
        const alPresionarTecla = (e) => { if (e.key === "Escape") cerrar(false); };

        elBtnCancelar.onclick  = () => cerrar(false);
        elBtnConfirmar.onclick = () => cerrar(true);
        document.addEventListener("keydown", alPresionarTecla);

        elAcciones.append(elBtnCancelar, elBtnConfirmar);
        elContenido.appendChild(elAcciones);
        document.body.appendChild(elFondo);
        elBtnConfirmar.focus();
    });
}

/**
 * Modal con formulario.
 * @param {object}   config
 * @param {string}   config.titulo
 * @param {string}   [config.mensaje]
 * @param {Array}    config.campos  - { id, label, tipo: "text"|"number"|"select",
 *                                      opciones: [{valor, texto}], valor, placeholder,
 *                                      maxLength, min, max, mayusculas }
 * @param {string}   [config.textoEnviar]
 * @param {Function} config.onEnviar - async (valores) => string con el error,
 *                                     o cualquier otra cosa si salió bien.
 * @returns {Promise<object|null>} valores enviados, o null si se canceló
 */
export function formularioModal({ titulo, mensaje, campos, textoEnviar = "Enviar", textoCancelar = "Cancelar", onEnviar }) {
    return new Promise((resolve) => {
        const { elFondo, elContenido } = crearModal(titulo, mensaje);
        const elementos = {};

        // Cada etiqueta + campo va dentro de su propio <div>, así las reglas de
        // su CSS para "#modal-contenido input" (que lo mandan al final) no los
        // separan ni los ponen debajo de los botones.
        const elCampos = document.createElement("div");
        elCampos.className = "modal-campos";

        campos.forEach((campo) => {
            const idHtml = `modal_campo_${campo.id}`;

            const elLabel = document.createElement("label");
            elLabel.htmlFor = idHtml;
            elLabel.textContent = campo.label;

            let elCampo;
            if (campo.tipo === "select") {
                elCampo = document.createElement("select");
                (campo.opciones || []).forEach(op => elCampo.add(new Option(op.texto, op.valor)));
                // Texto de ayuda ("-- Selecciona --") en gris hasta que se elija algo
                const select = elCampo;
                const marcarVacio = () => select.classList.toggle("sin-valor", !select.value);
                select.addEventListener("change", marcarVacio);
                queueMicrotask(marcarVacio);
            } else {
                elCampo = document.createElement("input");
                elCampo.type = campo.tipo || "text";
                if (campo.placeholder) elCampo.placeholder = campo.placeholder;
                if (campo.maxLength)   elCampo.maxLength   = campo.maxLength;
                if (campo.min != null) elCampo.min = campo.min;
                if (campo.max != null) elCampo.max = campo.max;
                if (campo.mayusculas) {
                    elCampo.addEventListener("input", () => { elCampo.value = elCampo.value.toUpperCase(); });
                }
                elCampo.addEventListener("keydown", (e) => { if (e.key === "Enter") elBtnEnviar.click(); });
            }
            elCampo.id = idHtml;
            if (campo.valor != null) elCampo.value = campo.valor;

            elementos[campo.id] = elCampo;
            const elGrupo = document.createElement("div");
            elGrupo.className = "modal-campo";
            elGrupo.append(elLabel, elCampo);
            elCampos.appendChild(elGrupo);
        });

        const elError = document.createElement("p");
        elError.className = "modal-error";
        elError.setAttribute("role", "alert");

        const elAcciones    = document.createElement("div");
        elAcciones.className = "botones";
        const elBtnCancelar = crearBoton(textoCancelar, "btn cancelar");
        const elBtnEnviar   = crearBoton(textoEnviar,   "btn guardar");

        let enviando = false;
        const cerrar = (resultado) => {
            document.removeEventListener("keydown", alPresionarTecla);
            elFondo.remove();
            resolve(resultado);
        };
        const alPresionarTecla = (e) => { if (e.key === "Escape" && !enviando) cerrar(null); };

        elBtnCancelar.onclick = () => { if (!enviando) cerrar(null); };
        document.addEventListener("keydown", alPresionarTecla);

        elBtnEnviar.onclick = async () => {
            if (enviando) return;
            const valores = {};
            Object.entries(elementos).forEach(([id, el]) => { valores[id] = el.value.trim(); });

            enviando = true;
            elBtnEnviar.disabled = elBtnCancelar.disabled = true;
            elError.textContent = "";

            try {
                const error = await onEnviar(valores);
                if (typeof error === "string" && error) {
                    elError.textContent = error;
                } else {
                    cerrar(valores);
                    return;
                }
            } catch (e) {
                console.error("formularioModal:", e);
                elError.textContent = e.message || "Ocurrió un error";
            }
            enviando = false;
            elBtnEnviar.disabled = elBtnCancelar.disabled = false;
        };

        elAcciones.append(elBtnCancelar, elBtnEnviar);
        elContenido.append(elCampos, elError, elAcciones);
        document.body.appendChild(elFondo);
        Object.values(elementos)[0]?.focus();
    });
}