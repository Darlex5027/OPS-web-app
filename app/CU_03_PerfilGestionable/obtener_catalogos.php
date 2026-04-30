<?php
require_once '../php/db.php';

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    // Obtener valores distintos de Estado
    $stmtEstado = $pdo->prepare("SELECT DISTINCT Estado FROM Actividades_Alumnos WHERE Estado IS NOT NULL ORDER BY Estado");
    $stmtEstado->execute();
    $estados = $stmtEstado->fetchAll(PDO::FETCH_COLUMN);

    // Obtener valores distintos de periodo_tipo
    $stmtPeriodo = $pdo->prepare("SELECT DISTINCT periodo_tipo FROM Actividades_Alumnos WHERE periodo_tipo IS NOT NULL ORDER BY periodo_tipo");
    $stmtPeriodo->execute();
    $periodos = $stmtPeriodo->fetchAll(PDO::FETCH_COLUMN);

    echo json_encode(['estados' => $estados, 'periodos' => $periodos]);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>