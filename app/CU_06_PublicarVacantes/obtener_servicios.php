<?php
require_once '../php/db.php';

try {
    // Crea una nueva conexión a la base de datos usando PDO
    $pdo = new PDO($dsn, $user, $pass, $options);
    // Prepara una consulta para obtener el ID y nombre de todas las empresas
    $consulta = $pdo->prepare("SELECT Id_servicio, Servicio FROM Actividades");
    // Ejecuta la consulta
    $consulta->execute();
    // Convierte los resultados en un arreglo asociativo y los devuelve en formato JSON
    echo json_encode($consulta->fetchAll(PDO::FETCH_ASSOC));
} catch (\PDOException $e) {
    // Si ocurre un error, se envía un código HTTP 500 (error del servidor)
    http_response_code(500);
    // Se devuelve el mensaje de error en formato JSON
    echo json_encode(['error' => "Error de conexión: " . $e->getMessage()]);
}
