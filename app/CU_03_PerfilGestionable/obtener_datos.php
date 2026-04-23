<?php
require_once '../php/db.php';

try{
    $pdo = new PDO($dsn, $user, $pass, $options);

    $filas_carreras = $pdo->query("SELECT Id_carrera, Nombre_carrera FROM Carrera WHERE Activo = TRUE");
    
    $resultado = [
        "carreras" => $filas_carreras->fetchAll(),
    ];

    header('Content-Type: application/json');
    echo json_encode($resultado);
} catch (\PDOException $e){
    http_response_code(500);
        echo json_encode(['error' => "Error de conexión: " . $e->getMessage()]);
}
    