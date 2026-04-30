<?php
require_once '../php/db.php';
$id_usuario = $_COOKIE['Id_usuario'];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    $consulta = $pdo->prepare("SELECT Id_alumno FROM Alumnos WHERE Id_usuario = ?");
    $consulta->execute([$id_usuario]);
    $id_alumno = $consulta->fetchColumn();

    if (!$id_alumno) {
        echo json_encode([]);
        exit;
    }

    $col_periodo_ano = "periodo_a\xc3\xb1o";

    $stmt = $pdo->prepare("SELECT 
    Actividades_Alumnos.Id_alumno_servicio,
    Actividades_Alumnos.Id_alumno,
    Actividades_Alumnos.Id_empresa,
    Actividades_Alumnos.Area,
    Actividades_Alumnos.Programa,
    Actividades_Alumnos.Estado,
    Actividades_Alumnos.periodo_tipo,
    Actividades_Alumnos.periodo_año,
    Actividades_Alumnos.Fecha_inicio,
    Actividades_Alumnos.Fecha_fin,
    Actividades.Servicio
    FROM Actividades_Alumnos 
    JOIN Actividades ON Actividades_Alumnos.Id_servicio = Actividades.Id_servicio 
    WHERE Actividades_Alumnos.Id_alumno = ?");
    $stmt->execute([$id_alumno]);

    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => "Error de conexión: " . $e->getMessage()]);
}
?>