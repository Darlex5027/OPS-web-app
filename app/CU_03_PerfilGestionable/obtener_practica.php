<?php
/**
 * ================================
 * Archivo : obtener_practica.php
 * Autor   : Viridiana Tonix Zarate
 * Fecha   : 2026-05-24
 * Desc.   : Obtiene los datos de
 *           la actividad de Prácticas
 *           Profesionales del alumno
 *           logueado.
 * ================================
 */

require_once '../php/db.php';

header('Content-Type: application/json');

// ── Validar sesión ──
if (!isset($_COOKIE['Id_usuario'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'No hay sesión activa']);
    exit;
}

$id_usuario = trim($_COOKIE['Id_usuario']);

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    // ── Obtener Id_alumno desde Id_usuario ──
    $stmtAlumno = $pdo->prepare(
        "SELECT Id_alumno FROM Alumnos WHERE Id_usuario = :id_usuario"
    );
    $stmtAlumno->execute([':id_usuario' => $id_usuario]);
    $alumno = $stmtAlumno->fetch(PDO::FETCH_ASSOC);

    if (!$alumno) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Alumno no encontrado', 'practica' => null]);
        exit;
    }

    $id_alumno = $alumno['Id_alumno'];
    $ID_SERVICIO_PRACTICAS = 2; // Id_servicio para Prácticas Profesionales

    // ── Obtener datos de Prácticas Profesionales ──
    $stmtPractica = $pdo->prepare(
        "SELECT aa.Id_alumno_servicio AS Id_actividad,
                aa.Id_alumno,
                aa.Id_servicio,
                aa.Id_empresa,
                aa.Area,
                aa.Programa,
                aa.Estado,
                aa.periodo_tipo,
                aa.periodo_año,
                aa.Fecha_inicio,
                aa.Fecha_fin,
                aa.Fecha_registro AS Fecha_registro_act,
                aa.Fecha_modificacion,
                e.Nombre AS Nombre_empresa
         FROM Actividades_Alumnos aa
         LEFT JOIN Empresas e ON aa.Id_empresa = e.Id_empresa
         WHERE aa.Id_alumno = :id_alumno AND aa.Id_servicio = :id_servicio
         LIMIT 1"
    );
    $stmtPractica->execute([
        ':id_alumno'    => $id_alumno,
        ':id_servicio'  => $ID_SERVICIO_PRACTICAS
    ]);
    $practica = $stmtPractica->fetch(PDO::FETCH_ASSOC);

    if ($practica) {
        // Formatear fechas
        $campos_fecha = ['Fecha_registro_act', 'Fecha_inicio', 'Fecha_fin', 'Fecha_modificacion'];
        foreach ($campos_fecha as $campo) {
            if (!empty($practica[$campo]) && $practica[$campo] !== '0000-00-00') {
                $practica[$campo] = date('d / m / Y', strtotime($practica[$campo]));
            } else {
                $practica[$campo] = '';
            }
        }

        echo json_encode([
            'success'  => true,
            'practica' => $practica
        ]);
    } else {
        // No hay práctica aún, devuelve null
        echo json_encode([
            'success'  => true,
            'practica' => null
        ]);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage()
    ]);
}
?>