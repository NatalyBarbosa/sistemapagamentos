<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método não permitido']);
    exit;
}

include 'db_connect.php';

try {
    // Ler dados JSON do corpo da requisição
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['boletoId']) || !isset($input['parcelId'])) {
        throw new Exception('Dados obrigatórios não fornecidos');
    }
    
    $boletoId = $input['boletoId'];
    $parcelId = $input['parcelId'];
    $vendor = isset($input['vendor']) ? trim($input['vendor']) : '';  // ✅ MELHORIA: trim() para limpar espaços
    $process = isset($input['process']) ? trim($input['process']) : '';
    $value = isset($input['value']) ? floatval($input['value']) : 0;  // ✅ MELHORIA: floatval para garantir número
    $dueDate = isset($input['dueDate']) ? $input['dueDate'] : '';
    $direction = isset($input['direction']) ? trim($input['direction']) : '';
    $observation = isset($input['observation']) ? trim($input['observation']) : '';
    
    // ✅ NOVO: Capturar e validar Empresa (obrigatório, como process/vendor)
    $company = isset($input['company']) ? trim($input['company']) : '';
    if (empty($company)) {
        throw new Exception('O campo "Empresa" é obrigatório');
    }
    
    // Validações gerais (agora inclui company)
    if (empty($vendor) || empty($process) || $value <= 0 || empty($dueDate) || empty($direction) || empty($company)) {  // ✅ NOVO: empty($company)
        throw new Exception('Todos os campos obrigatórios devem ser preenchidos, incluindo Empresa');
    }
    
    // Iniciar transação
    $pdo->beginTransaction();
    
    try {
        // Verificar se o boleto existe e pegar o ID interno
        $stmt = $pdo->prepare("SELECT id FROM boletos WHERE uuid = ?");
        $stmt->execute([$boletoId]);
        $boleto = $stmt->fetch();
        
        if (!$boleto) {
            throw new Exception('Boleto não encontrado');
        }
        
        $boletoInternalId = $boleto['id'];
        
        // Verificar se a parcela existe (REMOVEMOS a verificação de is_paid)
        $stmt = $pdo->prepare("SELECT id, is_paid FROM boleto_parcels WHERE uuid = ? AND boleto_id = ?");
        $stmt->execute([$parcelId, $boletoInternalId]);
        $parcela = $stmt->fetch();
        
        if (!$parcela) {
            throw new Exception('Parcela não encontrada');
        }
        
        // ✅ PERMITIR EDIÇÃO MESMO SE ESTIVER PAGA
        // Log para auditoria
        if ($parcela['is_paid']) {
            error_log("AUDITORIA: Editando parcela paga - Boleto: {$boletoId}, Parcela: {$parcelId}, Empresa: {$company}");
        }
        
        // Atualizar dados do boleto (agora inclui company)
        $stmt = $pdo->prepare("
            UPDATE boletos 
            SET vendor = ?, process = ?, company = ?, direction = ?, observation = ? 
            WHERE uuid = ?
        ");
        $stmt->execute([$vendor, $process, $company, $direction, $observation, $boletoId]);  // ✅ NOVO: company no UPDATE e execute
        
        // Atualizar dados da parcela
        $stmt = $pdo->prepare("
            UPDATE boleto_parcels 
            SET value = ?, due_date = ? 
            WHERE uuid = ?
        ");
        $stmt->execute([$value, $dueDate, $parcelId]);
        
        // Recalcular o valor total do boleto
        $stmt = $pdo->prepare("
            SELECT SUM(value) as total_value, MIN(due_date) as first_due_date 
            FROM boleto_parcels 
            WHERE boleto_id = ?
        ");
        $stmt->execute([$boletoInternalId]);
        $totals = $stmt->fetch();
        
        // Atualizar totais do boleto
        $stmt = $pdo->prepare("
            UPDATE boletos 
            SET total_value = ?, first_due_date = ? 
            WHERE id = ?
        ");
        $stmt->execute([$totals['total_value'], $totals['first_due_date'], $boletoInternalId]);
        
        // Confirmar transação
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => $parcela['is_paid'] ? 'Parcela paga editada com sucesso' : 'Parcela editada com sucesso',
            'data' => [
                'boletoId' => $boletoId,
                'parcelId' => $parcelId,
                'newValue' => $value,
                'newDueDate' => $dueDate,
                'newTotalValue' => $totals['total_value'],
                'newCompany' => $company,  // ✅ NOVO: Retornar para confirmação no JS
                'wasPaid' => (bool)$parcela['is_paid']
            ]
        ]);
        
    } catch (Exception $e) {
        // Reverter transação em caso de erro
        $pdo->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>