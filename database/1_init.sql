-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: ops-web-app-database-1
-- Generation Time: Apr 14, 2026 at 09:05 AM
-- Server version: 12.2.2-MariaDB-ubu2404
-- PHP Version: 8.3.30

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
-- Database: `DB_Sistema_Academico`
--

-- --------------------------------------------------------

--
-- Table structure for table `Actividades`
--

CREATE TABLE `Actividades` (
  `Id_servicio` int(11) NOT NULL,
  `Servicio` varchar(100) NOT NULL,
  `Descripcion` varchar(255) DEFAULT NULL,
  `Activo` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Actividades_Alumnos`
--

CREATE TABLE `Actividades_Alumnos` (
  `Id_alumno_servicio` int(11) NOT NULL,
  `Id_alumno` int(11) NOT NULL,
  `Id_servicio` int(11) NOT NULL,
  `Id_empresa` int(11) DEFAULT NULL,
  `Estado` enum('PENDIENTE','EN_CURSO','COMPLETADO','CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
  `Fecha_inicio` date DEFAULT NULL,
  `Fecha_fin` date DEFAULT NULL,
  `Horas_totales` int(11) DEFAULT NULL,
  `Horas_completadas` int(11) DEFAULT 0,
  `Documento_liberacion` varchar(255) DEFAULT NULL,
  `Observaciones` text DEFAULT NULL,
  `Fecha_registro` datetime DEFAULT current_timestamp(),
  `Fecha_modificacion` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `Administradores`
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
-- Table structure for table `Alumnos`
--

CREATE TABLE `Alumnos` (
  `Id_alumno` int(11) NOT NULL,
  `Id_usuario` int(11) NOT NULL,
  `Nombre` varchar(100) NOT NULL,
  `Apellido_P` varchar(100) NOT NULL,
  `Apellido_M` varchar(100) DEFAULT NULL,
  `Id_carrera` int(11) NOT NULL,
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
-- Triggers `Alumnos`
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
-- Table structure for table `Audit_Log`
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
-- Table structure for table `Carreras`
--

CREATE TABLE `Carreras` (
  `Id_carrera` int(11) NOT NULL,
  `Id_Facultad` int(11) NOT NULL,
  `Nombre` varchar(100) NOT NULL,
  `Activo` tinyint(1) DEFAULT 1,
  `Fecha_registro` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Contactos_Alumno`
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
-- Table structure for table `Empresas`
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
-- Table structure for table `Encuestas`
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
-- Table structure for table `Facultades`
--

CREATE TABLE `Facultades` (
  `Id_Facultad` int(11) NOT NULL,
  `Nombre` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Permisos`
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
-- Table structure for table `Preguntas`
--

CREATE TABLE `Preguntas` (
  `Id_pregunta` int(11) NOT NULL,
  `Id_encuesta` int(11) NOT NULL,
  `Pregunta` varchar(500) NOT NULL,
  `Tipo_respuesta` enum('ESCALA_1_5','ESCALA_1_10','TEXTO','BOOLEANO') DEFAULT 'ESCALA_1_5',
  `Rango` varchar(10) DEFAULT NULL,
  `Orden` int(11) NOT NULL,
  `Obligatoria` tinyint(1) DEFAULT 1,
  `Activo` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Respuestas`
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
-- Table structure for table `Tipos_Usuario`
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
-- Table structure for table `TipoUsuarios_Permiso`
--

CREATE TABLE `TipoUsuarios_Permiso` (
  `Id_tipo_usuario` int(11) NOT NULL,
  `Id_permiso` int(11) NOT NULL,
  `Fecha_asignacion` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Usuarios`
--

CREATE TABLE `Usuarios` (
  `Id_usuario` int(11) NOT NULL,
  `Matricula` varchar(100) NOT NULL,
  `Contrasena` varchar(200) NOT NULL,
  `Id_tipo_usuario` int(11) NOT NULL,
  `Activo` tinyint(1) DEFAULT 1,
  `Fecha_registro` datetime DEFAULT current_timestamp(),
  `Fecha_ultimo_acceso` datetime DEFAULT NULL,
  `Intentos_fallidos` int(11) DEFAULT 0,
  `Bloqueado` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Vacantes`
--

CREATE TABLE `Vacantes` (
  `Id_vacante` int(11) NOT NULL,
  `Id_empresa` int(11) NOT NULL,
  `Titulo` varchar(200) NOT NULL,
  `Flyer_Path` varchar(100) DEFAULT NULL,
  `Descripcion` text NOT NULL,
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
-- Stand-in structure for view `vw_alumnos_completo`
-- (See below for the actual view)
--

--
-- Indexes for dumped tables
--

--
-- Indexes for table `Actividades`
--
ALTER TABLE `Actividades`
  ADD PRIMARY KEY (`Id_servicio`),
  ADD UNIQUE KEY `Servicio` (`Servicio`);

--
-- Indexes for table `Actividades_Alumnos`
--
ALTER TABLE `Actividades_Alumnos`
  ADD PRIMARY KEY (`Id_alumno_servicio`),
  ADD UNIQUE KEY `unique_alumno_servicio` (`Id_alumno`,`Id_servicio`),
  ADD KEY `Id_servicio` (`Id_servicio`),
  ADD KEY `Id_empresa` (`Id_empresa`),
  ADD KEY `idx_alumno_servicio_estado` (`Estado`),
  ADD KEY `idx_alumno_servicio_fechas` (`Fecha_inicio`,`Fecha_fin`);

--
-- Indexes for table `Administradores`
--
ALTER TABLE `Administradores`
  ADD PRIMARY KEY (`Id_admin`),
  ADD UNIQUE KEY `Id_usuario` (`Id_usuario`),
  ADD UNIQUE KEY `Correo` (`Correo`),
  ADD KEY `Id_carrera` (`Id_carrera`);

--
-- Indexes for table `Alumnos`
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
-- Indexes for table `Audit_Log`
--
ALTER TABLE `Audit_Log`
  ADD PRIMARY KEY (`Id_audit`),
  ADD KEY `idx_audit_fecha` (`Fecha_hora`),
  ADD KEY `idx_audit_tabla` (`Tabla_afectada`,`Id_registro`),
  ADD KEY `idx_audit_usuario` (`Id_usuario`);

--
-- Indexes for table `Carreras`
--
ALTER TABLE `Carreras`
  ADD PRIMARY KEY (`Id_carrera`);

--
-- Indexes for table `Contactos_Alumno`
--
ALTER TABLE `Contactos_Alumno`
  ADD PRIMARY KEY (`Id_contacto`),
  ADD UNIQUE KEY `unique_contacto_alumno` (`Id_alumno`,`Tipo`,`Valor`);

--
-- Indexes for table `Empresas`
--
ALTER TABLE `Empresas`
  ADD PRIMARY KEY (`Id_empresa`),
  ADD UNIQUE KEY `Nombre` (`Nombre`),
  ADD KEY `idx_empresa_nombre` (`Nombre`);

--
-- Indexes for table `Encuestas`
--
ALTER TABLE `Encuestas`
  ADD PRIMARY KEY (`Id_encuesta`),
  ADD UNIQUE KEY `Nombre` (`Nombre`),
  ADD KEY `Id_servicio` (`Id_servicio`);

--
-- Indexes for table `Facultades`
--
ALTER TABLE `Facultades`
  ADD PRIMARY KEY (`Id_Facultad`);

--
-- Indexes for table `Permisos`
--
ALTER TABLE `Permisos`
  ADD PRIMARY KEY (`Id_permiso`),
  ADD UNIQUE KEY `Nombre_permiso` (`Nombre_permiso`);

--
-- Indexes for table `Preguntas`
--
ALTER TABLE `Preguntas`
  ADD PRIMARY KEY (`Id_pregunta`),
  ADD UNIQUE KEY `unique_pregunta_orden` (`Id_encuesta`,`Orden`);

--
-- Indexes for table `Respuestas`
--
ALTER TABLE `Respuestas`
  ADD PRIMARY KEY (`Id_respuesta`),
  ADD UNIQUE KEY `unique_respuesta_alumno` (`Id_pregunta`,`Id_alumno`,`Id_encuesta`),
  ADD KEY `Id_servicio` (`Id_servicio`),
  ADD KEY `idx_respuestas_consulta` (`Id_encuesta`,`Id_servicio`,`Fecha_respuesta`),
  ADD KEY `idx_respuestas_alumno` (`Id_alumno`);

--
-- Indexes for table `Tipos_Usuario`
--
ALTER TABLE `Tipos_Usuario`
  ADD PRIMARY KEY (`Id_tipo_usuario`),
  ADD UNIQUE KEY `Nombre_tipo_usuario` (`Nombre_tipo_usuario`);

--
-- Indexes for table `TipoUsuarios_Permiso`
--
ALTER TABLE `TipoUsuarios_Permiso`
  ADD PRIMARY KEY (`Id_tipo_usuario`,`Id_permiso`),
  ADD KEY `Id_permiso` (`Id_permiso`);

--
-- Indexes for table `Usuarios`
--
ALTER TABLE `Usuarios`
  ADD PRIMARY KEY (`Id_usuario`),
  ADD UNIQUE KEY `Matricula` (`Matricula`),
  ADD KEY `Id_tipo_usuario` (`Id_tipo_usuario`),
  ADD KEY `idx_usuario_matricula` (`Matricula`),
  ADD KEY `idx_usuario_activo` (`Activo`);

--
-- Indexes for table `Vacantes`
--
ALTER TABLE `Vacantes`
  ADD PRIMARY KEY (`Id_vacante`),
  ADD KEY `Id_empresa` (`Id_empresa`),
  ADD KEY `idx_vacantes_activas` (`Activa`,`Fecha_expiracion`),
  ADD KEY `idx_vacantes_servicio` (`Id_servicio`),
  ADD KEY `idx_vacantes_carrera` (`Id_carrera`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `Actividades`
--
ALTER TABLE `Actividades`
  MODIFY `Id_servicio` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Actividades_Alumnos`
--
ALTER TABLE `Actividades_Alumnos`
  MODIFY `Id_alumno_servicio` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Administradores`
--
ALTER TABLE `Administradores`
  MODIFY `Id_admin` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Alumnos`
--
ALTER TABLE `Alumnos`
  MODIFY `Id_alumno` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Audit_Log`
--
ALTER TABLE `Audit_Log`
  MODIFY `Id_audit` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Carreras`
--
ALTER TABLE `Carreras`
  MODIFY `Id_carrera` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Contactos_Alumno`
--
ALTER TABLE `Contactos_Alumno`
  MODIFY `Id_contacto` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Empresas`
--
ALTER TABLE `Empresas`
  MODIFY `Id_empresa` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Encuestas`
--
ALTER TABLE `Encuestas`
  MODIFY `Id_encuesta` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Facultades`
--
ALTER TABLE `Facultades`
  MODIFY `Id_Facultad` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Permisos`
--
ALTER TABLE `Permisos`
  MODIFY `Id_permiso` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Preguntas`
--
ALTER TABLE `Preguntas`
  MODIFY `Id_pregunta` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Respuestas`
--
ALTER TABLE `Respuestas`
  MODIFY `Id_respuesta` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Tipos_Usuario`
--
ALTER TABLE `Tipos_Usuario`
  MODIFY `Id_tipo_usuario` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Usuarios`
--
ALTER TABLE `Usuarios`
  MODIFY `Id_usuario` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Vacantes`
--
ALTER TABLE `Vacantes`
  MODIFY `Id_vacante` int(11) NOT NULL AUTO_INCREMENT;


--
-- Constraints for table `Actividades_Alumnos`
--
ALTER TABLE `Actividades_Alumnos`
  ADD CONSTRAINT `1` FOREIGN KEY (`Id_alumno`) REFERENCES `Alumnos` (`Id_alumno`) ON DELETE CASCADE,
  ADD CONSTRAINT `2` FOREIGN KEY (`Id_servicio`) REFERENCES `Actividades` (`Id_servicio`),
  ADD CONSTRAINT `3` FOREIGN KEY (`Id_empresa`) REFERENCES `Empresas` (`Id_empresa`);

--
-- Constraints for table `Administradores`
--
ALTER TABLE `Administradores`
  ADD CONSTRAINT `1` FOREIGN KEY (`Id_usuario`) REFERENCES `Usuarios` (`Id_usuario`) ON DELETE CASCADE,
  ADD CONSTRAINT `2` FOREIGN KEY (`Id_carrera`) REFERENCES `Carreras` (`Id_carrera`) ON DELETE SET NULL;

--
-- Constraints for table `Alumnos`
--
ALTER TABLE `Alumnos`
  ADD CONSTRAINT `1` FOREIGN KEY (`Id_usuario`) REFERENCES `Usuarios` (`Id_usuario`) ON DELETE CASCADE,
  ADD CONSTRAINT `2` FOREIGN KEY (`Id_carrera`) REFERENCES `Carreras` (`Id_carrera`);

--
-- Constraints for table `Audit_Log`
--
ALTER TABLE `Audit_Log`
  ADD CONSTRAINT `1` FOREIGN KEY (`Id_usuario`) REFERENCES `Usuarios` (`Id_usuario`) ON DELETE SET NULL;

--
-- Constraints for table `Contactos_Alumno`
--
ALTER TABLE `Contactos_Alumno`
  ADD CONSTRAINT `1` FOREIGN KEY (`Id_alumno`) REFERENCES `Alumnos` (`Id_alumno`) ON DELETE CASCADE;

--
-- Constraints for table `Encuestas`
--
ALTER TABLE `Encuestas`
  ADD CONSTRAINT `1` FOREIGN KEY (`Id_servicio`) REFERENCES `Actividades` (`Id_servicio`);

--
-- Constraints for table `Preguntas`
--
ALTER TABLE `Preguntas`
  ADD CONSTRAINT `1` FOREIGN KEY (`Id_encuesta`) REFERENCES `Encuestas` (`Id_encuesta`) ON DELETE CASCADE;

--
-- Constraints for table `Respuestas`
--
ALTER TABLE `Respuestas`
  ADD CONSTRAINT `1` FOREIGN KEY (`Id_pregunta`) REFERENCES `Preguntas` (`Id_pregunta`),
  ADD CONSTRAINT `2` FOREIGN KEY (`Id_alumno`) REFERENCES `Alumnos` (`Id_alumno`),
  ADD CONSTRAINT `3` FOREIGN KEY (`Id_encuesta`) REFERENCES `Encuestas` (`Id_encuesta`),
  ADD CONSTRAINT `4` FOREIGN KEY (`Id_servicio`) REFERENCES `Actividades` (`Id_servicio`);

--
-- Constraints for table `TipoUsuarios_Permiso`
--
ALTER TABLE `TipoUsuarios_Permiso`
  ADD CONSTRAINT `1` FOREIGN KEY (`Id_tipo_usuario`) REFERENCES `Tipos_Usuario` (`Id_tipo_usuario`) ON DELETE CASCADE,
  ADD CONSTRAINT `2` FOREIGN KEY (`Id_permiso`) REFERENCES `Permisos` (`Id_permiso`) ON DELETE CASCADE;

--
-- Constraints for table `Usuarios`
--
ALTER TABLE `Usuarios`
  ADD CONSTRAINT `1` FOREIGN KEY (`Id_tipo_usuario`) REFERENCES `Tipos_Usuario` (`Id_tipo_usuario`);

--
-- Constraints for table `Vacantes`
--
ALTER TABLE `Vacantes`
  ADD CONSTRAINT `1` FOREIGN KEY (`Id_empresa`) REFERENCES `Empresas` (`Id_empresa`),
  ADD CONSTRAINT `2` FOREIGN KEY (`Id_carrera`) REFERENCES `Carreras` (`Id_carrera`) ON DELETE SET NULL,
  ADD CONSTRAINT `3` FOREIGN KEY (`Id_servicio`) REFERENCES `Actividades` (`Id_servicio`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
