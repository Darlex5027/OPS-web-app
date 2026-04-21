<?php
$host = 'database'; // Nombre del servicio en tu docker-compose
$db   = 'DB_Sistema_Academico';
$user = 'root';
$pass = getenv('MYSQL_ROOT_PASSWORD') ?: 'root_password';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];
/* 
try {
    $pdo = new PDO($dsn, $user, $pass, $options); //Conexion directa a la base de datos
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "DB_CONNECTION_ERROR",
        "message" => $e->getMessage()
    ]);
    exit;
}  
*/