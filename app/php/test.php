<?php
require_once 'db.php';

try {
        $pdo = new PDO($dsn, $user, $pass, $options);
        
        $stmt = $pdo->query("SELECT 'Conexión Exitosa' as mensaje");
        echo json_encode($stmt->fetch());

    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => "Error de conexión: " . $e->getMessage()]);
    }