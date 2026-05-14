<?php
/*
  Archivo     : pregunta_editar.php
  Módulo      : CU_12_CrearFormularios
  Autor       : Daniela Hernandez Hernandez
  Fecha       : 05/05/2026
  Descripción : Consulta los datos de una pregunta para su edición o actualiza sus campos
                en la tabla Preguntas según la operación recibida.
*/
require_once '../php/db.php';

$datos_pregunta = json_decode(file_get_contents('php://input'), true);
$id_pregunta = $datos_pregunta['Id_pregunta'];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    if (isset($datos_pregunta['pregunta'])) {
        $pregunta = $datos_pregunta['pregunta'];
        $tipo_respuesta = $datos_pregunta['tipo_respuesta'];
        $seccion = $datos_pregunta['seccion'];
        $obligatoria = $datos_pregunta['obligatoria'];
        $activo = $datos_pregunta['activo'];

        $stmt = $pdo->prepare("UPDATE Preguntas 
        SET Pregunta=?, 
        Tipo_respuesta=?, 
        Seccion=?, 
        Obligatoria=?, 
        Activo=?
        WHERE Id_pregunta=?");
        $stmt->execute([$pregunta, $tipo_respuesta, $seccion, $obligatoria, $activo, $id_pregunta]);

        echo json_encode(['success' => true, 'mensaje' => 'Pregunta actualizada']);
    } else {
        $stmt = $pdo->prepare("SELECT
        Orden, 
        Pregunta, 
        Tipo_respuesta, 
        Seccion, 
        Obligatoria, 
        Activo
        FROM Preguntas WHERE Id_pregunta=?");
        $stmt->execute([$id_pregunta]);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => "pregunta_editar.php | Error: " . $e->getMessage()]);
}