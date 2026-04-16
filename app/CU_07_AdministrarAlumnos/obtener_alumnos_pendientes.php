<?php
require_once '../php/db.php';

try{
    $pdo = new PDO($dsn, $user, $pass, $options);
    $consulta = $pdo->prepare("SELECT 
    Alumnos.Nombre, 
    Carrera.Nombre_carrera, 
    Usuario.Matricula, 
    Usuario.Fecha_registro, 
    Servicio.Servicio 
    FROM Usuario JOIN Alumnos JOIN Alumno_Servicio JOIN Carrera JOIN Servicio 
    WHERE Alumno_Servicio.Id_servicio=Servicio.Id_servicio 
    AND Carrera.Id_carrera=Alumnos.Id_carrera AND Usuario.Id_tipo_usuario=2 
    AND Usuario.Id_usuario=Alumnos.Id_usuario AND Alumnos.Id_alumno=Alumno_Servicio.Id_alumno 
    AND Usuario.Activo=0");
    $consulta->execute();   
    echo json_encode($consulta->fetchAll());
} catch (\PDOException $e){
    http_response_code(500);
        echo json_encode(['error' => "Error de conexión: " . $e->getMessage()]);
}
