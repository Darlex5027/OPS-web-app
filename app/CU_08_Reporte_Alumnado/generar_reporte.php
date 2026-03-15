<?php
require_once '../php/db.php';

try{
    $pdo = new PDO($dsn, $user, $pass, $options);
    $query = 'SELECT 
    a.No_Expediente,
    a.Nombre, a.Apellido_P, a.Apellido_M,
    c.Nombre_carrera,
    s.Servicio,
    als.Estado,
    als.Fecha_inicio,
    als.Fecha_fin,
    als.Horas_totales,
    als.Horas_completadas
FROM Alumnos a
JOIN Carrera c ON a.Id_carrera = c.Id_carrera
JOIN Alumno_Servicio als ON a.Id_alumno = als.Id_alumno
JOIN Servicio s ON als.Id_servicio = s.Id_servicio';
    $condiciones=[];
    $parametros = [];

    
    if (!empty($_POST['carrera'] )){
        $condiciones[] = "a.Id_carrera = :carrera";
        $parametros[':carrera'] = $_POST['carrera'];
    }
    
    if (!empty($_POST['servicio'] )){
        $condiciones[] = "als.Id_servicio = :servicio";
        $parametros[':servicio'] = $_POST['servicio'];
    }
    
    if (!empty($_POST['estado'] )){
        $condiciones[] = "als.Estado = :estado";
        $parametros[':estado'] = $_POST['estado'];
    }

    if (!empty($_POST['fecha_inicio'] )){
        $condiciones[] = "als.fecha_inicio >= :fecha_inicio";
        $parametros[':fecha_inicio'] = $_POST['fecha_inicio'];
    }

    if (!empty($_POST['fecha_fin'] )){
        $condiciones[] = "als.fecha_fin <= :fecha_fin";
        $parametros[':fecha_fin'] = $_POST['fecha_fin'];
    }


    if(!empty($condiciones)){
        $query .= " WHERE " . implode (" AND ", $condiciones);
    }
        

    $smt = $pdo->prepare($query);
    $smt -> execute($parametros);
    $data = $smt -> fetchAll();

    echo json_encode(["success" => true, "data" => $data, "total" => count($data)]);
}catch (\PDOException $e)
{
    http_response_code(500);
        echo json_encode(['error'=> "Error de conexión"]);
}