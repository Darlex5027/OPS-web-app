// ================================
// Archivo : menu.js
// Autor   : Francisco Angel Membrila Alarcón
// Fecha   : 2026-05-27
// Desc.   : Importa y renderiza el menú
//           de navegación principal.
//           Ejecuta la función renderMenu()
//           cuando el DOM está completamente
//           cargado para asegurar que todos
//           los elementos HTML estén
//           disponibles antes de renderizar
//           el menú dinámicamente.
// ================================
import { renderMenu } from '../js/menu.js';

document.addEventListener('DOMContentLoaded', () => {
    renderMenu();
});