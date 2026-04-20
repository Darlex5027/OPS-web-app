<?php

require_once("../config/database.php");

header("Content-Type: application/json");

try {

    $stmt = $pdo->prepare("
        SELECT Id_carrera, Nombre_carrera
        FROM Carrera
        WHERE Activo = TRUE
        ORDER BY Nombre_carrera
    ");

    $stmt->execute();

    $carreras = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "carreras" => $carreras
    ]);

} catch (Exception $e) {

    echo json_encode([
        "error" => "Error al obtener el catálogo de carreras"
    ]);

}