/*
 * Archivo     : redireccion.js
 * Módulo      : Para todos los modulos, verificación de sesión.
 * Autor       : Alejandro Resendiz Reyes
 * Fecha       : 23/04/2026
 * Descripción : Verifica la sesión del usuario mediante fetch a verificar_sesion.php.
 *               Si la sesión no es válida, redirige al login automáticamente.
 */

document.addEventListener('DOMContentLoaded', redireccionar);

function redireccionar(){
	fetch('../verificar_sesion.php')
	.then(res => res.json())
	.then(data => {
		if (data.error){
			window.location.href = '../CU_01_Login/login.html';
		}
	})
	.catch(() => {
		window.location.href = '../CU_01_Login/login.html';
	});
}
