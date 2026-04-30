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
} catch (PDOException $error_pdo) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error"   => "error_conexion_db",
        "message" => $error_pdo->getMessage()
    ]);
    exit;
}

header("Content-Type: application/json");

$data_input = json_decode(file_get_contents("php://input"), true);

// CORRECCIÓN SEC. 10: Error estructurado en snake_case
if (!$data_input) {
    echo json_encode([
        "success" => false,
        "error"   => "datos_invalidos"
    ]);
    exit;
}

$matricula = trim($data_input['matricula'] ?? '');
$contrasena = $data_input['contrasena'] ?? '';

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
$datos_usuario = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$datos_usuario) {
    echo json_encode([
        "success" => false,
        "error"   => "matricula_no_existe"
    ]);
    exit;
}

/* =========================
   VALIDACIONES
========================= */
if (!$datos_usuario['Activo']) {
    echo json_encode([
        "success" => false,
        "error"   => "usuario_inactivo"
    ]);
    exit;
}

if ($datos_usuario['Bloqueado']) {
    echo json_encode([
        "success" => false,
        "error"   => "usuario_bloqueado"
    ]);
    exit;
}

/* =========================
   CONTRASEÑA
========================= */
if (!password_verify($contrasena, $datos_usuario['Contrasena'])) {

    $intentos = $datos_usuario['Intentos_fallidos'] + 1;

    if ($intentos >= 3) {
        $stmt = $pdo->prepare("
            UPDATE Usuarios
            SET Intentos_fallidos = ?, Bloqueado = 1
            WHERE Id_usuario = ?
        ");
        $stmt->execute([$intentos, $datos_usuario['Id_usuario']]);
    } else {
        // CORRECCIÓN SEC. 11.4: Cambio 'usuarios' por 'Usuarios' (PascalCase)
        $stmt = $pdo->prepare("
            UPDATE Usuarios
            SET Intentos_fallidos = ?
            WHERE Id_usuario = ?
        ");
        $stmt->execute([$intentos, $datos_usuario['Id_usuario']]);
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

$stmt->execute([$datos_usuario['Id_usuario']]);

/* =========================
   PERMISOS
========================= */
$stmt = $pdo->prepare("
    SELECT p.Nombre_permiso
    FROM TipoUsuarios_Permiso tp
    JOIN Permisos p ON p.Id_permiso = tp.Id_permiso
    WHERE tp.Id_tipo_usuario = ?
");

$stmt->execute([$datos_usuario['Id_tipo_usuario']]);
$permisos = $stmt->fetchAll(PDO::FETCH_COLUMN);

/* =========================
   NUEVO: ID CARRERA
========================= */
$carrera = null;

if ($datos_usuario['Id_tipo_usuario'] == 2) {
    $stmt = $pdo->prepare("
        SELECT Id_carrera FROM Alumnos WHERE Id_usuario = ?
        UNION
        SELECT Id_carrera FROM Administradores WHERE Id_usuario = ?
");
    $stmt->execute([$datos_usuario['Id_usuario'], $datos_usuario['Id_usuario']]);
    $datos_usuario['Id_carrera'] = $stmt->fetchColumn() ?: null;
}

if ($datos_usuario['Id_tipo_usuario'] == 1) {
    $stmt = $pdo->prepare("
        SELECT Id_carrera
        FROM Administradores
        WHERE Id_usuario = ?
    ");
    $stmt->execute([$datos_usuario['Id_usuario']]);
    $carrera = $stmt->fetchColumn();
}

$datos_usuario['Id_carrera'] = $carrera;

/* =========================
   SEGURIDAD
========================= */
unset($datos_usuario['Contrasena']);

/* =========================
   RESPUESTA FINAL
========================= */
echo json_encode([
    "success"  => true,
    "usuario"  => $datos_usuario,
    "permisos" => $permisos
]);

?>