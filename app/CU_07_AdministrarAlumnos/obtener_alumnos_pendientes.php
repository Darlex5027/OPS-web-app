<?php
require_once '../php/db.php';

try{
    $pdo = new PDO($dsn, $user, $pass, $options);
    $id_carrera = $_COOKIE['Id_carrera'];
    $consulta = $pdo->prepare("SELECT 
    CONCAT (Alumnos.Nombre, ' ', Alumnos.Apellido_M, ' ', Alumnos.Apellido_P) As Nombre_Completo, 
    Carreras.Nombre as Nombre_Carrera, 
    Usuarios.Matricula, 
    Usuarios.Fecha_registro, 
    Actividades.Servicio 
    FROM Usuarios JOIN Alumnos JOIN Actividades_Alumnos JOIN Carreras JOIN Actividades 
    WHERE Actividades_Alumnos.Id_servicio=Actividades.Id_servicio 
    AND Carreras.Id_carrera=Alumnos.Id_carrera AND Usuarios.Id_tipo_usuario=2 
    AND Usuarios.Id_usuario=Alumnos.Id_usuario AND Alumnos.Id_alumno=Actividades_Alumnos.Id_alumno 
    AND Usuarios.Activo=0 AND Carreras.Id_carrera=?");
    $consulta->execute([$id_carrera]);   
    echo json_encode($consulta->fetchAll());
} catch (\PDOException $e){
    http_response_code(500);
        echo json_encode(['error' => "Error de conexión: " . $e->getMessage()]);
}
