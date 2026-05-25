<?php
/**
 * Archivo      : obtener_actividades.php
 * Módulo       : CU_02_RegistroUsuario
 * Autor        : Francisco Angel Membrila Alarcón
 * Fecha        : 21/04/2026
 * Descripción  : Endpoint que obtiene las actividades activas del sistema
 * y las retorna en formato JSON.
 */

require_once("../php/db.php");
header("Content-Type: application/json");

/* =========================
   CONSULTA ACTIVIDADES
========================= */
try {
    if (!isset($pdo)) {
        $pdo = new PDO($dsn, $user, $pass, $options);
    }

    $stmt = $pdo->prepare("
        SELECT 
            Id_servicio AS Id_actividad,
            Servicio AS Nombre
        FROM Actividades
        WHERE Activo = 1
        ORDER BY Servicio ASC
    ");

    $stmt->execute();

    echo json_encode([
        "success" => true,
        "actividades" => $stmt->fetchAll(PDO::FETCH_ASSOC)
    ]);

} catch (PDOException $error_conexion) {
    error_log("Error en obtener_actividades.php: " . $error_conexion->getMessage());
    
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Error al cargar las actividades. Por favor, recargue la página."
    ]);
} catch (Exception $error_general) {
    error_log("Error general en obtener_actividades.php: " . $error_general->getMessage());
    
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Error al cargar las actividades. Por favor, recargue la página."
    ]);
}
?>