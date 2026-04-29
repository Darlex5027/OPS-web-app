<?php
/*
Daniela Hernandez Hernandez
Fecha de creacion: 8 de abril del 2026  
El archivo obtener_alumnos_pendientes.php es el encargado de consultar la base de datos para 
obtener los alumnos que aún no han sido aprobados. Realiza una conexión a la base de datos y 
ejecuta una consulta que une varias tablas para obtener información completa, como nombre,
matrícula, carrera, fecha de registro y servicio. Solo devuelve aquellos alumnos que están 
inactivos, es decir, pendientes de validación. Finalmente, envía estos datos en formato JSON 
al frontend.*/
// Incluye el archivo de conexión a la base de datos (contiene $dsn, $user, $pass, etc.)
require_once '../php/db.php';

try {
    // Se crea una nueva conexión a la base de datos usando PDO
    $pdo = new PDO($dsn, $user, $pass, $options);
    // Obtiene el id de la carrera desde una cookie del navegador
    $id_carrera = $_COOKIE['Id_carrera'];
    $id_tipo_usuario = $_COOKIE['Id_tipo_usuario'];


    // Se prepara la consulta SQL para obtener datos de los alumnos
    if ($id_tipo_usuario == 1) {
        $resultado_alumnos = $pdo->prepare("SELECT 
        CONCAT (Alumnos.Nombre, ' ', Alumnos.Apellido_P, ' ', Alumnos.Apellido_M) As Nombre_Completo, 
        Carreras.Nombre as Nombre_Carrera, 
        Usuarios.Matricula, 
        Usuarios.Fecha_registro, 
        Actividades.Servicio 
        FROM Usuarios JOIN Alumnos JOIN Actividades_Alumnos JOIN Carreras JOIN Actividades 
        WHERE Actividades_Alumnos.Id_servicio=Actividades.Id_servicio 
        AND Carreras.Id_carrera=Alumnos.Id_carrera AND Usuarios.Id_tipo_usuario=2 
        AND Usuarios.Id_usuario=Alumnos.Id_usuario AND Alumnos.Id_alumno=Actividades_Alumnos.Id_alumno 
        AND Usuarios.Activo=0 AND Carreras.Id_carrera=?");
        $resultado_alumnos->execute([$id_carrera]);
        // Convierte los resultados en formato JSON y los envía al frontend

        $resultado_coordinadores = $pdo->prepare("SELECT 
        CONCAT (Administradores.Nombre, ' ', Administradores.Apellido_P, ' ', Administradores.Apellido_M) As Nombre_Completo, 
        Carreras.Nombre As Nombre_Carrera, 
        Usuarios.Matricula, 
        Usuarios.Fecha_registro, 
        Administradores.Telefono, 
        Administradores.Correo 
        FROM Usuarios, Administradores, Carreras 
        WHERE Usuarios.Id_usuario = Administradores.Id_usuario 
        AND Administradores.Id_carrera = Carreras.Id_carrera 
        AND Usuarios.Activo = 0 AND Usuarios.Id_tipo_usuario = 3");
        $resultado_coordinadores->execute([]);
        // Convierte los resultados en formato JSON y los envía al frontend
        echo json_encode([
            'alumnos' => $resultado_alumnos->fetchAll(),
            'coordinadores' => $resultado_coordinadores->fetchAll(),
        ]);
    } else if ($id_tipo_usuario == 3) {
        $resultado_alumnos = $pdo->prepare("SELECT 
        CONCAT (Alumnos.Nombre, ' ', Alumnos.Apellido_P, ' ', Alumnos.Apellido_M) As Nombre_Completo, 
        Carreras.Nombre as Nombre_Carrera, 
        Usuarios.Matricula, 
        Usuarios.Fecha_registro, 
        Actividades.Servicio 
        FROM Usuarios JOIN Alumnos JOIN Actividades_Alumnos JOIN Carreras JOIN Actividades 
        WHERE Actividades_Alumnos.Id_servicio=Actividades.Id_servicio 
        AND Carreras.Id_carrera=Alumnos.Id_carrera AND Usuarios.Id_tipo_usuario=2 
        AND Usuarios.Id_usuario=Alumnos.Id_usuario AND Alumnos.Id_alumno=Actividades_Alumnos.Id_alumno 
        AND Usuarios.Activo=0 AND Carreras.Id_carrera=?");
        $resultado_alumnos->execute([$id_carrera]);
        // Convierte los resultados en formato JSON y los envía al frontend
        echo json_encode([
            'alumnos' => $resultado_alumnos->fetchAll(),
            'coordinadores' => [], // ← vacío porque el coordinador no ve otros coordinadores
            'tipo_usuario' => $id_tipo_usuario
        ]);
    } else if ($id_tipo_usuario == 2) {
        echo json_encode([
            'tipo_usuario' => $id_tipo_usuario
        ]);
    }
} catch (\PDOException $e) {
    // Si ocurre un error en la conexión o consulta, se envía código HTTP 500
    http_response_code(500);
    // Se devuelve un mensaje de error en formato JSON
    echo json_encode(['error' => "Error de conexión: " . $e->getMessage()]);
}
