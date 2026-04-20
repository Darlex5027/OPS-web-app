<?php

require_once("../config/database.php");

header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);

if(!$data){
    echo json_encode([
        "success"=>false,
        "error"=>"Datos inválidos"
    ]);
    exit;
}

$matricula = trim($data['matricula'] ?? '');
$contrasena = $data['contrasena'] ?? '';

if(!$matricula || !$contrasena){
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

$stmt = $pdo->prepare("
SELECT *
FROM Usuario
WHERE Matricula = ?
");

$stmt->execute([$matricula]);

$usuario = $stmt->fetch(PDO::FETCH_ASSOC);

if(!$usuario){

    echo json_encode([
        "success"=>false,
        "error"=>"Usuario no encontrado"
    ]);
    exit;

}

if(!$usuario['Activo']){

    echo json_encode([
        "success"=>false,
        "error"=>"Cuenta inactiva pendiente de aprobación"
    ]);
    exit;

}

if($usuario['Bloqueado']){

    echo json_encode([
        "success"=>false,
        "error"=>"Usuario bloqueado"
    ]);
    exit;

}

if(!password_verify($contrasena,$usuario['Contrasena'])){

    $intentos = $usuario['Intentos_fallidos'] + 1;

    if($intentos >= 3){

        $stmt = $pdo->prepare("
        UPDATE Usuario
        SET Intentos_fallidos = ?, Bloqueado = TRUE
        WHERE Id_usuario = ?
        ");

        $stmt->execute([$intentos,$usuario['Id_usuario']]);

    }else{

        $stmt = $pdo->prepare("
        UPDATE Usuario
        SET Intentos_fallidos = ?
        WHERE Id_usuario = ?
        ");

        $stmt->execute([$intentos,$usuario['Id_usuario']]);

    }

    echo json_encode([
        "success"=>false,
        "error"=>"Contraseña incorrecta"
    ]);
    exit;

}

$stmt = $pdo->prepare("
UPDATE Usuario
SET Intentos_fallidos = 0,
Fecha_ultimo_acceso = NOW()
WHERE Id_usuario = ?
");

$stmt->execute([$usuario['Id_usuario']]);


$stmt = $pdo->prepare("
SELECT Permiso.Nombre
FROM TipoUsuario_Permiso
JOIN Permiso ON Permiso.Id_permiso = TipoUsuario_Permiso.Id_permiso
WHERE TipoUsuario_Permiso.Id_tipo_usuario = ?
");

$stmt->execute([$usuario['Id_tipo_usuario']]);

$permisos = $stmt->fetchAll(PDO::FETCH_COLUMN);

echo json_encode([
    "success"=>true,
    "usuario"=>$usuario,
    "permisos"=>$permisos
]);

?>