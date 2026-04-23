<?php
/**
 * ARCHIVO: registrar_empresa.php
 * Ubicación: app/CU_02_RegistroUsuario/php/
 */

// 1. Ajuste de ruta para llegar a la conexión PDO correcta
require_once("../../php/db.php");
header("Content-Type: application/json");

// 2. Obtener datos del fetch (JSON)
$data = json_decode(file_get_contents("php://input"), true);

if(!$data) {
    echo json_encode(["success" => false, "error" => "No se recibieron datos"]);
    exit;
}

// Limpieza de datos
$nombre    = trim($data['nombre_comercial'] ?? '');
$razon     = trim($data['razon_social'] ?? '');
$rfc       = trim($data['rfc'] ?? '');
$direccion = trim($data['direccion'] ?? '');
$web       = trim($data['sitio_web'] ?? '');
$desc      = trim($data['descripcion'] ?? '');

// 3. Validación de campos obligatorios
if(!$nombre || !$razon || !$rfc || !$direccion) {
    echo json_encode(["success" => false, "error" => "Campos obligatorios incompletos (*)"]);
    exit;
}

try {
    // 4. Inserción en la tabla empresas
    $stmt = $pdo->prepare("
        INSERT INTO empresas (Nombre_comercial, Razon_social, RFC, Direccion, Sitio_web, Descripcion, Activo, Fecha_registro)
        VALUES (?, ?, ?, ?, ?, ?, 1, NOW())
    ");
    
    $stmt->execute([$nombre, $razon, $rfc, $direccion, $web, $desc]);
    
    // 5. Retornar el ID generado para que el JS lo seleccione automáticamente
    $id_empresa = $pdo->lastInsertId();
    
    echo json_encode([
        "success" => true, 
        "id_empresa" => $id_empresa
    ]);

} catch(Exception $e) {
    // 6. Log del error para Docker y respuesta al cliente
    error_log("Error DB al registrar empresa: " . $e->getMessage());
    
    echo json_encode([
        "success" => false, 
        "error" => "Error al registrar empresa en la base de datos",
        "debug" => $e->getMessage() // Útil para ver si falta alguna columna
    ]);
}