<?php
/**
 * ================================
 * Archivo : obtener_datos.php
 * Autor   : Viridiana Tonix Zarate
 * Fecha   : 2026-05-24
 * Desc.   : Obtiene los datos del usuario logueado.
 *           Para el alumno también devuelve:
 *           - su actividad vigente: la abierta (PENDIENTE / EN_CURSO)
 *             o, si no hay, la más reciente;
 *           - los catálogos (empresas, servicios y periodos) que usa
 *             al editar y al crear una nueva actividad.
 * ================================
 */
// Cambiar a false en producción para no mostrar detalles internos.
const MODO_DEBUG = true;

// Los avisos de PHP no deben mezclarse con la respuesta JSON
ini_set('display_errors', '0');
ob_start();

// Valores del ENUM Actividades_Alumnos.periodo_tipo
const PERIODOS = ['primavera', 'otoño'];

require_once '../php/db.php';

[$tipo_usuario, $id_usuario] = sesion();

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    if ($tipo_usuario === '1' || $tipo_usuario === '3') {
        $stmt = $pdo->prepare("
            SELECT a.Nombre, a.Apellido_P, a.Apellido_M, a.Telefono, a.Correo, a.Fecha_registro,
                   u.Profile_picture_path, c.Nombre AS Nombre_Carrera
            FROM Administradores a
            JOIN Usuarios u ON a.Id_usuario = u.Id_usuario
            JOIN Carreras c ON a.Id_carrera = c.Id_carrera
            WHERE a.Id_usuario = ?
        ");
        $stmt->execute([$id_usuario]);
        $fila = $stmt->fetch(PDO::FETCH_ASSOC);

    } elseif ($tipo_usuario === '2') {
        $stmt = $pdo->prepare("
            SELECT a.Id_alumno, a.Nombre, a.Apellido_P, a.Apellido_M, a.Grupo, a.Horario, a.Fecha_registro,
                   u.Profile_picture_path, c.Nombre AS Nombre_Carrera
            FROM Alumnos a
            JOIN Usuarios u ON a.Id_usuario = u.Id_usuario
            JOIN Carreras c ON a.Id_carrera = c.Id_carrera
            WHERE a.Id_usuario = ?
        ");
        $stmt->execute([$id_usuario]);
        $fila = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($fila) {
            $stmt = $pdo->prepare("
                SELECT aa.No_expediente, aa.Id_empresa, aa.Area, aa.Programa, aa.Estado,
                       aa.periodo_tipo, aa.`periodo_año`, aa.Fecha_inicio, aa.Fecha_fin,
                       aa.Fecha_registro AS Fecha_registro_act, aa.Fecha_modificacion,
                       ac.Servicio AS Nombre_servicio, e.Nombre AS Nombre_empresa
                FROM Actividades_Alumnos aa
                LEFT JOIN Actividades ac ON aa.Id_servicio = ac.Id_servicio
                LEFT JOIN Empresas    e  ON aa.Id_empresa  = e.Id_empresa
                WHERE aa.Id_alumno = ?
                ORDER BY (aa.Estado IN ('PENDIENTE', 'EN_CURSO')) DESC,
                         aa.Fecha_registro DESC, aa.Id_alumno_servicio DESC
                LIMIT 1
            ");
            $stmt->execute([$fila['Id_alumno']]);
            $actividad = $stmt->fetch(PDO::FETCH_ASSOC);

            $fila = array_merge($fila, $actividad ?: []);
            $fila['Tiene_actividad'] = (bool) $actividad;
            unset($fila['Id_alumno']);
        }

    } else {
        responder(403, ['success' => false, 'error' => 'Tipo de usuario no válido']);
    }

    if (!$fila) responder(404, ['success' => false, 'error' => 'No se encontró el perfil']);

    foreach (['Fecha_registro', 'Fecha_registro_act', 'Fecha_inicio', 'Fecha_fin', 'Fecha_modificacion'] as $campo) {
        if (!empty($fila[$campo])) $fila[$campo] = substr($fila[$campo], 0, 10);
    }

    $catalogos = $tipo_usuario === '2' ? obtenerCatalogos($pdo) : null;
    responder(200, ['success' => true, 'datos' => $fila, 'catalogos' => $catalogos]);

} catch (Throwable $e) {
    responderExcepcion($e, 'obtener_datos.php');
}

// =========================
// CATÁLOGOS DEL ALUMNO
// =========================
function obtenerCatalogos($pdo) {
    return [
        'empresas'  => $pdo->query('SELECT Id_empresa, Nombre FROM Empresas WHERE Activo = 1 ORDER BY Nombre')->fetchAll(PDO::FETCH_ASSOC),
        'servicios' => $pdo->query('SELECT Id_servicio, Servicio FROM Actividades ORDER BY Servicio')->fetchAll(PDO::FETCH_ASSOC),
        'periodos'  => PERIODOS,
    ];
}

// =========================
// FUNCIONES DE APOYO
// =========================
function responder($codigo, $cuerpo) {
    while (ob_get_level() > 0) ob_end_clean();
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($cuerpo, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function responderExcepcion($e, $archivo) {
    error_log("$archivo: " . $e->getMessage());
    responder(500, [
        'success' => false,
        'error'   => MODO_DEBUG ? "Error en $archivo: " . $e->getMessage() : 'Error interno del servidor',
    ]);
}

/** Exige sesión; devuelve [tipo_usuario, id_usuario]. */
function sesion() {
    if (!isset($_COOKIE['Id_tipo_usuario'], $_COOKIE['Id_usuario'])) {
        responder(401, ['success' => false, 'error' => 'No hay sesión activa']);
    }
    return [trim($_COOKIE['Id_tipo_usuario']), trim($_COOKIE['Id_usuario'])];
}