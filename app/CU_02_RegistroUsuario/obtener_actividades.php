<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once("../php/db.php");
header("Content-Type: application/json");

try {
    if (!isset($pdo)) {
        $pdo = new PDO(
            "mysql:host=database;port=3306;dbname=DB_Sistema_Academico;charset=utf8mb4",
            $user,
            $pass,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
    }

    // Usamos los nombres exactos: Id_servicio y Servicio
    // Mantenemos el alias 'Id_actividad' y 'Nombre' para que tu registro.js no falle
    $stmt = $pdo->prepare("
        SELECT Id_servicio AS Id_actividad, Servicio AS Nombre 
        FROM Actividades 
        WHERE Activo = 1 
        ORDER BY Servicio ASC
    ");

    $stmt->execute();

    echo json_encode([
        "success" => true,
        "actividades" => $stmt->fetchAll(PDO::FETCH_ASSOC)
    ]);

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => $e->getMessage()
    ]);
}