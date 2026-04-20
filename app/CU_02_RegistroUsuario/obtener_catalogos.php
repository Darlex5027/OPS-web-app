<?php
/**
 * ARCHIVO: obtener_catalogos.php
 * Ubicación: app/CU_02_RegistroUsuario/php/
 */

// 1. Ajuste de ruta: Subir dos niveles para llegar a la raíz donde está db.php
require_once("../php/db.php");
// 2. Indicar al navegador que la respuesta es JSON
header("Content-Type: application/json");

try {
    // 3. Consulta (Basada en tu terminal: Tabla 'Carreras' y columna 'Nombre')
    $stmt = $pdo->prepare("
        SELECT Id_carrera, Nombre 
        FROM Carreras 
        WHERE Activo = 1 
        ORDER BY Nombre
    ");

    $stmt->execute();

    $carreras = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Respuesta exitosa
    echo json_encode([
        "carreras" => $carreras
    ]);

} catch (Exception $e) {
    // 5. Enviar error en formato JSON
    echo json_encode([
        "error" => "Error al obtener carreras",
        "detalle" => $e->getMessage() // Opcional para depurar en Docker
    ]);
}