<?php
require_once '../php/db.php';

$tipo_usuario = $_COOKIE['Id_tipo_usuario'];
$id_usuario = $_COOKIE['Id_usuario'];

// Recibir los datos enviados desde el JS
$datos = json_decode(file_get_contents("php://input"), true);

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    if ($tipo_usuario == "1" || $tipo_usuario == "3") {
        $consulta = $pdo->prepare("UPDATE Administradores SET 
            Telefono = :telefono,
            Correo = :correo
            WHERE Id_usuario = :id_usuario");

        $consulta->execute([
            ':telefono'   => $datos['telefono_administrador'],
            ':correo'     => $datos['correo_administrador'],
            ':id_usuario' => $id_usuario
        ]);

    } elseif ($tipo_usuario == "2") {
        $consulta = $pdo->prepare("UPDATE Alumnos SET 
            Grupo = :grupo,
            No_Expediente = :no_expediente,
            Horario = :horario
            WHERE Id_usuario = :id_usuario");

        $consulta->execute([
            ':grupo'           => $datos['grupo_alumno'],
            ':no_expediente'   => $datos['no_expediente_alumno'],
            ':horario'         => $datos['horario_alumno'],
            ':id_usuario'      => $id_usuario
        ]);
    }

    echo json_encode(['success' => true]);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>