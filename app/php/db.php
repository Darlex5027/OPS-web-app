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
