<?php
// Configurações do Banco de Dados
$host = 'localhost'; // Geralmente 'localhost', mas pode variar na hospedagem
$db   = 'u787670524_ordempagamento'; // Seu nome de banco de dados
$user = 'u787670524_Facilita';     // Seu usuário do banco de dados
$pass = 'Fac1l1ta*';               // Sua senha do banco de dados
$charset = 'utf8mb4';              // Codificação de caracteres padrão

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Lança exceções para erros
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,     // Retorna linhas como arrays associativos
    PDO::ATTR_EMULATE_PREPARES   => false,                // Desabilita emulação de prepared statements para segurança
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    
    // *** ADIÇÕES PARA CONFIGURAR HORÁRIO DE BRASÍLIA ***
    // Define fuso horário do PHP para Brasília
    date_default_timezone_set('America/Sao_Paulo');
    
    // Define fuso horário do MySQL para Brasília (UTC-3)
    $pdo->exec("SET time_zone = '-03:00'");
    
} catch (\PDOException $e) {
    // Em caso de falha na conexão, loga o erro e encerra com mensagem genérica
    error_log("Falha na conexão com o banco de dados: " . $e->getMessage());
    die(json_encode(["success" => false, "error" => "Falha na conexão com o banco de dados. Por favor, tente novamente mais tarde."]));
}
?>