<?php
require_once '../php/db.php';

try{
    $pdo = new PDO($dsn, $user, $pass, $options);
    $query = 'SELECT
    a.Nombre,a.Apellido_P, a.Apellido_M,
    a.Telefono,
    a.Id_admin,
    a.Correo,
    c.Nombre_Carrera
FROM Admin a
JOIN Usuario u ON a.Id_usuario = u.Id_usuario
JOIN Carrera c ON a.Id_carrera = c.Id_carrera
JOIN Usuario u ON a.Id_usuario = u.Id_tipo_usuario';
    $condiciones=[];
    $parametros = [];

    if (!empty($_POST['telefono'] )){
        $condiciones[] = "a.Telefono = :telefono";
        $parametros[':telefono'] = $_POST['telefono'];
    }

    if (!empty($_POST['correo'] )){
        $condiciones[] = "a.Correo = :correo";
        $parametros[':correo'] = $_POST['correo'];
    }

    if (!empty($_POST['carrera'] )){
        $condiciones[] = "a.Id_carrera = :carrera";
        $parametros[':carrera'] = $_POST['carrera'];
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
