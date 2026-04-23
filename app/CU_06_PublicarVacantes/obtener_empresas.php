<?php
/* 
Daniela Hernandez Hernandez
Fecha de creacion: 20 de abril del 2026
el archivo obtener_empresas.php tiene como objetivo consultar la base de datos para obtener la 
lista de empresas disponibles. Devuelve los datos en formato JSON para que el frontend pueda 
llenar los campos de selección dentro del formulario de vacantes.
*/
// Incluye el archivo de conexión a la base de datos
require_once '../php/db.php';

try {
    // Crea una nueva conexión a la base de datos usando PDO
    $pdo = new PDO($dsn, $user, $pass, $options);
    // Prepara una consulta para obtener el ID y nombre de todas las empresas
    $consulta = $pdo->prepare("SELECT Id_empresa, Nombre FROM Empresas");
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
