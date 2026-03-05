-- 1. Crear la base de datos
DROP DATABASE IF EXISTS DB_Sistema_Academico;
CREATE DATABASE DB_Sistema_Academico;
USE DB_Sistema_Academico;

-- TABLA USUARIO
CREATE TABLE Usuario (
    Id_usuario INT PRIMARY KEY,
    Matricula VARCHAR(100) NOT NULL UNIQUE, -- Se asume que la matrícula es única
    Contrasena VARCHAR(200) NOT NULL,
    Tipo_de_usuario BOOLEAN -- Se asume 0 para un tipo, 1 para otro (o se podría usar VARCHAR)
);

-- TABLA CARRERA
CREATE TABLE Carrera (
    Id_carrera INT PRIMARY KEY,
    Nombre_carrera VARCHAR(100) NOT NULL UNIQUE
);

-- TABLA SERVICIO
CREATE TABLE Servicio (
    Id_servicio INT PRIMARY KEY,
    Servicio VARCHAR(100) NOT NULL UNIQUE
);

-- TABLA ALUMNOS
CREATE TABLE Alumnos (
    Id_alumno INT PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    Apellido_P VARCHAR(100) NOT NULL,
    Apellido_M VARCHAR(100),
    Id_carrera INT, -- Llave Foránea a CARRERA
    Id_servicio INT, -- Llave Foránea a SERVICIO
    No_Expediente VARCHAR(200) UNIQUE, -- Se asume que el expediente es único
    Area_o_programa VARCHAR(500),
    Fecha_inicio DATE, -- shortdate
    Fecha_fin DATE,   -- shortdate
    Observaciones VARCHAR(500),
    Horario VARCHAR(200),
    Organizacion VARCHAR(100),
    Id_usuario INT, -- Llave Foránea a USUARIO
    
    FOREIGN KEY (Id_carrera) REFERENCES Carrera(Id_carrera),
    FOREIGN KEY (Id_servicio) REFERENCES Servicio(Id_servicio),
    FOREIGN KEY (Id_usuario) REFERENCES Usuario(Id_usuario)
);

-- TABLA ADMIN (Se asume que es el personal administrativo/docente)
CREATE TABLE Admin (
    Id_admin INT PRIMARY KEY, -- Se agregó una PK propia para la tabla Admin
    Nombre VARCHAR(100) NOT NULL,
    Id_usuario INT, -- Llave Foránea a USUARIO (asociación de cuenta)
    Id_carrera INT, -- Llave Foránea a CARRERA (departamento/área a cargo)
    Telefono VARCHAR(10) UNIQUE,
    Correo VARCHAR(100) UNIQUE,
    
    FOREIGN KEY (Id_usuario) REFERENCES Usuario(Id_usuario),
    FOREIGN KEY (Id_carrera) REFERENCES Carrera(Id_carrera)
);

-- TABLA ENCUESTA
CREATE TABLE Encuesta (
    Id_encuesta INT PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL UNIQUE
);

-- TABLA PREGUNTA
CREATE TABLE Pregunta (
    Id_pregunta INT PRIMARY KEY,
    Pregunta VARCHAR(200) NOT NULL,
    Id_encuesta INT, -- Llave Foránea a ENCUESTA
    
    FOREIGN KEY (Id_encuesta) REFERENCES Encuesta(Id_encuesta)
);

-- TABLA RESPUESTA 
CREATE TABLE Respuesta (
    Id_respuesta INT PRIMARY KEY,
    Id_pregunta INT, -- Llave Foránea a PREGUNTA
    Id_alumno INT,   -- Llave Foránea a ALUMNOS
    Id_encuesta INT, -- NUEVA Llave Foránea a ENCUESTA
    Respuesta INT,   -- Valor de la respuesta (e.g., escala de 1 a 5)
    Id_servicio INT, -- Llave Foránea a SERVICIO (Servicio evaluado)
    
    FOREIGN KEY (Id_pregunta) REFERENCES Pregunta(Id_pregunta),
    FOREIGN KEY (Id_alumno) REFERENCES Alumnos(Id_alumno),
    FOREIGN KEY (Id_encuesta) REFERENCES Encuesta(Id_encuesta), -- NUEVA RELACIÓN
    FOREIGN KEY (Id_servicio) REFERENCES Servicio(Id_servicio)
);

-- TABLA EMPRESA
CREATE TABLE Empresa (
    Id_empresa INT PRIMARY KEY,
    Nombre VARCHAR(200) NOT NULL UNIQUE,
    Descripcion VARCHAR(500)
);

-- TABLA VACANTES
CREATE TABLE Vacantes (
    Id_vacante INT PRIMARY KEY,
    Id_empresa INT NOT NULL, -- Llave Foránea a EMPRESA
    Descripcion VARCHAR(500) NOT NULL,
    Id_carrera INT, -- Llave Foránea a CARRERA
    Id_servicio INT, -- Llave Foránea a SERVICIO
    
    FOREIGN KEY (Id_empresa) REFERENCES Empresa(Id_empresa),
    FOREIGN KEY (Id_carrera) REFERENCES Carrera(Id_carrera),
    FOREIGN KEY (Id_servicio) REFERENCES Servicio(Id_servicio)
);