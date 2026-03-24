<?php
// api/bulk_edit_orders.php

header('Content-Type: application/json');
require_once __DIR__ . '/db_connect.php'; // USANDO SEU ARQUIVO DE CONEXÃO
require_once __DIR__ . '/auth_utils.php';   // O ARQUIVO QUE VOCÊ ACABOU DE CRIAR

// Configurações de depuração (opcional, REMOVA em produção)
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/bulk_edit_errors.log');
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
$fields_to_update = $input['fields'] ?? []; // Array associativo de campos e novos valores

if (empty($order_ids) || !is_array($order_ids)) {
    http_response_code(400);
    $response['message'] = 'IDs das ordens não fornecidos ou inválidos.';
    echo json_encode($response);
    exit;
}

if (empty($fields_to_update) || !is_array($fields_to_update)) {
    http_response_code(400);
    $response['message'] = 'Nenhum campo para atualização fornecido.';
    echo json_encode($response);
    exit;
}

// --- Autenticação e Permissão ---
// A edição em massa é uma ação poderosa, geralmente restrita.
// Aqui, permitimos apenas o perfil 'Geral'. Você pode expandir.
if (!hasPermission(['Geral'])) {
    http_response_code(403);
    $response['message'] = 'Acesso negado. Você não tem permissão para editar ordens em massa.';
    echo json_encode($response);
    exit;
}

// Lista de campos que SÃO PERMITIDOS serem editados em massa
$allowed_fields = [
    'favoredName', 'paymentValue', 'paymentType', 'priority', 'paymentForecast',
    'company', 'process', 'direction', 'solicitant', 'reference', 'observation',
    'pixKeyType', 'pixKey', 'linhaDigitavel', 'bankDetails'
];

$set_clauses = [];
$params = [];

foreach ($fields_to_update as $field => $value) {
    if (!in_array($field, $allowed_fields)) {
        http_response_code(400);
        $response['message'] = "Campo '$field' não permitido para edição em massa.";
        echo json_encode($response);
        exit;
    }
    $set_clauses[] = "`$field` = ?";
    $params[] = $value;
}

if (empty($set_clauses)) {
    http_response_code(400);
    $response['message'] = 'Nenhum campo válido para atualização fornecido.';
    echo json_encode($response);
    exit;
}

try {
    $order_placeholders = implode(',', array_fill(0, count($order_ids), '?'));
    $sql = "UPDATE orders SET " . implode(', ', $set_clauses) . " WHERE id IN ($order_placeholders)";
    
    $stmt = $pdo->prepare($sql);
    
    // Adiciona os valores dos IDs ao final dos parâmetros
    foreach ($order_ids as $id) {
        $params[] = $id;
    }
    
    $stmt->execute($params);
    $affected_rows = $stmt->rowCount();

    $response['success'] = true;
    $response['message'] = "{$affected_rows} ordem(ns) atualizada(s) com sucesso.";
    $response['affected_rows'] = $affected_rows;

} catch (PDOException $e) {
    error_log("Erro PDO (bulk_edit_orders): " . $e->getMessage());
    http_response_code(500);
    $response['message'] = 'Erro interno do servidor ao processar a edição em massa.';
}

echo json_encode($response);