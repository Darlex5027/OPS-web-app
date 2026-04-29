<?php
/*
 * Archivo     : verificar_sesion.php
 * Módulo      : Para todos los modulos Verificación de Session
 * Autor       : Alejandro Resendiz Reyes
 * Fecha       : 23/04/2026
 * Descripción : Verifica que las cookies de sesión requeridas existan.
 *               Retorna JSON con éxito o error según el resultado.
 */

$camposRequeridos = ['Id_usuario', 'Matricula', 'Id_tipo_usuario', 'Id_carrera', 'permisos'];

foreach ($camposRequeridos as $campo) {
    if (empty($_COOKIE[$campo])) {
        http_response_code(401);
        echo json_encode(['error' => 'Sesión no válida']);
        exit;
    }
}

echo json_encode(['exito' => true]);

