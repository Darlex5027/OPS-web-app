<?php

/*
  Archivo     : eliminar.php
  Módulo      : CU_12_CrearFormularios
  Autor       : Daniela Hernandez Hernandez
  Fecha       : 05/05/2026
  Descripción : php para eliminar preguntas, encustas y respuestas
*/

require_once '../php/db.php';
$Id_encuesta = $_GET['Id_encuesta'];
try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    if (isset($_GET['Id_pregunta'])) {

        $id_pregunta = $_GET['Id_pregunta'];
        $eliminar_respuestas = $pdo->prepare("DELETE FROM Respuestas WHERE Id_encuesta=? AND Id_pregunta=?");
        $eliminar_respuestas->execute([$Id_encuesta, $id_pregunta]);
        $eliminar_preguntas = $pdo->prepare("DELETE FROM Preguntas WHERE Id_encuesta=? AND Id_pregunta=?");
        $eliminar_preguntas->execute([$Id_encuesta, $id_pregunta]);
    } else {
        $eliminar_respuestas = $pdo->prepare("DELETE FROM Respuestas WHERE Id_encuesta=?");
        $eliminar_respuestas->execute([$Id_encuesta]);
        $eliminar_preguntas = $pdo->prepare("DELETE FROM Preguntas WHERE Id_encuesta=?");
        $eliminar_preguntas->execute([$Id_encuesta]);
        $eliminar_encuesta = $pdo->prepare("DELETE FROM Encuestas WHERE Id_encuesta=?");
        $eliminar_encuesta->execute([$Id_encuesta]);
    }

    echo json_encode(['success' => true]);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => "Error al eliminar la encuesta en la Base de datos"]);
}