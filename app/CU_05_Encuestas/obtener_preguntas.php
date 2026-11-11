<?php
/**
 * Archivo     : obtener_preguntas.php
 * Módulo      : CU_05_ResponderEncuestas
 * Autor       : Francisco Angel Membrila Alarcón
 * Fecha       : 22/04/2026
 * Descripción : Servicio encargado de obtener las preguntas asociadas
 * a una encuesta específica dentro del sistema OPS.
 */

require_once("../php/db.php");

header('Content-Type: application/json; charset=utf-8');

$id_encuesta = $_GET['encuesta'] ?? null;

if (!$id_encuesta) {
    echo json_encode([
        "success" => false, 
        "preguntas" => [], 
        "error" => "ID de encuesta no proporcionado"
    ]);
    exit;
}

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    
    $sql = "SELECT Id_pregunta, Pregunta, Tipo_respuesta, Obligatoria, Orden, Seccion 
            FROM Preguntas 
            WHERE Id_encuesta = :id_encuesta AND Activo = 1
            ORDER BY Orden ASC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['id_encuesta' => $id_encuesta]);
    $preguntas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        "success" => true,
        "preguntas" => $preguntas,
        "total" => count($preguntas)
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        "success" => false,
        "preguntas" => [],
        "message" => "Error en la base de datos: " . $e->getMessage()
    ]);
}
?>