<?php
/**
 * Archivo      : login.php
 * Módulo       : CU_01_Login
 * Autor        : Francisco Angel Membrilla Alarcon
 * Fecha        : 21/04/2026
 * Descripción  : Endpoint que procesa el inicio de sesión. Valida credenciales
 * contra la base de datos MariaDB, gestiona el bloqueo de 
 * usuarios por intentos fallidos, recupera permisos por tipo 
 * de usuario y retorna la información en formato JSON.
 */

require_once("../php/db.php");

try {
    $pdo = new PDO($dsn, $user, $pass, $options); 
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error"   => "error_conexion_db",
        "message" => $e->getMessage()
    ]);
    exit;
}

header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);

// CORRECCIÓN SEC. 10: Error estructurado en snake_case
if (!$data) {
    echo json_encode([
        "success" => false,
        "error"   => "datos_invalidos"
    ]);
    exit;
}

$matricula = trim($data['matricula'] ?? '');
$contrasena = $data['contrasena'] ?? '';

// CORRECCIÓN SEC. 10: Error estructurado en snake_case
if (!$matricula || !$contrasena) {
    echo json_encode([
        "success" => false,
        "error"   => "datos_incompletos"
    ]);
    exit;
}

// CORRECCIÓN SEC. 10: Error estructurado en snake_case
if (!preg_match('/^\d{4}$|^\d{8}$/', $matricula)) {
    echo json_encode([
        "success" => false,
        "error"   => "formato_matricula_invalido"
    ]);
    exit;
}

/* =========================
   BUSCAR USUARIO
========================= */
$stmt = $pdo->prepare("
    SELECT *
    FROM Usuarios
    WHERE Matricula = ?
");

$stmt->execute([$matricula]);
$usuario = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$usuario) {
    echo json_encode([
        "success" => false,
        "error"   => "matricula_no_existe"
    ]);
    exit;
}

/* =========================
   VALIDACIONES
========================= */
if (!$usuario['Activo']) {
    echo json_encode([
        "success" => false,
        "error"   => "usuario_inactivo"
    ]);
    exit;
}

if ($usuario['Bloqueado']) {
    echo json_encode([
        "success" => false,
        "error"   => "usuario_bloqueado"
    ]);
    exit;
}

/* =========================
   CONTRASEÑA
========================= */
if (!password_verify($contrasena, $usuario['Contrasena'])) {

    $intentos = $usuario['Intentos_fallidos'] + 1;

    if ($intentos >= 3) {
        $stmt = $pdo->prepare("
            UPDATE Usuarios
            SET Intentos_fallidos = ?, Bloqueado = 1
            WHERE Id_usuario = ?
        ");
        $stmt->execute([$intentos, $usuario['Id_usuario']]);
    } else {
        // CORRECCIÓN SEC. 11.4: Cambio 'usuarios' por 'Usuarios' (PascalCase)
        $stmt = $pdo->prepare("
            UPDATE Usuarios
            SET Intentos_fallidos = ?
            WHERE Id_usuario = ?
        ");
        $stmt->execute([$intentos, $usuario['Id_usuario']]);
    }

    echo json_encode([
        "success" => false,
        "error"   => "contrasena_incorrecta"
    ]);
    exit;
}

/* =========================
   LOGIN EXITOSO
========================= */
$stmt = $pdo->prepare("
    UPDATE Usuarios
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
    FROM TipoUsuarios_Permiso tp
    JOIN Permisos p ON p.Id_permiso = tp.Id_permiso
    WHERE tp.Id_tipo_usuario = ?
");

$stmt->execute([$usuario['Id_tipo_usuario']]);
$permisos = $stmt->fetchAll(PDO::FETCH_COLUMN);

/* =========================
   NUEVO: ID CARRERA
========================= */
$carrera = null;

if ($usuario['Id_tipo_usuario'] == 2) {
    $stmt = $pdo->prepare("
        SELECT Id_carrera
        FROM Alumnos
        WHERE Id_usuario = ?
    ");
    $stmt->execute([$usuario['Id_usuario']]);
    $carrera = $stmt->fetchColumn();
}

if ($usuario['Id_tipo_usuario'] == 1) {
    $stmt = $pdo->prepare("
        SELECT Id_carrera
        FROM Administradores
        WHERE Id_usuario = ?
    ");
    $stmt->execute([$usuario['Id_usuario']]);
    $carrera = $stmt->fetchColumn();
}

$usuario['Id_carrera'] = $carrera;

/* =========================
   SEGURIDAD
========================= */
unset($usuario['Contrasena']);

/* =========================
   RESPUESTA FINAL
========================= */
echo json_encode([
    "success"  => true,
    "usuario"  => $usuario,
    "permisos" => $permisos
]);

?>