<?php
/*
    Archivo: obtener_respuesta_individual.php
    Autor: Alejandro Resendiz Reyes
    Fecha de creación: 11/06/2024
    Descripción: Este archivo se encarga de obtener 
    la respuesta individual a una encuesta, utilizando 
    el ID de la encuesta y la matricula del alumno. 
    Se conecta a la base de datos, ejecuta la consulta 
    y devuelve los resultados en formato JSON.
*/

require_once '../php/db.php';

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (Exception $error_pdo) {
    http_response_code(500);
    echo json_encode(['error' => 'Hubo un error conectando al servidor']);
    exit();
}

try {
    $filtros = json_decode(file_get_contents("php://input"), true);
    // Se asignan los valores de los filtros a variables para su uso posterior
    $matricula_alumno = $filtros['Matricula_alumno'];
    $id_encuesta = $filtros['Id_encuesta'];
} catch (Exception $error_pdo) {
    http_response_code(500);
    echo json_encode(['error' => 'Hubo un error pasando los datos de filtrado.']);
    exit();
}

try {
    $stmt = $pdo->prepare('SELECT 
        Encuestas.Nombre AS Nombre_encuesta
        FROM Encuestas
        WHERE Encuestas.Id_encuesta=?');
    $stmt->execute([$id_encuesta]);           // Ejecuto la consulta
    $nombre_encuesta = $stmt->fetchColumn();  // Obtengo el resultado
} catch (Exception $error_pdo) {
    http_response_code(500);
    echo json_encode(['error' => 'Hubo un error obteniendo el nombre de la encuesta.' + $error_pdo]);
    exit();
}

try {
    $stmt = $pdo->prepare('SELECT 
        CONCAT (Alumnos.Nombre, " ", Alumnos.Apellido_P, " ", Alumnos.Apellido_M) AS Nombre_alumno
        FROM Alumnos 
        JOIN Usuarios 
        ON Usuarios.Id_usuario=Alumnos.Id_usuario 
        WHERE Usuarios.Matricula=?');
    $stmt->execute([$matricula_alumno]);
    $nombre_alumno = $stmt->fetchColumn();
} catch (Exception $error_pdo) {
    http_response_code(500);
    echo json_encode(['error' => 'Hubo un error obteniendo el nombre del alumno.' + $error_pdo]);
    exit();
}

try {
    $stmt = $pdo->prepare('SELECT 
        Preguntas.Pregunta,
        Respuestas.Respuesta 
        FROM Respuestas 
        JOIN Preguntas 
        ON Respuestas.Id_pregunta = Preguntas.Id_pregunta 
        JOIN Alumnos 
        ON Respuestas.Id_alumno = Alumnos.Id_alumno 
        JOIN Usuarios 
        ON Alumnos.Id_usuario = Usuarios.Id_usuario 
        WHERE Usuarios.Matricula=? 
        AND Respuestas.Id_encuesta=?');
    $stmt->execute([$matricula_alumno, $id_encuesta]);
    $respuesta_individual = $stmt->fetchAll();
    echo json_encode(['nombre_alumno' => $nombre_alumno, 'nombre_encuesta' => $nombre_encuesta, 'respuesta_individual' => $respuesta_individual]);
} catch (Exception $error_pdo) {
    http_response_code(500);
    echo json_encode(['error' => 'Hubo un error obteniendo la respuesta individual.']);
    exit();
}