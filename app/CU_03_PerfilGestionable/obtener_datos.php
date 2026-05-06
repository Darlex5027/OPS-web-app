<?php
require_once '../php/db.php';

header('Content-Type: application/json');

// =========================
// VALIDAR COOKIES
// =========================
if (!isset($_COOKIE['Id_tipo_usuario']) || !isset($_COOKIE['Id_usuario'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No hay sesión activa']);
    exit;
}

$tipo_usuario = $_COOKIE['Id_tipo_usuario'];
$id_usuario = $_COOKIE['Id_usuario'];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    // =========================
    // ADMIN / COORDINADOR
    // =========================
    if ($tipo_usuario == "1" || $tipo_usuario == "3") {

        $consulta = $pdo->prepare("
            SELECT 
                Administradores.Nombre,
                Administradores.Apellido_P,
                Administradores.Apellido_M,
                Administradores.Telefono,
                Administradores.Correo,
                Administradores.Fecha_registro,
                Carreras.Nombre AS Nombre_Carrera
            FROM Administradores
            JOIN Carreras 
                ON Administradores.Id_carrera = Carreras.Id_carrera
            WHERE Administradores.Id_usuario = ?
        ");

        $consulta->execute([$id_usuario]);

        // =========================
        // ALUMNO
        // =========================
    } elseif ($tipo_usuario == "2") {

        $consulta = $pdo->prepare("
            SELECT 
                Alumnos.Nombre,
                Alumnos.Apellido_P,
                Alumnos.Apellido_M,
                Alumnos.Grupo,
                Alumnos.No_Expediente,
                Alumnos.Horario,
                Alumnos.Fecha_registro,

                Carreras.Nombre AS Nombre_Carrera,

                -- Actividades
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
                Actividades_Alumnos.Fecha_registro AS Fecha_registro_act,
                Actividades_Alumnos.Fecha_modificacion,

                -- Servicio y empresa
                Actividades.Descripcion AS Nombre_servicio,
                Empresas.Nombre AS Nombre_empresa

            FROM Alumnos
            JOIN Carreras 
                ON Alumnos.Id_carrera = Carreras.Id_carrera
            LEFT JOIN Actividades_Alumnos 
                ON Actividades_Alumnos.Id_alumno = Alumnos.Id_alumno
            LEFT JOIN Actividades 
                ON Actividades_Alumnos.Id_servicio = Actividades.Id_servicio
            LEFT JOIN Empresas 
                ON Actividades_Alumnos.Id_empresa = Empresas.Id_empresa
            WHERE Alumnos.Id_usuario = ?
        ");

        $consulta->execute([$id_usuario]);

    } else {
        http_response_code(403);
        echo json_encode(['error' => 'Tipo de usuario no válido']);
        exit;
    }

    $resultado = $consulta->fetch(PDO::FETCH_ASSOC);

    if (!$resultado) {
        echo json_encode(['error' => 'No se encontraron datos para este usuario']);
        exit;
    }

    echo json_encode($resultado, JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión: ' . $e->getMessage()]);
}
?>