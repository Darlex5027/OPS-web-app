<?php
/**
 * ================================
 * Archivo : utilidades_json.php
 * Desc.   : Funciones comunes de los PHP del perfil.
 *           - Responder SIEMPRE en JSON, incluso ante un error fatal
 *             (así el JS nunca recibe HTML o una respuesta vacía).
 *           - Funciones de texto que NO dependen de las extensiones
 *             mbstring ni ctype (pueden no estar instaladas en Docker).
 *           Compatible con PHP 7.2+.
 * ================================
 */

// ⚠ Cambiar a false en producción para no mostrar detalles internos.
if (!defined('MODO_DEBUG')) define('MODO_DEBUG', true);

ini_set('display_errors', '0');
if (ob_get_level() === 0) ob_start();

class ErrorPeticion extends Exception {}

function responder($codigo, $cuerpo) {
    while (ob_get_level() > 0) ob_end_clean();
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($cuerpo, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function fallar($codigo, $mensaje) {
    throw new ErrorPeticion($mensaje, $codigo);
}

/** Respuesta para cualquier excepción inesperada (PDO, TypeError, etc.) */
function responderExcepcion($e, $archivo) {
    error_log($archivo . ': ' . $e->getMessage());
    $cuerpo = ['success' => false, 'error' => 'Error interno del servidor'];
    if (MODO_DEBUG) {
        $cuerpo['error'] = 'Error en ' . $archivo . ': ' . $e->getMessage();
    }
    responder(500, $cuerpo);
}

register_shutdown_function(function () {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        while (ob_get_level() > 0) ob_end_clean();
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'error'   => MODO_DEBUG
                ? 'Error fatal de PHP: ' . $err['message'] . ' (' . basename($err['file']) . ':' . $err['line'] . ')'
                : 'Error interno del servidor',
        ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    }
});

// ===== Texto sin mbstring / ctype =====
function largo($texto) {
    return function_exists('mb_strlen') ? mb_strlen($texto, 'UTF-8') : (int) preg_match_all('/./us', $texto);
}

function mayusculas($texto) {
    if (function_exists('mb_strtoupper')) return mb_strtoupper($texto, 'UTF-8');
    return strtr(strtoupper($texto), ['ñ' => 'Ñ', 'á' => 'Á', 'é' => 'É', 'í' => 'Í', 'ó' => 'Ó', 'ú' => 'Ú']);
}

function minusculas($texto) {
    if (function_exists('mb_strtolower')) return mb_strtolower($texto, 'UTF-8');
    return strtr(strtolower($texto), ['Ñ' => 'ñ', 'Á' => 'á', 'É' => 'é', 'Í' => 'í', 'Ó' => 'ó', 'Ú' => 'ú']);
}

function esEntero($valor) {
    return is_string($valor) && preg_match('/^\d+$/', $valor) === 1;
}