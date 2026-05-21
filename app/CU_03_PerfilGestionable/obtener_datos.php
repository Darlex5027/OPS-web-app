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

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    if ($tipo_usuario == "1" || $tipo_usuario == "3") {
        $sql = "SELECT a.Nombre, a.Apellido_P, a.Apellido_M, a.Telefono, a.Correo, a.Fecha_registro,"
            . " c.Nombre AS Nombre_Carrera"
            . " FROM Administradores a"
            . " JOIN Carreras c ON a.Id_carrera = c.Id_carrera"
            . " WHERE a.Id_usuario = ?";

    } elseif ($tipo_usuario == "2") {
        $sql = "SELECT a.Nombre, a.Apellido_P, a.Apellido_M, a.Grupo, a.No_Expediente, a.Horario, a.Fecha_registro,"
            . " c.Nombre AS Nombre_Carrera,"
            . " aa.Id_empresa, aa.Area, aa.Programa, aa.Estado, aa.periodo_tipo, aa.periodo_año,"
            . " aa.Fecha_inicio, aa.Fecha_fin, aa.Fecha_registro AS Fecha_registro_act, aa.Fecha_modificacion,"
            . " ac.Servicio AS Nombre_servicio,"
            . " e.Nombre AS Nombre_empresa"
            . " FROM Alumnos a"
            . " JOIN Carreras c ON a.Id_carrera = c.Id_carrera"
            . " LEFT JOIN Actividades_Alumnos aa ON aa.Id_alumno = a.Id_alumno"
            . " LEFT JOIN Actividades ac ON aa.Id_servicio = ac.Id_servicio"
            . " LEFT JOIN Empresas e ON aa.Id_empresa = e.Id_empresa"
            . " WHERE a.Id_usuario = ?";
    }

    $consulta = $pdo->prepare($sql);
    $consulta->execute([$id_usuario]);
    $datos = $consulta->fetchAll(PDO::FETCH_ASSOC);
    $campos_fecha = ['Fecha_registro', 'Fecha_registro_act', 'Fecha_inicio', 'Fecha_fin', 'Fecha_modificacion'];
    foreach ($datos as &$fila) {
        foreach ($campos_fecha as $campo) {
            if (!empty($fila[$campo])) {
                $fila[$campo] = date('Y-m-d', strtotime($fila[$campo]));
            }
        }
    }
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>