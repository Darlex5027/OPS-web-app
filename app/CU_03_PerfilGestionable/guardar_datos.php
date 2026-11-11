<?php
/**
 * ================================
 * Archivo : guardar_datos.php
 * Autor   : Viridiana Tonix Zarate
 * Fecha   : 2026-05-24
 * Desc.   : Guarda el perfil (admin o alumno) y, si viene, la foto.
 *           Recibe FormData: "datos" (JSON) y "foto_perfil" (opcional).
 *           Del alumno solo modifica la actividad abierta; el estado
 *           solo avanza y la empresa solo cambia en PENDIENTE.
 * ================================
 */
// Cambiar a false en producción para no mostrar detalles internos.
const MODO_DEBUG = true;

// Los avisos de PHP no deben mezclarse con la respuesta JSON
ini_set('display_errors', '0');
ob_start();

/** Error esperado (validación, permisos...): se responde con su código y mensaje. */
class ErrorPeticion extends Exception {}

require_once '../php/db.php';

const NIVEL_ESTADO = ['PENDIENTE' => 1, 'EN_CURSO' => 2, 'COMPLETADO' => 3];
const EXT_FOTO     = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
const CARPETA_FOTO = '/home/uploads/Perfil/';   // carpeta en el servidor
const URL_FOTO     = '../uploads/Perfil/';      // cómo la ve el navegador

[$tipo_usuario, $id_usuario] = sesion();
if (!esEntero($tipo_usuario) || !esEntero($id_usuario)) responder(400, ['success' => false, 'error' => 'Sesión inválida']);

$datos = leerDatos();
$foto  = $_FILES['foto_perfil'] ?? null;
$pdo   = null;

try {
    // La foto se valida antes de tocar la BD
    $extFoto = $foto ? validarFoto($foto) : null;

    $pdo = new PDO($dsn, $user, $pass, $options);
    $pdo->beginTransaction();

    if ($tipo_usuario === '1' || $tipo_usuario === '3') guardarAdmin($pdo, $datos, $id_usuario);
    elseif ($tipo_usuario === '2')                       guardarAlumno($pdo, $datos, $id_usuario);
    else                                                 fallar(403, 'Tipo de usuario no válido');

    $pdo->commit();

    $url = $foto ? guardarFoto($pdo, $foto, $extFoto, $tipo_usuario, $id_usuario) : null;
    responder(200, ['success' => true, 'url' => $url]);

} catch (ErrorPeticion $e) {
    if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
    responder($e->getCode(), ['success' => false, 'error' => $e->getMessage()]);

} catch (Throwable $e) {
    if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
    responderExcepcion($e, 'guardar_datos.php');
}

// =========================
// ADMIN / COORDINADOR
// =========================
function guardarAdmin($pdo, $datos, $id_usuario) {
    if (!$datos) return;   // solo cambió la foto

    $telefono = texto($datos, 'telefono_administrador');
    $correo   = texto($datos, 'correo_administrador');
    if (!preg_match('/^\d{3}-\d{4}-\d{3}$/', $telefono)) fallar(422, 'Formato de teléfono: 246-5444-885');
    if (!filter_var($correo, FILTER_VALIDATE_EMAIL))      fallar(422, 'Correo inválido');

    $stmt = $pdo->prepare('UPDATE Administradores SET Telefono = ?, Correo = ? WHERE Id_usuario = ?');
    $stmt->execute([$telefono, $correo, $id_usuario]);
}

// =========================
// ALUMNO
// =========================
function guardarAlumno($pdo, $datos, $id_usuario) {
    $stmt = $pdo->prepare('SELECT Id_alumno, Grupo, Horario FROM Alumnos WHERE Id_usuario = ? FOR UPDATE');
    $stmt->execute([$id_usuario]);
    $alumno = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$alumno) fallar(404, 'No se encontró el alumno');

    // ---------- Datos personales ----------
    $grupo   = strtoupper(texto($datos, 'grupo'));
    $horario = texto($datos, 'horario');

    if ($grupo !== '' && !preg_match('/^[1-9][A-Z]$/', $grupo)) {
        fallar(422, 'El semestre y grupo debe ser un número (1-9) y una letra. Ejemplo: 1A');
    }
    if ($horario !== '') {
        if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d - ([01]\d|2[0-3]):[0-5]\d$/', $horario)) fallar(422, 'Formato de horario inválido');
        [$entrada, $salida] = explode(' - ', $horario);
        if ($salida <= $entrada) fallar(422, 'La hora de salida debe ser posterior a la de entrada');
    }
    if ($grupo !== '' || $horario !== '') {
        $alumno['Grupo']   = $grupo   ?: $alumno['Grupo'];
        $alumno['Horario'] = $horario ?: $alumno['Horario'];
        $stmt = $pdo->prepare('UPDATE Alumnos SET Grupo = ?, Horario = ? WHERE Id_alumno = ?');
        $stmt->execute([$alumno['Grupo'], $alumno['Horario'], $alumno['Id_alumno']]);
    }

    // ---------- Actividad abierta ----------
    $hayActividad = false;
    foreach (['estado', 'area', 'programa', 'fecha_inicio', 'fecha_fin', 'id_empresa'] as $clave) {
        if (texto($datos, $clave) !== '') { $hayActividad = true; break; }
    }
    if (!$hayActividad) return;

    $stmt = $pdo->prepare("
        SELECT Id_alumno_servicio, Estado, Area, Programa, Fecha_inicio, Fecha_fin, Id_empresa
        FROM Actividades_Alumnos
        WHERE Id_alumno = ? AND Estado IN ('PENDIENTE', 'EN_CURSO')
        ORDER BY Fecha_registro DESC, Id_alumno_servicio DESC
        LIMIT 1
        FOR UPDATE
    ");
    $stmt->execute([$alumno['Id_alumno']]);
    $actividad = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$actividad) fallar(409, 'No tienes una actividad abierta. Crea una nueva actividad.');

    $nivelActual = NIVEL_ESTADO[$actividad['Estado']];
    $nuevos      = [];

    $estado = strtoupper(texto($datos, 'estado'));
    if ($estado !== '') {
        if (!isset(NIVEL_ESTADO[$estado]))        fallar(422, 'Estado inválido');
        if (NIVEL_ESTADO[$estado] < $nivelActual) fallar(422, 'No puedes regresar la actividad a un estado anterior');
        $nuevos['Estado'] = $estado;
    }

    foreach (['area' => 'Area', 'programa' => 'Programa'] as $clave => $columna) {
        $v = texto($datos, $clave);
        if ($v === '') continue;
        if (largo($v) > 300) fallar(422, "El campo $columna es demasiado largo (máx. 300)");
        $nuevos[$columna] = $v;
    }

    foreach (['fecha_inicio' => 'Fecha_inicio', 'fecha_fin' => 'Fecha_fin'] as $clave => $columna) {
        $v = texto($datos, $clave);
        if ($v === '') continue;
        $d = DateTime::createFromFormat('Y-m-d', $v);
        if (!$d || $d->format('Y-m-d') !== $v) fallar(422, 'Fecha inválida');
        $nuevos[$columna] = $v;
    }

    $idEmpresa = texto($datos, 'id_empresa');
    if ($idEmpresa !== '' && $idEmpresa !== (string) $actividad['Id_empresa']) {
        if ($nivelActual !== 1)    fallar(409, 'La empresa solo puede cambiarse mientras la actividad está PENDIENTE');
        if (!esEntero($idEmpresa)) fallar(422, 'Empresa inválida');
        $stmt = $pdo->prepare('SELECT 1 FROM Empresas WHERE Id_empresa = ? AND Activo = 1');
        $stmt->execute([$idEmpresa]);
        if (!$stmt->fetchColumn()) fallar(422, 'La empresa seleccionada no existe o no está activa');
        $nuevos['Id_empresa'] = (int) $idEmpresa;
    }

    // Cómo quedaría la actividad con los cambios
    $final  = array_merge($actividad, $nuevos);
    $inicio = substr((string) $final['Fecha_inicio'], 0, 10);
    $fin    = substr((string) $final['Fecha_fin'], 0, 10);
    if ($inicio !== '' && $fin !== '' && $fin <= $inicio) fallar(422, 'La fecha fin debe ser posterior a la fecha inicio');

    if ($final['Estado'] === 'COMPLETADO') {
        $faltantes  = [];
        $requeridos = ['Area' => 'Área', 'Programa' => 'Programa', 'Fecha_inicio' => 'Fecha de inicio',
                       'Fecha_fin' => 'Fecha de fin', 'Id_empresa' => 'Empresa'];
        foreach ($requeridos as $columna => $etiqueta) {
            if (trim((string) $final[$columna]) === '') $faltantes[] = $etiqueta;
        }
        if (trim((string) $alumno['Grupo'])   === '') $faltantes[] = 'Semestre y Grupo';
        if (trim((string) $alumno['Horario']) === '') $faltantes[] = 'Horario';
        if ($faltantes) fallar(422, 'Para completar la actividad faltan: ' . implode(', ', $faltantes));
    }

    if ($nuevos) {
        // Las columnas vienen de listas fijas, no del usuario
        $sets = implode(', ', array_map(function ($c) { return "$c = ?"; }, array_keys($nuevos)));
        $stmt = $pdo->prepare("UPDATE Actividades_Alumnos SET $sets WHERE Id_alumno_servicio = ?");
        $stmt->execute(array_merge(array_values($nuevos), [$actividad['Id_alumno_servicio']]));
    }
}

// =========================
// FOTO DE PERFIL
// =========================
/** Revisa tamaño y contenido real; devuelve la extensión. */
function validarFoto($foto) {
    if ($foto['error'] !== UPLOAD_ERR_OK)  fallar(400, 'No se pudo recibir la foto');
    if ($foto['size'] > 2 * 1024 * 1024)   fallar(422, 'La imagen no debe superar los 2MB');
    $info = @getimagesize($foto['tmp_name']);
    $mime = $info ? $info['mime'] : '';
    if (!isset(EXT_FOTO[$mime]))           fallar(422, 'Solo se permiten imágenes JPG, PNG o WEBP');
    return EXT_FOTO[$mime];
}

/** Guarda en un temporal, actualiza la BD y solo entonces reemplaza la anterior. */
function guardarFoto($pdo, $foto, $ext, $tipo_usuario, $id_usuario) {
    if (!is_dir(CARPETA_FOTO) && !mkdir(CARPETA_FOTO, 0755, true)) fallar(500, 'No se pudo preparar la carpeta de fotos');

    $base     = "$tipo_usuario-$id_usuario";
    $archivo  = "$base.$ext";
    $final    = CARPETA_FOTO . $archivo;
    $temporal = "$final.subiendo";

    if (!move_uploaded_file($foto['tmp_name'], $temporal)) fallar(500, 'Error al guardar la foto en el servidor');

    try {
        $stmt = $pdo->prepare('UPDATE Usuarios SET Profile_picture_path = ? WHERE Id_usuario = ?');
        $stmt->execute([URL_FOTO . $archivo, $id_usuario]);
    } catch (Throwable $e) {
        @unlink($temporal);
        throw $e;
    }

    rename($temporal, $final);
    foreach (EXT_FOTO as $otra) {
        if ($otra !== $ext) @unlink(CARPETA_FOTO . "$base.$otra");
    }
    return URL_FOTO . $archivo . '?v=' . time();   // ?v= evita ver la foto anterior en caché
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

function fallar($codigo, $mensaje) {
    throw new ErrorPeticion($mensaje, $codigo);
}

/** Exige sesión; devuelve [tipo_usuario, id_usuario]. */
function sesion() {
    if (!isset($_COOKIE['Id_tipo_usuario'], $_COOKIE['Id_usuario'])) {
        responder(401, ['success' => false, 'error' => 'No hay sesión activa']);
    }
    return [trim($_COOKIE['Id_tipo_usuario']), trim($_COOKIE['Id_usuario'])];
}

/** Lee los datos JSON: del cuerpo, o del campo "datos" si viene con archivo (FormData). */
function leerDatos() {
    $datos = json_decode(isset($_POST['datos']) ? $_POST['datos'] : file_get_contents('php://input'), true);
    if (!is_array($datos)) responder(400, ['success' => false, 'error' => 'Datos inválidos']);
    return $datos;
}

function texto($datos, $clave) {
    return isset($datos[$clave]) ? trim((string) $datos[$clave]) : '';
}

function largo($t) {
    return function_exists('mb_strlen') ? mb_strlen($t, 'UTF-8') : (int) preg_match_all('/./us', $t);
}

function esEntero($v) {
    return is_string($v) && preg_match('/^\d+$/', $v) === 1;
}