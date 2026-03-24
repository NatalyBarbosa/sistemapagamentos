<?php
require_once 'db_connect.php'; // Inclui a conexão com o banco de dados

// Cabeçalhos HTTP para JSON, CORS e controle de cache
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Ajuste conforme sua política de CORS em produção
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Cabeçalhos para desativar o cache (garante que o navegador sempre busque dados novos)
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: Sat, 26 Jul 1997 05:00:00 GMT'); // Data no passado distante

try {
    // Seleciona explicitamente todas as colunas necessárias para depósitos
    $stmt = $pdo->query("SELECT id, deposit_date, deposit_value, proof_data, proof_file_name, registered_at FROM deposits ORDER BY registered_at DESC");
    $deposits = $stmt->fetchAll(PDO::FETCH_ASSOC); // Usar FETCH_ASSOC para garantir que as chaves do array sejam os nomes das colunas

    echo json_encode(['success' => true, 'data' => $deposits]);

} catch (PDOException $e) {
    // Loga o erro no servidor para depuração
    error_log('Erro ao obter depósitos: ' . $e->getMessage());
    // Retorna uma mensagem de erro genérica ao cliente
    echo json_encode(['success' => false, 'error' => 'Erro ao obter depósitos: ' . $e->getMessage()]);
}
?>