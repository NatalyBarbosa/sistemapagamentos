<?php
// Ativa a exibição de todos os erros PHP na tela. ESSENCIAL para depuração.
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// config.php - ATUALIZADO COM NOVA INSTÂNCIA E LOG CENTRALIZADO

// === CONFIGURAÇÕES Z-API (NOVOS DADOS) ===
define('ZAPI_TOKEN', 'A2BE318D5AF857C8B693E139');
define('ZAPI_INSTANCE_ID', '3E8927A89445C179E5E6FA5FB5498E95');
define('ZAPI_CLIENT_TOKEN', 'F2e26928c126c4ff28d15c2ebf910fae2S');

// === CONFIGURAÇÕES DO BANCO DE DADOS ===
define('DB_HOST', 'localhost'); 
define('DB_NAME', 'u787670524_ordempagamento');
define('DB_USER', 'u787670524_Facilita');
define('DB_PASS', 'Fac1l1ta*'); 

// === TOKEN PARA A API DO BOT (ALTERE PARA UM TOKEN SEGURO) ===
define('BOT_API_TOKEN', 'bot_token_facilita_2024_secure_key_djael');

// === CONFIGURAÇÕES DE DEBUG ===
define('WHATSAPP_BOT_DEBUG_MODE', true);

// === CONFIGURAÇÕES DE TIMEZONE ===
date_default_timezone_set('America/Sao_Paulo');

// === CONFIGURAÇÕES DE CHARSET ===
ini_set('default_charset', 'UTF-8');

// === FUNÇÃO CENTRALIZADA DE LOG ===
if (!function_exists('log_message')) {
    function log_message($message, $level = 'info', $logFileName = 'general_log.log') {
        $logFile = __DIR__ . '/' . $logFileName; 
        file_put_contents($logFile, date('Y-m-d H:i:s') . " [{$level}] " . $message . PHP_EOL, FILE_APPEND);
        // Descomente a linha abaixo para enviar erros para o log de erro padrão do PHP (útil em alguns hosts)
        // if (defined('WHATSAPP_BOT_DEBUG_MODE') && WHATSAPP_BOT_DEBUG_MODE) {
        //     error_log("[{$level}] " . $message);
        // }
    }
}

file_put_contents(__DIR__ . '/debug_permission_test.log', date('Y-m-d H:i:s') . ' [PERMISSION_TEST] config.php included.' . PHP_EOL, FILE_APPEND);

// === CONEXÃO COM BANCO DE DADOS ===
$conn = null;
file_put_contents(__DIR__ . '/debug_permission_test.log', date('Y-m-d H:i:s') . ' [PERMISSION_TEST] Attempting DB connection.' . PHP_EOL, FILE_APPEND);
try {
    $conn = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    log_message("Conexão com o banco de dados estabelecida com sucesso.", 'INFO', 'db_log.log');
    file_put_contents(__DIR__ . '/debug_permission_test.log', date('Y-m-d H:i:s') . ' [PERMISSION_TEST] DB connection successful.' . PHP_EOL, FILE_APPEND);
} catch(PDOException $e) {
    // Registra o erro no log
    log_message("Erro de conexão com o banco de dados: " . $e->getMessage(), 'ERROR', 'db_error.log');
    file_put_contents(__DIR__ . '/debug_permission_test.log', date('Y-m-d H:i:s') . ' [PERMISSION_TEST] DB connection FAILED: ' . $e->getMessage() . PHP_EOL, FILE_APPEND);
    
    // Força a saída e imprime o erro diretamente, ignorando headers de JSON
    // Isso é crucial para pegar erros de PDO em ambientes restritivos.
    echo "<h1>Fatal Error</h1>";
    echo "<p>Could not connect to the database. Details: " . $e->getMessage() . "</p>";
    echo "<p>Please check your DB_HOST, DB_NAME, DB_USER, DB_PASS in config.php</p>";
    die(); 
}
file_put_contents(__DIR__ . '/debug_permission_test.log', date('Y-m-d H:i:s') . ' [PERMISSION_TEST] Finished DB connection block.' . PHP_EOL, FILE_APPEND);


// === FUNÇÃO PARA O BOT ACESSAR O BANCO ===
if (!function_exists('getDBConnection')) {
    function getDBConnection() {
        global $conn;
        return $conn;
    }
}
?>