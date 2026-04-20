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

/* =========================
   BUSCAR USUARIO
========================= */
$stmt = $pdo->prepare("
SELECT *
FROM usuarios
WHERE Matricula = ?
");

$stmt->execute([$matricula]);

$usuario = $stmt->fetch(PDO::FETCH_ASSOC);

if(!$usuario){
    echo json_encode([
        "success"=>false,
        "error"=>"matricula_no_existe"
    ]);
    exit;
}

/* =========================
   VALIDACIONES
========================= */
if(!$usuario['Activo']){
    echo json_encode([
        "success"=>false,
        "error"=>"usuario_inactivo"
    ]);
    exit;
}

if($usuario['Bloqueado']){
    echo json_encode([
        "success"=>false,
        "error"=>"usuario_bloqueado"
    ]);
    exit;
}

/* =========================
   CONTRASEÑA
========================= */
if(!password_verify($contrasena, $usuario['Contraseña'])){

    $intentos = $usuario['Intentos_fallidos'] + 1;

    if($intentos >= 3){

        $stmt = $pdo->prepare("
        UPDATE usuarios
        SET Intentos_fallidos = ?, Bloqueado = 1
        WHERE Id_usuario = ?
        ");
        $stmt->execute([$intentos, $usuario['Id_usuario']]);

    } else {

        $stmt = $pdo->prepare("
        UPDATE usuarios
        SET Intentos_fallidos = ?
        WHERE Id_usuario = ?
        ");
        $stmt->execute([$intentos, $usuario['Id_usuario']]);
    }

    echo json_encode([
        "success"=>false,
        "error"=>"contrasena_incorrecta"
    ]);
    exit;
}

/* =========================
   LOGIN EXITOSO
========================= */
$stmt = $pdo->prepare("
UPDATE usuarios
SET Intentos_fallidos = 0,
Fecha_ultimo_acceso = NOW()
WHERE Id_usuario = ?
");

$stmt->execute([$usuario['Id_usuario']]);

/* =========================
   PERMISOS
========================= */
$stmt = $pdo->prepare("
SELECT p.Nombre_permiso
FROM tipousuarios_permisos tp
JOIN permisos p ON p.Id_permiso = tp.Id_permiso
WHERE tp.Id_tipo_usuario = ?
");

$stmt->execute([$usuario['Id_tipo_usuario']]);

$permisos = $stmt->fetchAll(PDO::FETCH_COLUMN);

/* =========================
   🟢 NUEVO: ID CARRERA
========================= */
$carrera = null;

if ($usuario['Id_tipo_usuario'] == 2) {

    $stmt = $pdo->prepare("
        SELECT Id_carrera
        FROM alumnos
        WHERE Id_usuario = ?
    ");
    $stmt->execute([$usuario['Id_usuario']]);
    $carrera = $stmt->fetchColumn();
}

if ($usuario['Id_tipo_usuario'] == 1) {

    $stmt = $pdo->prepare("
        SELECT Id_carrera
        FROM administradores
        WHERE Id_usuario = ?
    ");
    $stmt->execute([$usuario['Id_usuario']]);
    $carrera = $stmt->fetchColumn();
}

/* agregar al usuario */
$usuario['Id_carrera'] = $carrera;

/* =========================
   SEGURIDAD
========================= */
unset($usuario['Contraseña']);

/* =========================
   RESPUESTA FINAL
========================= */
echo json_encode([
    "success"=>true,
    "usuario"=>$usuario,
    "permisos"=>$permisos
]);

?>