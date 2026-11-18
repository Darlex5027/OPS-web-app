<?php
/**
 * Archivo      : LoginTest.php
 * Módulo       : CU_01_Login (Pruebas unitarias)
 * Archivo bajo prueba : app/CU_01_Login/login.php
 * Herramienta  : PHPUnit
 *
 * Cómo correrlo (con el Docker del proyecto prendido):
 *   vendor/bin/phpunit --testdox Pruebas_Unitarias/CU_01/LoginTest.php   (desde OPS-web-app)
 *
 * Descripción  : Pruebas de login.php. El código original NO se modifica.
 *   - Las pruebas usan una base de datos APARTE llamada "ops_pruebas_unitarias"
 *     que se crea sola. Tu base de datos real no se toca.
 *   - Si tu MySQL tiene contraseña, cámbiala en DB_PASS (abajo).
 *   - Como login.php termina con exit y lee php://input, se ejecuta en un
 *     proceso aparte y se le manda el JSON como si fuera una petición POST.
 *
 * login.php no tiene funciones declaradas: es un script que se ejecuta de arriba
 * a abajo. Por eso cada prueba indica el BLOQUE de login.php que prueba, usando
 * los mismos nombres de los comentarios del archivo:
 *   1. CONEXIÓN A LA BD          (try { new PDO(...) })
 *   2. LECTURA DE DATOS          (json_decode de php://input + validaciones)
 *   3. BUSCAR USUARIO
 *   4. VALIDACIONES              (Activo / Bloqueado)
 *   5. CONTRASEÑA                (password_verify + intentos fallidos)
 *   6. LOGIN EXITOSO             (reinicia intentos y Fecha_ultimo_acceso)
 *   7. PERMISOS
 *   8. ID CARRERA Y CONTEXTO ALUMNO
 *   9. SEGURIDAD                 (unset de la contraseña)
 *
 * Cada prueba indica:
 *   - Función   : bloque de login.php que se prueba.
 *   - Comprueba : qué comportamiento se verifica.
 */

namespace CU_01;

use PDO;
use PDOException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\TestDox;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class LoginTest extends TestCase
{
    // =========================
    // CONFIGURACIÓN DE LA BD DE PRUEBAS (cámbiala si es necesario)
    // =========================
    // Si la BD está en Docker, se busca sola la IP de este contenedor.
    // Si no usas Docker, pon aquí '' y escribe la dirección en DB_HOST.
    private const CONTENEDOR_DOCKER_BD = 'ops-web-app-database-1';
    private const DB_HOST = '127.0.0.1';
    private const DB_PORT = '3306';
    private const DB_USER = 'root';
    private const DB_PASS = ''; // si se deja vacía, se lee DB_ROOT_PASS del archivo .env del proyecto
    private const DB_NAME = 'ops_pruebas_unitarias'; // debe contener "prueba"

    private const CLAVE_CORRECTA = 'Clave123!';
    private const LOGIN_PHP = __DIR__ . '/../../app/CU_01_Login/login.php';

    private const PUENTE_DOCKER = 'ops-pruebas-puente-bd';
    private const PUERTO_PUENTE = '33061';

    private static ?PDO $pdo = null;
    private static ?array $destino = null;
    private static string $carpetaTemporal = '';

    public static function setUpBeforeClass(): void
    {
        self::prepararArchivosTemporales();
        self::crearEsquema();
    }

    protected function setUp(): void
    {
        foreach (['TipoUsuarios_Permiso', 'Permisos', 'Administradores', 'Alumnos', 'Usuarios'] as $tabla) {
            self::conexion()->exec("TRUNCATE TABLE `{$tabla}`");
        }
    }

    // =====================================================================
    // FUNCIONES DE APOYO (no son pruebas)
    // =====================================================================

    /**
     * Crea en la carpeta temporal del sistema dos archivos que necesita la prueba:
     *  - php/db.php: conexión a la BD de pruebas. login.php hace
     *    require_once("../php/db.php"); al ejecutarlo desde <temporal>/CU_01_Login,
     *    PHP carga este db.php en lugar del real.
     *  - simular_input.php: hace que php://input devuelva el JSON enviado por la prueba
     *    (en la terminal no existe el cuerpo de una petición HTTP).
     */
    private static function prepararArchivosTemporales(): void
    {
        $base = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'ops_pruebas_login';
        @mkdir($base . DIRECTORY_SEPARATOR . 'php', 0777, true);
        @mkdir($base . DIRECTORY_SEPARATOR . 'CU_01_Login', 0777, true);

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
PHP);

        self::$carpetaTemporal = $base;
    }

    /** Ejecuta login.php en un proceso aparte, le manda $cuerpo como petición POST y regresa su respuesta. */
    private static function ejecutarLoginPhp(?string $cuerpo, array $entornoExtra = []): array
    {
        $comando = [
            PHP_BINARY,
            '-d', 'auto_prepend_file=' . self::$carpetaTemporal . DIRECTORY_SEPARATOR . 'simular_input.php',
            '-d', 'display_errors=stderr',
            self::LOGIN_PHP,
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
            self::$carpetaTemporal . DIRECTORY_SEPARATOR . 'CU_01_Login',
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

    /** Crea las tablas que usa login.php en la BD de pruebas. */
    private static function crearEsquema(): void
    {
        $pdo = self::conexion();
        foreach (['TipoUsuarios_Permiso', 'Permisos', 'Administradores', 'Alumnos', 'Usuarios'] as $tabla) {
            $pdo->exec("DROP TABLE IF EXISTS `{$tabla}`");
        }
        $pdo->exec('CREATE TABLE Usuarios (
            Id_usuario INT AUTO_INCREMENT PRIMARY KEY,
            Matricula VARCHAR(8) NOT NULL UNIQUE,
            Contrasena VARCHAR(255) NOT NULL,
            Id_tipo_usuario INT NOT NULL,
            Activo TINYINT(1) NOT NULL DEFAULT 1,
            Bloqueado TINYINT(1) NOT NULL DEFAULT 0,
            Intentos_fallidos INT NOT NULL DEFAULT 0,
            Fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            Fecha_ultimo_acceso DATETIME NULL)');
        $pdo->exec('CREATE TABLE Alumnos (Id_alumno INT AUTO_INCREMENT PRIMARY KEY, Id_usuario INT NOT NULL, Id_carrera INT NULL)');
        $pdo->exec('CREATE TABLE Administradores (Id_administrador INT AUTO_INCREMENT PRIMARY KEY, Id_usuario INT NOT NULL, Id_carrera INT NULL)');
        $pdo->exec('CREATE TABLE Permisos (Id_permiso INT AUTO_INCREMENT PRIMARY KEY, Nombre_permiso VARCHAR(100) NOT NULL)');
        $pdo->exec('CREATE TABLE TipoUsuarios_Permiso (Id_tipo_usuario INT NOT NULL, Id_permiso INT NOT NULL)');
    }

    /** Inserta un usuario. Por defecto: alumno activo, no bloqueado, con contraseña CLAVE_CORRECTA. */
    private static function crearUsuario(array $datos = []): int
    {
        $datos += [
            'Matricula' => '20232389', 'Id_tipo_usuario' => 2,
            'Activo' => 1, 'Bloqueado' => 0, 'Intentos_fallidos' => 0,
        ];
        self::conexion()->prepare('INSERT INTO Usuarios
            (Matricula, Contrasena, Id_tipo_usuario, Activo, Bloqueado, Intentos_fallidos) VALUES (?, ?, ?, ?, ?, ?)')
            ->execute([
                $datos['Matricula'], password_hash(self::CLAVE_CORRECTA, PASSWORD_DEFAULT), $datos['Id_tipo_usuario'],
                $datos['Activo'], $datos['Bloqueado'], $datos['Intentos_fallidos'],
            ]);
        return (int) self::conexion()->lastInsertId();
    }

    private static function crearAlumno(int $idUsuario, ?int $idCarrera): int
    {
        self::conexion()->prepare('INSERT INTO Alumnos (Id_usuario, Id_carrera) VALUES (?, ?)')->execute([$idUsuario, $idCarrera]);
        return (int) self::conexion()->lastInsertId();
    }

    private static function crearAdministrador(int $idUsuario, ?int $idCarrera): void
    {
        self::conexion()->prepare('INSERT INTO Administradores (Id_usuario, Id_carrera) VALUES (?, ?)')->execute([$idUsuario, $idCarrera]);
    }

    /** Crea un permiso y se lo asigna a los tipos de usuario indicados. */
    private static function crearPermiso(string $nombre, array $tiposUsuario): void
    {
        self::conexion()->prepare('INSERT INTO Permisos (Nombre_permiso) VALUES (?)')->execute([$nombre]);
        $idPermiso = (int) self::conexion()->lastInsertId();
        foreach ($tiposUsuario as $tipo) {
            self::conexion()->prepare('INSERT INTO TipoUsuarios_Permiso (Id_tipo_usuario, Id_permiso) VALUES (?, ?)')
                ->execute([$tipo, $idPermiso]);
        }
    }

    /** Lee un usuario directamente de la BD para revisar qué cambió. */
    private static function usuario(int $idUsuario): array
    {
        $stmt = self::conexion()->prepare('SELECT * FROM Usuarios WHERE Id_usuario = ?');
        $stmt->execute([$idUsuario]);
        return $stmt->fetch();
    }

    /** Envía un arreglo como JSON a login.php y regresa la respuesta decodificada. */
    private function iniciarSesion(array $datos): array
    {
        return $this->enviarCuerpo(json_encode($datos));
    }

    private function enviarCuerpo(?string $cuerpo): array
    {
        $resultado = self::ejecutarLoginPhp($cuerpo);

        $this->assertSame('', $resultado['errores'], "login.php mostró errores de PHP:\n" . $resultado['errores']);
        $this->assertIsArray($resultado['json'], "login.php no respondió JSON válido. Respondió:\n" . $resultado['salida']);

        return $resultado['json'];
    }

    private function assertError(string $codigoEsperado, array $respuesta): void
    {
        $this->assertSame(['success' => false, 'error' => $codigoEsperado], $respuesta);
    }

    // =====================================================================
    // BLOQUE 2: LECTURA DE DATOS DE ENTRADA
    // =====================================================================

    public static function cuerposInvalidos(): array
    {
        return [
            'cuerpo vacío'       => [''],
            'JSON mal formado'   => ['{matricula: 1234'],
            'texto plano'        => ['hola'],
            'arreglo JSON vacío' => ['[]'],
        ];
    }

    /**
     * Función   : login.php › LECTURA DE DATOS (json_decode de php://input).
     * Comprueba : que si el cuerpo de la petición no es un JSON válido (o viene
     *             vacío) se responde el error "datos_invalidos".
     *
     * @testdox [LECTURA DE DATOS] Comprueba que un cuerpo que no es JSON válido responde "datos_invalidos"
     * @dataProvider cuerposInvalidos
     */
    #[TestDox('[LECTURA DE DATOS] Comprueba que un cuerpo que no es JSON válido responde "datos_invalidos"')]
    #[DataProvider('cuerposInvalidos')]
    public function test_responde_datos_invalidos_si_el_cuerpo_no_es_json_valido(string $cuerpo): void
    {
        $this->assertError('datos_invalidos', $this->enviarCuerpo($cuerpo));
    }

    public static function datosIncompletos(): array
    {
        return [
            'sin matrícula'               => [['contrasena' => 'Clave123!']],
            'sin contraseña'              => [['matricula' => '20232389']],
            'matrícula vacía'             => [['matricula' => '', 'contrasena' => 'Clave123!']],
            'matrícula solo con espacios' => [['matricula' => '   ', 'contrasena' => 'Clave123!']],
            'contraseña vacía'            => [['matricula' => '20232389', 'contrasena' => '']],
        ];
    }

    /**
     * Función   : login.php › LECTURA DE DATOS (if (!$matricula || !$contrasena)).
     * Comprueba : que si falta la matrícula o la contraseña (o vienen vacías)
     *             se responde el error "datos_incompletos".
     *
     * @testdox [LECTURA DE DATOS] Comprueba que si falta matrícula o contraseña responde "datos_incompletos"
     * @dataProvider datosIncompletos
     */
    #[TestDox('[LECTURA DE DATOS] Comprueba que si falta matrícula o contraseña responde "datos_incompletos"')]
    #[DataProvider('datosIncompletos')]
    public function test_responde_datos_incompletos_si_falta_matricula_o_contrasena(array $datos): void
    {
        $this->assertError('datos_incompletos', $this->iniciarSesion($datos));
    }

    public static function matriculasConFormatoInvalido(): array
    {
        return [
            '3 dígitos'          => ['123'],
            '5 dígitos'          => ['12345'],
            '7 dígitos'          => ['1234567'],
            '9 dígitos'          => ['123456789'],
            'letras'             => ['abcd'],
            'letras y números'   => ['2023a389'],
            'con guion'          => ['2023-238'],
            'con salto de línea' => ["1234\n5678"],
        ];
    }

    /**
     * Función   : login.php › LECTURA DE DATOS (preg_match de la matrícula).
     * Comprueba : que una matrícula que no tiene exactamente 4 u 8 dígitos se
     *             rechaza con el error "formato_matricula_invalido".
     *
     * @testdox [LECTURA DE DATOS] Comprueba que una matrícula que no es de 4 u 8 dígitos responde "formato_matricula_invalido"
     * @dataProvider matriculasConFormatoInvalido
     */
    #[TestDox('[LECTURA DE DATOS] Comprueba que una matrícula que no es de 4 u 8 dígitos responde "formato_matricula_invalido"')]
    #[DataProvider('matriculasConFormatoInvalido')]
    public function test_responde_formato_matricula_invalido(string $matricula): void
    {
        $respuesta = $this->iniciarSesion(['matricula' => $matricula, 'contrasena' => 'Clave123!']);

        $this->assertError('formato_matricula_invalido', $respuesta);
    }

    /**
     * Función   : login.php › LECTURA DE DATOS (trim de la matrícula).
     * Comprueba : que una matrícula con espacios al inicio y al final se limpia
     *             y el usuario puede iniciar sesión.
     *
     * @testdox [LECTURA DE DATOS] Comprueba que acepta una matrícula con espacios alrededor (trim)
     */
    #[TestDox('[LECTURA DE DATOS] Comprueba que acepta una matrícula con espacios alrededor (trim)')]
    public function test_acepta_matricula_con_espacios_alrededor(): void
    {
        self::crearUsuario();

        $respuesta = $this->iniciarSesion(['matricula' => '  20232389  ', 'contrasena' => self::CLAVE_CORRECTA]);

        $this->assertTrue($respuesta['success']);
    }

    // =====================================================================
    // BLOQUE 3: BUSCAR USUARIO
    // =====================================================================

    /**
     * Función   : login.php › BUSCAR USUARIO (SELECT ... WHERE Matricula = ?).
     * Comprueba : que si no existe ningún usuario con esa matrícula se responde
     *             el error "matricula_no_existe".
     *
     * @testdox [BUSCAR USUARIO] Comprueba que una matrícula que no está registrada responde "matricula_no_existe"
     */
    #[TestDox('[BUSCAR USUARIO] Comprueba que una matrícula que no está registrada responde "matricula_no_existe"')]
    public function test_responde_matricula_no_existe_si_no_hay_usuario_con_esa_matricula(): void
    {
        self::crearUsuario(['Matricula' => '11111111']);

        $respuesta = $this->iniciarSesion(['matricula' => '20232389', 'contrasena' => 'Clave123!']);

        $this->assertError('matricula_no_existe', $respuesta);
    }

    // =====================================================================
    // BLOQUE 4: VALIDACIONES (Activo / Bloqueado)
    // =====================================================================

    /**
     * Función   : login.php › VALIDACIONES (if (!$datos_usuario['Activo'])).
     * Comprueba : que un usuario con la cuenta inactiva no puede entrar aunque su
     *             contraseña sea correcta, y se responde "usuario_inactivo".
     *
     * @testdox [VALIDACIONES] Comprueba que una cuenta inactiva responde "usuario_inactivo"
     */
    #[TestDox('[VALIDACIONES] Comprueba que una cuenta inactiva responde "usuario_inactivo"')]
    public function test_responde_usuario_inactivo_si_la_cuenta_no_esta_activa(): void
    {
        self::crearUsuario(['Activo' => 0]);

        $respuesta = $this->iniciarSesion(['matricula' => '20232389', 'contrasena' => self::CLAVE_CORRECTA]);

        $this->assertError('usuario_inactivo', $respuesta);
    }

    /**
     * Función   : login.php › VALIDACIONES (if ($datos_usuario['Bloqueado'])).
     * Comprueba : que un usuario bloqueado no puede entrar aunque su contraseña
     *             sea correcta, y se responde "usuario_bloqueado".
     *
     * @testdox [VALIDACIONES] Comprueba que un usuario bloqueado responde "usuario_bloqueado" aunque la contraseña sea correcta
     */
    #[TestDox('[VALIDACIONES] Comprueba que un usuario bloqueado responde "usuario_bloqueado" aunque la contraseña sea correcta')]
    public function test_responde_usuario_bloqueado_aunque_la_contrasena_sea_correcta(): void
    {
        self::crearUsuario(['Bloqueado' => 1, 'Intentos_fallidos' => 3]);

        $respuesta = $this->iniciarSesion(['matricula' => '20232389', 'contrasena' => self::CLAVE_CORRECTA]);

        $this->assertError('usuario_bloqueado', $respuesta);
    }

    /**
     * Función   : login.php › VALIDACIONES (orden de las revisiones).
     * Comprueba : que si una cuenta está inactiva Y bloqueada, primero se revisa
     *             que esté activa (responde "usuario_inactivo").
     *
     * @testdox [VALIDACIONES] Comprueba que la cuenta inactiva se revisa antes que el bloqueo
     */
    #[TestDox('[VALIDACIONES] Comprueba que la cuenta inactiva se revisa antes que el bloqueo')]
    public function test_la_cuenta_inactiva_se_revisa_antes_que_el_bloqueo(): void
    {
        self::crearUsuario(['Activo' => 0, 'Bloqueado' => 1]);

        $respuesta = $this->iniciarSesion(['matricula' => '20232389', 'contrasena' => self::CLAVE_CORRECTA]);

        $this->assertError('usuario_inactivo', $respuesta);
    }

    /**
     * Función   : login.php › VALIDACIONES (el bloqueo se revisa antes que la contraseña).
     * Comprueba : que si un usuario bloqueado escribe mal la contraseña, su
     *             contador de intentos fallidos NO cambia.
     *
     * @testdox [VALIDACIONES] Comprueba que un usuario bloqueado no aumenta sus intentos fallidos
     */
    #[TestDox('[VALIDACIONES] Comprueba que un usuario bloqueado no aumenta sus intentos fallidos')]
    public function test_usuario_bloqueado_no_aumenta_intentos_aunque_la_contrasena_sea_incorrecta(): void
    {
        $id = self::crearUsuario(['Bloqueado' => 1, 'Intentos_fallidos' => 3]);

        $respuesta = $this->iniciarSesion(['matricula' => '20232389', 'contrasena' => 'otra']);

        $this->assertError('usuario_bloqueado', $respuesta);
        $this->assertSame(3, (int) self::usuario($id)['Intentos_fallidos']);
    }

    // =====================================================================
    // BLOQUE 5: CONTRASEÑA (password_verify + intentos fallidos)
    // =====================================================================

    /**
     * Función   : login.php › CONTRASEÑA (password_verify + UPDATE Intentos_fallidos).
     * Comprueba : que una contraseña incorrecta responde "contrasena_incorrecta",
     *             suma 1 a Intentos_fallidos y todavía NO bloquea al usuario.
     *
     * @testdox [CONTRASEÑA] Comprueba que una contraseña incorrecta suma un intento fallido sin bloquear
     */
    #[TestDox('[CONTRASEÑA] Comprueba que una contraseña incorrecta suma un intento fallido sin bloquear')]
    public function test_contrasena_incorrecta_suma_un_intento_fallido_sin_bloquear(): void
    {
        $id = self::crearUsuario(['Intentos_fallidos' => 0]);

        $respuesta = $this->iniciarSesion(['matricula' => '20232389', 'contrasena' => 'incorrecta']);

        $this->assertError('contrasena_incorrecta', $respuesta);
        $usuario = self::usuario($id);
        $this->assertSame(1, (int) $usuario['Intentos_fallidos']);
        $this->assertSame(0, (int) $usuario['Bloqueado']);
    }

    /**
     * Función   : login.php › CONTRASEÑA (if ($intentos >= 3) → else).
     * Comprueba : que el segundo intento fallido deja Intentos_fallidos en 2 y
     *             el usuario todavía NO queda bloqueado.
     *
     * @testdox [CONTRASEÑA] Comprueba que el segundo intento fallido todavía no bloquea
     */
    #[TestDox('[CONTRASEÑA] Comprueba que el segundo intento fallido todavía no bloquea')]
    public function test_el_segundo_intento_fallido_todavia_no_bloquea(): void
    {
        $id = self::crearUsuario(['Intentos_fallidos' => 1]);

        $this->iniciarSesion(['matricula' => '20232389', 'contrasena' => 'incorrecta']);

        $usuario = self::usuario($id);
        $this->assertSame(2, (int) $usuario['Intentos_fallidos']);
        $this->assertSame(0, (int) $usuario['Bloqueado']);
    }

    /**
     * Función   : login.php › CONTRASEÑA (if ($intentos >= 3) → Bloqueado = 1).
     * Comprueba : que el tercer intento fallido deja Intentos_fallidos en 3 y
     *             bloquea al usuario (Bloqueado = 1).
     *
     * @testdox [CONTRASEÑA] Comprueba que el tercer intento fallido bloquea al usuario
     */
    #[TestDox('[CONTRASEÑA] Comprueba que el tercer intento fallido bloquea al usuario')]
    public function test_el_tercer_intento_fallido_bloquea_al_usuario(): void
    {
        $id = self::crearUsuario(['Intentos_fallidos' => 2]);

        $respuesta = $this->iniciarSesion(['matricula' => '20232389', 'contrasena' => 'incorrecta']);

        $this->assertError('contrasena_incorrecta', $respuesta);
        $usuario = self::usuario($id);
        $this->assertSame(3, (int) $usuario['Intentos_fallidos']);
        $this->assertSame(1, (int) $usuario['Bloqueado']);
    }

    /**
     * Función   : login.php › CONTRASEÑA + VALIDACIONES (flujo completo de bloqueo).
     * Comprueba : que después de 3 contraseñas incorrectas seguidas el usuario
     *             queda bloqueado y ya no puede entrar ni con la contraseña correcta.
     *
     * @testdox [CONTRASEÑA] Comprueba que tras 3 intentos fallidos ni la contraseña correcta permite entrar
     */
    #[TestDox('[CONTRASEÑA] Comprueba que tras 3 intentos fallidos ni la contraseña correcta permite entrar')]
    public function test_tres_intentos_seguidos_bloquean_y_despues_ni_la_clave_correcta_entra(): void
    {
        self::crearUsuario();
        $credencialesMalas = ['matricula' => '20232389', 'contrasena' => 'incorrecta'];

        $this->assertError('contrasena_incorrecta', $this->iniciarSesion($credencialesMalas));
        $this->assertError('contrasena_incorrecta', $this->iniciarSesion($credencialesMalas));
        $this->assertError('contrasena_incorrecta', $this->iniciarSesion($credencialesMalas));

        $respuesta = $this->iniciarSesion(['matricula' => '20232389', 'contrasena' => self::CLAVE_CORRECTA]);
        $this->assertError('usuario_bloqueado', $respuesta);
    }

    /**
     * Función   : login.php › CONTRASEÑA (password_verify).
     * Comprueba : que la contraseña distingue mayúsculas de minúsculas.
     *
     * @testdox [CONTRASEÑA] Comprueba que la contraseña distingue mayúsculas y minúsculas
     */
    #[TestDox('[CONTRASEÑA] Comprueba que la contraseña distingue mayúsculas y minúsculas')]
    public function test_la_contrasena_distingue_mayusculas_y_minusculas(): void
    {
        self::crearUsuario();

        $respuesta = $this->iniciarSesion(['matricula' => '20232389', 'contrasena' => strtolower(self::CLAVE_CORRECTA)]);

        $this->assertError('contrasena_incorrecta', $respuesta);
    }

    /**
     * Función   : login.php › CONTRASEÑA (UPDATE ... WHERE Id_usuario = ?).
     * Comprueba : que un intento fallido solo suma intentos al usuario que lo
     *             hizo y no a los demás.
     *
     * @testdox [CONTRASEÑA] Comprueba que un intento fallido solo afecta al usuario que lo hizo
     */
    #[TestDox('[CONTRASEÑA] Comprueba que un intento fallido solo afecta al usuario que lo hizo')]
    public function test_un_intento_fallido_solo_afecta_al_usuario_que_lo_hizo(): void
    {
        $idOtro = self::crearUsuario(['Matricula' => '11112222']);
        self::crearUsuario(['Matricula' => '20232389']);

        $this->iniciarSesion(['matricula' => '20232389', 'contrasena' => 'incorrecta']);

        $this->assertSame(0, (int) self::usuario($idOtro)['Intentos_fallidos']);
    }

    // =====================================================================
    // BLOQUE 6: LOGIN EXITOSO
    // =====================================================================

    /**
     * Función   : login.php › LOGIN EXITOSO (UPDATE Intentos_fallidos = 0, Fecha_ultimo_acceso = NOW()).
     * Comprueba : que al entrar correctamente se reinician los intentos fallidos
     *             a 0 y se guarda la fecha del último acceso.
     *
     * @testdox [LOGIN EXITOSO] Comprueba que reinicia los intentos fallidos y guarda la fecha de último acceso
     */
    #[TestDox('[LOGIN EXITOSO] Comprueba que reinicia los intentos fallidos y guarda la fecha de último acceso')]
    public function test_login_exitoso_reinicia_intentos_y_guarda_fecha_de_ultimo_acceso(): void
    {
        $id = self::crearUsuario(['Intentos_fallidos' => 2]);
        $this->assertNull(self::usuario($id)['Fecha_ultimo_acceso']);

        $respuesta = $this->iniciarSesion(['matricula' => '20232389', 'contrasena' => self::CLAVE_CORRECTA]);

        $this->assertTrue($respuesta['success']);
        $usuario = self::usuario($id);
        $this->assertSame(0, (int) $usuario['Intentos_fallidos']);
        $this->assertSame(0, (int) $usuario['Bloqueado']);
        $this->assertNotNull($usuario['Fecha_ultimo_acceso']);
    }

    // =====================================================================
    // BLOQUE 7: PERMISOS
    // =====================================================================

    /**
     * Función   : login.php › PERMISOS (JOIN TipoUsuarios_Permiso / Permisos).
     * Comprueba : que un usuario sin permisos asignados recibe "permisos" como
     *             lista vacía.
     *
     * @testdox [PERMISOS] Comprueba que un usuario sin permisos recibe una lista vacía
     */
    #[TestDox('[PERMISOS] Comprueba que un usuario sin permisos recibe una lista vacía')]
    public function test_usuario_sin_permisos_recibe_lista_vacia(): void
    {
        self::crearUsuario();

        $respuesta = $this->iniciarSesion(['matricula' => '20232389', 'contrasena' => self::CLAVE_CORRECTA]);

        $this->assertSame([], $respuesta['permisos']);
    }

    // =====================================================================
    // BLOQUE 8: ID CARRERA Y CONTEXTO ALUMNO (+ PERMISOS)
    // =====================================================================

    /**
     * Función   : login.php › PERMISOS + ID CARRERA Y CONTEXTO ALUMNO (Id_tipo_usuario == 2).
     * Comprueba : que un alumno recibe su Id_carrera e Id_alumno de la tabla
     *             Alumnos y SOLO los permisos de su tipo de usuario.
     *
     * @testdox [ID CARRERA Y CONTEXTO ALUMNO] Comprueba que un alumno recibe su carrera, su Id_alumno y solo sus permisos
     */
    #[TestDox('[ID CARRERA Y CONTEXTO ALUMNO] Comprueba que un alumno recibe su carrera, su Id_alumno y solo sus permisos')]
    public function test_alumno_inicia_sesion_y_recibe_sus_datos_carrera_alumno_y_permisos(): void
    {
        $idUsuario = self::crearUsuario(['Id_tipo_usuario' => 2]);
        $idAlumno  = self::crearAlumno($idUsuario, 4);
        self::crearPermiso('ver_perfil', [1, 2, 3]);
        self::crearPermiso('subir_documentos', [2]);
        self::crearPermiso('gestionar_alumnos', [3]); // no es de alumno

        $respuesta = $this->iniciarSesion(['matricula' => '20232389', 'contrasena' => self::CLAVE_CORRECTA]);

        $this->assertTrue($respuesta['success']);
        $this->assertSame($idUsuario, (int) $respuesta['usuario']['Id_usuario']);
        $this->assertSame('20232389', $respuesta['usuario']['Matricula']);
        $this->assertSame(4, (int) $respuesta['usuario']['Id_carrera']);
        $this->assertSame($idAlumno, (int) $respuesta['usuario']['Id_alumno']);
        $this->assertEqualsCanonicalizing(['ver_perfil', 'subir_documentos'], $respuesta['permisos']);
    }

    /**
     * Función   : login.php › ID CARRERA Y CONTEXTO ALUMNO (alumno sin registro en Alumnos).
     * Comprueba : que si un alumno no tiene fila en la tabla Alumnos, su
     *             Id_carrera e Id_alumno se devuelven como null (sin errores).
     *
     * @testdox [ID CARRERA Y CONTEXTO ALUMNO] Comprueba que un alumno sin registro en Alumnos tiene carrera e Id_alumno nulos
     */
    #[TestDox('[ID CARRERA Y CONTEXTO ALUMNO] Comprueba que un alumno sin registro en Alumnos tiene carrera e Id_alumno nulos')]
    public function test_alumno_sin_registro_en_alumnos_tiene_carrera_e_id_alumno_nulos(): void
    {
        self::crearUsuario(['Id_tipo_usuario' => 2]);

        $respuesta = $this->iniciarSesion(['matricula' => '20232389', 'contrasena' => self::CLAVE_CORRECTA]);

        $this->assertTrue($respuesta['success']);
        $this->assertNull($respuesta['usuario']['Id_carrera']);
        $this->assertNull($respuesta['usuario']['Id_alumno']);
    }

    /**
     * Función   : login.php › PERMISOS + ID CARRERA Y CONTEXTO ALUMNO (Id_tipo_usuario 3).
     * Comprueba : que un coordinador recibe su Id_carrera de la tabla
     *             Administradores, Id_alumno = null y sus propios permisos.
     *
     * @testdox [ID CARRERA Y CONTEXTO ALUMNO] Comprueba que un coordinador recibe su carrera de Administradores y sin Id_alumno
     */
    #[TestDox('[ID CARRERA Y CONTEXTO ALUMNO] Comprueba que un coordinador recibe su carrera de Administradores y sin Id_alumno')]
    public function test_coordinador_recibe_la_carrera_de_administradores_y_sin_id_alumno(): void
    {
        $id = self::crearUsuario(['Matricula' => '1234', 'Id_tipo_usuario' => 3]);
        self::crearAdministrador($id, 7);
        self::crearPermiso('gestionar_alumnos', [3]);

        $respuesta = $this->iniciarSesion(['matricula' => '1234', 'contrasena' => self::CLAVE_CORRECTA]);

        $this->assertTrue($respuesta['success']);
        $this->assertSame(7, (int) $respuesta['usuario']['Id_carrera']);
        $this->assertNull($respuesta['usuario']['Id_alumno']);
        $this->assertSame(['gestionar_alumnos'], $respuesta['permisos']);
    }

    /**
     * Función   : login.php › ID CARRERA Y CONTEXTO ALUMNO (Id_tipo_usuario 1).
     * Comprueba : que un administrador (tipo 1) recibe su Id_carrera de la tabla
     *             Administradores e Id_alumno = null.
     *
     * @testdox [ID CARRERA Y CONTEXTO ALUMNO] Comprueba que un administrador (tipo 1) recibe su carrera de Administradores
     */
    #[TestDox('[ID CARRERA Y CONTEXTO ALUMNO] Comprueba que un administrador (tipo 1) recibe su carrera de Administradores')]
    public function test_administrador_tipo_1_recibe_la_carrera_de_administradores(): void
    {
        $id = self::crearUsuario(['Matricula' => '9999', 'Id_tipo_usuario' => 1]);
        self::crearAdministrador($id, 2);

        $respuesta = $this->iniciarSesion(['matricula' => '9999', 'contrasena' => self::CLAVE_CORRECTA]);

        $this->assertTrue($respuesta['success']);
        $this->assertSame(2, (int) $respuesta['usuario']['Id_carrera']);
        $this->assertNull($respuesta['usuario']['Id_alumno']);
    }

    /**
     * Función   : login.php › ID CARRERA Y CONTEXTO ALUMNO (administrador sin registro en Administradores).
     * Comprueba : que si un administrador no tiene fila en Administradores, su
     *             Id_carrera se devuelve como null (sin errores).
     *
     * @testdox [ID CARRERA Y CONTEXTO ALUMNO] Comprueba que un administrador sin registro en Administradores tiene carrera nula
     */
    #[TestDox('[ID CARRERA Y CONTEXTO ALUMNO] Comprueba que un administrador sin registro en Administradores tiene carrera nula')]
    public function test_administrador_sin_registro_en_administradores_tiene_carrera_nula(): void
    {
        self::crearUsuario(['Matricula' => '9999', 'Id_tipo_usuario' => 1]);

        $respuesta = $this->iniciarSesion(['matricula' => '9999', 'contrasena' => self::CLAVE_CORRECTA]);

        $this->assertTrue($respuesta['success']);
        $this->assertNull($respuesta['usuario']['Id_carrera']);
    }

    // =====================================================================
    // BLOQUE 9: SEGURIDAD
    // =====================================================================

    /**
     * Función   : login.php › SEGURIDAD (unset($datos_usuario['Contrasena'])).
     * Comprueba : que la respuesta del login exitoso NUNCA incluye la contraseña
     *             (ni siquiera el hash).
     *
     * @testdox [SEGURIDAD] Comprueba que la respuesta nunca incluye la contraseña
     */
    #[TestDox('[SEGURIDAD] Comprueba que la respuesta nunca incluye la contraseña')]
    public function test_la_respuesta_nunca_incluye_la_contrasena(): void
    {
        $id = self::crearUsuario();
        self::crearAlumno($id, 1);

        $respuesta = $this->iniciarSesion(['matricula' => '20232389', 'contrasena' => self::CLAVE_CORRECTA]);

        $this->assertTrue($respuesta['success']);
        $this->assertArrayNotHasKey('Contrasena', $respuesta['usuario']);
    }

    // =====================================================================
    // BLOQUE 1: CONEXIÓN A LA BD
    // =====================================================================

    /**
     * Función   : login.php › CONEXIÓN A LA BD (catch PDOException).
     * Comprueba : que si no se puede conectar a la base de datos se responde
     *             success = false con el error "error_conexion_db" y un mensaje.
     *
     * @testdox [CONEXIÓN A LA BD] Comprueba que si no se puede conectar responde "error_conexion_db"
     */
    #[TestDox('[CONEXIÓN A LA BD] Comprueba que si no se puede conectar responde "error_conexion_db"')]
    public function test_responde_error_conexion_db_si_no_se_puede_conectar(): void
    {
        $resultado = self::ejecutarLoginPhp(
            json_encode(['matricula' => '20232389', 'contrasena' => 'x']),
            ['OPS_FORZAR_ERROR_DB' => '1']
        );

        $this->assertIsArray($resultado['json'], "Respuesta no JSON:\n" . $resultado['salida']);
        $this->assertFalse($resultado['json']['success']);
        $this->assertSame('error_conexion_db', $resultado['json']['error']);
        $this->assertArrayHasKey('message', $resultado['json']);
    }
}