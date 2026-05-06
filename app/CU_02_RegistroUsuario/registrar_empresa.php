<?php
/**
 * Archivo      : registrar_empresa.php
 * Módulo       : CU_02_RegistroUsuario
 * Autor        : Francisco Angel Membrilla Alarcon
 * Fecha        : 21/04/2026
 * Descripción  : Endpoint que procesa el registro de empresas. Valida los datos
 * y los almacena en la base de datos MariaDB.
 * de usuario y retorna la información en formato JSON.
 */

// 1. Ajuste de ruta para llegar a la conexión PDO
require_once("../php/db.php");
header("Content-Type: application/json");

// 2. Obtener datos del fetch (JSON)
$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    echo json_encode(["success" => false, "error" => "No se recibieron datos"]);
    exit;
}

// Limpieza de datos (Mapeo desde el JS)
$nombre    = trim($data['nombre_comercial'] ?? ''); // Viene del input del modal
$razon     = trim($data['razon_social'] ?? '');
$rfc       = trim($data['rfc'] ?? '');
$direccion = trim($data['direccion'] ?? '');
$web       = trim($data['sitio_web'] ?? '');
$desc      = trim($data['descripcion'] ?? '');

// 3. Validación de campos obligatorios
if (!$nombre || !$razon || !$rfc || !$direccion) {
    echo json_encode(["success" => false, "error" => "Campos obligatorios incompletos (*)"]);
    exit;
}

try {

    // IMPORTANTE: Asegurar conexión activa
    if (!isset($pdo)) {
        $pdo = new PDO($dsn, $user, $pass, $options);
    }

    /**
     * 4. Inserción corregida según tu init_sql:
     * - Se cambió 'Nombre_comercial' por 'Nombre'
     * - Se cambió la tabla 'empresas' por 'Empresas' (Case sensitive en Docker)
     */
    $stmt = $pdo->prepare("
        INSERT INTO Empresas (Nombre, Razon_social, RFC, Direccion, Sitio_web, Descripcion, Activo, Fecha_registro)
        VALUES (?, ?, ?, ?, ?, ?, 1, NOW())
    ");

    $stmt->execute([
        $nombre,
        $razon,
        $rfc,
        $direccion,
        $web,
        $desc
    ]);

    // 5. Retornar el ID generado para el frontend
    $id_empresa = $pdo->lastInsertId();

    echo json_encode([
        "success" => true,
        "id_empresa" => $id_empresa,
        "nombre" => $nombre
    ]);

} catch (PDOException $e) {

    // 6. Manejo de errores específicos de SQL
    error_log("Error DB al registrar empresa: " . $e->getMessage());

    // Si el RFC o Nombre ya existe (son UNIQUE en tu SQL)
    if ($e->getCode() == 23000) {
        $error_msg = "El nombre de la empresa o el RFC ya se encuentran registrados.";
    } else {
        $error_msg = "Error interno al guardar en la base de datos.";
    }

    echo json_encode([
        "success" => false,
        "error" => $error_msg,
        "debug" => $e->getMessage()
    ]);

}