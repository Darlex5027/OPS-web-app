<?php
/**
 * Archivo:     obtener_info_admin.php
 * Módulo:      CU_08_Reporte_Alumnado
 * Autor:       Alejandro Resendiz
 * Fecha:       02-06-2026
 * Descripción: Endpoint PHP del módulo CU_09_ReporteEstadistico.
 *              Retorna en JSON la facultad, carrera y nombre completo
 *              del administrador autenticado, usando Id_usuario de la cookie.
 *              Tablas consultadas: Administradores, Carreras, Facultades.
 */
require_once '../php/db.php';

try {
    // Validar que la cookie exista
    if (!isset($_COOKIE['Id_usuario']) || empty($_COOKIE['Id_usuario'])) {
        http_response_code(401);
        echo json_encode(['error' => 'No autenticado']);
        exit;
    }

    $id_usuario = (int) $_COOKIE['Id_usuario'];

    $pdo = new PDO($dsn, $user, $pass, $options);

    $stmt = $pdo->prepare("
        SELECT
            CONCAT(a.Nombre, ' ', a.Apellido_P, ' ', COALESCE(a.Apellido_M, '')) AS nombre_completo,
            c.Nombre  AS carrera,
            f.Nombre  AS facultad
        FROM Administradores a
        JOIN Carreras   c ON c.Id_carrera  = a.Id_carrera
        JOIN Facultades f ON f.Id_facultad = c.Id_facultad
        WHERE a.Id_usuario = :id_usuario
          AND a.Activo = 1
    ");

    $stmt->execute([':id_usuario' => $id_usuario]);
    $resultado = $stmt->fetch();

    if (!$resultado) {
        http_response_code(404);
        echo json_encode(['error' => 'Administrador no encontrado']);
        exit;
    }

    echo json_encode($resultado);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Hubo un error obteniendo la información del administrador']);
}