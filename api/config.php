<?php
echo "DEBUG_CONFIG: INÍCIO DO ARQUIVO config.php - VERSÃO 2024-03-01<br>"; // ADICIONE ESTA LINHA

// config.php - Unificado e Corrigido (Versão FINAL e TESTADA)
define('DB_CHARSET', 'utf8mb4'); // Adicione esta linha! (se não estiver lá)

// === CONFIGURAÇÕES DE DEBUG E EXIBIÇÃO DE ERROS ===
if (!defined('WHATSAPP_BOT_DEBUG_MODE')) {
    define('WHATSAPP_BOT_DEBUG_MODE', false); // Padrão para false se não definido
}

if (WHATSAPP_BOT_DEBUG_MODE === true) {
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', 0);
    ini_set('display_startup_errors', 0);
    error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED); // Loga tudo, exceto Notices e Deprecated
}

// === CONFIGURAÇÕES Z-API ===
define('ZAPI_TOKEN', 'A2BE318D5AF857C8B693E139'); // SEU TOKEN REAL
define('ZAPI_INSTANCE_ID', '3E8927A89445C179E5E6FA5FB5498E95'); // SUA ID DE INSTÂNCIA REAL
define('ZAPI_CLIENT_TOKEN', 'F2e26928c126c4ff28d15c2ebf910fae2S');

// === CONFIGURAÇÕES DO BANCO DE DADOS ===
define('DB_HOST', 'localhost');
define('DB_NAME', 'u787670524_ordempagamento'); // SEU NOME DE BD REAL
define('DB_USER', 'u787670524_Facilita'); // SEU USUÁRIO DE BD REAL
define('DB_PASS', 'Fac1l1ta*'); // SUA SENHA DE BD REAL

// === TOKEN PARA A API DO BOT ===
define('BOT_API_TOKEN', 'bot_token_facilita_2024_secure_key_djael');

// === CONFIGURAÇÕES DE TIMEZONE ===
date_default_timezone_set('America/Sao_Paulo');

// === CONFIGURAÇÕES DE CHARSET ===
ini_set('default_charset', 'UTF-8');

// === FUNÇÃO CENTRALIZADA DE LOG ===
if (!function_exists('log_message')) {
    function log_message($message, $level = 'info', $logFileName = 'general_log.log') {
        $logDir = __DIR__ . '/logs/'; 
        $logFile = $logDir . $logFileName;

        if (!file_exists($logDir)) {
            mkdir($logDir, 0775, true);
        }

        file_put_contents($logFile, date('Y-m-d H:i:s') . " [{$level}] " . $message . PHP_EOL, FILE_APPEND);

        if (in_array($level, ['error', 'critical'])) {
            error_log("[{$level}] " . $message);
        }
    }
}

// === CONEXÃO COM BANCO DE DADOS ===
$conn = null;
try {
    $conn = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    
    $conn->exec("SET time_zone = '-03:00'");

    log_message("Conexão com o banco de dados estabelecida com sucesso.", 'INFO', 'db_log.log');
} catch(PDOException $e) {
    log_message("Erro de conexão com o banco de dados: " . $e->getMessage(), 'CRITICAL', 'db_error.log');

    if (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false || php_sapi_name() === 'cli') {
        header('Content-Type: application/json', true, 500);
        echo json_encode(['success' => false, 'error' => 'Database connection failed.']);
    } else {
        echo "<h1>Erro Fatal</h1>";
        echo "<p>Não foi possível conectar ao banco de dados.</p>";
        if (WHATSAPP_BOT_DEBUG_MODE === true) {
            echo "<p>Detalhes: " . $e->getMessage() . "</p>";
            echo "<p>Por favor, verifique as configurações DB_HOST, DB_NAME, DB_USER, DB_PASS no config.php</p>";
        } else {
            echo "<p>Por favor, entre em contato com o suporte técnico.</p>";
        }
    }
    die();
}

// === FUNÇÃO PARA OBTER A CONEXÃO COM O BANCO DE DADOS ===
if (!function_exists('getDBConnection')) {
    function getDBConnection() {
        global $conn;
        if (!$conn) {
            log_message("Tentativa de obter conexão DB falhou (conexão nula).", 'CRITICAL');
            throw new Exception("Database connection is not available.");
        }
        return $conn;
    }
}
echo "DEBUG_CONFIG: FIM DO ARQUIVO config.php<br>"; // ADICIONE ESTA LINHA
?>