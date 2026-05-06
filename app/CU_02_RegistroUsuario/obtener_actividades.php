<?php
/**
 * Archivo      : obtener_actividades.php
 * Módulo       : CU_02_RegistroUsuario
 * Autor        : Francisco Angel Membrila Alarcon
 * Fecha        : 21/04/2026
 * Descripción  : Endpoint que obtiene las actividades activas del sistema
 * y las retorna en formato JSON.
 */

require_once("../php/db.php");
header("Content-Type: application/json");

/* =========================
   CONEXIÓN A BD
========================= */
try {

    if (!isset($pdo)) {
        $pdo = new PDO($dsn, $user, $pass, $options);
    }

} catch (PDOException $e) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "error"   => "error_conexion_db",
        "detalle" => $e->getMessage()
    ]);
    exit;
}

/* =========================
   CONSULTA ACTIVIDADES
========================= */
try {

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

} catch (Exception $e) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "error"   => "error_consulta_actividades",
        "detalle" => $e->getMessage()
    ]);
}