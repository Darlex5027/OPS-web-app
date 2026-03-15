<?php
require_once '../php/db.php';

try{
    $pdo = new PDO($dsn, $user, $pass, $options);

    $filas_carreras = $pdo->query("SELECT Id_carrera, Nombre_carrera FROM Carrera WHERE Activo = TRUE");
    $filas_servicios = $pdo->query("SELECT Id_servicio, Servicio FROM Servicio WHERE Activo = TRUE");
    $filas_estados = $pdo->query("SELECT DISTINCT Estado FROM Alumno_Servicio");
    
    $resultado = [
        "carreras" => $filas_carreras->fetchAll(),
        "servicios" => $filas_servicios->fetchAll(),
        "estados" => $filas_estados->fetchAll()
    ];

    header('Content-Type: application/json');
    echo json_encode($resultado);
} catch (\PDOException $e){
    http_response_code(500);
        echo json_encode(['error' => "Error de conexión: " . $e->getMessage()]);
}
    