<?php
// database.php - Funções de acesso ao banco para o bot

require_once __DIR__ . '/config.php';

function getDBConnection() {
    global $conn;
    if (!$conn) {
        throw new Exception("Conexão PDO não disponível globalmente.");
    }
    return $conn;
}
?>