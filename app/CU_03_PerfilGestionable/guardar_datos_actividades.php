<?php
require_once '../php/db.php';

$id_usuario = $_COOKIE['Id_usuario'];
$datos      = json_decode(file_get_contents("php://input"), true);

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    $consulta = $pdo->prepare("SELECT Id_alumno FROM Alumnos WHERE Id_usuario = ?");
    $consulta->execute([$id_usuario]);
    $id_alumno = $consulta->fetchColumn();

    if (!$id_alumno) {
        http_response_code(404);
        echo json_encode(['error' => 'Alumno no encontrado']);
        exit;
    }

    $col_periodo_ano = "periodo_a\xc3\xb1o"; // periodo_año en UTF-8

    $stmt = $pdo->prepare("UPDATE Actividades_Alumnos SET
        Id_empresa   = :id_empresa,
        Area         = :area,
        Programa     = :programa,
        Estado       = :estado,
        periodo_tipo = :periodo_tipo,
        `$col_periodo_ano` = :periodo_ano,
        Fecha_inicio = :fecha_inicio,
        Fecha_fin    = :fecha_fin
        WHERE Id_alumno = :id_alumno");

    $stmt->execute([
        ':id_empresa'   => $datos['id_empresa'],
        ':area'         => $datos['area'],
        ':programa'     => $datos['programa'],
        ':estado'       => $datos['estado'],
        ':periodo_tipo' => $datos['periodo_tipo'],
        ':periodo_ano'  => $datos['periodo_año'],
        ':fecha_inicio' => $datos['fecha_inicio'],
        ':fecha_fin'    => $datos['fecha_fin'],
        ':id_alumno'    => $id_alumno
    ]);

    echo json_encode(['success' => true]);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>