<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Permite requisições de qualquer origem
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: Sat, 26 Jul 1997 05:00:00 GMT'); // Data no passado distante

require_once 'db_connect.php'; // Inclui a conexão PDO já estabelecida

try {
    // Consulta SQL para buscar todas as ordens com status 'Paga'
    // Usando PDO, padronizando com get_orders.php
    $sql = "SELECT * FROM orders WHERE LOWER(TRIM(status)) = 'paga'";
    $stmt = $pdo->query($sql); // Executa a query
    $orders = $stmt->fetchAll(); // Pega todas as linhas

    // Processamento de dados similar ao get_orders.php para consistência
    foreach ($orders as &$order) {
        // Decodifica a string JSON da coluna 'payments'
        if (isset($order['payments']) && is_string($order['payments'])) {
            $decoded_payments = json_decode($order['payments'], true);
            $order['payments'] = (json_last_error() === JSON_ERROR_NONE) ? $decoded_payments : [];
        } else {
            $order['payments'] = [];
        }
        
        // Converte TINYINT(1) para booleanos
        $order['approvedByDiretoria'] = (bool)(isset($order['approvedByDiretoria']) ? $order['approvedByDiretoria'] : false);
        $order['approvedByFinanceiro'] = (bool)(isset($order['approvedByFinanceiro']) ? $order['approvedByFinanceiro'] : false);
        $order['isPaid'] = (bool)(isset($order['isPaid']) ? $order['isPaid'] : false);
        
        // Garante que paymentValue seja um float para cálculos no JS
        if (isset($order['paymentValue'])) {
            $order['paymentValue'] = (float)$order['paymentValue'];
        }
    }

    echo json_encode([
    'success' => true,
    'data' => $orders,
    'debug_tag' => 'VERSAO_20250825_CONFIRMADA_DL' // <<< Esta é a linha a adicionar
]);

} catch(PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erro ao buscar ordens para relatório: ' . $e->getMessage()]);
}
?>