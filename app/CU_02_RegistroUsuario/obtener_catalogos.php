<?php
/**
 * Archivo       : obtener_catalogos.php
 * Módulo        : CU_02_RegistroUsuario
 * Autor         : Francisco Angel Membrila Alarcón
 * Fecha         : 21/04/2026
 * Descripción   : Endpoint que devuelve los catálogos necesarios para el registro de usuarios,
 * como facultades y carreras.
 */
require_once("../php/db.php");
header("Content-Type: application/json");

try {
    if (!isset($pdo)) {
        $pdo = new PDO($dsn, $user, $pass, $options);
    }

    // 1. Obtener Facultades activas
    $stmtFacultades = $pdo->prepare("
        SELECT Id_facultad, Nombre 
        FROM Facultades 
        WHERE Activo = 1 
        ORDER BY Nombre
    ");
    $stmtFacultades->execute();
    $resultado_facultades = $stmtFacultades->fetchAll(PDO::FETCH_ASSOC);

    // 2. Obtener Carreras
    $stmtCarreras = $pdo->prepare("
        SELECT Id_carrera, Nombre, Id_facultad 
        FROM Carreras 
        WHERE Activo = 1
        ORDER BY Nombre
    ");
    $stmtCarreras->execute();
    $resultado_carreras = $stmtCarreras->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "facultades" => $resultado_facultades,
        "carreras" => $resultado_carreras
    ]);

} catch (PDOException $error_base_datos) {
    error_log("Error en obtener_catalogos.php: " . $error_base_datos->getMessage());
    
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Error al cargar los catálogos. Por favor, recargue la página."
    ]);
} catch (Exception $error_general) {
    error_log("Error general en obtener_catalogos.php: " . $error_general->getMessage());
    
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Error al cargar los catálogos. Por favor, recargue la página."
    ]);
}
?>