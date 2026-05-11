<?php

require_once '../php/db.php';

header('Content-Type: application/json; charset=utf-8');

try {

    $pdo = new PDO($dsn, $user, $pass, $options);

    $stmt = $pdo->query("
        SELECT 
            Id_empresa,
            Nombre
        FROM Empresas
        ORDER BY Nombre ASC
    ");

    $empresas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(
        $empresas,
        JSON_UNESCAPED_UNICODE
    );

} catch (PDOException $e) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>