<?php
// Cabeçalhos HTTP para JSON, CORS e controle de cache
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Ajuste conforme sua política de CORS em produção
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Cabeçalhos para desativar o cache (garante que o navegador sempre busque dados novos)
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: Sat, 26 Jul 1997 05:00:00 GMT'); // Data no passado distante

require_once 'db_connect.php'; // Inclui a conexão com o banco de dados

try {
    // Seleciona todas as colunas da tabela 'salaries'.
    // Importante: APENAS registros com 'isBackedUp = 0' são retornados por padrão.
    // Isso garante que salários arquivados não apareçam na lista principal.
    $stmt = $pdo->query("SELECT * FROM salaries WHERE isBackedUp = 0 ORDER BY createdAt DESC");
    $salaries = $stmt->fetchAll(PDO::FETCH_ASSOC); // <--- Adicionado PDO::FETCH_ASSOC para consistência

    // Processamento dos dados para o frontend
    foreach ($salaries as &$salary) { // Use & para modificar o array original
        // Garante que 'value' seja um float para cálculos no JS
        if (isset($salary['value'])) {
            $salary['value'] = (float)$salary['value'];
        }
        // Converte TINYINT(1) (0 ou 1) para boolean (false ou true) para o frontend
        $salary['isBackedUp'] = (bool)(isset($salary['isBackedUp']) ? $salary['isBackedUp'] : false); // Garante que a chave existe e é booleana
    }

    echo json_encode(['success' => true, 'data' => $salaries]);

} catch(PDOException $e) {
    // Loga o erro no servidor para depuração
    error_log('Erro ao buscar salários: ' . $e->getMessage());
    // Retorna uma mensagem de erro genérica ao cliente
    echo json_encode(['success' => false, 'error' => 'Erro ao buscar salários. Por favor, tente novamente mais tarde.']);
}