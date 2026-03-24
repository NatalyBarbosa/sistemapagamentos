<?php
// api/bulk_delete_orders.php

header('Content-Type: application/json');
require_once __DIR__ . '/db_connect.php'; // USANDO SEU ARQUIVO DE CONEXÃO
require_once __DIR__ . '/auth_utils.php';   // O ARQUIVO QUE VOCÊ ACABOU DE CRIAR

// Configurações de depuração (opcional, REMOVA em produção)
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/bulk_delete_errors.log');
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

// --- Autenticação e Permissão ---
// A exclusão é uma ação crítica, geralmente restrita ao perfil 'Geral'.
if (!hasPermission(['Geral'])) {
    http_response_code(403);
    $response['message'] = 'Acesso negado. Você não tem permissão para excluir ordens em massa.';
    echo json_encode($response);
    exit;
}

try {
    $placeholders = implode(',', array_fill(0, count($order_ids), '?'));

    // Prepara a query SQL para deletar as ordens
    $stmt = $pdo->prepare("DELETE FROM orders WHERE id IN ($placeholders)");
    
    foreach ($order_ids as $key => $id) {
        $stmt->bindValue(($key + 1), $id, PDO::PARAM_STR);
    }
    
    $stmt->execute();
    $affected_rows = $stmt->rowCount();

    $response['success'] = true;
    $response['message'] = "{$affected_rows} ordem(ns) excluída(s) com sucesso.";
    $response['affected_rows'] = $affected_rows;

} catch (PDOException $e) {
    error_log("Erro PDO (bulk_delete_orders): " . $e->getMessage());
    http_response_code(500);
    $response['message'] = 'Erro interno do servidor ao processar a exclusão em massa.';
}

echo json_encode($response);