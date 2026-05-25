<?php
/**
 * ================================
 * Archivo : obtener_empresas.php
 * Autor   : Viridiana Tonix Zarate
 * Fecha   : 2026-05-24
 * Desc.   : Obtiene la lista de
 *           empresas disponibles
 *           para asignar a alumno.
 * ================================
 */
require_once '../php/db.php';

header('Content-Type: application/json');

if (!isset($_COOKIE['Id_usuario'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'No hay sesión activa'
    ]);
    exit;
}

if (!isset($_COOKIE['Id_tipo_usuario'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Datos de sesión incompletos'
    ]);
    exit;
}

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    $consulta = $pdo->prepare("
        SELECT Id_empresa, Nombre
        FROM Empresas
        WHERE Activo = 1
        ORDER BY Nombre ASC
    ");
    $consulta->execute();

    $datos = $consulta->fetchAll(PDO::FETCH_ASSOC);

    // Respuesta exitosa con success: true
    echo json_encode([
        'success' => true,
        'data' => $datos,
        'count' => count($datos)
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error al consultar empresas'
    ]);
    
    error_log('obtener_empresas.php - Error PDO: ' . $e->getMessage());
} catch (Exception $e) {
    // Manejo de otros errores
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error del sistema'
    ]);
    error_log('obtener_empresas.php - Error: ' . $e->getMessage());
}
?>