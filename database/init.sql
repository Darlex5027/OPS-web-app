-- 1. Crear la base de datos
DROP DATABASE IF EXISTS DB_Sistema_Academico;
CREATE DATABASE DB_Sistema_Academico;
USE DB_Sistema_Academico;

-- =====================================================
-- TABLAS BASE (CATÁLOGOS)
-- =====================================================

-- TABLA CARRERA 
-- Aquí se definen las carreras a las que puede pertenecer un alumno
CREATE TABLE Carrera (
    Id_carrera INT AUTO_INCREMENT PRIMARY KEY,
    Nombre_carrera VARCHAR(100) NOT NULL UNIQUE,
    Activo BOOLEAN DEFAULT TRUE,
    Fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- TABLA SERVICIO
-- Los servicios que puede presentar un alumno, ejemplo: Servicio Social, Practicas Profesionales.
CREATE TABLE Servicio (
    Id_servicio INT AUTO_INCREMENT PRIMARY KEY,
    Servicio VARCHAR(100) NOT NULL UNIQUE,
    Descripcion VARCHAR(255),
    Activo BOOLEAN DEFAULT TRUE
);

-- =====================================================
-- SISTEMA DE PERMISOS (RBAC)
-- =====================================================

-- TABLA PERMISO
-- Se escribe un permiso (cómo si fuera una tarjeta de acceso) y se describe el permiso
-- Se le da un nombre, una descripción, y un modulo al que pertenece.
CREATE TABLE Permiso (
    Id_permiso INT AUTO_INCREMENT PRIMARY KEY,
    Nombre_permiso VARCHAR(100) NOT NULL UNIQUE,
    Descripcion VARCHAR(255),
    Modulo VARCHAR(50), -- 'USUARIOS', 'ENCUESTAS', 'VACANTES', etc.
    Fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- TABLA TIPO_USUARIO (ROLES)
CREATE TABLE TipoUsuario (
    Id_tipo_usuario INT AUTO_INCREMENT PRIMARY KEY,
    Nombre_tipo_usuario VARCHAR(50) NOT NULL UNIQUE,
    Descripcion VARCHAR(255),
    Activo BOOLEAN DEFAULT TRUE,
    Fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- TABLA TIPOUSUARIO_PERMISO (RELACIÓN ROL-PERMISO)

CREATE TABLE TipoUsuario_Permiso (
    Id_tipo_usuario INT,
    Id_permiso INT,
    Fecha_asignacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (Id_tipo_usuario, Id_permiso),
    FOREIGN KEY (Id_tipo_usuario) REFERENCES TipoUsuario(Id_tipo_usuario) ON DELETE CASCADE,
    FOREIGN KEY (Id_permiso) REFERENCES Permiso(Id_permiso) ON DELETE CASCADE
);

-- =====================================================
-- TABLA USUARIO (BASE PARA TODOS LOS USUARIOS DEL SISTEMA)
-- =====================================================

CREATE TABLE Usuario (
    Id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    Matricula VARCHAR(100) NOT NULL UNIQUE,
    Contrasena VARCHAR(200) NOT NULL,
    Id_tipo_usuario INT NOT NULL,
    Activo BOOLEAN DEFAULT TRUE,
    Fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    Fecha_ultimo_acceso DATETIME,
    Intentos_fallidos INT DEFAULT 0,
    Bloqueado BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (Id_tipo_usuario) REFERENCES TipoUsuario(Id_tipo_usuario)
);

-- Índices para búsquedas frecuentes
CREATE INDEX idx_usuario_matricula ON Usuario(Matricula);
CREATE INDEX idx_usuario_activo ON Usuario(Activo);

-- =====================================================
-- TABLA ADMIN (PERSONAL ADMINISTRATIVO/DOCENTE)
-- =====================================================

CREATE TABLE Admin (
    Id_admin INT AUTO_INCREMENT PRIMARY KEY,
    Id_usuario INT NOT NULL UNIQUE, -- UNIQUE garantiza relación 1:1
    Nombre VARCHAR(100) NOT NULL,
    Apellido_P VARCHAR(100) NOT NULL,
    Apellido_M VARCHAR(100),
    Id_carrera INT, -- Departamento/área a cargo
    Telefono VARCHAR(20),
    Correo VARCHAR(100) UNIQUE,
    Activo BOOLEAN DEFAULT TRUE,
    Fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    Fecha_modificacion DATETIME ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (Id_usuario) REFERENCES Usuario(Id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (Id_carrera) REFERENCES Carrera(Id_carrera) ON DELETE SET NULL
);

-- =====================================================
-- TABLA ALUMNOS
-- =====================================================

CREATE TABLE Alumnos (
    Id_alumno INT AUTO_INCREMENT PRIMARY KEY,
    Id_usuario INT NOT NULL UNIQUE, -- UNIQUE garantiza relación 1:1
    Nombre VARCHAR(100) NOT NULL,
    Apellido_P VARCHAR(100) NOT NULL,
    Apellido_M VARCHAR(100),
    Id_carrera INT NOT NULL,
    No_Expediente VARCHAR(50) UNIQUE,
    Area_o_programa VARCHAR(255),
    Observaciones TEXT,
    Horario VARCHAR(200),
    Organizacion VARCHAR(100),
    Activo BOOLEAN DEFAULT TRUE,
    Fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    Fecha_modificacion DATETIME ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (Id_usuario) REFERENCES Usuario(Id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (Id_carrera) REFERENCES Carrera(Id_carrera)
);

-- Índices para Alumnos
CREATE INDEX idx_alumno_nombre ON Alumnos(Apellido_P, Apellido_M, Nombre);
CREATE INDEX idx_alumno_expediente ON Alumnos(No_Expediente);
CREATE INDEX idx_alumno_activo ON Alumnos(Activo);

-- =====================================================
-- TABLA CONTACTO_ALUMNO (MÚLTIPLES FORMAS DE CONTACTO)
-- =====================================================

CREATE TABLE Contacto_Alumno (
    Id_contacto INT AUTO_INCREMENT PRIMARY KEY,
    Id_alumno INT NOT NULL,
    Tipo ENUM('EMAIL', 'TELEFONO_CASA', 'TELEFONO_CELULAR', 'TELEFONO_TRABAJO', 'OTRO') NOT NULL,
    Valor VARCHAR(100) NOT NULL,
    Principal BOOLEAN DEFAULT FALSE,
    Verificado BOOLEAN DEFAULT FALSE,
    Fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (Id_alumno) REFERENCES Alumnos(Id_alumno) ON DELETE CASCADE,
    UNIQUE KEY unique_contacto_alumno (Id_alumno, Tipo, Valor)
);

-- =====================================================
-- TABLA EMPRESA
-- =====================================================

CREATE TABLE Empresa (
    Id_empresa INT AUTO_INCREMENT PRIMARY KEY,
    Nombre VARCHAR(200) NOT NULL UNIQUE,
    Descripcion TEXT,
    Razon_social VARCHAR(200),
    RFC VARCHAR(13),
    Direccion TEXT,
    Sitio_web VARCHAR(255),
    Activo BOOLEAN DEFAULT TRUE,
    Fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    Fecha_modificacion DATETIME ON UPDATE CURRENT_TIMESTAMP
);


CREATE INDEX idx_empresa_nombre ON Empresa(Nombre);

-- =====================================================
-- TABLA ALUMNO_SERVICIO (HISTÓRICO DE SERVICIOS DEL ALUMNO)
-- =====================================================


CREATE TABLE Alumno_Servicio (
    Id_alumno_servicio INT AUTO_INCREMENT PRIMARY KEY,
    Id_alumno INT NOT NULL,
    Id_servicio INT NOT NULL,
    Id_empresa INT NOT NULL,
    Estado ENUM('PENDIENTE', 'EN_CURSO', 'COMPLETADO', 'CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
    Fecha_inicio DATE,
    Fecha_fin DATE,
    Horas_totales INT, -- Horas requeridas para el servicio
    Horas_completadas INT DEFAULT 0,
    Documento_liberacion VARCHAR(255), -- Ruta del documento PDF
    Observaciones TEXT,
    Fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    Fecha_modificacion DATETIME ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (Id_alumno) REFERENCES Alumnos(Id_alumno) ON DELETE CASCADE,
    FOREIGN KEY (Id_servicio) REFERENCES Servicio(Id_servicio),
    FOREIGN KEY (Id_empresa) REFERENCES Empresa(Id_empresa),
    UNIQUE KEY unique_alumno_servicio (Id_alumno, Id_servicio),
    
    -- Restricción: Fecha fin no puede ser menor a fecha inicio
    CONSTRAINT chk_fechas_servicio CHECK (Fecha_fin IS NULL OR Fecha_fin >= Fecha_inicio)
);

-- Índices para consultas frecuentes
CREATE INDEX idx_alumno_servicio_estado ON Alumno_Servicio(Estado);
CREATE INDEX idx_alumno_servicio_fechas ON Alumno_Servicio(Fecha_inicio, Fecha_fin);

-- =====================================================
-- TABLA VACANTES (MEJORADA)
-- =====================================================

CREATE TABLE Vacantes (
    Id_vacante INT AUTO_INCREMENT PRIMARY KEY,
    Id_empresa INT NOT NULL,
    Titulo VARCHAR(200) NOT NULL,
    Descripcion TEXT NOT NULL,
    Requisitos TEXT,
    Id_carrera INT, -- Carrera específica requerida (NULL = cualquier carrera)
    Id_servicio INT NOT NULL, -- Tipo de servicio (prácticas o servicio social)
    Numero_vacantes INT DEFAULT 1,
    Activa BOOLEAN DEFAULT TRUE,
    Fecha_publicacion DATE NOT NULL,
    Fecha_expiracion DATE,
    Contacto_nombre VARCHAR(100),
    Contacto_email VARCHAR(100),
    Contacto_telefono VARCHAR(20),
    Fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    Fecha_modificacion DATETIME ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (Id_empresa) REFERENCES Empresa(Id_empresa),
    FOREIGN KEY (Id_carrera) REFERENCES Carrera(Id_carrera) ON DELETE SET NULL,
    FOREIGN KEY (Id_servicio) REFERENCES Servicio(Id_servicio),
    
    -- Restricción: Fecha expiración no puede ser menor a fecha publicación
    CONSTRAINT chk_fechas_vacante CHECK (Fecha_expiracion IS NULL OR Fecha_expiracion >= Fecha_publicacion)
);

-- Índices para consultas de vacantes activas
CREATE INDEX idx_vacantes_activas ON Vacantes(Activa, Fecha_expiracion);
CREATE INDEX idx_vacantes_servicio ON Vacantes(Id_servicio);
CREATE INDEX idx_vacantes_carrera ON Vacantes(Id_carrera);

-- =====================================================
-- TABLAS DE ENCUESTAS
-- =====================================================

CREATE TABLE Encuesta (
    Id_encuesta INT AUTO_INCREMENT PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL UNIQUE,
    Descripcion TEXT,
    Id_servicio INT NOT NULL,
    Activo BOOLEAN DEFAULT TRUE,
    Fecha_inicio DATE,
    Fecha_fin DATE,
    Fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    Fecha_modificacion DATETIME ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (Id_servicio) REFERENCES Servicio(Id_servicio)
);

CREATE TABLE Pregunta (
    Id_pregunta INT AUTO_INCREMENT PRIMARY KEY,
    Id_encuesta INT NOT NULL,
    Pregunta VARCHAR(500) NOT NULL,
    Tipo_respuesta ENUM('ESCALA_1_5', 'ESCALA_1_10', 'TEXTO', 'BOOLEANO') DEFAULT 'ESCALA_1_5',
    Rango VARCHAR(10) NULL,
    Orden INT NOT NULL,
    Obligatoria BOOLEAN DEFAULT TRUE,
    Activo BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (Id_encuesta) REFERENCES Encuesta(Id_encuesta) ON DELETE CASCADE,
    UNIQUE KEY unique_pregunta_orden (Id_encuesta, Orden)
);

CREATE TABLE Respuesta (
    Id_respuesta INT AUTO_INCREMENT PRIMARY KEY,
    Id_pregunta INT NOT NULL,
    Id_alumno INT NOT NULL,
    Id_encuesta INT NOT NULL, -- Desnormalizado para consultas más rápidas
    Id_servicio INT, -- Servicio evaluado (si aplica)
    Respuesta TEXT NOT NULL, -- TEXT para soportar cualquier tipo de respuesta
    Fecha_respuesta DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (Id_pregunta) REFERENCES Pregunta(Id_pregunta),
    FOREIGN KEY (Id_alumno) REFERENCES Alumnos(Id_alumno),
    FOREIGN KEY (Id_encuesta) REFERENCES Encuesta(Id_encuesta),
    FOREIGN KEY (Id_servicio) REFERENCES Servicio(Id_servicio),
    
    -- Un alumno solo puede responder una vez por pregunta en una encuesta
    UNIQUE KEY unique_respuesta_alumno (Id_pregunta, Id_alumno, Id_encuesta)
);

-- Índices para análisis estadístico
CREATE INDEX idx_respuestas_consulta ON Respuesta(Id_encuesta, Id_servicio, Fecha_respuesta);
CREATE INDEX idx_respuestas_alumno ON Respuesta(Id_alumno);

-- =====================================================
-- SISTEMA DE AUDITORÍA
-- =====================================================

-- TABLA AUDIT_LOG (REGISTRO CENTRAL DE AUDITORÍA)
CREATE TABLE Audit_Log (
    Id_audit INT AUTO_INCREMENT PRIMARY KEY,
    Tabla_afectada VARCHAR(100) NOT NULL,
    Id_registro INT NOT NULL,
    Accion ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    Datos_anteriores JSON, -- Cambios antes de la modificación
    Datos_nuevos JSON, -- Cambios después de la modificación
    Id_usuario INT,
    Direccion_ip VARCHAR(45),
    Fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (Id_usuario) REFERENCES Usuario(Id_usuario) ON DELETE SET NULL
);

-- Índices para consultas de auditoría
CREATE INDEX idx_audit_fecha ON Audit_Log(Fecha_hora);
CREATE INDEX idx_audit_tabla ON Audit_Log(Tabla_afectada, Id_registro);
CREATE INDEX idx_audit_usuario ON Audit_Log(Id_usuario);

-- =====================================================
-- DATOS INICIALES (OPCIONAL)
-- =====================================================

-- Insertar permisos básicos
INSERT INTO Permiso (Nombre_permiso, Descripcion, Modulo) VALUES
('VER_USUARIOS', 'Puede ver la lista de usuarios', 'USUARIOS'),
('CREAR_USUARIOS', 'Puede crear nuevos usuarios', 'USUARIOS'),
('EDITAR_USUARIOS', 'Puede editar usuarios existentes', 'USUARIOS'),
('ELIMINAR_USUARIOS', 'Puede eliminar usuarios', 'USUARIOS'),
('VER_ENCUESTAS', 'Puede ver encuestas', 'ENCUESTAS'),
('CREAR_ENCUESTAS', 'Puede crear nuevas encuestas', 'ENCUESTAS'),
('EDITAR_ENCUESTAS', 'Puede editar encuestas', 'ENCUESTAS'),
('ELIMINAR_ENCUESTAS', 'Puede eliminar encuestas', 'ENCUESTAS'),
('VER_VACANTES', 'Puede ver vacantes', 'VACANTES'),
('CREAR_VACANTES', 'Puede crear nuevas vacantes', 'VACANTES'),
('EDITAR_VACANTES', 'Puede editar vacantes', 'VACANTES'),
('ELIMINAR_VACANTES', 'Puede eliminar vacantes', 'VACANTES'),
('VER_REPORTES', 'Puede ver reportes y estadísticas', 'REPORTES');

-- Insertar tipos de usuario
INSERT INTO TipoUsuario (Nombre_tipo_usuario, Descripcion) VALUES
('ADMIN', 'Administrador del sistema con acceso completo'),
('ALUMNO', 'Alumno regular del sistema'),
('COORDINADOR', 'Coordinador de carrera con permisos intermedios');

-- Asignar permisos a ADMIN (todos los permisos)
INSERT INTO TipoUsuario_Permiso (Id_tipo_usuario, Id_permiso)
SELECT 1, Id_permiso FROM Permiso;

-- Asignar permisos a ALUMNO (solo consulta)
INSERT INTO TipoUsuario_Permiso (Id_tipo_usuario, Id_permiso)
SELECT 2, Id_permiso FROM Permiso 
WHERE Nombre_permiso IN ('VER_VACANTES', 'VER_ENCUESTAS');

-- Insertar servicios básicos
INSERT INTO Servicio (Servicio, Descripcion) VALUES
('SERVICIO_SOCIAL', 'Servicio Social Universitario'),
('PRACTICAS_PROFESIONALES', 'Prácticas Profesionales');

-- Insertar carreras de ejemplo
INSERT INTO Carrera (Nombre_carrera) VALUES
('INGENIERIA_INFORMATICA'),
('INGENIERIA_INDUSTRIAL'),
('LICENCIATURA_ADMINISTRACION');

-- =====================================================
-- TRIGGERS PARA AUDITORÍA AUTOMÁTICA (EJEMPLO)
-- =====================================================

DELIMITER $$

CREATE TRIGGER audit_alumnos_insert
AFTER INSERT ON Alumnos
FOR EACH ROW
BEGIN
    INSERT INTO Audit_Log (Tabla_afectada, Id_registro, Accion, Datos_nuevos, Id_usuario)
    VALUES ('Alumnos', NEW.Id_alumno, 'INSERT', 
            JSON_OBJECT('Id_usuario', NEW.Id_usuario, 'Nombre', NEW.Nombre, 'Apellido_P', NEW.Apellido_P),
            @current_user_id);
END$$

CREATE TRIGGER audit_alumnos_update
AFTER UPDATE ON Alumnos
FOR EACH ROW
BEGIN
    INSERT INTO Audit_Log (Tabla_afectada, Id_registro, Accion, Datos_anteriores, Datos_nuevos, Id_usuario)
    VALUES ('Alumnos', NEW.Id_alumno, 'UPDATE',
            JSON_OBJECT('Nombre', OLD.Nombre, 'Apellido_P', OLD.Apellido_P, 'Activo', OLD.Activo),
            JSON_OBJECT('Nombre', NEW.Nombre, 'Apellido_P', NEW.Apellido_P, 'Activo', NEW.Activo),
            @current_user_id);
END$$

CREATE TRIGGER audit_alumnos_delete
BEFORE DELETE ON Alumnos
FOR EACH ROW
BEGIN
    INSERT INTO Audit_Log (Tabla_afectada, Id_registro, Accion, Datos_anteriores, Id_usuario)
    VALUES ('Alumnos', OLD.Id_alumno, 'DELETE',
            JSON_OBJECT('Id_usuario', OLD.Id_usuario, 'Nombre', OLD.Nombre, 'Apellido_P', OLD.Apellido_P),
            @current_user_id);
END$$

DELIMITER ;

-- =====================================================
-- VISTAS ÚTILES PARA CONSULTAS FRECUENTES
-- =====================================================

-- Vista de alumnos activos con su información completa
CREATE VIEW vw_alumnos_completo AS
SELECT 
    a.Id_alumno,
    u.Matricula,
    a.Nombre,
    a.Apellido_P,
    a.Apellido_M,
    c.Nombre_carrera AS Carrera,
    a.No_Expediente,
    a.Activo,
    GROUP_CONCAT(DISTINCT CONCAT(ca.Tipo, ': ', ca.Valor) SEPARATOR ' | ') AS Contactos,
    GROUP_CONCAT(DISTINCT CONCAT(s.Servicio, ' (', als.Estado, ')') SEPARATOR ' | ') AS Servicios
FROM Alumnos a
JOIN Usuario u ON a.Id_usuario = u.Id_usuario
JOIN Carrera c ON a.Id_carrera = c.Id_carrera
LEFT JOIN Contacto_Alumno ca ON a.Id_alumno = ca.Id_alumno
LEFT JOIN Alumno_Servicio als ON a.Id_alumno = als.Id_alumno
LEFT JOIN Servicio s ON als.Id_servicio = s.Id_servicio
GROUP BY a.Id_alumno;

-- Vista de vacantes activas
CREATE VIEW vw_vacantes_activas AS
SELECT 
    v.Id_vacante,
    v.Titulo,
    v.Descripcion,
    e.Nombre AS Empresa,
    c.Nombre_carrera AS Carrera_requerida,
    s.Servicio AS Tipo_servicio,
    v.Numero_vacantes,
    v.Fecha_publicacion,
    v.Fecha_expiracion,
    v.Contacto_nombre,
    v.Contacto_email,
    v.Contacto_telefono
FROM Vacantes v
JOIN Empresa e ON v.Id_empresa = e.Id_empresa
LEFT JOIN Carrera c ON v.Id_carrera = c.Id_carrera
JOIN Servicio s ON v.Id_servicio = s.Id_servicio
WHERE v.Activa = TRUE 
    AND (v.Fecha_expiracion IS NULL OR v.Fecha_expiracion >= CURDATE());

-- Vista de resultados de encuestas para análisis
CREATE VIEW vw_resultados_encuestas AS
SELECT 
    e.Id_encuesta,
    e.Nombre AS Encuesta,
    p.Pregunta,
    r.Respuesta,
    COUNT(*) AS Total_respuestas,
    AVG(CAST(r.Respuesta AS DECIMAL)) AS Promedio
FROM Respuesta r
JOIN Encuesta e ON r.Id_encuesta = e.Id_encuesta
JOIN Pregunta p ON r.Id_pregunta = p.Id_pregunta
WHERE p.Tipo_respuesta IN ('ESCALA_1_5', 'ESCALA_1_10')
GROUP BY e.Id_encuesta, p.Id_pregunta, r.Respuesta;
