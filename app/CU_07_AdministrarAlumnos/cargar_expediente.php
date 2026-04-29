<?php
/*
Daniela Hernandez Hernandez
Fecha de creacion: 8 de abril del 2026 
El archivo procesar_validacion.php es el que procesa las acciones de aceptar o rechazar alumnos. 
Recibe los datos enviados desde JavaScript en formato JSON y, dependiendo del valor recibido, 
realiza una operación en la base de datos. Si el alumno es aceptado, actualiza su estado a activo; 
si es rechazado, elimina su registro. Al finalizar, devuelve una respuesta indicando si la 
operación fue exitosa. Este archivo es clave porque conecta las acciones del usuario con los 
cambios en la base de datos.
*/
// Incluye el archivo de conexión a la base de datos
require_once '../php/db.php';
//pasa de Json a variable de php
$valor = json_decode(file_get_contents("php://input"), true);
// Extrae los datos enviados desde JavaScript
$matricula = $valor['matricula']; // Matrícula del alumno
$no_expediente  = $valor['no_expediente'];

try {
    // Se establece la conexión a la base de datos con PDO
    $pdo = new PDO($dsn, $user, $pass, $options);
    $stmt  = $pdo->prepare("SELECT Id_usuario FROM Usuarios WHERE Matricula=?");
    $stmt ->execute([$matricula]);
    $id_usuario_alumno = $stmt ->fetchColumn();

    if ($id_usuario_alumno != null) {
        $stmt = $pdo->prepare("UPDATE Alumnos SET No_expediente=? WHERE Id_usuario=?");
        $stmt ->execute([$no_expediente , $id_usuario_alumno]);
    }
    echo json_encode(['success' => true]);

} catch (\PDOException $e) {
    // Si ocurre un error, se envía código HTTP 500 (error del servidor)
    http_response_code(500);
    // Devuelve el mensaje de error en formato JSON
    echo json_encode(['error' => "Error de conexión: " . $e->getMessage()]);
}
