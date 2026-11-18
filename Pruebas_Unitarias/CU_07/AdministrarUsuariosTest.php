<?php
/**
 * Archivo      : AdministrarUsuariosTest.php
 * Módulo       : CU_07 Administrar usuarios (Pruebas unitarias)
 * Archivos bajo prueba (en la carpeta de app/ que empieza con "CU_07"):
 *   obtener_usuarios_pendientes.php
 *   cargar_expediente.php
 *   procesar_validacion.php
 * Herramienta  : PHPUnit
 *
 * Cómo correrlo (desde OPS-web-app, con el Docker del proyecto prendido):
 *   vendor/bin/phpunit --testdox Pruebas_Unitarias/CU_07/AdministrarUsuariosTest.php
 *
 * Descripción  : Pruebas de los PHP para aceptar o rechazar usuarios. El código original NO se modifica.
 *   - Usan una base de datos APARTE llamada "ops_pruebas_cu07" que se crea sola
 *     dentro del MariaDB de Docker. Tu base de datos real no se toca.
 *   - Cada PHP se ejecuta en un proceso aparte. La prueba le simula la
 *     sesión (cookies) y el cuerpo JSON, y revisa el código HTTP y lo que responde.
 *
 * Cada prueba indica:
 *   - Función   : archivo PHP › bloque que se prueba.
 *   - Comprueba : qué comportamiento se verifica.
 */

namespace CU_07;

use PDO;
use PDOException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\TestDox;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class AdministrarUsuariosTest extends TestCase
{
    // =========================
    // CONFIGURACIÓN DE LA BD DE PRUEBAS
    // =========================
    // Si la BD está en Docker, se conecta sola a este contenedor.
    // Si no usas Docker, pon aquí '' y escribe la dirección en DB_HOST.
    private const CONTENEDOR_DOCKER_BD = 'ops-web-app-database-1';
    private const DB_HOST = '127.0.0.1';
    private const DB_PORT = '3306';
    private const DB_USER = 'root';
    private const DB_PASS = ''; // si se deja vacía, se lee DB_ROOT_PASS del archivo .env del proyecto
    private const DB_NAME = 'ops_pruebas_cu07'; // debe contener "prueba"

    private const PUENTE_DOCKER = 'ops-pruebas-puente-bd';
    private const PUERTO_PUENTE = '33061';

    private static ?PDO $pdo = null;
    private static ?array $destino = null;
    private static string $carpetaTemporal = '';

    /** Carpeta del módulo: la primera de app/ que empieza con "CU_07". */
    private static function carpetaApp(): string
    {
        $carpetas = glob(__DIR__ . '/../../app/CU_07*', GLOB_ONLYDIR);
        if (!$carpetas) {
            throw new RuntimeException('No se encontró ninguna carpeta que empiece con "CU_07" dentro de app/.');
        }
        return $carpetas[0];
    }

    public static function setUpBeforeClass(): void
    {
        self::prepararArchivosTemporales();
        self::conexion();
    }

    /** Antes de cada prueba se vuelven a crear las tablas vacías. */
    protected function setUp(): void
    {
        self::crearEsquema();
    }

    // =====================================================================
    // FUNCIONES DE APOYO (no son pruebas)
    // =====================================================================

    /**
     * Crea en la carpeta temporal del sistema dos archivos que necesita la prueba:
     *  - php/db.php: conexión a la BD de pruebas. los PHP del módulo hacen
     *    require_once("../php/db.php"); al ejecutarlo desde <temporal>/CU_05,
     *    PHP carga este db.php en lugar del real.
     *  - simular_input.php: hace que php://input devuelva el JSON enviado por la prueba
     *    (en la terminal no existe el cuerpo de una petición HTTP) y simula las
     *    cookies de sesión, los parámetros GET, los campos POST y los archivos subidos.
     */
    private static function prepararArchivosTemporales(): void
    {
        $base = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'ops_pruebas_cu07';
        @mkdir($base . DIRECTORY_SEPARATOR . 'php', 0777, true);
        @mkdir($base . DIRECTORY_SEPARATOR . 'CU_07', 0777, true);

        file_put_contents($base . DIRECTORY_SEPARATOR . 'php' . DIRECTORY_SEPARATOR . 'db.php', <<<'PHP'
<?php
$dsn  = 'mysql:host=' . getenv('OPS_DB_HOST') . ';port=' . getenv('OPS_DB_PORT')
      . ';dbname=' . getenv('OPS_DB_NAME') . ';charset=utf8mb4';
$user = getenv('OPS_DB_USER');
$pass = (string) getenv('OPS_DB_PASS');
if (getenv('OPS_FORZAR_ERROR_DB') === '1') {
    $user = 'usuario_inexistente_ops';
    $pass = 'clave_incorrecta_ops';
}
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];
PHP);

        file_put_contents($base . DIRECTORY_SEPARATOR . 'simular_input.php', <<<'PHP'
<?php
$GLOBALS['__CUERPO'] = stream_get_contents(STDIN);
final class SimuladorPhpInput
{
    public $context;
    private string $datos = '';
    private int $pos = 0;
    public function stream_open($ruta, $modo, $opciones, &$abierta): bool
    {
        if (strtolower($ruta) !== 'php://input') return false;
        $this->datos = (string) $GLOBALS['__CUERPO'];
        return true;
    }
    public function stream_read($n): string
    {
        $parte = substr($this->datos, $this->pos, $n);
        $this->pos += strlen($parte);
        return $parte;
    }
    public function stream_eof(): bool { return $this->pos >= strlen($this->datos); }
    public function stream_stat(): array { return ['size' => strlen($this->datos)]; }
}
stream_wrapper_unregister('php');
stream_wrapper_register('php', SimuladorPhpInput::class);

// Cookies de sesión, campos POST (FormData) y archivos subidos simulados
$_COOKIE = json_decode((string) getenv('OPS_COOKIES'), true) ?: [];
$_POST   = json_decode((string) getenv('OPS_POST'), true) ?: [];
$_FILES  = json_decode((string) getenv('OPS_FILES'), true) ?: [];
$_GET    = json_decode((string) getenv('OPS_GET'), true) ?: [];

// Al terminar, se guarda el código HTTP para que la prueba lo revise
if ($archivoCodigo = getenv('OPS_ARCHIVO_CODIGO')) {
    register_shutdown_function(function () use ($archivoCodigo) {
        // Si el PHP no fija un código, el servidor web responde 200
        file_put_contents($archivoCodigo, (string) (http_response_code() ?: 200));
    });
}
PHP);

        self::$carpetaTemporal = $base;
    }

    /**
     * Ejecuta un PHP del módulo (ej. 'registro.php') en un proceso aparte, le manda
     * $cuerpo como petición POST y regresa su respuesta.
     */
    private static function ejecutarPhp(string $archivo, ?string $cuerpo = null, array $entornoExtra = []): array
    {
        $comando = [
            PHP_BINARY,
            '-d', 'auto_prepend_file=' . self::$carpetaTemporal . DIRECTORY_SEPARATOR . 'simular_input.php',
            '-d', 'display_errors=stderr',
            self::carpetaApp() . '/' . $archivo,
        ];
        $entorno = array_merge(getenv(), [
            'OPS_DB_HOST' => self::destino()[0],
            'OPS_DB_PORT' => self::destino()[1],
            'OPS_DB_USER' => self::DB_USER,
            'OPS_DB_PASS' => self::pass(),
            'OPS_DB_NAME' => self::DB_NAME,
        ], $entornoExtra);

        $proceso = proc_open(
            $comando,
            [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $tuberias,
            self::$carpetaTemporal . DIRECTORY_SEPARATOR . 'CU_07',
            $entorno
        );
        fwrite($tuberias[0], (string) $cuerpo);
        fclose($tuberias[0]);
        $salida  = stream_get_contents($tuberias[1]);
        $errores = stream_get_contents($tuberias[2]);
        fclose($tuberias[1]);
        fclose($tuberias[2]);
        proc_close($proceso);

        return ['salida' => $salida, 'errores' => trim($errores), 'json' => json_decode($salida, true)];
    }

    /**
     * Devuelve [host, puerto] para conectarse a la BD.
     * Si existe el contenedor de Docker de la BD, crea un "puente" temporal
     * (contenedor alpine/socat) que publica la BD en 127.0.0.1:33061, porque el
     * puerto 3306 del contenedor no está publicado hacia la computadora.
     * El puente se borra solo al terminar las pruebas.
     */
    private static function destino(): array
    {
        if (self::$destino !== null) {
            return self::$destino;
        }
        self::$destino = [self::DB_HOST, self::DB_PORT];

        if (self::CONTENEDOR_DOCKER_BD === '' || !function_exists('shell_exec')) {
            return self::$destino;
        }

        $redes = trim((string) @shell_exec(
            'docker inspect -f ' . escapeshellarg('{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}')
            . ' ' . escapeshellarg(self::CONTENEDOR_DOCKER_BD) . ' 2>/dev/null'
        ));
        if ($redes === '') {
            return self::$destino; // no hay contenedor: se usa DB_HOST y DB_PORT
        }
        $red = explode(' ', $redes)[0];

        self::borrarPuente();
        $salida = (string) @shell_exec(
            'docker run -d --rm --name ' . escapeshellarg(self::PUENTE_DOCKER)
            . ' --network ' . escapeshellarg($red)
            . ' -p ' . escapeshellarg('127.0.0.1:' . self::PUERTO_PUENTE . ':3306')
            . ' alpine/socat tcp-listen:3306,fork,reuseaddr '
            . escapeshellarg('tcp-connect:' . self::CONTENEDOR_DOCKER_BD . ':3306') . ' 2>&1'
        );
        $id = trim((string) @shell_exec(
            'docker ps -q -f ' . escapeshellarg('name=^' . self::PUENTE_DOCKER . '$')
        ));
        if ($id === '') {
            throw new RuntimeException("No se pudo crear el puente de Docker hacia la BD. Docker respondió:\n" . $salida);
        }
        register_shutdown_function([self::class, 'borrarPuente']);

        return self::$destino = ['127.0.0.1', self::PUERTO_PUENTE];
    }

    public static function borrarPuente(): void
    {
        if (self::CONTENEDOR_DOCKER_BD !== '' && function_exists('shell_exec')) {
            @shell_exec('docker rm -f ' . escapeshellarg(self::PUENTE_DOCKER) . ' >/dev/null 2>&1');
        }
    }

    public static function tearDownAfterClass(): void
    {
        self::borrarPuente();
    }

    /** Contraseña de la BD: DB_PASS, o si está vacía, DB_ROOT_PASS del archivo .env del proyecto. */
    private static function pass(): string
    {
        if (self::DB_PASS !== '') {
            return self::DB_PASS;
        }
        $archivoEnv = __DIR__ . '/../../.env';
        if (is_readable($archivoEnv)) {
            foreach (file($archivoEnv, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $linea) {
                if (preg_match('/^\s*(?:export\s+)?DB_ROOT_PASS\s*=\s*(.*)$/', $linea, $m)) {
                    return trim(trim($m[1]), "\"'");
                }
            }
        }
        return '';
    }

    private static function conexion(): PDO
    {
        if (self::$pdo === null) {
            if (stripos(self::DB_NAME, 'prueba') === false) {
                throw new RuntimeException('Por seguridad, DB_NAME debe contener la palabra "prueba".');
            }
            [$host, $puerto] = self::destino();
            for ($intento = 1; ; $intento++) {
                try {
                    self::$pdo = new PDO(
                        'mysql:host=' . $host . ';port=' . $puerto . ';charset=utf8mb4',
                        self::DB_USER,
                        self::pass(),
                        [
                            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                            PDO::ATTR_TIMEOUT            => 5,
                        ]
                    );
                    break;
                } catch (PDOException $e) {
                    // El puente de Docker puede tardar unos segundos en estar listo
                    if ($intento >= 10 || stripos($e->getMessage(), 'Access denied') !== false) {
                        throw new RuntimeException(
                            "No se pudo conectar a MariaDB en {$host}:{$puerto}. ¿Está prendido Docker? "
                            . '¿La contraseña (DB_PASS o DB_ROOT_PASS del .env) es correcta? ' . $e->getMessage()
                        );
                    }
                    sleep(1);
                }
            }
            self::$pdo->exec('CREATE DATABASE IF NOT EXISTS `' . self::DB_NAME . '` CHARACTER SET utf8mb4');
            self::$pdo->exec('USE `' . self::DB_NAME . '`');
        }
        return self::$pdo;
    }

    /** Crea las tablas que usan los PHP de este módulo (versión mínima para pruebas). */
    private static function crearEsquema(): void
    {
        $pdo = self::conexion();
        foreach (['Actividades_Alumnos', 'Alumnos', 'Administradores', 'Usuarios', 'Carreras', 'Actividades'] as $t) {
            $pdo->exec("DROP TABLE IF EXISTS `{$t}`");
        }
        $pdo->exec('CREATE TABLE Carreras (Id_carrera INT AUTO_INCREMENT PRIMARY KEY, Nombre VARCHAR(150) NOT NULL)');
        $pdo->exec('CREATE TABLE Actividades (Id_servicio INT AUTO_INCREMENT PRIMARY KEY, Servicio VARCHAR(150) NOT NULL)');
        $pdo->exec('CREATE TABLE Usuarios (
            Id_usuario INT AUTO_INCREMENT PRIMARY KEY, Matricula VARCHAR(8) NOT NULL UNIQUE,
            Id_tipo_usuario INT NOT NULL, Activo TINYINT(1) NOT NULL DEFAULT 0, Fecha_registro DATETIME NULL)');
        $pdo->exec('CREATE TABLE Alumnos (
            Id_alumno INT AUTO_INCREMENT PRIMARY KEY, Id_usuario INT NOT NULL, Nombre VARCHAR(100) NOT NULL,
            Apellido_P VARCHAR(100) NULL, Apellido_M VARCHAR(100) NULL, Id_carrera INT NOT NULL)');
        $pdo->exec('CREATE TABLE Administradores (
            Id_administrador INT AUTO_INCREMENT PRIMARY KEY, Id_usuario INT NOT NULL, Nombre VARCHAR(100) NOT NULL,
            Apellido_P VARCHAR(100) NULL, Apellido_M VARCHAR(100) NULL, Id_carrera INT NOT NULL,
            Telefono VARCHAR(20) NULL, Correo VARCHAR(150) NULL)');
        $pdo->exec('CREATE TABLE Actividades_Alumnos (
            Id_alumno_servicio INT AUTO_INCREMENT PRIMARY KEY, No_expediente VARCHAR(15) NULL UNIQUE,
            Id_alumno INT NOT NULL, Id_servicio INT NOT NULL)');
    }

    // ---------- Datos de prueba ----------

    private static function insertar(string $tabla, array $fila): int
    {
        $columnas = implode(', ', array_map(fn ($c) => "`$c`", array_keys($fila)));
        $marcas   = implode(', ', array_fill(0, count($fila), '?'));
        self::conexion()->prepare("INSERT INTO `$tabla` ($columnas) VALUES ($marcas)")->execute(array_values($fila));
        return (int) self::conexion()->lastInsertId();
    }

    private static function filas(string $sql, array $valores = []): array
    {
        $stmt = self::conexion()->prepare($sql);
        $stmt->execute($valores);
        return $stmt->fetchAll();
    }

    private static int $computacion = 0;
    private static int $quimica = 0;
    private static int $social = 0;

    /** Carreras y servicio de ejemplo para cada prueba. */
    private static function catalogos(): void
    {
        self::$computacion = self::insertar('Carreras', ['Nombre' => 'Ing. en Computación']);
        self::$quimica = self::insertar('Carreras', ['Nombre' => 'Ing. Química']);
        self::$social = self::insertar('Actividades', ['Servicio' => 'Servicio social']);
    }

    /** Crea un alumno (pendiente por defecto) con una actividad. Regresa Id_alumno. */
    private static function crearAlumno(string $matricula, array $cambios = []): int
    {
        $cambios += ['Activo' => 0, 'Id_carrera' => self::$computacion, 'Nombre' => 'Ana', 'Apellido_P' => 'López',
            'Apellido_M' => 'Ruiz', 'actividad' => true, 'Fecha_registro' => '2026-11-01 10:00:00'];
        $idUsuario = self::insertar('Usuarios', ['Matricula' => $matricula, 'Id_tipo_usuario' => 2,
            'Activo' => $cambios['Activo'], 'Fecha_registro' => $cambios['Fecha_registro']]);
        $idAlumno = self::insertar('Alumnos', ['Id_usuario' => $idUsuario, 'Nombre' => $cambios['Nombre'],
            'Apellido_P' => $cambios['Apellido_P'], 'Apellido_M' => $cambios['Apellido_M'], 'Id_carrera' => $cambios['Id_carrera']]);
        if ($cambios['actividad']) {
            self::insertar('Actividades_Alumnos', ['Id_alumno' => $idAlumno, 'Id_servicio' => self::$social]);
        }
        return $idAlumno;
    }

    /** Crea un coordinador (pendiente por defecto). */
    private static function crearCoordinador(string $matricula, array $cambios = []): void
    {
        $cambios += ['Activo' => 0, 'Id_carrera' => self::$quimica];
        $idUsuario = self::insertar('Usuarios', ['Matricula' => $matricula, 'Id_tipo_usuario' => 3,
            'Activo' => $cambios['Activo'], 'Fecha_registro' => '2026-10-20 09:00:00']);
        self::insertar('Administradores', ['Id_usuario' => $idUsuario, 'Nombre' => 'María', 'Apellido_P' => 'Soto',
            'Apellido_M' => 'Ríos', 'Id_carrera' => $cambios['Id_carrera'], 'Telefono' => '2461112233', 'Correo' => 'maria@uatx.mx']);
    }

    private static function usuario(string $matricula): ?array
    {
        return self::filas('SELECT * FROM Usuarios WHERE Matricula = ?', [$matricula])[0] ?? null;
    }

    // ---------- Llamar a los PHP ----------

    /** Ejecuta un PHP del módulo y regresa [código HTTP, JSON]. Opciones: cookies, datos (JSON). */
    private function llamar(string $archivo, array $op = []): array
    {
        $archivoCodigo = tempnam(sys_get_temp_dir(), 'ops_codigo_');
        $entorno = ['OPS_COOKIES' => json_encode($op['cookies'] ?? []), 'OPS_ARCHIVO_CODIGO' => $archivoCodigo];

        $resultado = self::ejecutarPhp($archivo, isset($op['datos']) ? json_encode($op['datos']) : '', $entorno);
        $codigo = (int) file_get_contents($archivoCodigo);
        @unlink($archivoCodigo);

        $this->assertSame('', $resultado['errores'], "{$archivo} mostró errores de PHP:\n" . $resultado['errores']);
        $this->assertIsArray($resultado['json'], "{$archivo} no respondió JSON válido. Respondió:\n" . $resultado['salida']);
        return [$codigo, $resultado['json']];
    }

    private static function sesion(int $tipo): array
    {
        return ['Id_usuario' => '1', 'Id_tipo_usuario' => (string) $tipo, 'Id_carrera' => (string) self::$computacion];
    }

    // =====================================================================
    // obtener_usuarios_pendientes.php
    // =====================================================================

    /**
     * Función   : obtener_usuarios_pendientes.php › rama del administrador (tipo 1).
     * Comprueba : que el administrador recibe los alumnos pendientes de su
     *             carrera y TODOS los coordinadores pendientes, con sus datos.
     *
     * @testdox [obtener_usuarios_pendientes.php] Comprueba que el administrador recibe alumnos y coordinadores pendientes
     */
    #[TestDox('[obtener_usuarios_pendientes.php] Comprueba que el administrador recibe alumnos y coordinadores pendientes')]
    public function test_pendientes_administrador(): void
    {
        self::catalogos();
        self::crearAlumno('20232389');
        self::crearCoordinador('1234');

        [$codigo, $r] = $this->llamar('obtener_usuarios_pendientes.php', ['cookies' => self::sesion(1)]);

        $this->assertSame(200, $codigo);
        $this->assertSame([[
            'Nombre_Completo' => 'Ana López Ruiz', 'Nombre_Carrera' => 'Ing. en Computación',
            'Matricula' => '20232389', 'Fecha_registro' => '2026-11-01 10:00:00', 'Servicio' => 'Servicio social',
        ]], $r['alumnos']);
        $this->assertSame([[
            'Nombre_Completo' => 'María Soto Ríos', 'Nombre_Carrera' => 'Ing. Química', 'Matricula' => '1234',
            'Fecha_registro' => '2026-10-20 09:00:00', 'Telefono' => '2461112233', 'Correo' => 'maria@uatx.mx',
        ]], $r['coordinadores']);
    }

    /**
     * Función   : obtener_usuarios_pendientes.php › rama del coordinador (tipo 3).
     * Comprueba : que el coordinador solo recibe alumnos pendientes y la lista
     *             de coordinadores vacía.
     *
     * @testdox [obtener_usuarios_pendientes.php] Comprueba que el coordinador solo recibe alumnos
     */
    #[TestDox('[obtener_usuarios_pendientes.php] Comprueba que el coordinador solo recibe alumnos')]
    public function test_pendientes_coordinador(): void
    {
        self::catalogos();
        self::crearAlumno('20232389');
        self::crearCoordinador('1234');

        [, $r] = $this->llamar('obtener_usuarios_pendientes.php', ['cookies' => self::sesion(3)]);

        $this->assertSame(['20232389'], array_column($r['alumnos'], 'Matricula'));
        $this->assertSame([], $r['coordinadores']);
        $this->assertSame('3', $r['tipo_usuario']);
    }

    /**
     * Función   : obtener_usuarios_pendientes.php › rama del alumno (tipo 2).
     * Comprueba : que a un alumno no se le regresa ninguna lista, solo su tipo.
     *
     * @testdox [obtener_usuarios_pendientes.php] Comprueba que a un alumno no se le regresan listas
     */
    #[TestDox('[obtener_usuarios_pendientes.php] Comprueba que a un alumno no se le regresan listas')]
    public function test_pendientes_alumno(): void
    {
        self::catalogos();
        self::crearAlumno('20232389');

        $this->assertSame([200, ['tipo_usuario' => '2']], $this->llamar('obtener_usuarios_pendientes.php', ['cookies' => self::sesion(2)]));
    }

    /**
     * Función   : obtener_usuarios_pendientes.php › filtros de la consulta.
     * Comprueba : que NO aparecen alumnos ya aceptados (Activo = 1), de otra
     *             carrera, ni coordinadores ya aceptados.
     *
     * @testdox [obtener_usuarios_pendientes.php] Comprueba que solo aparecen pendientes (de la carrera, en alumnos)
     */
    #[TestDox('[obtener_usuarios_pendientes.php] Comprueba que solo aparecen pendientes (de la carrera, en alumnos)')]
    public function test_pendientes_filtros(): void
    {
        self::catalogos();
        self::crearAlumno('20230001');
        self::crearAlumno('20230002', ['Activo' => 1]);
        self::crearAlumno('20230003', ['Id_carrera' => self::$quimica]);
        self::crearCoordinador('1001');
        self::crearCoordinador('1002', ['Activo' => 1]);
        self::crearCoordinador('1003', ['Id_carrera' => self::$computacion]);

        [, $r] = $this->llamar('obtener_usuarios_pendientes.php', ['cookies' => self::sesion(1)]);

        $this->assertSame(['20230001'], array_column($r['alumnos'], 'Matricula'));
        $this->assertEqualsCanonicalizing(['1001', '1003'], array_column($r['coordinadores'], 'Matricula'));
    }

    // =====================================================================
    // cargar_expediente.php
    // =====================================================================

    /**
     * Función   : cargar_expediente.php › UPDATE Actividades_Alumnos.
     * Comprueba : que guarda el No. de expediente en la actividad del alumno con
     *             esa matrícula (y no toca a los demás alumnos).
     *
     * @testdox [cargar_expediente.php] Comprueba que guarda el expediente en la actividad del alumno
     */
    #[TestDox('[cargar_expediente.php] Comprueba que guarda el expediente en la actividad del alumno')]
    public function test_expediente_se_guarda(): void
    {
        self::catalogos();
        $ana = self::crearAlumno('20232389');
        $luis = self::crearAlumno('20231111');

        $r = $this->llamar('cargar_expediente.php', ['datos' => ['matricula' => '20232389', 'no_expediente' => 'EXP-2026-01']]);

        $this->assertSame([200, ['success' => true]], $r);
        $this->assertSame('EXP-2026-01', self::filas('SELECT No_expediente FROM Actividades_Alumnos WHERE Id_alumno = ?', [$ana])[0]['No_expediente']);
        $this->assertNull(self::filas('SELECT No_expediente FROM Actividades_Alumnos WHERE Id_alumno = ?', [$luis])[0]['No_expediente']);
    }

    /**
     * Función   : cargar_expediente.php › if ($id_usuario_alumno != null).
     * Comprueba : que con una matrícula que no existe no cambia nada (y aun así
     *             responde success, como está programado).
     *
     * @testdox [cargar_expediente.php] Comprueba que con una matrícula inexistente no cambia nada
     */
    #[TestDox('[cargar_expediente.php] Comprueba que con una matrícula inexistente no cambia nada')]
    public function test_expediente_matricula_inexistente(): void
    {
        self::catalogos();
        self::crearAlumno('20232389');

        $r = $this->llamar('cargar_expediente.php', ['datos' => ['matricula' => '99999999', 'no_expediente' => 'EXP-X']]);

        $this->assertSame([200, ['success' => true]], $r);
        $this->assertSame([], self::filas('SELECT * FROM Actividades_Alumnos WHERE No_expediente IS NOT NULL'));
    }

    /**
     * Función   : cargar_expediente.php › catch (PDOException) del UPDATE.
     * Comprueba : que si el No. de expediente ya lo tiene otro alumno responde
     *             500 con el error y no lo repite.
     *
     * @testdox [cargar_expediente.php] Comprueba que un expediente repetido responde 500
     */
    #[TestDox('[cargar_expediente.php] Comprueba que un expediente repetido responde 500')]
    public function test_expediente_repetido(): void
    {
        self::catalogos();
        $ana = self::crearAlumno('20232389');
        self::crearAlumno('20231111');
        self::conexion()->prepare('UPDATE Actividades_Alumnos SET No_expediente = ? WHERE Id_alumno = ?')->execute(['EXP-1', $ana]);

        $r = $this->llamar('cargar_expediente.php', ['datos' => ['matricula' => '20231111', 'no_expediente' => 'EXP-1']]);

        $this->assertSame([500, ['error' => 'Error de actualizacion el numero de expediente']], $r);
        $this->assertCount(1, self::filas("SELECT * FROM Actividades_Alumnos WHERE No_expediente = 'EXP-1'"));
    }

    // =====================================================================
    // procesar_validacion.php
    // =====================================================================

    /**
     * Función   : procesar_validacion.php › identificador "Aceptado".
     * Comprueba : que aceptar activa al usuario (Activo = 1) y solo a ese.
     *
     * @testdox [procesar_validacion.php] Comprueba que "Aceptado" activa solo a ese usuario
     */
    #[TestDox('[procesar_validacion.php] Comprueba que "Aceptado" activa solo a ese usuario')]
    public function test_validacion_aceptar(): void
    {
        self::catalogos();
        self::crearAlumno('20232389');
        self::crearAlumno('20231111');

        $r = $this->llamar('procesar_validacion.php', ['datos' => ['matricula' => '20232389', 'identificador' => 'Aceptado']]);

        $this->assertSame([200, ['success' => true]], $r);
        $this->assertSame(1, (int) self::usuario('20232389')['Activo']);
        $this->assertSame(0, (int) self::usuario('20231111')['Activo']);
    }

    /**
     * Función   : procesar_validacion.php › identificador "Rechazado".
     * Comprueba : que rechazar elimina al usuario (y solo a ese).
     *
     * @testdox [procesar_validacion.php] Comprueba que "Rechazado" elimina solo a ese usuario
     */
    #[TestDox('[procesar_validacion.php] Comprueba que "Rechazado" elimina solo a ese usuario')]
    public function test_validacion_rechazar(): void
    {
        self::catalogos();
        self::crearAlumno('20232389');
        self::crearCoordinador('1234');

        $r = $this->llamar('procesar_validacion.php', ['datos' => ['matricula' => '1234', 'identificador' => 'Rechazado']]);

        $this->assertSame([200, ['success' => true]], $r);
        $this->assertNull(self::usuario('1234'));
        $this->assertNotNull(self::usuario('20232389'));
    }
}