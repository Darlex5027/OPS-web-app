<?php
require_once '../php/db.php';

header('Content-Type: application/json');

if (!isset($_COOKIE['Id_tipo_usuario']) || !isset($_COOKIE['Id_usuario'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No hay sesión activa']);
    exit;
}

$tipo_usuario = trim($_COOKIE['Id_tipo_usuario']);
$id_usuario   = trim($_COOKIE['Id_usuario']);
$datos        = json_decode(file_get_contents("php://input"), true);

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    if ($tipo_usuario == "1" || $tipo_usuario == "3") {

        $sql = "UPDATE Administradores SET"
             . " Telefono = :telefono,"
             . " Correo   = :correo"   // ← sin coma aquí
             . " WHERE Id_usuario = :id_usuario";

        $pdo->prepare($sql)->execute([
            ':telefono'   => $datos['telefono_administrador'],
            ':correo'     => $datos['correo_administrador'],
            ':id_usuario' => $id_usuario
        ]);

    } elseif ($tipo_usuario == "2") {

        $sql = "UPDATE Alumnos SET"
             . " Grupo   = :grupo,"
             . " Horario = :horario"  // ← sin coma aquí
             . " WHERE Id_usuario = :id_usuario";

        $pdo->prepare($sql)->execute([
            ':grupo'      => $datos['grupo'],
            ':horario'    => $datos['horario'],
            ':id_usuario' => $id_usuario
        ]);

        // Actualizar actividad solo si viene id_empresa o campos de actividad
        if (!empty($datos['estado'])) {
            $sqlAct = "UPDATE Actividades_Alumnos SET"
                    . " Area         = :area,"
                    . " Programa     = :programa,"
                    . " Estado       = :estado,"
                    . " Fecha_inicio = :fecha_inicio,"
                    . " Fecha_fin    = :fecha_fin"
                    . (!empty($datos['id_empresa']) ? ", Id_empresa = :id_empresa" : "")
                    . " WHERE Id_alumno = (SELECT Id_alumno FROM Alumnos WHERE Id_usuario = :id_usuario)";

            $params = [
                ':area'        => $datos['area'],
                ':programa'    => $datos['programa'],
                ':estado'      => $datos['estado'],
                ':fecha_inicio'=> $datos['fecha_inicio'],
                ':fecha_fin'   => $datos['fecha_fin'],
                ':id_usuario'  => $id_usuario
            ];

            if (!empty($datos['id_empresa'])) {
                $params[':id_empresa'] = $datos['id_empresa'];
            }

            $pdo->prepare($sqlAct)->execute($params);
        }
    }

    echo json_encode(['success' => true]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>