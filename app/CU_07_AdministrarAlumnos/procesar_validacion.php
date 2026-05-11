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
//Se reciben los datos de matricula y el identificador
$datos_entrada = json_decode(file_get_contents("php://input"), true);
// Extrae los datos enviados desde JavaScript
$matricula = $datos_entrada['matricula']; // Matrícula del alumno
$identificador = $datos_entrada['identificador']; // Indica si fue "Aceptado" o rechazado

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
    // Dependiendo de la acción recibida:
    if ($identificador === "Aceptado") {
        // Si fue aceptado, se actualiza el campo Activo a 1 (activo)
        $stmt = $pdo->prepare("UPDATE Usuarios SET Activo=1 WHERE Matricula=?");
    } else {
        // Si no fue aceptado (rechazado), se elimina el usuario de la base de datos
        $stmt = $pdo->prepare("DELETE FROM Usuarios WHERE Matricula=?");
    }
    // Ejecuta la consulta pasando la matrícula como parámetro
    $stmt->execute([$matricula]);
    // Devuelve una respuesta en formato JSON indicando éxito
    echo json_encode(['success' => true]);

} catch (\PDOException $e) {
    // Si ocurre un error, se envía código HTTP 500 (error del servidor)
    http_response_code(500);
    // Devuelve el mensaje de error en formato JSON
    echo json_encode(['error' => "No se pudo realizar la accion " + $identificador]);
}
