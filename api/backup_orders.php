<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['orderIds']) || !is_array($input['orderIds'])) {
        throw new Exception('IDs das ordens não fornecidos');
    }
    
    $orderIds = $input['orderIds'];
    $count = count($orderIds);
    
    // Apenas confirma o recebimento - não altera banco
    echo json_encode([
        'success' => true,
        'message' => "$count ordens removidas da visualização com sucesso"
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>