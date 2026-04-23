<?php
require_once("../php/db.php");
header("Content-Type: application/json");

try {
    // IMPORTANTE: Asegurar que PDO esté inicializado
    if (!isset($pdo)) {
        $pdo = new PDO($dsn, $user, $pass, $options);
    }

    $stmt = $pdo->prepare("
        SELECT Id_carrera, Nombre 
        FROM Carreras 
        WHERE Activo = 1 
        ORDER BY Nombre
    ");

    $stmt->execute();
    $carreras = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["carreras" => $carreras]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "Error al obtener carreras",
        "detalle" => $e->getMessage()
    ]);
}