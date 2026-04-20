<?php
// app/php/db.php

$host = 'database'; // Nombre del servicio en docker-compose
$db   = 'DB_Sistema_Academico'; // Confirmado en tu terminal MariaDB
$user = 'root';

/**
 * IMPORTANTE: 
 * Si en tu .env o docker-compose la contraseña es 'root', pon 'root'.
 * Si no estás seguro, intenta poner la contraseña directamente en texto plano 
 * para descartar errores de variables de entorno.
 */
$pass = '12345678'; // Cambia esto por el valor real de tu variable ${DB_ROOT_PASS}
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    // Si falla, esto enviará el mensaje de error real al navegador
    header('Content-Type: application/json');
    echo json_encode([
        "error" => "Error de conexión a la base de datos",
        "debug" => $e->getMessage()
    ]);
    exit;
}