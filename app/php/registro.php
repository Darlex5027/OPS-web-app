<?php

require_once("../config/database.php");

header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);

$matricula = trim($data['matricula'] ?? '');
$password = $data['password'] ?? '';
$tipo = $data['tipo_usuario'] ?? '';

if(!$matricula || !$password || !$tipo){
    echo json_encode([
        "success"=>false,
        "error"=>"Datos incompletos"
    ]);
    exit;
}

if(!preg_match('/^\d{4}$|^\d{8}$/',$matricula)){
    echo json_encode([
        "success"=>false,
        "error"=>"Formato de matrícula inválido"
    ]);
    exit;
}

if(strlen($password) < 8){
    echo json_encode([
        "success"=>false,
        "error"=>"La contraseña debe tener al menos 8 caracteres"
    ]);
    exit;
}

try {

    $stmt = $pdo->prepare("
        SELECT Id_usuario
        FROM Usuario
        WHERE Matricula = ?
    ");

    $stmt->execute([$matricula]);

    if($stmt->fetch()){
        echo json_encode([
            "success"=>false,
            "error"=>"La matrícula ya está registrada"
        ]);
        exit;
    }

    $pdo->beginTransaction();

    $hash = password_hash($password, PASSWORD_DEFAULT);

    if($tipo === "admin"){
        $id_tipo_usuario = 1;
        $activo = true;
    }else{
        $id_tipo_usuario = 2;
        $activo = false;
    }

    $stmt = $pdo->prepare("
        INSERT INTO Usuario
        (Matricula, Contrasena, Id_tipo_usuario, Activo)
        VALUES (?,?,?,?)
    ");

    $stmt->execute([
        $matricula,
        $hash,
        $id_tipo_usuario,
        $activo
    ]);

    $id_usuario = $pdo->lastInsertId();

    if($tipo === "admin"){

        $stmt = $pdo->prepare("
            INSERT INTO Admin
            (Id_usuario, Nombre, Apellido_P, Apellido_M, Id_carrera, Telefono, Correo)
            VALUES (?,?,?,?,?,?,?)
        ");

        $stmt->execute([
            $id_usuario,
            $data['nombre'] ?? null,
            $data['apellido_p'] ?? null,
            $data['apellido_m'] ?? null,
            $data['id_carrera'] ?? null,
            $data['telefono'] ?? null,
            $data['correo'] ?? null
        ]);

    }

    if($tipo === "alumno"){

        $stmt = $pdo->prepare("
            INSERT INTO Alumnos
            (Id_usuario, Nombre, Apellido_P, Apellido_M, Id_carrera, No_expediente, Horario, Organizacion)
            VALUES (?,?,?,?,?,?,?,?)
        ");

        $stmt->execute([
            $id_usuario,
            $data['nombre'] ?? null,
            $data['apellido_p'] ?? null,
            $data['apellido_m'] ?? null,
            $data['id_carrera'] ?? null,
            $data['expediente'] ?? null,
            $data['horario'] ?? null,
            $data['organizacion'] ?? null
        ]);

        $stmt = $pdo->prepare("
            INSERT INTO Contacto_Alumno
            (Id_usuario, Email, Telefono_celular)
            VALUES (?,?)
        ");

        $stmt->execute([
            $id_usuario,
            $data['email'] ?? null,
            $data['telefono'] ?? null
        ]);

        $stmt = $pdo->prepare("
            INSERT INTO Alumno_Servicio
            (Id_usuario, Estado)
            VALUES (?, 'PENDIENTE')
        ");

        $stmt->execute([$id_usuario]);

    }

    $pdo->commit();

    echo json_encode([
        "success"=>true
    ]);

} catch(Exception $e){

    $pdo->rollBack();

    echo json_encode([
        "success"=>false,
        "error"=>"Error al registrar el usuario"
    ]);

}