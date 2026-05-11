<?php
/**
 * Archivo     : obtener_preguntas.php
 * Módulo      : CU_05_ResponderEncuestas
 * Autor       : Miguel Angel Bello Rivera
 * Descripción : Obtiene las preguntas de una encuesta específica en formato JSON.
 */
header('Content-Type: application/json');
require_once 'conexion.php';

$id_encuesta = $_GET['encuesta'] ?? null;

if (!$id_encuesta) {
    echo json_encode(["error" => "ID de encuesta no proporcionado"]);
    exit;
}

try {
    // Se usa el alias 'Pregunta' para el campo 'Texto' según la especificación
    $stmt = $pdo->prepare("SELECT Id_pregunta, Texto AS Pregunta, Tipo_respuesta, Obligatoria, Orden 
                           FROM Pregunta 
                           WHERE Id_encuesta = :id AND Activo = TRUE 
                           ORDER BY Orden ASC");
    $stmt->execute(['id' => $id_encuesta]);
    $lista_preguntas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // REQUERIMIENTO: Retorna JSON {preguntas:[{...}]}
    echo json_encode([
        "preguntas" => $lista_preguntas
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error al obtener preguntas: " . $e->getMessage()]);
}