<?php
/**
 * ================================
 * Archivo : guardar_datos.php
 * Autor   : Viridiana Tonix Zarate
 * Fecha   : 2026-05-24
 * Desc.   : Guarda cambios en los
 *           datos del perfil del
 *           usuario (admin o alumno).
 *
 * Cambios:
 *  - Antes el UPDATE de Actividades_Alumnos usaba solo Id_alumno, así que
 *    modificaba TODAS las actividades del alumno, incluidas las COMPLETADAS.
 *    Ahora solo toca la actividad abierta (PENDIENTE / EN_CURSO), por su
 *    llave Id_alumno_servicio.
 *  - Una actividad COMPLETADA o CANCELADA ya no se puede modificar desde aquí.
 *  - El estado solo avanza: PENDIENTE → EN_CURSO → COMPLETADO.
 *  - La empresa solo se cambia mientras la actividad está PENDIENTE.
 *  - Para marcar COMPLETADO se valida en el servidor que no falte nada
 *    (antes solo se validaba en JS y se podía saltar).
 *  - Validación de grupo, horario, fechas, correo y teléfono en servidor.
 *  - Todo se guarda en una transacción.
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

function fechaValida($fecha) {
    $d = DateTime::createFromFormat('Y-m-d', $fecha);
    return $d && $d->format('Y-m-d') === $fecha;
}

if (!isset($_COOKIE['Id_tipo_usuario'], $_COOKIE['Id_usuario'])) {
    responder(401, ['success' => false, 'error' => 'No hay sesión activa']);
}

$tipo_usuario = trim($_COOKIE['Id_tipo_usuario']);
$id_usuario   = trim($_COOKIE['Id_usuario']);
$datos        = json_decode(file_get_contents('php://input'), true);

if (!is_array($datos)) {
    responder(400, ['success' => false, 'error' => 'Datos inválidos']);
}

$valor = function ($clave) use ($datos) {
    return isset($datos[$clave]) ? trim((string) $datos[$clave]) : '';
};

const NIVEL_ESTADO = ['PENDIENTE' => 1, 'EN_CURSO' => 2, 'COMPLETADO' => 3];

$pdo = null;

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    // ========================= ADMIN / COORDINADOR =========================
    if ($tipo_usuario === '1' || $tipo_usuario === '3') {
        $campos     = [];
        $parametros = [':id_usuario' => $id_usuario];

        $telefono = $valor('telefono_administrador');
        if ($telefono !== '') {
            if (!preg_match('/^\d{3}-\d{4}-\d{3}$/', $telefono)) {
                fallar(422, 'Formato de teléfono inválido. Ejemplo: 246-5444-885');
            }
            $campos[]                 = 'Telefono = :telefono';
            $parametros[':telefono']  = $telefono;
        }

        $correo = $valor('correo_administrador');
        if ($correo !== '') {
            if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
                fallar(422, 'Correo inválido');
            }
            $campos[]               = 'Correo = :correo';
            $parametros[':correo']  = $correo;
        }

        if ($campos) {
            $stmt = $pdo->prepare('UPDATE Administradores SET ' . implode(', ', $campos) . ' WHERE Id_usuario = :id_usuario');
            $stmt->execute($parametros);
        }

        responder(200, ['success' => true]);
    }

    if ($tipo_usuario !== '2') {
        fallar(403, 'Tipo de usuario no válido');
    }

    // ========================= ALUMNO =========================
    $pdo->beginTransaction();

    $stmt = $pdo->prepare('SELECT Id_alumno, Grupo, Horario FROM Alumnos WHERE Id_usuario = ? FOR UPDATE');
    $stmt->execute([$id_usuario]);
    $alumno = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$alumno) {
        fallar(404, 'No se encontró el alumno');
    }

    // ---------- PASO 1: datos personales (tabla Alumnos) ----------
    $camposAlumno     = [];
    $parametrosAlumno = [':id_alumno' => $alumno['Id_alumno']];

    $grupo = strtoupper($valor('grupo'));
    if ($grupo !== '') {
        if (!preg_match('/^[1-9][A-Z]$/', $grupo)) {
            fallar(422, 'El semestre y grupo debe tener el formato: número (1-9) seguido de una letra. Ejemplo: 1A, 2B');
        }
        $camposAlumno[]              = 'Grupo = :grupo';
        $parametrosAlumno[':grupo']  = $grupo;
        $alumno['Grupo']             = $grupo;
    }

    $horario = $valor('horario');
    if ($horario !== '') {
        if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d - ([01]\d|2[0-3]):[0-5]\d$/', $horario)) {
            fallar(422, 'Formato de horario inválido');
        }
        [$entrada, $salida] = explode(' - ', $horario);
        if ($salida <= $entrada) {
            fallar(422, 'La hora de salida debe ser posterior a la de entrada');
        }
        $camposAlumno[]                = 'Horario = :horario';
        $parametrosAlumno[':horario']  = $horario;
        $alumno['Horario']             = $horario;
    }

    if ($camposAlumno) {
        $stmt = $pdo->prepare('UPDATE Alumnos SET ' . implode(', ', $camposAlumno) . ' WHERE Id_alumno = :id_alumno');
        $stmt->execute($parametrosAlumno);
    }

    // ---------- PASO 2: actividad abierta (tabla Actividades_Alumnos) ----------
    $clavesActividad = ['estado', 'area', 'programa', 'fecha_inicio', 'fecha_fin', 'id_empresa'];
    $hayDatosActividad = false;
    foreach ($clavesActividad as $clave) {
        if ($valor($clave) !== '') { $hayDatosActividad = true; break; }
    }

    if ($hayDatosActividad) {
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

        if (!$actividad) {
            fallar(409, 'No tienes una actividad abierta. Si la anterior ya está completada o cancelada, crea una nueva actividad.');
        }

        $idActividad = $actividad['Id_alumno_servicio'];
        unset($actividad['Id_alumno_servicio']);
        $nivelActual = NIVEL_ESTADO[$actividad['Estado']] ?? 1;
        $nuevos      = [];

        $estado = strtoupper($valor('estado'));
        if ($estado !== '') {
            // CANCELADO no está en la lista: el alumno no puede cancelar desde aquí
            if (!isset(NIVEL_ESTADO[$estado])) {
                fallar(422, 'Estado inválido');
            }
            if (NIVEL_ESTADO[$estado] < $nivelActual) {
                fallar(422, 'No puedes regresar la actividad a un estado anterior');
            }
            $nuevos['Estado'] = $estado;
        }

        foreach (['area' => 'Area', 'programa' => 'Programa'] as $clave => $columna) {
            $v = $valor($clave);
            if ($v === '') continue;
            if (largo($v) > 300) fallar(422, "El campo $columna es demasiado largo (máx. 300)");
            $nuevos[$columna] = $v;
        }

        foreach (['fecha_inicio' => 'Fecha_inicio', 'fecha_fin' => 'Fecha_fin'] as $clave => $columna) {
            $v = $valor($clave);
            if ($v === '') continue;
            if (!fechaValida($v)) fallar(422, 'Fecha inválida');
            $nuevos[$columna] = $v;
        }

        $idEmpresa = $valor('id_empresa');
        if ($idEmpresa !== '' && $idEmpresa !== (string) $actividad['Id_empresa']) {
            if ($nivelActual !== 1) {
                fallar(409, 'La empresa solo puede cambiarse mientras la actividad está PENDIENTE');
            }
            if (!esEntero($idEmpresa)) {
                fallar(422, 'Empresa inválida');
            }
            $stmt = $pdo->prepare('SELECT 1 FROM Empresas WHERE Id_empresa = ? AND Activo = 1');
            $stmt->execute([$idEmpresa]);
            if (!$stmt->fetchColumn()) {
                fallar(422, 'La empresa seleccionada no existe o no está activa');
            }
            $nuevos['Id_empresa'] = (int) $idEmpresa;
        }

        // No_expediente NO se edita aquí: solo se captura al crear la actividad
        // (crear_actividad.php). Si llega en la petición, se ignora.

        // Cómo quedaría la actividad después del cambio
        $final  = array_merge($actividad, $nuevos);
        $inicio = substr((string) $final['Fecha_inicio'], 0, 10);
        $fin    = substr((string) $final['Fecha_fin'], 0, 10);
        if ($inicio !== '' && $fin !== '' && $fin <= $inicio) {
            fallar(422, 'La fecha fin debe ser posterior a la fecha inicio');
        }

        if (($final['Estado'] ?? '') === 'COMPLETADO') {
            $requeridos = [
                'Area'         => 'Área',
                'Programa'     => 'Programa',
                'Fecha_inicio' => 'Fecha de inicio',
                'Fecha_fin'    => 'Fecha de fin',
                'Id_empresa'   => 'Empresa',
            ];
            $faltantes = [];
            foreach ($requeridos as $columna => $etiqueta) {
                if (trim((string) ($final[$columna] ?? '')) === '') $faltantes[] = $etiqueta;
            }
            if (trim((string) $alumno['Grupo'])   === '') $faltantes[] = 'Semestre y Grupo';
            if (trim((string) $alumno['Horario']) === '') $faltantes[] = 'Horario';

            if ($faltantes) {
                fallar(422, 'Para completar la actividad faltan: ' . implode(', ', $faltantes));
            }
        }

        if ($nuevos) {
            $sets       = [];
            $parametros = [':id_actividad' => $idActividad];
            foreach ($nuevos as $columna => $v) {   // columnas de lista blanca, no del usuario
                $sets[]                 = "$columna = :$columna";
                $parametros[":$columna"] = $v;
            }
            // Fecha_modificacion se actualiza sola (ON UPDATE current_timestamp)

            $stmt = $pdo->prepare('
                UPDATE Actividades_Alumnos SET ' . implode(', ', $sets) . "
                WHERE Id_alumno_servicio = :id_actividad
                  AND Estado IN ('PENDIENTE', 'EN_CURSO')
            ");
            $stmt->execute($parametros);
        }
    }

    $pdo->commit();
    responder(200, ['success' => true]);

} catch (ErrorPeticion $e) {
    if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
    responder($e->getCode(), ['success' => false, 'error' => $e->getMessage()]);

} catch (Throwable $e) {
    if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
    responderExcepcion($e, 'guardar_datos.php');
}