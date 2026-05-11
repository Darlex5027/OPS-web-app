<?php
/*
Daniela Hernandez Hernandez
Fecha de creacion: 8 de abril del 2026 
El archivo cargar_expediente.php es el encargado de gestionar la vinculación de expedientes 
administrativos con los registros de los alumnos. Recibe la matrícula y el nuevo número de
expediente desde JavaScript en formato JSON y realiza una operación de dos pasos en la 
base de datos: primero localiza el identificador único del usuario mediante su matrícula 
y, tras confirmar su existencia, actualiza el campo correspondiente en la tabla de alumnos.
*/
// Incluye el archivo de conexión a la base de datos
require_once '../php/db.php';
//pasa de Json a variable de php
//Se reciben los datos de matricula y el no de expediente
$datos_expediente = json_decode(file_get_contents("php://input"), true);
// Extrae los datos enviados desde JavaScript
$matricula = $datos_expediente['matricula']; // Matrícula del alumno
$no_expediente = $datos_expediente['no_expediente'];

try {
    // Se establece la conexión a la base de datos con PDO
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    // Si ocurre un error, se envía código HTTP 500 (error del servidor)
    http_response_code(500);
    // Devuelve el mensaje de error en formato JSON
    echo json_encode(['error' => "Error de conexión al servidor: "]);
}

try {
    $stmt = $pdo->prepare("SELECT Id_usuario FROM Usuarios WHERE Matricula=?");
    $stmt->execute([$matricula]);
    $id_usuario_alumno = $stmt->fetchColumn();

    if ($id_usuario_alumno != null) {
        $stmt = $pdo->prepare("UPDATE Alumnos SET No_expediente=? WHERE Id_usuario=?");
        $stmt->execute([$no_expediente, $id_usuario_alumno]);
    }
    echo json_encode(['success' => true]);
} catch (\PDOException $e) {
    // Si ocurre un error, se envía código HTTP 500 (error del servidor)
    http_response_code(500);
    // Devuelve el mensaje de error en formato JSON
    echo json_encode(['error' => "Error de actualizacion el numero de expediente"]);
}