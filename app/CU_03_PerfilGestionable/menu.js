// ================================
// Archivo : menu.js
// Autor   : Viridiana Tonix Zarate
// Fecha   : 2026-05-24
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
document.addEventListener('DOMContentLoaded', function () {
    renderMenu();
})