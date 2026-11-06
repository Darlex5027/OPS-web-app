<?php
/**
 * ================================
 * Archivo : obtener_datos.php
 * Autor   : Viridiana Tonix Zarate
 * Fecha   : 2026-05-24
 * Desc.   : Obtiene los datos del
 *           usuario logueado desde
 *           las cookies de sesión.
 *
 * Cambios:
 *  - El alumno puede tener VARIAS filas en Actividades_Alumnos.
 *    Antes se hacía LEFT JOIN y el JS tomaba data[0] (una fila al azar).
 *    Ahora se devuelve SOLO la actividad vigente: la abierta
 *    (no COMPLETADO) si existe; si no, la última completada.
 *  - No_expediente ahora viene de Actividades_Alumnos (ya no de Alumnos).
 *  - Se agregan Tiene_actividad y Actividades_completadas para que
 *    el front sepa si debe ofrecer "Nueva actividad".
 *  - Tipo de usuario desconocido → 403 (antes $sql quedaba indefinida).
 *  - Los errores de BD ya no se envían al navegador.
 * ================================
 */

// Primero: garantiza respuesta JSON. Si no se puede cargar, se avisa en JSON.
if (!is_readable(__DIR__ . '/utilidades_json.php')) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => file_exists(__DIR__ . '/utilidades_json.php')
        ? 'El servidor no tiene permiso de leer utilidades_json.php (chmod 644)'
        : 'No se encontró utilidades_json.php en ' . __DIR__]);
    exit;
}
require_once __DIR__ . '/utilidades_json.php';
require_once '../php/db.php';


if (!isset($_COOKIE['Id_tipo_usuario'], $_COOKIE['Id_usuario'])) {
    responder(401, ['success' => false, 'error' => 'No hay sesión activa']);
}

$tipo_usuario = trim($_COOKIE['Id_tipo_usuario']);
$id_usuario   = trim($_COOKIE['Id_usuario']);

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    // ========================= ADMIN / COORDINADOR =========================
    if ($tipo_usuario === '1' || $tipo_usuario === '3') {
        $stmt = $pdo->prepare("
            SELECT a.Nombre, a.Apellido_P, a.Apellido_M, a.Telefono, a.Correo, a.Fecha_registro,
                   u.Profile_picture_path,
                   c.Nombre AS Nombre_Carrera
            FROM Administradores a
            JOIN Usuarios u ON a.Id_usuario = u.Id_usuario
            JOIN Carreras c ON a.Id_carrera = c.Id_carrera
            WHERE a.Id_usuario = ?
        ");
        $stmt->execute([$id_usuario]);
        $fila = $stmt->fetch(PDO::FETCH_ASSOC);

    // ========================= ALUMNO =========================
    } elseif ($tipo_usuario === '2') {
        $stmt = $pdo->prepare("
            SELECT a.Id_alumno, a.Nombre, a.Apellido_P, a.Apellido_M, a.Grupo,
                   a.Horario, a.Fecha_registro,
                   u.Profile_picture_path,
                   c.Nombre AS Nombre_Carrera
            FROM Alumnos a
            JOIN Usuarios u ON a.Id_usuario = u.Id_usuario
            JOIN Carreras c ON a.Id_carrera = c.Id_carrera
            WHERE a.Id_usuario = ?
        ");
        $stmt->execute([$id_usuario]);
        $fila = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($fila) {
            // Actividad vigente: primero la abierta (PENDIENTE / EN_CURSO);
            // si no hay, la más reciente (COMPLETADO o CANCELADO).
            $stmt = $pdo->prepare("
                SELECT aa.No_expediente, aa.Id_empresa, aa.Area, aa.Programa, aa.Estado, aa.periodo_tipo, aa.`periodo_año`,
                       aa.Fecha_inicio, aa.Fecha_fin,
                       aa.Fecha_registro AS Fecha_registro_act, aa.Fecha_modificacion,
                       ac.Servicio AS Nombre_servicio,
                       e.Nombre    AS Nombre_empresa
                FROM Actividades_Alumnos aa
                LEFT JOIN Actividades ac ON aa.Id_servicio = ac.Id_servicio
                LEFT JOIN Empresas    e  ON aa.Id_empresa  = e.Id_empresa
                WHERE aa.Id_alumno = ?
                ORDER BY (aa.Estado IN ('PENDIENTE', 'EN_CURSO')) DESC,
                         aa.Fecha_registro DESC,
                         aa.Id_alumno_servicio DESC
                LIMIT 1
            ");
            $stmt->execute([$fila['Id_alumno']]);
            $actividad = $stmt->fetch(PDO::FETCH_ASSOC);

            $stmt = $pdo->prepare("
                SELECT COUNT(*) FROM Actividades_Alumnos
                WHERE Id_alumno = ? AND Estado = 'COMPLETADO'
            ");
            $stmt->execute([$fila['Id_alumno']]);

            $fila = array_merge($fila, $actividad ?: []);
            $fila['Tiene_actividad']         = (bool) $actividad;
            $fila['Actividades_completadas'] = (int) $stmt->fetchColumn();
            unset($fila['Id_alumno']);
        }

    } else {
        responder(403, ['success' => false, 'error' => 'Tipo de usuario no válido']);
    }

    if (!$fila) {
        responder(404, ['success' => false, 'error' => 'No se encontró el perfil']);
    }

    foreach (['Fecha_registro', 'Fecha_registro_act', 'Fecha_inicio', 'Fecha_fin', 'Fecha_modificacion'] as $campo) {
        if (!empty($fila[$campo])) {
            $fila[$campo] = date('Y-m-d', strtotime($fila[$campo]));
        }
    }

    // Se mantiene el formato de arreglo para no romper otros scripts.
    responder(200, [$fila]);

} catch (Throwable $e) {
    responderExcepcion($e, 'obtener_datos.php');
}