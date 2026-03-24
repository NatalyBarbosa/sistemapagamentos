<?php
// api/bulk_reprove_financeiro.php

header('Content-Type: application/json');
require_once __DIR__ . '/db_connect.php'; // USANDO SEU ARQUIVO DE CONEXÃO
require_once __DIR__ . '/auth_utils.php';   // O ARQUIVO QUE VOCÊ ACABOU DE CRIAR

// Configurações de depuração (opcional, REMOVA em produção)
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/bulk_financeiro_errors.log');
error_reporting(E_ALL);

$response = ['success' => false, 'message' => '', 'affected_rows' => 0];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    $response['message'] = 'Método não permitido.';
    echo json_encode($response);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$order_ids = $input['order_ids'] ?? [];
$reason = $input['reason'] ?? 'Motivo não especificado';

if (empty($order_ids) || !is_array($order_ids)) {
    http_response_code(400);
    $response['message'] = 'IDs das ordens não fornecidos ou inválidos.';
    echo json_encode($response);
    exit;
}

if (!hasPermission(['Geral', 'Financeiro'])) {
    http_response_code(403);
    $response['message'] = 'Acesso negado. Você não tem permissão para reprovar ordens pelo Financeiro.';
    echo json_encode($response);
    exit;
}

try {
    $placeholders = implode(',', array_fill(0, count($order_ids), '?'));

    // Reprova ordens pelo Financeiro: status volta para 'Aguardando Financeiro',
    // aprovação financeira resetada. Motivo da reprovação é adicionado.
    $stmt = $pdo->prepare(
        "UPDATE orders 
         SET status = 'Aguardando Financeiro', 
             approvedByFinanceiro = 0, 
             reprovedByFinanceiroReason = ?,
             approvalDateFinanceiro = NULL
         WHERE id IN ($placeholders) 
         AND status = 'Aguardando Pagamento'" // Só reprova ordens que estão como 'Aguardando Pagamento'
    );
    
    $params = [$reason];
    foreach ($order_ids as $id) {
        $params[] = $id;
    }
    
    $stmt->execute($params);
    $affected_rows = $stmt->rowCount();

    $response['success'] = true;
    $response['message'] = "{$affected_rows} ordem(ns) reprovada(s) pelo Financeiro.";
    $response['affected_rows'] = $affected_rows;

} catch (PDOException $e) {
    error_log("Erro PDO (bulk_reprove_financeiro): " . $e->getMessage());
    http_response_code(500);
    $response['message'] = 'Erro interno do servidor ao processar a reprovação.';
}

echo json_encode($response);