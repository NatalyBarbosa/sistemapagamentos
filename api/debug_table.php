<?php
require_once 'config.php';

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8", DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Ver estrutura da tabela
    $structure = $pdo->query("DESCRIBE salaries")->fetchAll(PDO::FETCH_ASSOC);
    
    // Ver alguns registros existentes
    $sample = $pdo->query("SELECT * FROM salaries LIMIT 3")->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<h3>Estrutura da tabela salaries:</h3>";
    echo "<pre>" . print_r($structure, true) . "</pre>";
    
    echo "<h3>Registros de exemplo:</h3>";
    echo "<pre>" . print_r($sample, true) . "</pre>";
    
} catch (Exception $e) {
    echo "Erro: " . $e->getMessage();
}
?>