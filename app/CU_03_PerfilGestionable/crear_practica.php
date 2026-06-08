<?php
// ================================
// Archivo : crear_practica.php
// Módulo  : CU_03_PerfilGestionable
// Desc.   : Crea una nueva actividad de Prácticas Profesionales
//           para el alumno logueado. Si ya existe un registro,
//           devuelve el id existente sin intentar insertarlo de nuevo.
// ================================

require_once '../php/db.php';

header('Content-Type: application/json');

// Valida que exista una sesión activa
if (!isset($_COOKIE['Id_usuario'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'No hay sesión activa']);
    exit;
}

$id_usuario = trim($_COOKIE['Id_usuario']);
$datos      = json_decode(file_get_contents("php://input"), true);

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    // Obtiene el Id_alumno a partir del Id_usuario de la sesión
    $stmtAlumno = $pdo->prepare(
        "SELECT Id_alumno FROM Alumnos WHERE Id_usuario = :id_usuario"
    );
    $stmtAlumno->execute([':id_usuario' => $id_usuario]);
    $alumno = $stmtAlumno->fetch(PDO::FETCH_ASSOC);

    if (!$alumno) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Alumno no encontrado']);
        exit;
    }

    $id_alumno = $alumno['Id_alumno'];

    // Verifica si ya existe un registro de Prácticas Profesionales para este alumno
    // para evitar el error de llave duplicada unique_alumno_servicio
    $stmtCheck = $pdo->prepare(
        "SELECT Id_alumno_servicio FROM Actividades_Alumnos
          WHERE Id_alumno = :id_alumno AND Id_servicio = 2
          LIMIT 1"
    );
    $stmtCheck->execute([':id_alumno' => $id_alumno]);
    $registroExistente = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    // Si ya existe el registro, devuelve el id sin insertar
    if ($registroExistente) {
        echo json_encode([
            'success'      => true,
            'id_actividad' => $registroExistente['Id_alumno_servicio']
        ]);
        exit;
    }

    // Si no existe, inserta el nuevo registro de Prácticas Profesionales
    $stmtInsert = $pdo->prepare("
        INSERT INTO Actividades_Alumnos
            (Id_alumno, Id_servicio, Estado, periodo_tipo, periodo_año, Fecha_registro)
        VALUES
            (:id_alumno, 2, 'PENDIENTE', 'primavera', :periodo_ano, NOW())
    ");
    $stmtInsert->execute([
        ':id_alumno'   => $id_alumno,
        ':periodo_ano' => date('Y')
    ]);

    echo json_encode([
        'success'      => true,
        'id_actividad' => $pdo->lastInsertId()
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error al procesar la solicitud']);
}
?>