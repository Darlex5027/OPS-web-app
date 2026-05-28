/*
 * Archivo     : index.js
 * Módulo      : Punto de entrada principal
 * Autor       : Alejandro Resendiz Reyes
 * Fecha       : 27/05/2026
 * Descripción : Verifica la sesión del usuario. Si es válida
 *               redirige al perfil, si no al login.
 */
document.addEventListener('DOMContentLoaded', verificarEntrada);

function verificarEntrada() {
    fetch('php/verificar_sesion.php')
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                window.location.href = 'CU_01_Login/login.html';
            } else {
                window.location.href = 'CU_03_PerfilGestionable/perfil.html';
            }
        })
        .catch(() => {
            window.location.href = 'CU_01_Login/login.html';
        });
}
