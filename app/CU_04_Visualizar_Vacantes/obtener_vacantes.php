<?php
/*
 * Archivo     : obtener_vacantes.php
 * Módulo      : Modulo 4 CU_04_VisualizarVacantes
 * Autor       : Viridiana Tonix Zarate
 * Fecha       : 2026
 * Descripción : Devuelve en JSON las vacantes activas de la carrera en sesión.
 *               Todos los tipos de usuario ven solo las vacantes de su carrera.
 */

require_once '../php/db.php';

header('Content-Type: application/json');

// ================= VALIDACIÓN DE SESIÓN =================
$id_carrera  = $_COOKIE['Id_carrera']  ?? null;
$id_usuario  = $_COOKIE['Id_usuario']  ?? null;

if (!$id_usuario || !$id_carrera) {
    http_response_code(401);
    echo json_encode(['error' => 'Sesión no válida.']);
    exit();
}

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    $stmt = $pdo->prepare("
        SELECT
            v.Id_vacante,
            v.Titulo,
            v.Descripcion,
            v.Requisitos,
            v.Contacto_nombre,
            v.Contacto_email,
            v.Contacto_telefono,
            v.Fecha_publicacion,
            v.Fecha_expiracion,
            v.Flyer_Path,
            v.Id_servicio,
            e.Nombre   AS Empresa,
            a.Servicio AS Servicio
        FROM Vacantes v
        LEFT JOIN Empresas    e ON v.Id_empresa  = e.Id_empresa
        LEFT JOIN Actividades a ON v.Id_servicio = a.Id_servicio
        WHERE v.Id_carrera = :id_carrera
          AND v.Fecha_expiracion >= CURDATE()
        ORDER BY v.Fecha_publicacion DESC
    ");

    $stmt->execute([':id_carrera' => $id_carrera]);

    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión: ' . $e->getMessage()]);
}