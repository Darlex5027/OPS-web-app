<?php
/**
 * Archivo       : registrar_empresa.php
 * Módulo        : CU_02_RegistroUsuario
 * Autor         : Francisco Angel Membrila Alarcón
 * Fecha         : 22/04/2026
 * Descripción   : Endpoint que procesa el registro de empresas.
 * Solo el nombre comercial es obligatorio.
 */

require_once("../php/db.php");
header("Content-Type: application/json");

// Obtener datos del fetch (JSON)
$datos_input = json_decode(file_get_contents("php://input"), true);

if (!$datos_input) {
    echo json_encode(["success" => false, "error" => "No se recibieron datos"]);
    exit;
}

// Agrupación de datos en un arreglo asociativo
$datos_empresa = [
    'nombre'      => trim($datos_input['nombre_comercial'] ?? ''),
    'razon'       => trim($datos_input['razon_social'] ?? ''),
    'rfc'         => trim($datos_input['rfc'] ?? ''),
    'direccion'   => trim($datos_input['direccion'] ?? ''),
    'sitio_web'   => trim($datos_input['sitio_web'] ?? ''),
    'descripcion' => trim($datos_input['descripcion'] ?? '')
];

// Validación de campo obligatorio (solo nombre comercial)
if (empty($datos_empresa['nombre'])) {
    echo json_encode(["success" => false, "error" => "El nombre comercial es obligatorio."]);
    exit;
}

try {
    if (!isset($pdo)) {
        $pdo = new PDO($dsn, $user, $pass, $options);
    }

    // Usamos NULLIF para convertir cadenas vacías en NULL automáticamente al insertar
    $stmtInsertEmpresa = $pdo->prepare("
        INSERT INTO Empresas (Nombre, Razon_social, RFC, Direccion, Sitio_web, Descripcion, Activo, Fecha_registro)
        VALUES (?, NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''), 1, NOW())
    ");

    $stmtInsertEmpresa->execute([
        $datos_empresa['nombre'],
        $datos_empresa['razon'],
        $datos_empresa['rfc'],
        $datos_empresa['direccion'],
        $datos_empresa['sitio_web'],
        $datos_empresa['descripcion']
    ]);

    $id_empresa = $pdo->lastInsertId();

    echo json_encode([
        "success"    => true,
        "id_empresa" => $id_empresa,
        "nombre"     => $datos_empresa['nombre']
    ]);

} catch (PDOException $error_registro_empresa) {
    // Manejo de errores específicos de SQL
    error_log("Error DB al registrar empresa: " . $error_registro_empresa->getMessage());

    if ($error_registro_empresa->getCode() == 23000) {
        $error_mensaje = "El nombre de la empresa ya se encuentra registrado.";
    } else {
        $error_mensaje = "Error al registrar la empresa. Por favor, intente más tarde.";
    }

    echo json_encode([
        "success" => false,
        "error"   => $error_mensaje
    ]);
}
?>