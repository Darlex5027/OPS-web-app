/*
 * Archivo     : lanzarToast.js
 * Módulo      : Para todos los modulos, toast.
 * Autor       : Daniela Hernandez Hernandez
 * Fecha       : 28/04/2026
 * Descripción : Permite mostrar mensajes dinámicos al usuario (como confirmaciones o alertas) que 
 *               aparecen en pantalla y se desvanecen automáticamente tras 3 segundos,
 */

export {lanzarToast};
function lanzarToast(texto, tipo) {
    // Obtiene el elemento del DOM donde se mostrará el mensaje
    const toast = document.getElementById('toast-mensaje');

    // 1. Limpiamos clases previas y ponemos la nueva
    toast.className = 'toast'; // Resetea a la base
    toast.classList.add(tipo); // Agrega 'exito' o 'error'

    // 2. Insertamos el texto
    toast.innerText = texto;

    // 3. Mostramos el toast
    toast.classList.remove('oculto');

    // 4. Desvanecemos en 3 segundos
    setTimeout(() => {
        toast.classList.add('oculto');
    }, 5000);
}