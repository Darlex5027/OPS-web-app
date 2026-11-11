/*
  Archivo     : revision_tipo_usuario.js
  Módulo      : CU_09_ReporteEstadistico
  Autor       : Alejandro Resendiz Reyes
  Fecha       : 29/04/2026		
  Descripción : Este archivo se encarga de revisar el tipo de usuario y redirigir según corresponda.
*/

// Se obtiene el valor de la cookie "Id_tipo_usuario" para determinar el tipo de usuario que ha iniciado sesión
const	IdTipoUsuario=document.cookie.split('; ').find( r => r.startsWith('Id_tipo_usuario=')).split('=')[1];

// Si el tipo de usuario es 2 (administrador), se redirige a la página de perfil gestionable
if (IdTipoUsuario == 2) {
	window.location.href = "../CU_03_PerfilGestionable/perfil.html";
}

