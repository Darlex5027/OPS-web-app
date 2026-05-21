<?php

/*
  Archivo     : eliminar.php
  Módulo      : CU_12_CrearFormularios
  Autor       : Daniela Hernandez Hernandez
  Fecha       : 05/05/2026
  Descripción : php para eliminar preguntas, encustas y respuestas
*/

require_once '../php/db.php';

// ─────────────────────────────────────────────
// Parámetros de entrada (GET)
// ─────────────────────────────────────────────
// Id_encuesta (requerido) : Identificador de la encuesta a eliminar.
// Id_pregunta (opcional)  : Identificador de una pregunta específica.
//                           Si se proporciona, solo se elimina esa pregunta
//                           y sus respuestas. Si se omite, se elimina toda
//                           la encuesta con sus preguntas y respuestas.
// ─────────────────────────────────────────────

$id_encuesta = $_GET['Id_encuesta'];
try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    if (isset($_GET['Id_pregunta'])) {
        // ── Eliminación parcial: solo una pregunta y sus respuestas ──
        $id_pregunta = $_GET['Id_pregunta'];
        // 1. Eliminar las respuestas asociadas a la pregunta específica
        $eliminar_respuestas = $pdo->prepare("DELETE FROM Respuestas WHERE Id_encuesta=? AND Id_pregunta=?");
        $eliminar_respuestas->execute([$id_encuesta, $id_pregunta]);
        // 2. Eliminar la pregunta específica de la encuesta
        $eliminar_preguntas = $pdo->prepare("DELETE FROM Preguntas WHERE Id_encuesta=? AND Id_pregunta=?");
        $eliminar_preguntas->execute([$id_encuesta, $id_pregunta]);
    } else {
        // ── Eliminación total: encuesta completa con preguntas y respuestas ──

        // 1. Eliminar todas las respuestas de la encuesta
        $eliminar_respuestas = $pdo->prepare("DELETE FROM Respuestas WHERE Id_encuesta=?");
        $eliminar_respuestas->execute([$id_encuesta]);
        // 2. Eliminar todas las preguntas de la encuesta
        $eliminar_preguntas = $pdo->prepare("DELETE FROM Preguntas WHERE Id_encuesta=?");
        $eliminar_preguntas->execute([$id_encuesta]);
        // 3. Eliminar el registro principal de la encuesta
        $eliminar_encuesta = $pdo->prepare("DELETE FROM Encuestas WHERE Id_encuesta=?");
        $eliminar_encuesta->execute([$id_encuesta]);
    }

    echo json_encode(['success' => true]);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => "Error al eliminar la encuesta en la Base de datos"]);
}