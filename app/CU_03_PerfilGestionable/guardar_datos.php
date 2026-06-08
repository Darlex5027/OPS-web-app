<?php
/*
    Archivo     : guardar_datos.php
    Módulo      : CU_03_PerfilGestionable
    Autor       : Viridiana Tonix Zarate
    Fecha       : 2026-05-24
    Descripción : Guarda y actualiza los datos del perfil del usuario (administrador o alumno).
                  Valida la sesión activa mediante cookies, obtiene el tipo de usuario y el ID
                  del usuario, y según el tipo de solicitud (PERFIL, ACTIVIDADES, ACTIVIDADES_2,
                  PRACTICAS), realiza las operaciones correspondientes en la base de datos.
                  Incluye validaciones condicionales según el estado de las actividades
                  (PENDIENTE, EN_CURSO, COMPLETADO) para garantizar integridad de datos.
                  Devuelve respuestas en formato JSON indicando éxito o error de las operaciones.
*/

require_once '../php/db.php';

// Se establece el tipo de contenido de la respuesta como JSON
header('Content-Type: application/json');

// Se valida que existan las cookies necesarias para confirmar que hay una sesión activa
if (!isset($_COOKIE['Id_tipo_usuario']) || !isset($_COOKIE['Id_usuario'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'No hay sesión activa']);
    exit;
}

// Se obtienen y limpian los valores de las cookies
$tipo_usuario = trim($_COOKIE['Id_tipo_usuario']);
$id_usuario   = trim($_COOKIE['Id_usuario']);

// Se decodifica el cuerpo de la solicitud JSON para obtener los datos enviados
$datos = json_decode(file_get_contents("php://input"), true);

// Se valida que los datos recibidos sean válidos
if (!$datos) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Datos inválidos']);
    exit;
}

// Se obtiene el tipo de operación (PERFIL, ACTIVIDADES, ACTIVIDADES_2 o PRACTICAS)
$tipo = $datos['tipo'] ?? '';

// Se intenta establecer una conexión a la base de datos utilizando PDO
try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (Exception $error_pdo) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error conectando a la base de datos']);
    exit;
}

// ================================
// FUNCIÓN AUXILIAR — Actualiza o inserta un registro en Actividades_Alumnos
// ================================

// Busca si ya existe un registro para el alumno y servicio indicados.
// Si existe, lo actualiza con los campos provistos; si no, lo inserta.
function guardarActividad(PDO $pdo, int $id_alumno, int $id_servicio, array $datos): void {
    $stmtCheck = $pdo->prepare(
        "SELECT Id_alumno_servicio FROM Actividades_Alumnos
          WHERE Id_alumno = :id_alumno AND Id_servicio = :id_servicio
          LIMIT 1"
    );
    $stmtCheck->execute([':id_alumno' => $id_alumno, ':id_servicio' => $id_servicio]);
    $registro = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    if ($registro) {
        // ── UPDATE: actualiza los campos que vienen en la solicitud ──
        $campos = [];
        $params = [':id_alumno_servicio' => $registro['Id_alumno_servicio']];

        if (!empty($datos['estado']))       { $campos[] = "Estado = :estado";             $params[':estado']       = $datos['estado']; }
        if (!empty($datos['area']))         { $campos[] = "Area = :area";                 $params[':area']         = $datos['area']; }
        if (!empty($datos['programa']))     { $campos[] = "Programa = :programa";         $params[':programa']     = $datos['programa']; }
        if (!empty($datos['periodo_tipo'])) { $campos[] = "periodo_tipo = :periodo_tipo"; $params[':periodo_tipo'] = $datos['periodo_tipo']; }
        if (!empty($datos['periodo_año']))  { $campos[] = "periodo_año = :periodo_ano";   $params[':periodo_ano']  = $datos['periodo_año']; }
        if (!empty($datos['fecha_inicio'])) { $campos[] = "Fecha_inicio = :fecha_inicio"; $params[':fecha_inicio'] = $datos['fecha_inicio']; }
        if (!empty($datos['fecha_fin']))    { $campos[] = "Fecha_fin = :fecha_fin";       $params[':fecha_fin']    = $datos['fecha_fin']; }
        if (!empty($datos['id_empresa']))   { $campos[] = "Id_empresa = :id_empresa";     $params[':id_empresa']   = $datos['id_empresa']; }

        if (!empty($campos)) {
            $sql  = "UPDATE Actividades_Alumnos SET "
                  . implode(", ", $campos)
                  . " WHERE Id_alumno_servicio = :id_alumno_servicio";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
        }

    } else {
        // ── INSERT: crea un nuevo registro de actividad ──
        $sql  = "INSERT INTO Actividades_Alumnos
                    (Id_alumno, Id_servicio, Id_empresa, Area, Programa,
                     Estado, periodo_tipo, periodo_año,
                     Fecha_inicio, Fecha_fin)
                 VALUES
                    (:id_alumno, :id_servicio, :id_empresa, :area, :programa,
                     :estado, :periodo_tipo, :periodo_ano,
                     :fecha_inicio, :fecha_fin)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':id_alumno'    => $id_alumno,
            ':id_servicio'  => $id_servicio,
            ':id_empresa'   => !empty($datos['id_empresa'])   ? $datos['id_empresa']   : null,
            ':area'         => !empty($datos['area'])         ? $datos['area']         : null,
            ':programa'     => !empty($datos['programa'])     ? $datos['programa']     : null,
            ':estado'       => !empty($datos['estado'])       ? $datos['estado']       : 'PENDIENTE',
            ':periodo_tipo' => !empty($datos['periodo_tipo']) ? $datos['periodo_tipo'] : 'primavera',
            ':periodo_ano'  => !empty($datos['periodo_año'])  ? $datos['periodo_año']  : date('Y'),
            ':fecha_inicio' => !empty($datos['fecha_inicio']) ? $datos['fecha_inicio'] : null,
            ':fecha_fin'    => !empty($datos['fecha_fin'])    ? $datos['fecha_fin']    : null,
        ]);
    }
}

// Se verifica el tipo de usuario para ejecutar las operaciones correspondientes
try {

    // ========================= ADMIN / COORDINADOR =========================
    if ($tipo_usuario == "1" || $tipo_usuario == "3") {
        $campos = [];
        $params = [':id_usuario' => $id_usuario];

        if (!empty($datos['telefono_administrador'])) {
            $campos[] = "Telefono = :telefono";
            $params[':telefono'] = $datos['telefono_administrador'];
        }
        if (!empty($datos['correo_administrador'])) {
            $campos[] = "Correo = :correo";
            $params[':correo'] = $datos['correo_administrador'];
        }

        if (!empty($campos)) {
            $sql  = "UPDATE Administradores SET " . implode(", ", $campos) . " WHERE Id_usuario = :id_usuario";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
        }

        echo json_encode(['success' => true]);

    // ========================= ALUMNO =========================
    } elseif ($tipo_usuario == "2") {

        // Se obtiene el ID del alumno a partir del ID del usuario
        $stmtId = $pdo->prepare("SELECT Id_alumno FROM Alumnos WHERE Id_usuario = :id_usuario");
        $stmtId->execute([':id_usuario' => $id_usuario]);
        $alumno = $stmtId->fetch(PDO::FETCH_ASSOC);

        if (!$alumno) {
            echo json_encode(['success' => false, 'error' => 'Alumno no encontrado']);
            exit;
        }

        $id_alumno = $alumno['Id_alumno'];

        // ── PERFIL: Actualiza tabla Alumnos (grupo, horario) ──
        if ($tipo === 'PERFIL') {
            $campos = [];
            $params = [':id_alumno' => $id_alumno];

            if (!empty($datos['grupo'])) {
                $campos[] = "Grupo = :grupo";
                $params[':grupo'] = strtoupper($datos['grupo']);
            }
            if (!empty($datos['horario'])) {
                $campos[] = "Horario = :horario";
                $params[':horario'] = $datos['horario'];
            }

            if (!empty($campos)) {
                $sql  = "UPDATE Alumnos SET " . implode(", ", $campos)
                      . ", Fecha_modificacion = NOW()"
                      . " WHERE Id_alumno = :id_alumno";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
            }

            echo json_encode(['success' => true]);

        // ── ACTIVIDADES: Servicio Social (Id_servicio = 1) ──
        } elseif ($tipo === 'ACTIVIDADES') {
            guardarActividad($pdo, $id_alumno, 1, $datos);
            echo json_encode(['success' => true]);

        // ── ACTIVIDADES_2: Segunda inscripción (Id_servicio = 3) ──
        } elseif ($tipo === 'ACTIVIDADES_2') {
            guardarActividad($pdo, $id_alumno, 3, $datos);
            echo json_encode(['success' => true]);

        // ── PRACTICAS: Prácticas Profesionales (Id_servicio = 2) ──
        } elseif ($tipo === 'PRACTICAS') {
            $estado = $datos['estado'] ?? '';

            // Se valida que el estado sea obligatorio
            if (empty($estado)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'El Estado es obligatorio']);
                exit;
            }

            // EN_CURSO requiere Área, Programa y Fecha Inicio
            if ($estado === 'EN_CURSO') {
                if (empty($datos['area'])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'En EN_CURSO, el Área es obligatoria']);
                    exit;
                }
                if (empty($datos['programa'])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'En EN_CURSO, el Programa es obligatorio']);
                    exit;
                }
                if (empty($datos['fecha_inicio'])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'En EN_CURSO, la Fecha Inicio es obligatoria']);
                    exit;
                }
            }

            // COMPLETADO requiere Área, Programa y ambas fechas
            if ($estado === 'COMPLETADO') {
                if (empty($datos['area'])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Para COMPLETADO, el Área es obligatoria']);
                    exit;
                }
                if (empty($datos['programa'])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Para COMPLETADO, el Programa es obligatorio']);
                    exit;
                }
                if (empty($datos['fecha_inicio'])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Para COMPLETADO, la Fecha Inicio es obligatoria']);
                    exit;
                }
                if (empty($datos['fecha_fin'])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Para COMPLETADO, la Fecha Fin es obligatoria']);
                    exit;
                }
            }

            guardarActividad($pdo, $id_alumno, 2, $datos);
            echo json_encode(['success' => true]);

        } else {
            echo json_encode(['success' => false, 'error' => 'Tipo de operación no reconocido']);
        }

    } else {
        echo json_encode(['success' => false, 'error' => 'Tipo de usuario no autorizado']);
    }

} catch (Exception $error_consulta) {
    // Se intercepta el error real y se devuelve un mensaje genérico al cliente
    $mensaje_error = $error_consulta->getMessage();

    if (str_contains($mensaje_error, 'Duplicate entry')) {
        // El registro ya existe; no es un error crítico, se responde con éxito
        // ya que guardarActividad usa UPDATE cuando el registro existe,
        // pero por si acaso la restricción unique dispara en otro contexto
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'Este registro ya existe para el alumno']);
    } elseif (str_contains($mensaje_error, 'foreign key')) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'La empresa o servicio seleccionado no es válido']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Ocurrió un error al guardar. Intenta de nuevo']);
    }
}
?>