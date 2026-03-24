<?php
// update_entry_data_custom.php
header('Content-Type: application/json');
require_once '../config.php';

if (!defined('DB_CHARSET')) {
    define('DB_CHARSET', 'utf8mb4');
}

$pdo = null;
try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erro de conexão com o banco de dados: ' . $e->getMessage()]);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);

// =========================================================
// !!! LINHA DE LOG PARA DEPURAÇÃO - ADICIONADA AQUI !!!
// =========================================================
error_log("Payload recebido em update_entry_data_custom: " . print_r($data, true));

if (!isset($data['id'])) {
    echo json_encode(['success' => false, 'error' => 'ID do dado de entrada não fornecido.']);
    exit();
}

$id = $data['id'];

// Campos para edição geral de dados de entrada
$process = $data['process'] ?? null;
$company = $data['company'] ?? null;
$value = $data['value'] ?? null;
$entry_date = $data['entry_date'] ?? null;
$observation = $data['observation'] ?? null;

// Campos para marcação de pagamento
$status = $data['status'] ?? null;
$payment_date = $data['payment_date'] ?? null;
$payment_observation = $data['payment_observation'] ?? null;
$proof_data = $data['proof_data'] ?? null;
$proof_file_name = $data['proof_file_name'] ?? null;
$proof_mime_type = $data['proof_mime_type'] ?? null;

$set_clauses = [];
$params = ['id' => $id];

// Adicionar campos de edição geral às cláusulas SET
if ($process !== null) {
    $set_clauses[] = 'process = :process';
    $params['process'] = $process;
}
if ($company !== null) {
    $set_clauses[] = 'company = :company';
    $params['company'] = $company;
}
if ($value !== null) {
    $set_clauses[] = 'value = :value';
    $params['value'] = $value;
}
if ($entry_date !== null) {
    $set_clauses[] = 'entry_date = :entry_date';
    $params['entry_date'] = $entry_date;
}
if ($observation !== null) {
    $set_clauses[] = 'observation = :observation';
    $params['observation'] = $observation;
}

// Adicionar campos de pagamento/status às cláusulas SET (para quando for um pagamento)
if ($status !== null) {
    $set_clauses[] = 'status = :status';
    $params['status'] = $status;
}
if ($payment_date !== null) {
    $set_clauses[] = 'payment_date = :payment_date';
    $params['payment_date'] = $payment_date;
}
if ($payment_observation !== null) {
    $set_clauses[] = 'payment_observation = :payment_observation';
    $params['payment_observation'] = $payment_observation;
}
if ($proof_data !== null) {
    $set_clauses[] = 'proof_data = :proof_data';
    $params['proof_data'] = $proof_data;
}
if ($proof_file_name !== null) {
    $set_clauses[] = 'proof_file_name = :proof_file_name';
    $params['proof_file_name'] = $proof_file_name;
}
if ($proof_mime_type !== null) {
    $set_clauses[] = 'proof_mime_type = :proof_mime_type';
    $params['proof_mime_type'] = $proof_mime_type;
}


if (empty($set_clauses)) {
    echo json_encode(['success' => false, 'error' => 'Nenhum campo para atualizar fornecido.']);
    exit();
}

$sql = "UPDATE entry_data_custom SET " . implode(', ', $set_clauses) . " WHERE id = :id";

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    if ($stmt->rowCount()) {
        echo json_encode(['success' => true, 'message' => 'Dado de entrada atualizado com sucesso.']);
    } else {
        echo json_encode(['success' => true, 'message' => 'Nenhum dado de entrada foi alterado, mas a operação foi registrada como sucesso.']);
    }

} catch (PDOException $e) {
    error_log("Erro no banco de dados (update_entry_data_custom): " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Erro no banco de dados: ' . $e->getMessage()]);
} catch (Exception $e) {
    error_log("Erro geral (update_entry_data_custom): " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Erro geral: ' . $e->getMessage()]);
}
?>