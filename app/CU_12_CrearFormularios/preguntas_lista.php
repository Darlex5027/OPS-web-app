<?php

/*
  Archivo     : preguntas_lista.php
  Módulo      : CU_12_CrearFormularios
  Autor       : Daniela Hernandez Hernandez
  Fecha       : 05/05/2026
  Descripción : Consulta y retorna las preguntas de una encuesta específica,
                incluyendo el total de respuestas registradas por pregunta.
*/
require_once '../php/db.php';

$datos_encuesta = json_decode(file_get_contents('php://input'), true);
$id_encuesta = $datos_encuesta['Id_encuesta'];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    $stmt = $pdo->prepare("SELECT 
    Id_pregunta,
    Id_encuesta, 
    Pregunta, 
    Tipo_respuesta, 
    Seccion, 
    Orden, 
    Obligatoria, 
    Activo,
    (SELECT COUNT(*) FROM Respuestas WHERE Respuestas.Id_pregunta = Preguntas.Id_pregunta) AS total_respuestas
    FROM Preguntas WHERE Id_encuesta = ?");
    $stmt->execute([$id_encuesta]);
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => "Error al mostrar las preguntas"]);
}