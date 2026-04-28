-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Servidor: ops-web-app-database-1
-- Tiempo de generación: 16-04-2026 a las 00:21:19
-- Versión del servidor: 12.2.2-MariaDB-ubu2404
-- Versión de PHP: 8.3.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
DROP DATABASE IF EXISTS DB_Sistema_Academico;
CREATE DATABASE DB_Sistema_Academico;
USE DB_Sistema_Academico;
START TRANSACTION;
SET time_zone = "+00:00";

 
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `DB_Sistema_Academico`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `Actividades`
--

CREATE TABLE `Actividades` (
  `Id_servicio` int(11) NOT NULL,
  `Servicio` varchar(100) NOT NULL,
  `Descripcion` varchar(255) DEFAULT NULL,
  `Activo` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `Actividades_Alumnos`
--

CREATE TABLE `Actividades_Alumnos` (
  `Id_alumno_servicio` int(11) NOT NULL,
  `Id_alumno` int(11) NOT NULL,
  `Id_servicio` int(11) NOT NULL,
  `Id_empresa` int(11) DEFAULT NULL,
  `Area` varchar(300) DEFAULT NULL,
  `Programa` varchar(300) DEFAULT NULL,
  `Estado` enum('PENDIENTE','EN_CURSO','COMPLETADO','CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
  `periodo_tipo` enum('primavera','otoño') NOT NULL,
  `periodo_año` year(4) NOT NULL,
  `Fecha_inicio` date DEFAULT NULL,
  `Fecha_fin` date DEFAULT NULL,
  `Fecha_registro` datetime DEFAULT current_timestamp(),
  `Fecha_modificacion` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `Administradores`
--

CREATE TABLE `Administradores` (
  `Id_admin` int(11) NOT NULL,
  `Id_usuario` int(11) NOT NULL,
  `Nombre` varchar(100) NOT NULL,
  `Apellido_P` varchar(100) NOT NULL,
  `Apellido_M` varchar(100) DEFAULT NULL,
  `Id_carrera` int(11) DEFAULT NULL,
  `Telefono` varchar(20) DEFAULT NULL,
  `Correo` varchar(100) DEFAULT NULL,
  `Activo` tinyint(1) DEFAULT 1,
  `Fecha_registro` datetime DEFAULT current_timestamp(),
  `Fecha_modificacion` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `Alumnos`
--

CREATE TABLE `Alumnos` (
  `Id_alumno` int(11) NOT NULL,
  `Id_usuario` int(11) NOT NULL,
  `Nombre` varchar(100) NOT NULL,
  `Apellido_P` varchar(100) NOT NULL,
  `Apellido_M` varchar(100) DEFAULT NULL,
  `Id_carrera` int(11) NOT NULL,
  `Grupo` varchar(5) NOT NULL,
  `No_Expediente` varchar(50) DEFAULT NULL,
  `Area_o_programa` varchar(255) DEFAULT NULL,
  `Observaciones` text DEFAULT NULL,
  `Horario` varchar(200) DEFAULT NULL,
  `Organizacion` varchar(100) DEFAULT NULL,
  `Activo` tinyint(1) DEFAULT 1,
  `Fecha_registro` datetime DEFAULT current_timestamp(),
  `Fecha_modificacion` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Disparadores `Alumnos`
--
DELIMITER $$
CREATE TRIGGER `audit_alumnos_delete` BEFORE DELETE ON `Alumnos` FOR EACH ROW BEGIN
    INSERT INTO Audit_Log (Tabla_afectada, Id_registro, Accion, Datos_anteriores, Id_usuario)
    VALUES ('Alumnos', OLD.Id_alumno, 'DELETE',
            JSON_OBJECT('Id_usuario', OLD.Id_usuario, 'Nombre', OLD.Nombre, 'Apellido_P', OLD.Apellido_P),
            @current_user_id);
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `audit_alumnos_insert` AFTER INSERT ON `Alumnos` FOR EACH ROW BEGIN
    INSERT INTO Audit_Log (Tabla_afectada, Id_registro, Accion, Datos_nuevos, Id_usuario)
    VALUES ('Alumnos', NEW.Id_alumno, 'INSERT', 
            JSON_OBJECT('Id_usuario', NEW.Id_usuario, 'Nombre', NEW.Nombre, 'Apellido_P', NEW.Apellido_P),
            @current_user_id);
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `audit_alumnos_update` AFTER UPDATE ON `Alumnos` FOR EACH ROW BEGIN
    INSERT INTO Audit_Log (Tabla_afectada, Id_registro, Accion, Datos_anteriores, Datos_nuevos, Id_usuario)
    VALUES ('Alumnos', NEW.Id_alumno, 'UPDATE',
            JSON_OBJECT('Nombre', OLD.Nombre, 'Apellido_P', OLD.Apellido_P, 'Activo', OLD.Activo),
            JSON_OBJECT('Nombre', NEW.Nombre, 'Apellido_P', NEW.Apellido_P, 'Activo', NEW.Activo),
            @current_user_id);
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `Audit_Log`
--

CREATE TABLE `Audit_Log` (
  `Id_audit` int(11) NOT NULL,
  `Tabla_afectada` varchar(100) NOT NULL,
  `Id_registro` int(11) NOT NULL,
  `Accion` enum('INSERT','UPDATE','DELETE') NOT NULL,
  `Datos_anteriores` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`Datos_anteriores`)),
  `Datos_nuevos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`Datos_nuevos`)),
  `Id_usuario` int(11) DEFAULT NULL,
  `Direccion_ip` varchar(45) DEFAULT NULL,
  `Fecha_hora` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `Carreras`
--

CREATE TABLE `Carreras` (
  `Id_carrera` int(11) NOT NULL,
  `Id_facultad` int(11) NOT NULL,
  `Nombre` varchar(100) NOT NULL,
  `Activo` tinyint(1) DEFAULT 1,
  `Fecha_registro` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `Contactos_Alumno`
--

CREATE TABLE `Contactos_Alumno` (
  `Id_contacto` int(11) NOT NULL,
  `Id_alumno` int(11) NOT NULL,
  `Tipo` enum('EMAIL','TELEFONO_CASA','TELEFONO_CELULAR','TELEFONO_TRABAJO','OTRO') NOT NULL,
  `Valor` varchar(100) NOT NULL,
  `Principal` tinyint(1) DEFAULT 0,
  `Verificado` tinyint(1) DEFAULT 0,
  `Fecha_registro` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `Empresas`
--

CREATE TABLE `Empresas` (
  `Id_empresa` int(11) NOT NULL,
  `Nombre` varchar(200) NOT NULL,
  `Descripcion` text DEFAULT NULL,
  `Razon_social` varchar(200) DEFAULT NULL,
  `RFC` varchar(13) DEFAULT NULL,
  `Direccion` text DEFAULT NULL,
  `Sitio_web` varchar(255) DEFAULT NULL,
  `Activo` tinyint(1) DEFAULT 1,
  `Fecha_registro` datetime DEFAULT current_timestamp(),
  `Fecha_modificacion` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `Encuestas`
--

CREATE TABLE `Encuestas` (
  `Id_encuesta` int(11) NOT NULL,
  `Nombre` varchar(100) NOT NULL,
  `Descripcion` text DEFAULT NULL,
  `Id_servicio` int(11) NOT NULL,
  `Activo` tinyint(1) DEFAULT 1,
  `Fecha_inicio` date DEFAULT NULL,
  `Fecha_fin` date DEFAULT NULL,
  `Fecha_registro` datetime DEFAULT current_timestamp(),
  `Fecha_modificacion` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------


--
-- Estructura de tabla para la tabla `Facultades`
--

CREATE TABLE `Facultades` (
  `Id_facultad` int(11) NOT NULL,
  `Nombre` varchar(100) NOT NULL,
  `Activo` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `Permisos`
--

CREATE TABLE `Permisos` (
  `Id_permiso` int(11) NOT NULL,
  `Nombre_permiso` varchar(100) NOT NULL,
  `Descripcion` varchar(255) DEFAULT NULL,
  `Modulo` varchar(50) DEFAULT NULL,
  `Fecha_registro` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `Preguntas`
--

CREATE TABLE `Preguntas` (
  `Id_pregunta` int(11) NOT NULL,
  `Id_encuesta` int(11) NOT NULL,
  `Pregunta` varchar(500) NOT NULL,
  `Tipo_respuesta` enum('ESCALA_1_5','ESCALA_1_10','TEXTO','BOOLEANO') DEFAULT 'ESCALA_1_5',
  `Rango` varchar(10) DEFAULT NULL,
  `Seccion` varchar(1) NOT NULL,
  `Orden` int(11) NOT NULL,
  `Obligatoria` tinyint(1) DEFAULT 1,
  `Activo` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `Respuestas`
--

CREATE TABLE `Respuestas` (
  `Id_respuesta` int(11) NOT NULL,
  `Id_pregunta` int(11) NOT NULL,
  `Id_alumno` int(11) NOT NULL,
  `Id_encuesta` int(11) NOT NULL,
  `Id_servicio` int(11) DEFAULT NULL,
  `Respuesta` text NOT NULL,
  `Fecha_respuesta` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `Tipos_Usuario`
--

CREATE TABLE `Tipos_Usuario` (
  `Id_tipo_usuario` int(11) NOT NULL,
  `Nombre_tipo_usuario` varchar(50) NOT NULL,
  `Descripcion` varchar(255) DEFAULT NULL,
  `Activo` tinyint(1) DEFAULT 1,
  `Fecha_registro` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `TipoUsuarios_Permiso`
--

CREATE TABLE `TipoUsuarios_Permiso` (
  `Id_tipo_usuario` int(11) NOT NULL,
  `Id_permiso` int(11) NOT NULL,
  `Fecha_asignacion` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `Usuarios`
--

CREATE TABLE `Usuarios` (
  `Id_usuario` int(11) NOT NULL,
  `Matricula` varchar(100) NOT NULL,
  `Contrasena` varchar(200) NOT NULL,
  `Id_tipo_usuario` int(11) NOT NULL,
  `Activo` tinyint(1) DEFAULT 1,
  `Flyer_Path` varchar(100) DEFAULT NULL,
  `Fecha_registro` datetime DEFAULT current_timestamp(),
  `Fecha_ultimo_acceso` datetime DEFAULT NULL,
  `Intentos_fallidos` int(11) DEFAULT 0,
  `Bloqueado` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `Vacantes`
--

CREATE TABLE `Vacantes` (
  `Id_vacante` int(11) NOT NULL,
  `Id_empresa` int(11) NOT NULL,
  `Titulo` varchar(200) NOT NULL,
  `Flyer_Path` varchar(100) DEFAULT NULL,
  `Descripcion` text DEFAULT NULL,
  `Requisitos` text DEFAULT NULL,
  `Id_carrera` int(11) DEFAULT NULL,
  `Id_servicio` int(11) NOT NULL,
  `Numero_vacantes` int(11) DEFAULT 1,
  `Activa` tinyint(1) DEFAULT 1,
  `Fecha_publicacion` date NOT NULL,
  `Fecha_expiracion` date DEFAULT NULL,
  `Contacto_nombre` varchar(100) DEFAULT NULL,
  `Contacto_email` varchar(100) DEFAULT NULL,
  `Contacto_telefono` varchar(20) DEFAULT NULL,
  `Fecha_registro` datetime DEFAULT current_timestamp(),
  `Fecha_modificacion` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vw_alumnos_completo`
-- (Véase abajo para la vista actual)
--

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `Actividades`
--
ALTER TABLE `Actividades`
  ADD PRIMARY KEY (`Id_servicio`),
  ADD UNIQUE KEY `Servicio` (`Servicio`);

--
-- Indices de la tabla `Actividades_Alumnos`
--
ALTER TABLE `Actividades_Alumnos`
  ADD PRIMARY KEY (`Id_alumno_servicio`),
  ADD UNIQUE KEY `unique_alumno_servicio` (`Id_alumno`,`Id_servicio`),
  ADD KEY `Id_servicio` (`Id_servicio`),
  ADD KEY `Id_empresa` (`Id_empresa`),
  ADD KEY `idx_alumno_servicio_estado` (`Estado`),
  ADD KEY `idx_alumno_servicio_fechas` (`Fecha_inicio`,`Fecha_fin`);

--
-- Indices de la tabla `Administradores`
--
ALTER TABLE `Administradores`
  ADD PRIMARY KEY (`Id_admin`),
  ADD UNIQUE KEY `Id_usuario` (`Id_usuario`),
  ADD UNIQUE KEY `Correo` (`Correo`),
  ADD KEY `Id_carrera` (`Id_carrera`);

--
-- Indices de la tabla `Alumnos`
--
ALTER TABLE `Alumnos`
  ADD PRIMARY KEY (`Id_alumno`),
  ADD UNIQUE KEY `Id_usuario` (`Id_usuario`),
  ADD UNIQUE KEY `No_Expediente` (`No_Expediente`),
  ADD KEY `Id_carrera` (`Id_carrera`),
  ADD KEY `idx_alumno_nombre` (`Apellido_P`,`Apellido_M`,`Nombre`),
  ADD KEY `idx_alumno_expediente` (`No_Expediente`),
  ADD KEY `idx_alumno_activo` (`Activo`);

--
-- Indices de la tabla `Audit_Log`
--
ALTER TABLE `Audit_Log`
  ADD PRIMARY KEY (`Id_audit`),
  ADD KEY `idx_audit_fecha` (`Fecha_hora`),
  ADD KEY `idx_audit_tabla` (`Tabla_afectada`,`Id_registro`),
  ADD KEY `idx_audit_usuario` (`Id_usuario`);

--
-- Indices de la tabla `Carreras`
--
ALTER TABLE `Carreras`
  ADD PRIMARY KEY (`Id_carrera`);

--
-- Indices de la tabla `Contactos_Alumno`
--
ALTER TABLE `Contactos_Alumno`
  ADD PRIMARY KEY (`Id_contacto`),
  ADD UNIQUE KEY `unique_contacto_alumno` (`Id_alumno`,`Tipo`,`Valor`);

--
-- Indices de la tabla `Empresas`
--
ALTER TABLE `Empresas`
  ADD PRIMARY KEY (`Id_empresa`),
  ADD UNIQUE KEY `Nombre` (`Nombre`),
  ADD KEY `idx_empresa_nombre` (`Nombre`);

--
-- Indices de la tabla `Encuestas`
--
ALTER TABLE `Encuestas`
  ADD PRIMARY KEY (`Id_encuesta`),
  ADD UNIQUE KEY `Nombre` (`Nombre`),
  ADD KEY `Id_servicio` (`Id_servicio`);

--
-- Indices de la tabla `Facultades`
--
ALTER TABLE `Facultades`
  ADD PRIMARY KEY (`Id_facultad`);

--
-- Indices de la tabla `Permisos`
--
ALTER TABLE `Permisos`
  ADD PRIMARY KEY (`Id_permiso`),
  ADD UNIQUE KEY `Nombre_permiso` (`Nombre_permiso`);

--
-- Indices de la tabla `Preguntas`
--
ALTER TABLE `Preguntas`
  ADD PRIMARY KEY (`Id_pregunta`),
  ADD UNIQUE KEY `unique_pregunta_orden` (`Id_encuesta`,`Orden`);

--
-- Indices de la tabla `Respuestas`
--
ALTER TABLE `Respuestas`
  ADD PRIMARY KEY (`Id_respuesta`),
  ADD UNIQUE KEY `unique_respuesta_alumno` (`Id_pregunta`,`Id_alumno`,`Id_encuesta`),
  ADD KEY `Id_servicio` (`Id_servicio`),
  ADD KEY `idx_respuestas_consulta` (`Id_encuesta`,`Id_servicio`,`Fecha_respuesta`),
  ADD KEY `idx_respuestas_alumno` (`Id_alumno`);

--
-- Indices de la tabla `Tipos_Usuario`
--
ALTER TABLE `Tipos_Usuario`
  ADD PRIMARY KEY (`Id_tipo_usuario`),
  ADD UNIQUE KEY `Nombre_tipo_usuario` (`Nombre_tipo_usuario`);

--
-- Indices de la tabla `TipoUsuarios_Permiso`
--
ALTER TABLE `TipoUsuarios_Permiso`
  ADD PRIMARY KEY (`Id_tipo_usuario`,`Id_permiso`),
  ADD KEY `Id_permiso` (`Id_permiso`);

--
-- Indices de la tabla `Usuarios`
--
ALTER TABLE `Usuarios`
  ADD PRIMARY KEY (`Id_usuario`),
  ADD UNIQUE KEY `Matricula` (`Matricula`),
  ADD KEY `Id_tipo_usuario` (`Id_tipo_usuario`),
  ADD KEY `idx_usuario_matricula` (`Matricula`),
  ADD KEY `idx_usuario_activo` (`Activo`);

--
-- Indices de la tabla `Vacantes`
--
ALTER TABLE `Vacantes`
  ADD PRIMARY KEY (`Id_vacante`),
  ADD KEY `Id_empresa` (`Id_empresa`),
  ADD KEY `idx_vacantes_activas` (`Activa`,`Fecha_expiracion`),
  ADD KEY `idx_vacantes_servicio` (`Id_servicio`),
  ADD KEY `idx_vacantes_carrera` (`Id_carrera`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `Actividades`
--
ALTER TABLE `Actividades`
  MODIFY `Id_servicio` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `Actividades_Alumnos`
--
ALTER TABLE `Actividades_Alumnos`
  MODIFY `Id_alumno_servicio` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `Administradores`
--
ALTER TABLE `Administradores`
  MODIFY `Id_admin` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `Alumnos`
--
ALTER TABLE `Alumnos`
  MODIFY `Id_alumno` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `Audit_Log`
--
ALTER TABLE `Audit_Log`
  MODIFY `Id_audit` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `Carreras`
--
ALTER TABLE `Carreras`
  MODIFY `Id_carrera` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `Contactos_Alumno`
--
ALTER TABLE `Contactos_Alumno`
  MODIFY `Id_contacto` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `Empresas`
--
ALTER TABLE `Empresas`
  MODIFY `Id_empresa` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `Encuestas`
--
ALTER TABLE `Encuestas`
  MODIFY `Id_encuesta` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `Facultades`
--
ALTER TABLE `Facultades`
  MODIFY `Id_facultad` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `Permisos`
--
ALTER TABLE `Permisos`
  MODIFY `Id_permiso` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `Preguntas`
--
ALTER TABLE `Preguntas`
  MODIFY `Id_pregunta` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `Respuestas`
--
ALTER TABLE `Respuestas`
  MODIFY `Id_respuesta` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `Tipos_Usuario`
--
ALTER TABLE `Tipos_Usuario`
  MODIFY `Id_tipo_usuario` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `Usuarios`
--
ALTER TABLE `Usuarios`
  MODIFY `Id_usuario` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `Vacantes`
--
ALTER TABLE `Vacantes`
  MODIFY `Id_vacante` int(11) NOT NULL AUTO_INCREMENT;


--
-- Filtros para la tabla `Actividades_Alumnos`
--
ALTER TABLE `Actividades_Alumnos`
  ADD CONSTRAINT `1` FOREIGN KEY (`Id_alumno`) REFERENCES `Alumnos` (`Id_alumno`) ON DELETE CASCADE,
  ADD CONSTRAINT `2` FOREIGN KEY (`Id_servicio`) REFERENCES `Actividades` (`Id_servicio`),
  ADD CONSTRAINT `3` FOREIGN KEY (`Id_empresa`) REFERENCES `Empresas` (`Id_empresa`);

--
-- Filtros para la tabla `Administradores`
--
ALTER TABLE `Administradores`
  ADD CONSTRAINT `1` FOREIGN KEY (`Id_usuario`) REFERENCES `Usuarios` (`Id_usuario`) ON DELETE CASCADE,
  ADD CONSTRAINT `2` FOREIGN KEY (`Id_carrera`) REFERENCES `Carreras` (`Id_carrera`) ON DELETE SET NULL;

--
-- Filtros para la tabla `Alumnos`
--
ALTER TABLE `Alumnos`
  ADD CONSTRAINT `1` FOREIGN KEY (`Id_usuario`) REFERENCES `Usuarios` (`Id_usuario`) ON DELETE CASCADE,
  ADD CONSTRAINT `2` FOREIGN KEY (`Id_carrera`) REFERENCES `Carreras` (`Id_carrera`);

--
-- Filtros para la tabla `Audit_Log`
--
ALTER TABLE `Audit_Log`
  ADD CONSTRAINT `1` FOREIGN KEY (`Id_usuario`) REFERENCES `Usuarios` (`Id_usuario`) ON DELETE SET NULL;

--
-- Filtros para la tabla `Contactos_Alumno`
--
ALTER TABLE `Contactos_Alumno`
  ADD CONSTRAINT `1` FOREIGN KEY (`Id_alumno`) REFERENCES `Alumnos` (`Id_alumno`) ON DELETE CASCADE;

--
-- Filtros para la tabla `Encuestas`
--
ALTER TABLE `Encuestas`
  ADD CONSTRAINT `1` FOREIGN KEY (`Id_servicio`) REFERENCES `Actividades` (`Id_servicio`);

--
-- Filtros para la tabla `Preguntas`
--
ALTER TABLE `Preguntas`
  ADD CONSTRAINT `1` FOREIGN KEY (`Id_encuesta`) REFERENCES `Encuestas` (`Id_encuesta`) ON DELETE CASCADE;

--
-- Filtros para la tabla `Respuestas`
--
ALTER TABLE `Respuestas`
  ADD CONSTRAINT `1` FOREIGN KEY (`Id_pregunta`) REFERENCES `Preguntas` (`Id_pregunta`),
  ADD CONSTRAINT `2` FOREIGN KEY (`Id_alumno`) REFERENCES `Alumnos` (`Id_alumno`),
  ADD CONSTRAINT `3` FOREIGN KEY (`Id_encuesta`) REFERENCES `Encuestas` (`Id_encuesta`),
  ADD CONSTRAINT `4` FOREIGN KEY (`Id_servicio`) REFERENCES `Actividades` (`Id_servicio`);

--
-- Filtros para la tabla `TipoUsuarios_Permiso`
--
ALTER TABLE `TipoUsuarios_Permiso`
  ADD CONSTRAINT `1` FOREIGN KEY (`Id_tipo_usuario`) REFERENCES `Tipos_Usuario` (`Id_tipo_usuario`) ON DELETE CASCADE,
  ADD CONSTRAINT `2` FOREIGN KEY (`Id_permiso`) REFERENCES `Permisos` (`Id_permiso`) ON DELETE CASCADE;

--
-- Filtros para la tabla `Usuarios`
--
ALTER TABLE `Usuarios`
  ADD CONSTRAINT `1` FOREIGN KEY (`Id_tipo_usuario`) REFERENCES `Tipos_Usuario` (`Id_tipo_usuario`);

--
-- Filtros para la tabla `Vacantes`
--
ALTER TABLE `Vacantes`
  ADD CONSTRAINT `1` FOREIGN KEY (`Id_empresa`) REFERENCES `Empresas` (`Id_empresa`),
  ADD CONSTRAINT `2` FOREIGN KEY (`Id_carrera`) REFERENCES `Carreras` (`Id_carrera`) ON DELETE SET NULL,
  ADD CONSTRAINT `3` FOREIGN KEY (`Id_servicio`) REFERENCES `Actividades` (`Id_servicio`);
COMMIT;

--
-- Estrucutura de tabla para relacionar Encuestas con Periodos
--

CREATE TABLE Periodo_Encuesta (
    `Id_periodo_encuesta` int(11) AUTO_INCREMENT PRIMARY KEY,
    `Id_encuesta` INT NOT NULL,
    `Periodo_tipo` ENUM('primavera', 'otoño') NOT NULL,
    `Periodo_año` YEAR(4) NOT NULL,
    `Fecha_creacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (Id_encuesta) REFERENCES Encuestas(Id_encuesta) ON DELETE CASCADE,
    UNIQUE KEY unique_periodo_encuesta (Id_encuesta, Periodo_tipo, Periodo_año)
);


/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
