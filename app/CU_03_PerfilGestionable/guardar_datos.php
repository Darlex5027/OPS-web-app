<?php
require_once '../php/db.php';

header('Content-Type: application/json');

if (!isset($_COOKIE['Id_tipo_usuario']) || !isset($_COOKIE['Id_usuario'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No hay sesión activa']);
    exit;
}

$tipo_usuario = trim($_COOKIE['Id_tipo_usuario']);
$id_usuario = trim($_COOKIE['Id_usuario']);

$datos = $_POST;

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    // ── Foto de perfil (opcional, aplica a todos) ──────────────────────────
    if (!empty($_FILES['foto_perfil']['tmp_name'])) {
        $ext = pathinfo($_FILES['foto_perfil']['name'], PATHINFO_EXTENSION);
        $destino = "../uploads/fotos/{$id_usuario}.{$ext}";
        move_uploaded_file($_FILES['foto_perfil']['tmp_name'], $destino);
        // Aquí podrías guardar la ruta en BD si la tienes como columna
    }

    // ── Administrador / Coordinador ────────────────────────────────────────
    if ($tipo_usuario == "1" || $tipo_usuario == "3") {

        $sql = "UPDATE Administradores SET
                    Telefono = :telefono,
                    Correo   = :correo
                WHERE Id_usuario = :id_usuario";

        $pdo->prepare($sql)->execute([
            ':telefono' => $datos['telefono'] ?? '',
            ':correo' => $datos['correo'] ?? '',
            ':id_usuario' => $id_usuario
        ]);

        // ── Alumno ─────────────────────────────────────────────────────────────
    } elseif ($tipo_usuario == "2") {

        $horario = trim(($datos['horario_entrada']?? '').'-'.($datos['horario_salida']??''));
        $sql = "UPDATE Alumnos SET
                    Grupo   = :grupo,
                    Horario = :horario
                WHERE Id_usuario = :id_usuario";

        $pdo->prepare($sql)->execute([
            ':grupo' => $datos['grupo'] ?? '',
            ':horario' => $horario,
            ':id_usuario' => $id_usuario
        ]);

        // Actividades solo si viene el estado
        if (!empty($datos['estado'])) {

            $conEmpresa = !empty($datos['id_empresa']);

            $sqlAct = "UPDATE Actividades_Alumnos SET
                           Area         = :area,
                           Programa     = :programa,
                           Estado       = :estado,
                           Fecha_inicio = :fecha_inicio,
                           Fecha_fin    = :fecha_fin"
                . ($conEmpresa ? ", Id_empresa = :id_empresa" : "")
                . " WHERE Id_alumno = (
                           SELECT Id_alumno FROM Alumnos
                           WHERE Id_usuario = :id_usuario
                       )";

            $params = [
                ':area' => $datos['area'] ?? '',
                ':programa' => $datos['programa'] ?? '',
                ':estado' => $datos['estado'] ?? '',
                ':fecha_inicio' => $datos['fecha_inicio'] ?? null,
                ':fecha_fin' => $datos['fecha_fin'] ?? null,
                ':id_usuario' => $id_usuario
            ];

            if ($conEmpresa) {
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