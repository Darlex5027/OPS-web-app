<?php
require_once '../php/db.php';
$tipo_usuario = $_COOKIE['Id_tipo_usuario'];
$id_usuario = $_COOKIE['Id_usuario'];
try {
    // Crea una nueva conexión a la base de datos usando PDO
    $pdo = new PDO($dsn, $user, $pass, $options);
    if ($tipo_usuario == "1" || $tipo_usuario == "3") {
        $consulta = $pdo->prepare("SELECT Administradores.Nombre, Administradores.Apellido_P, Administradores.Apellido_M, Administradores.Telefono, Administradores.Correo, Administradores.Fecha_registro,  Carreras.Nombre AS Nombre_Carrera FROM Administradores JOIN Carreras WHERE Administradores.Id_carrera = Carreras.Id_carrera AND Id_usuario = ? ");//cokie id_usuario
        $consulta->execute([$id_usuario]);
    } elseif ($tipo_usuario == "2") {
        $consulta = $pdo->prepare("SELECT Alumnos.Nombre, Alumnos.Apellido_P, Alumnos.Apellido_M, Alumnos.Grupo, Alumnos.No_Expediente, Alumnos.Area_o_Programa, Alumnos.Observaciones, Alumnos.Horario, Alumnos.Organizacion, Alumnos.Fecha_registro, Carreras.Nombre AS Nombre_Carrera FROM Alumnos JOIN Carreras WHERE Alumnos.Id_carrera = Carreras.Id_carrera AND Id_usuario = ?");//cokie id_usuario
        $consulta->execute([$id_usuario]);
    }
    // Convierte los resultados en un arreglo asociativo y los devuelve en formato JSON
    echo json_encode($consulta->fetchAll(PDO::FETCH_ASSOC));
} catch (\PDOException $e) {
    // Si ocurre un error, se envía un código HTTP 500 (error del servidor)
    http_response_code(500);
    // Se devuelve el mensaje de error en formato JSON
    echo json_encode(['error' => "Error de conexión: " . $e->getMessage()]);
}