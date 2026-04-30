<?php
require_once("../php/db.php");
header("Content-Type: application/json");

try {

    if (!isset($pdo)) {
        $pdo = new PDO($dsn, $user, $pass, $options);
    }

    $stmt = $pdo->prepare("
        SELECT Id_actividad, Nombre
        FROM Actividades
        WHERE Activo = 1
        ORDER BY Nombre
    ");

    $stmt->execute();
    $actividades = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["actividades" => $actividades]);

} catch(Exception $e) {

    http_response_code(500);

    echo json_encode([
        "error" => "Error al cargar actividades",
        "detalle" => $e->getMessage()
    ]);
}