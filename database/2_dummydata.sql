-- =====================================================================
-- DATOS DUMMY — DB_Sistema_Academico
-- =====================================================================
-- Propósito  : Desarrollo y pruebas del equipo
-- Generado   : 2025
-- =====================================================================
--
-- CONTRASEÑAS DE PRUEBA
-- ┌─────────────────────┬──────────────────┬──────────────────────────┐
-- │ Matrícula           │ Contraseña       │ Rol                      │
-- ├─────────────────────┼──────────────────┼──────────────────────────┤
-- │ 0001                │ Admin2024!       │ ADMIN                    │
-- │ 0002                │ Coord2024!       │ COORDINADOR              │
-- │ 10000001            │ Alumno2024!      │ ALUMNO (activo)          │
-- │ 10000002            │ Alumno2024!      │ ALUMNO (activo)          │
-- │ 10000003            │ Alumno2024!      │ ALUMNO (activo)          │
-- │ 10000004            │ Alumno2024!      │ ALUMNO (activo)          │
-- │ 10000005            │ Alumno2024!      │ ALUMNO (activo, complet.)│
-- │ 10000006            │ Pendiente123!    │ ALUMNO (pendiente aprob) │
-- │ 10000007            │ Pendiente123!    │ ALUMNO (pendiente aprob) │
-- │ 10000008            │ Pendiente123!    │ ALUMNO (rechazado)       │
-- └─────────────────────┴──────────────────┴──────────────────────────┘
--
-- NOTA: Los hashes bcrypt abajo son pre-computados con cost=10.
--       Para regenerarlos en PHP: password_hash('Admin2024!', PASSWORD_BCRYPT)
--       El hash de 'Admin2024!' es compatible con password_verify() de PHP.
-- =====================================================================

USE DB_Sistema_Academico;

-- ─────────────────────────────────────────────────────────────────────
-- SECCIÓN 1: CATÁLOGOS BASE
-- (Carrera y Servicio ya insertados en init.sql, se omiten)
-- ─────────────────────────────────────────────────────────────────────

-- Carreras adicionales para mayor cobertura de pruebas
INSERT INTO Carrera (Nombre_carrera) VALUES
('INGENIERIA_ELECTRONICA'),
('INGENIERIA_CIVIL'),
('LICENCIATURA_CONTADURIA');

-- Las carreras quedan:
-- Id 1 = INGENIERIA_INFORMATICA
-- Id 2 = INGENIERIA_INDUSTRIAL
-- Id 3 = LICENCIATURA_ADMINISTRACION
-- Id 4 = INGENIERIA_ELECTRONICA
-- Id 5 = INGENIERIA_CIVIL
-- Id 6 = LICENCIATURA_CONTADURIA

-- Servicios ya en init.sql:
-- Id 1 = SERVICIO_SOCIAL
-- Id 2 = PRACTICAS_PROFESIONALES


-- ─────────────────────────────────────────────────────────────────────
-- SECCIÓN 2: EMPRESAS
-- ─────────────────────────────────────────────────────────────────────

INSERT INTO Empresa (Nombre, Descripcion, Razon_social, RFC, Direccion, Sitio_web, Activo) VALUES
('Tecnológica del Norte S.A.',
 'Empresa de desarrollo de software y soluciones tecnológicas para la industria.',
 'Tecnológica del Norte S.A. de C.V.',
 'TNO9801125AB',
 'Blvd. Industrial 1450, Parque Industrial Norte, Tlaxcala, Tlax. C.P. 90000',
 'https://tecnorte.com.mx',
 TRUE),

('Grupo Industrial Tlaxcala',
 'Manufactura y distribución de componentes metálicos para la industria automotriz.',
 'Grupo Industrial Tlaxcala S.A. de C.V.',
 'GIT0305098CD',
 'Carretera Federal 119 Km 12, Ixtacuixtla, Tlaxcala C.P. 90250',
 'https://grupointlax.mx',
 TRUE),

('Gobierno del Estado de Tlaxcala',
 'Dirección de Tecnologías de la Información del gobierno estatal.',
 'Gobierno del Estado Libre y Soberano de Tlaxcala',
 'GET540101000',
 'Plaza de la Constitución S/N, Tlaxcala, Tlax. C.P. 90000',
 'https://tlaxcala.gob.mx',
 TRUE),

('Hospital Regional IMSS',
 'Unidad médica de atención y servicios de salud del IMSS en Tlaxcala.',
 'Instituto Mexicano del Seguro Social',
 'IMS4310261I3',
 'Av. Juárez 22, Santa Ana Chiautempan, Tlax. C.P. 90800',
 'https://imss.gob.mx',
 TRUE),

('Contadores & Asociados Tlax',
 'Despacho contable y fiscal con más de 20 años en la región.',
 'Contadores y Asociados Tlaxcala S.C.',
 'CAT010612EF5',
 'Av. Independencia 340 Local 5, Apizaco, Tlax. C.P. 90300',
 NULL,
 TRUE),

('TechStartup MX',
 'Startup de desarrollo de aplicaciones móviles y web. EN PAUSA.',
 'TechStartup México S.A. de C.V.',
 'TSM2012099GH',
 'Coworking Center, Tlaxcala, Tlax.',
 'https://techstartupmx.io',
 FALSE); -- Inactiva para probar filtros

-- Empresas quedan:
-- Id 1 = Tecnológica del Norte S.A.
-- Id 2 = Grupo Industrial Tlaxcala
-- Id 3 = Gobierno del Estado de Tlaxcala
-- Id 4 = Hospital Regional IMSS
-- Id 5 = Contadores & Asociados Tlax
-- Id 6 = TechStartup MX (inactiva)


-- ─────────────────────────────────────────────────────────────────────
-- SECCIÓN 3: USUARIOS — ADMINS Y COORDINADORES
-- ─────────────────────────────────────────────────────────────────────
-- Contraseña Admin2024! → hash bcrypt cost=10
-- Contraseña Coord2024! → hash bcrypt cost=10

INSERT INTO Usuario (Matricula, Contrasena, Id_tipo_usuario, Activo, Fecha_registro, Intentos_fallidos, Bloqueado) VALUES
-- ADMIN principal
('0001',
 '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
 1, TRUE, '2024-01-10 08:00:00', 0, FALSE),

-- COORDINADOR
('0002',
 '$2y$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UHi2',
 3, TRUE, '2024-01-10 08:30:00', 0, FALSE);

-- Id_usuario 1 = ADMIN  (matrícula 0001)
-- Id_usuario 2 = COORDINADOR (matrícula 0002)

INSERT INTO Admin (Id_usuario, Nombre, Apellido_P, Apellido_M, Id_carrera, Telefono, Correo) VALUES
(1, 'Ricardo',   'Domínguez', 'Ríos',    1, '2461001001', 'r.dominguez@universidad.edu.mx'),
(2, 'Alejandra', 'Castillo',  'Vega',    2, '2461001002', 'a.castillo@universidad.edu.mx');


-- ─────────────────────────────────────────────────────────────────────
-- SECCIÓN 4: USUARIOS — ALUMNOS
-- ─────────────────────────────────────────────────────────────────────
-- Contraseña Alumno2024!  → Id_tipo_usuario=2, Activo=TRUE
-- Contraseña Pendiente123! → Id_tipo_usuario=2, Activo=FALSE (pendiente)

INSERT INTO Usuario (Matricula, Contrasena, Id_tipo_usuario, Activo, Fecha_registro, Intentos_fallidos, Bloqueado) VALUES
-- Alumnos activos
('10000001', '$2y$10$u5XFTLgAnsBeSN6f9HWXQ.6cFYRHq6lFpOAMm2wFDlcRFaGkGm.Mu', 2, TRUE,  '2024-02-01 09:00:00', 0, FALSE),
('10000002', '$2y$10$u5XFTLgAnsBeSN6f9HWXQ.6cFYRHq6lFpOAMm2wFDlcRFaGkGm.Mu', 2, TRUE,  '2024-02-05 10:00:00', 0, FALSE),
('10000003', '$2y$10$u5XFTLgAnsBeSN6f9HWXQ.6cFYRHq6lFpOAMm2wFDlcRFaGkGm.Mu', 2, TRUE,  '2024-02-10 11:00:00', 0, FALSE),
('10000004', '$2y$10$u5XFTLgAnsBeSN6f9HWXQ.6cFYRHq6lFpOAMm2wFDlcRFaGkGm.Mu', 2, TRUE,  '2024-03-01 09:00:00', 0, FALSE),
-- Alumno con servicio completado (para pruebas de reporte y digitalización)
('10000005', '$2y$10$u5XFTLgAnsBeSN6f9HWXQ.6cFYRHq6lFpOAMm2wFDlcRFaGkGm.Mu', 2, TRUE,  '2024-01-15 08:00:00', 0, FALSE),
-- Alumnos pendientes de aprobación (para pruebas de pantalla 07)
('10000006', '$2y$10$1oHgkR0a2FGGTgXv56lWuupMpQWAHRnvZrjvs7QITBY8YHjBn7jT.', 2, FALSE, '2025-01-20 14:30:00', 0, FALSE),
('10000007', '$2y$10$1oHgkR0a2FGGTgXv56lWuupMpQWAHRnvZrjvs7QITBY8YHjBn7jT.', 2, FALSE, '2025-01-22 16:00:00', 0, FALSE),
-- Alumno rechazado (Activo=FALSE, Bloqueado=TRUE)
('10000008', '$2y$10$1oHgkR0a2FGGTgXv56lWuupMpQWAHRnvZrjvs7QITBY8YHjBn7jT.', 2, FALSE, '2025-01-18 12:00:00', 0, TRUE);

-- Id_usuario: 3=al01, 4=al02, 5=al03, 6=al04, 7=al05(completado), 8=pend01, 9=pend02, 10=rechazado

INSERT INTO Alumnos (Id_usuario, Nombre, Apellido_P, Apellido_M, Id_carrera, No_Expediente, Horario, Organizacion, Activo) VALUES
(3,  'Carlos',    'Hernández', 'Morales', 1, 'EXP-2024-001', 'Lunes a Viernes 08:00-14:00', 'Tecnológica del Norte S.A.',    TRUE),
(4,  'Sofía',     'Ramírez',   'López',   1, 'EXP-2024-002', 'Lunes a Viernes 14:00-20:00', 'Gobierno del Estado de Tlaxcala', TRUE),
(5,  'Miguel',    'Torres',    'García',  2, 'EXP-2024-003', 'Lunes a Viernes 07:00-13:00', 'Grupo Industrial Tlaxcala',     TRUE),
(6,  'Valeria',   'Flores',    'Reyes',   3, 'EXP-2024-004', 'Lunes a Viernes 09:00-15:00', 'Contadores & Asociados Tlax',   TRUE),
(7,  'Diego',     'Mendoza',   'Soto',    1, 'EXP-2023-021', 'Lunes a Viernes 08:00-14:00', 'Tecnológica del Norte S.A.',    TRUE),
(8,  'Daniela',   'Vargas',    'Cruz',    2, 'EXP-2025-001', NULL,                           NULL,                            FALSE),
(9,  'Rodrigo',   'Jiménez',   'Peña',    1, 'EXP-2025-002', NULL,                           NULL,                            FALSE),
(10, 'Fernanda',  'Aguilar',   'Ruiz',    3, 'EXP-2025-003', NULL,                           NULL,                            FALSE);

-- Id_alumno: 1=Carlos, 2=Sofía, 3=Miguel, 4=Valeria, 5=Diego(completado)
--            6=Daniela(pend), 7=Rodrigo(pend), 8=Fernanda(rechazada)


-- ─────────────────────────────────────────────────────────────────────
-- SECCIÓN 5: CONTACTOS DE ALUMNOS
-- ─────────────────────────────────────────────────────────────────────

INSERT INTO Contacto_Alumno (Id_alumno, Tipo, Valor, Principal, Verificado) VALUES
-- Carlos Hernández (alumno 1)
(1, 'EMAIL',            'carlos.hernandez@estudiante.edu.mx', TRUE,  TRUE),
(1, 'TELEFONO_CELULAR', '2461100001',                         FALSE, FALSE),
-- Sofía Ramírez (alumno 2)
(2, 'EMAIL',            'sofia.ramirez@estudiante.edu.mx',    TRUE,  TRUE),
(2, 'TELEFONO_CELULAR', '2461100002',                         FALSE, FALSE),
-- Miguel Torres (alumno 3)
(3, 'EMAIL',            'miguel.torres@estudiante.edu.mx',    TRUE,  TRUE),
(3, 'TELEFONO_CELULAR', '2461100003',                         FALSE, FALSE),
(3, 'TELEFONO_CASA',    '2461200001',                         FALSE, FALSE),
-- Valeria Flores (alumno 4)
(4, 'EMAIL',            'valeria.flores@estudiante.edu.mx',   TRUE,  TRUE),
(4, 'TELEFONO_CELULAR', '2461100004',                         FALSE, FALSE),
-- Diego Mendoza (alumno 5, completado)
(5, 'EMAIL',            'diego.mendoza@estudiante.edu.mx',    TRUE,  TRUE),
(5, 'TELEFONO_CELULAR', '2461100005',                         FALSE, FALSE),
-- Daniela Vargas (alumno 6, pendiente)
(6, 'EMAIL',            'daniela.vargas@gmail.com',           TRUE,  FALSE),
(6, 'TELEFONO_CELULAR', '2461100006',                         FALSE, FALSE),
-- Rodrigo Jiménez (alumno 7, pendiente)
(7, 'EMAIL',            'rodrigo.jimenez@outlook.com',        TRUE,  FALSE),
(7, 'TELEFONO_CELULAR', '2461100007',                         FALSE, FALSE),
-- Fernanda Aguilar (alumno 8, rechazada)
(8, 'EMAIL',            'fernanda.aguilar@gmail.com',         TRUE,  FALSE),
(8, 'TELEFONO_CELULAR', '2461100008',                         FALSE, FALSE);


-- ─────────────────────────────────────────────────────────────────────
-- SECCIÓN 6: ALUMNO_SERVICIO
-- Cubre estados: PENDIENTE, EN_CURSO, COMPLETADO, CANCELADO
-- ─────────────────────────────────────────────────────────────────────

INSERT INTO Alumno_Servicio
    (Id_alumno, Id_servicio, Id_empresa, Estado, Fecha_inicio, Fecha_fin, Horas_totales, Horas_completadas, Observaciones)
VALUES
-- Carlos: Servicio Social EN CURSO en Tecnológica del Norte
(1, 1, 1, 'EN_CURSO',   '2024-08-01', NULL,         480, 240,
 'Trabajando en módulo de reportes del sistema académico.'),

-- Sofía: Prácticas PENDIENTES en Gobierno del Estado
(2, 2, 3, 'PENDIENTE',  NULL,         NULL,         480,   0,
 'Pendiente de asignación de supervisor.'),

-- Miguel: Servicio Social EN CURSO en Grupo Industrial
(3, 1, 2, 'EN_CURSO',   '2024-09-01', NULL,         480, 120,
 'Área de control de calidad y estadística de producción.'),

-- Valeria: Prácticas EN CURSO en Contadores & Asociados
(4, 2, 5, 'EN_CURSO',   '2024-08-15', NULL,         240,  80,
 'Apoyo en elaboración de declaraciones fiscales.'),

-- Diego: Servicio Social COMPLETADO en Tecnológica del Norte (para pruebas de reportes y digitalización)
(5, 1, 1, 'COMPLETADO', '2023-08-01', '2024-01-31', 480, 480,
 'Proyecto completado: desarrollo de API REST para sistema de inventarios.');


-- ─────────────────────────────────────────────────────────────────────
-- SECCIÓN 7: VACANTES
-- Cubre: activas, expiradas, para distintas carreras y servicios
-- ─────────────────────────────────────────────────────────────────────

INSERT INTO Vacantes
    (Id_empresa, Titulo, Descripcion, Requisitos, Id_carrera, Id_servicio,
     Numero_vacantes, Activa, Fecha_publicacion, Fecha_expiracion,
     Contacto_nombre, Contacto_email, Contacto_telefono)
VALUES
-- 1. Servicio Social en Informática - Tecnológica del Norte (cualquier carrera)
(1,
 'Desarrollador Web Junior – Servicio Social',
 'Apoya al equipo de desarrollo en la construcción de módulos para el sistema ERP interno. '
 'Trabajarás con PHP, MySQL y JavaScript en un ambiente ágil.',
 'Conocimientos básicos de HTML, CSS, JavaScript y PHP. '
 'Disponibilidad de lunes a viernes 8:00-14:00 hrs.',
 1, 1, 2, TRUE, '2024-11-01', '2025-06-30',
 'Ing. Patricia Sosa', 'psosa@tecnorte.com.mx', '2461990101'),

-- 2. Prácticas en Informática - Tecnológica del Norte
(1,
 'Analista de QA – Prácticas Profesionales',
 'Participación en pruebas funcionales y automatizadas de software de gestión empresarial.',
 'Conocimientos en metodologías de prueba, manejo de herramientas como Selenium o Postman. '
 'Inglés básico deseable.',
 1, 2, 1, TRUE, '2024-12-01', '2025-07-31',
 'Ing. Patricia Sosa', 'psosa@tecnorte.com.mx', '2461990101'),

-- 3. Servicio Social - Gobierno del Estado (cualquier carrera)
(3,
 'Auxiliar de Digitalización – Servicio Social',
 'Apoyo en la digitalización y clasificación de expedientes del archivo general del estado.',
 'Manejo de paquetería Office. Organización y atención al detalle. '
 'Sin restricción de carrera.',
 NULL, 1, 3, TRUE, '2025-01-10', '2025-08-31',
 'Lic. Jorge Méndez', 'jmendez@tlaxcala.gob.mx', '2461770200'),

-- 4. Prácticas en Administración - Contadores & Asociados
(5,
 'Practicante Contable – Prácticas Profesionales',
 'Apoyo en contabilidad general, nóminas y declaraciones fiscales de clientes PyME.',
 'Alumno de Licenciatura en Contaduría o Administración. '
 'Conocimientos de SAT, ISR, IVA y uso de COI o CONTPAQ.',
 3, 2, 2, TRUE, '2025-01-05', '2025-09-30',
 'C.P. Irma Téllez', 'itellez@contlax.mx', '2461880300'),

-- 5. Servicio Social - Ingeniería Industrial en Grupo Industrial
(2,
 'Auxiliar de Procesos – Servicio Social',
 'Participación en análisis de tiempos y movimientos, control de calidad y mejora continua '
 'en línea de producción de piezas metálicas.',
 'Alumno de Ingeniería Industrial mínimo 7mo semestre. '
 'Conocimientos de Lean Manufacturing o Six Sigma deseable.',
 2, 1, 2, TRUE, '2025-02-01', '2025-10-31',
 'Ing. Roberto Olvera', 'rolvera@grupointlax.mx', '2461550400'),

-- 6. Vacante EXPIRADA (para probar filtros)
(1,
 'Soporte Técnico – Prácticas (EXPIRADA)',
 'Vacante de periodo anterior, ya no disponible.',
 'Conocimientos básicos de redes y hardware.',
 1, 2, 1, TRUE, '2024-01-01', '2024-06-30',
 'Ing. Patricia Sosa', 'psosa@tecnorte.com.mx', '2461990101'),

-- 7. Vacante INACTIVA / desactivada por admin (soft-delete)
(2,
 'Auxiliar Administrativo – Vacante Cancelada',
 'Esta vacante fue desactivada antes de su expiración.',
 'Sin requisitos especiales.',
 NULL, 1, 1, FALSE, '2024-09-01', '2025-03-31',
 'Ing. Roberto Olvera', 'rolvera@grupointlax.mx', '2461550400');


-- ─────────────────────────────────────────────────────────────────────
-- SECCIÓN 8: ENCUESTAS Y PREGUNTAS
-- Cubre: encuesta activa, encuesta archivada, distintos tipos de pregunta
-- ─────────────────────────────────────────────────────────────────────

-- Encuesta 1: Evaluación de Servicio Social (activa, para Id_servicio=1)
INSERT INTO Encuesta (Id_servicio, Nombre, Descripcion, Activo, Fecha_inicio, Fecha_fin) VALUES
(1,
 'Evaluación de Servicio Social 2024',
 'Encuesta de satisfacción y desempeño para alumnos que realizaron o están realizando '
 'Servicio Social. Evalúa tanto la organización receptora como la experiencia del alumno.',
 TRUE, '2024-08-01', '2025-07-31');

-- Encuesta 2: Evaluación de Prácticas Profesionales (activa, para Id_servicio=2)
INSERT INTO Encuesta (Id_servicio, Nombre, Descripcion, Activo, Fecha_inicio, Fecha_fin) VALUES
(2,
 'Evaluación de Prácticas Profesionales 2024',
 'Encuesta dirigida a alumnos en prácticas profesionales. '
 'Mide la calidad de la experiencia, tutoría recibida y alineación con su carrera.',
 TRUE, '2024-08-01', '2025-07-31');

-- Encuesta 3: Encuesta archivada (para probar pantalla 12 pestaña Archivadas)
INSERT INTO Encuesta (Id_servicio, Nombre, Descripcion, Activo, Fecha_inicio, Fecha_fin) VALUES
(1,
 'Evaluación de Servicio Social 2023',
 'Encuesta del ciclo anterior. Archivada para consulta histórica.',
 FALSE, '2023-08-01', '2024-07-31');

-- Id_encuesta: 1=SS2024, 2=PP2024, 3=SS2023(archivada)

-- Preguntas de Encuesta 1 — Servicio Social 2024
INSERT INTO Pregunta (Id_encuesta, Pregunta, Tipo_respuesta, Rango, Orden, Obligatoria, Activo) VALUES
(1, '¿Cómo calificarías la organización y el ambiente de trabajo en la institución receptora?',
    'ESCALA_1_5', '1-5', 1, TRUE, TRUE),
(1, '¿El trabajo asignado fue relevante para tu formación académica?',
    'ESCALA_1_5', '1-5', 2, TRUE, TRUE),
(1, '¿Recibiste supervisión y orientación adecuada por parte de tu responsable directo?',
    'ESCALA_1_5', '1-5', 3, TRUE, TRUE),
(1, '¿Las instalaciones y recursos disponibles fueron suficientes para realizar tus actividades?',
    'ESCALA_1_5', '1-5', 4, TRUE, TRUE),
(1, '¿Recomendarías esta institución a otros compañeros para realizar su Servicio Social?',
    'BOOLEANO',   NULL,  5, TRUE, TRUE),
(1, 'Describe brevemente las actividades principales que realizaste durante tu Servicio Social.',
    'TEXTO',      NULL,  6, TRUE, TRUE),
(1, '¿Hubo algún problema o inconveniente durante tu estancia? (Si tu respuesta es Sí, descríbelo en la siguiente pregunta)',
    'BOOLEANO',   NULL,  7, FALSE, TRUE),
(1, 'En caso de haber tenido problemas, descríbelos brevemente.',
    'TEXTO',      NULL,  8, FALSE, TRUE);

-- Preguntas de Encuesta 2 — Prácticas Profesionales 2024
INSERT INTO Pregunta (Id_encuesta, Pregunta, Tipo_respuesta, Rango, Orden, Obligatoria, Activo) VALUES
(2, '¿En qué medida las actividades de tus prácticas se relacionaron con los contenidos de tu carrera?',
    'ESCALA_1_10', '1-10', 1, TRUE, TRUE),
(2, '¿Cómo evalúas la calidad de la tutoría y mentoría recibida por parte de tu supervisor?',
    'ESCALA_1_10', '1-10', 2, TRUE, TRUE),
(2, '¿Las prácticas contribuyeron al desarrollo de habilidades profesionales concretas?',
    'ESCALA_1_10', '1-10', 3, TRUE, TRUE),
(2, '¿Cómo calificarías el ambiente laboral y la cultura organizacional de la empresa?',
    'ESCALA_1_10', '1-10', 4, TRUE, TRUE),
(2, '¿Consideras que las prácticas te prepararon mejor para el mercado laboral?',
    'BOOLEANO',    NULL,   5, TRUE, TRUE),
(2, 'Describe las principales competencias que desarrollaste durante tus prácticas.',
    'TEXTO',       NULL,   6, TRUE, TRUE),
(2, '¿Te ofrecieron o considerarían ofrecerte empleo al concluir tus estudios?',
    'BOOLEANO',    NULL,   7, FALSE, TRUE);

-- Preguntas de Encuesta 3 — SS 2023 (archivada, mismas preguntas para pruebas de historial)
INSERT INTO Pregunta (Id_encuesta, Pregunta, Tipo_respuesta, Rango, Orden, Obligatoria, Activo) VALUES
(3, '¿Cómo calificarías la organización y el ambiente de trabajo?',
    'ESCALA_1_5', '1-5', 1, TRUE, TRUE),
(3, '¿El trabajo asignado fue relevante para tu formación académica?',
    'ESCALA_1_5', '1-5', 2, TRUE, TRUE),
(3, '¿Recomendarías esta institución?',
    'BOOLEANO',   NULL,  3, TRUE, TRUE),
(3, 'Comentarios adicionales.',
    'TEXTO',      NULL,  4, FALSE, TRUE);

-- Preguntas quedan:
-- Encuesta 1 (SS2024): Id_pregunta 1-8
-- Encuesta 2 (PP2024): Id_pregunta 9-15
-- Encuesta 3 (SS2023): Id_pregunta 16-19


-- ─────────────────────────────────────────────────────────────────────
-- SECCIÓN 9: RESPUESTAS
-- Diego (alumno 5, COMPLETADO) ya respondió encuesta de Servicio Social
-- Miguel (alumno 3, EN_CURSO) ya respondió encuesta de Servicio Social
-- Para pruebas de reportes estadísticos (pantallas 09 y 11)
-- ─────────────────────────────────────────────────────────────────────

-- Diego Mendoza (Id_alumno=5) — respondió Encuesta 1 (SS2024), servicio Id=1
-- Respuestas optimistas — empresa Tecnológica del Norte
INSERT INTO Respuesta (Id_pregunta, Id_alumno, Id_encuesta, Id_servicio, Respuesta, Fecha_respuesta) VALUES
(1, 5, 1, 1, '5', '2024-02-05 10:00:00'),
(2, 5, 1, 1, '5', '2024-02-05 10:01:00'),
(3, 5, 1, 1, '4', '2024-02-05 10:02:00'),
(4, 5, 1, 1, '5', '2024-02-05 10:03:00'),
(5, 5, 1, 1, '1', '2024-02-05 10:04:00'), -- Sí recomienda (BOOLEANO → '1')
(6, 5, 1, 1,
 'Desarrollé una API REST con PHP y MySQL para el módulo de inventarios. '
 'Participé en reuniones de planeación y documenté los endpoints.',
 '2024-02-05 10:05:00'),
(7, 5, 1, 1, '0', '2024-02-05 10:06:00'), -- No hubo problemas
(8, 5, 1, 1, 'N/A', '2024-02-05 10:07:00');

-- Miguel Torres (Id_alumno=3) — respondió Encuesta 1 (SS2024) parcialmente
-- Respuestas moderadas — empresa Grupo Industrial
INSERT INTO Respuesta (Id_pregunta, Id_alumno, Id_encuesta, Id_servicio, Respuesta, Fecha_respuesta) VALUES
(1, 3, 1, 1, '4', '2024-11-20 09:00:00'),
(2, 3, 1, 1, '3', '2024-11-20 09:01:00'),
(3, 3, 1, 1, '4', '2024-11-20 09:02:00'),
(4, 3, 1, 1, '3', '2024-11-20 09:03:00'),
(5, 3, 1, 1, '1', '2024-11-20 09:04:00'), -- Sí recomienda
(6, 3, 1, 1,
 'Apoyo en control de calidad y análisis de producción. '
 'Aprendí a usar software ERP para seguimiento de órdenes.',
 '2024-11-20 09:05:00'),
(7, 3, 1, 1, '1', '2024-11-20 09:06:00'), -- Sí tuvo problemas
(8, 3, 1, 1,
 'Al inicio hubo problemas con el acceso al sistema ERP. '
 'Se resolvió después de dos semanas.',
 '2024-11-20 09:07:00');

-- Respuestas a Encuesta 3 (SS2023 archivada) — para probar datos históricos
-- Simulamos 3 respuestas de alumnos ficticios que ya no están en el sistema
-- Usamos a Diego (5) y Miguel (3) con fechas del año anterior
INSERT INTO Respuesta (Id_pregunta, Id_alumno, Id_encuesta, Id_servicio, Respuesta, Fecha_respuesta) VALUES
(16, 5, 3, 1, '4', '2024-01-10 10:00:00'),
(17, 5, 3, 1, '5', '2024-01-10 10:01:00'),
(18, 5, 3, 1, '1', '2024-01-10 10:02:00'),
(19, 5, 3, 1, 'Excelente experiencia en general.', '2024-01-10 10:03:00');


-- ─────────────────────────────────────────────────────────────────────
-- SECCIÓN 10: AUDIT_LOG — entradas de ejemplo
-- ─────────────────────────────────────────────────────────────────────

INSERT INTO Audit_Log (Tabla_afectada, Id_registro, Accion, Datos_anteriores, Datos_nuevos, Id_usuario, Direccion_ip, Fecha_hora) VALUES
-- Activación de alumno Carlos por el admin
('Usuario', 3, 'UPDATE',
 '{"Activo": false}',
 '{"Activo": true}',
 1, '192.168.1.10', '2024-02-02 09:15:00'),

-- Activación de alumno Sofía
('Usuario', 4, 'UPDATE',
 '{"Activo": false}',
 '{"Activo": true}',
 1, '192.168.1.10', '2024-02-06 10:30:00'),

-- Creación de vacante por coordinador
('Vacantes', 1, 'INSERT',
 NULL,
 '{"Titulo": "Desarrollador Web Junior – Servicio Social", "Id_empresa": 1}',
 2, '192.168.1.11', '2024-10-31 11:00:00'),

-- Modificación de vacante
('Vacantes', 1, 'UPDATE',
 '{"Numero_vacantes": 1}',
 '{"Numero_vacantes": 2}',
 2, '192.168.1.11', '2024-11-15 14:20:00'),

-- Digitalización de evaluación de Diego
('Respuesta', 5, 'INSERT',
 NULL,
 '{"Id_encuesta": 1, "num_respuestas": 8}',
 1, '192.168.1.10', '2024-02-05 10:08:00');


-- =====================================================================
-- FIN DE DATOS DUMMY
-- =====================================================================
-- RESUMEN DE IDs ÚTILES PARA DESARROLLO
-- ─────────────────────────────────────
-- CARRERAS:   1=Informática  2=Industrial  3=Administración
--             4=Electrónica  5=Civil       6=Contaduría
-- SERVICIOS:  1=SERVICIO_SOCIAL   2=PRACTICAS_PROFESIONALES
-- EMPRESAS:   1=TecNorte  2=GrupoIndusTlax  3=GobTlax
--             4=IMSS  5=ContadoresTlax  6=TechStartup(inactiva)
-- ROLES:      1=ADMIN  2=ALUMNO  3=COORDINADOR
-- ─────────────────────────────────────
-- USUARIOS Y SUS ESTADOS:
--   0001  → ADMIN    activo
--   0002  → COORD    activo
--   10000001 → ALUMNO activo, SS EN_CURSO   (Id_alumno=1)
--   10000002 → ALUMNO activo, PP PENDIENTE  (Id_alumno=2)
--   10000003 → ALUMNO activo, SS EN_CURSO   (Id_alumno=3) — ya respondió encuesta
--   10000004 → ALUMNO activo, PP EN_CURSO   (Id_alumno=4)
--   10000005 → ALUMNO activo, SS COMPLETADO (Id_alumno=5) — ya respondió encuesta
--   10000006 → ALUMNO pendiente aprobación  (Id_alumno=6)
--   10000007 → ALUMNO pendiente aprobación  (Id_alumno=7)
--   10000008 → ALUMNO rechazado/bloqueado   (Id_alumno=8)
-- ─────────────────────────────────────
-- ENCUESTAS:
--   1 = Evaluación SS 2024      (activa,    SS, 8 preguntas)
--   2 = Evaluación PP 2024      (activa,    PP, 7 preguntas)
--   3 = Evaluación SS 2023      (ARCHIVADA, SS, 4 preguntas)
-- ─────────────────────────────────────
-- VACANTES ACTIVAS Y VIGENTES: Id 1, 2, 3, 4, 5
-- VACANTE EXPIRADA:             Id 6
-- VACANTE DESACTIVADA:          Id 7
-- =====================================================================