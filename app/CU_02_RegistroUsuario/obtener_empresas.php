<?php
/**
 * ARCHIVO: obtener_empresas.php
 * Ubicación: app/CU_02_RegistroUsuario/php/
 */

// 1. Ajuste de ruta para coincidir con tu estructura de Docker/VS Code
require_once("../php/db.php"); 
header("Content-Type: application/json");

try {
    // 2. Consulta a la tabla empresas
    // Asegúrate de que los nombres coincidan con tu tabla (Nombre_comercial)
    $stmt = $pdo->prepare("
        SELECT Id_empresa, Nombre_comercial
        FROM empresas
        WHERE Activo = 1
        ORDER BY Nombre_comercial
    ");
    
    $stmt->execute();
    $empresas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 3. Respuesta en formato JSON
    echo json_encode(["empresas" => $empresas]);

} catch(Exception $e) {
    // 4. Manejo de error
    echo json_encode([
        "error" => "Error al cargar empresas",
        "detalle" => $e->getMessage() // Útil para ver el error real en la consola de red
    ]);
}