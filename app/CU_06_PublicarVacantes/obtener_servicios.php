<?php
/*
 * Archivo     : obtener_servicios.php
 * Módulo      : Modulo 6 CU_06_PublicarVacantes
 * Autor       : Daniela Hernandez Hernandez
 * Fecha       : 20 de abril del 2026
 * Descripción : el archivo tiene como objetivo consultar la base de datos para obtener la 
                 lista de servicios disponibles. Devuelve los datos en formato JSON para que el frontend pueda 
                 llenar los campos de selección dentro del formulario de vacantes.
 */
require_once '../php/db.php';

try {
    // Crea una nueva conexión a la base de datos usando PDO
    $pdo = new PDO($dsn, $user, $pass, $options);
    // Prepara una consulta para obtener el ID y nombre de todos los servicios
    $stmt = $pdo->prepare("SELECT Id_servicio, Servicio FROM Actividades");
    // Ejecuta la consulta
    $stmt->execute();
    // Convierte los resultados en un arreglo asociativo y los devuelve en formato JSON
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (\PDOException $e) {
    // Si ocurre un error, se envía un código HTTP 500 (error del servidor)
    http_response_code(500);
    // Se devuelve el mensaje de error en formato JSON
    echo json_encode(['error' => "Error de conexión: " . $e->getMessage()]);
}
