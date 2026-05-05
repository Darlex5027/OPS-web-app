<?php
/**
 * ARCHIVO: obtener_empresas.php
 * Ubicación: app/CU_02_RegistroUsuario/php/
 */

require_once("../php/db.php"); 
header("Content-Type: application/json");

try {
    // Aseguramos la conexión (usando las variables de db.php)
    if (!isset($pdo)) {
        $pdo = new PDO($dsn, $user, $pass, $options);
    }

    // Consulta corregida: Se usa 'Nombre' en lugar de 'Nombre_comercial'
    $stmt = $pdo->prepare("
        SELECT Id_empresa, Nombre
        FROM Empresas
        WHERE Activo = 1
        ORDER BY Nombre
    ");
    
    $stmt->execute();
    $empresas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Respuesta en formato JSON
    echo json_encode(["empresas" => $empresas]);

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "Error al cargar empresas",
        "detalle" => $e->getMessage()
    ]);
}