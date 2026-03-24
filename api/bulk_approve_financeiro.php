<?php
// api/bulk_approve_financeiro.php

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

if (empty($order_ids) || !is_array($order_ids)) {
    http_response_code(400);
    $response['message'] = 'IDs das ordens não fornecidos ou inválidos.';
    echo json_encode($response);
    exit;
}

if (!hasPermission(['Geral', 'Financeiro'])) {
    http_response_code(403);
    $response['message'] = 'Acesso negado. Você não tem permissão para aprovar ordens pelo Financeiro.';
    echo json_encode($response);
    exit;
}

try {
    $placeholders = implode(',', array_fill(0, count($order_ids), '?'));

    // Prepara a query SQL para atualizar o status e a aprovação pelo financeiro
    $stmt = $pdo->prepare(
        "UPDATE orders 
         SET status = 'Aguardando Pagamento', 
             approvedByFinanceiro = 1, 
             approvalDateFinanceiro = CURDATE() 
         WHERE id IN ($placeholders) 
         AND status = 'Aguardando Financeiro'" // Só aprova ordens que estão como 'Aguardando Financeiro'
    );
    
    foreach ($order_ids as $key => $id) {
        $stmt->bindValue(($key + 1), $id, PDO::PARAM_STR);
    }
    
    $stmt->execute();
    $affected_rows = $stmt->rowCount();

    $response['success'] = true;
    $response['message'] = "{$affected_rows} ordem(ns) aprovada(s) pelo Financeiro.";
    $response['affected_rows'] = $affected_rows;

} catch (PDOException $e) {
    error_log("Erro PDO (bulk_approve_financeiro): " . $e->getMessage());
    http_response_code(500);
    $response['message'] = 'Erro interno do servidor ao processar a aprovação.';
}

echo json_encode($response);