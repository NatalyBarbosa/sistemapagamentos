<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

include 'db_connect.php';

try {

    // Verificar se é upload de arquivo (FormData) ou JSON
    $isFileUpload = isset($_FILES['boletoFile']);
    
    if ($isFileUpload) {
        // Dados vindos via FormData (com arquivo)
        $boletoUuid = $_POST['id'] ?? uniqid('boleto_');
        $vendor = $_POST['vendor'] ?? '';
        $generationDate = $_POST['generationDate'] ?? date('Y-m-d');
        $totalValue = floatval($_POST['totalValue'] ?? 0);
        $firstDueDate = $_POST['firstDueDate'] ?? null;
        $process = $_POST['process'] ?? '';
        $direction = $_POST['direction'] ?? '';
        $company = $_POST['company'] ?? ''; // ✅ NOVA LINHA: Capturar empresa
        $observation = $_POST['observation'] ?? '';
        $parcels = json_decode($_POST['parcels'] ?? '[]', true);
        
        // ✅ VALIDAÇÃO: Empresa é obrigatória
        if (empty($company)) {
            throw new Exception('O campo Empresa é obrigatório');
        }
        
        // Processar arquivo anexado
        if ($_FILES['boletoFile']['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('Erro no upload do arquivo');
        }
        
        // Validar tipo de arquivo
        $allowedTypes = ['application/pdf'];
        $fileType = $_FILES['boletoFile']['type'];
        if (!in_array($fileType, $allowedTypes)) {
            throw new Exception('Apenas arquivos PDF são permitidos');
        }
        
        // Validar tamanho (10MB)
        $maxSize = 10 * 1024 * 1024;
        if ($_FILES['boletoFile']['size'] > $maxSize) {
            throw new Exception('O arquivo deve ter no máximo 10MB');
        }
        
        // Criar diretório para uploads se não existir
        $uploadDir = '../uploads/boletos/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        // Gerar nome único para o arquivo
        $originalName = $_FILES['boletoFile']['name'];
        $extension = pathinfo($originalName, PATHINFO_EXTENSION);
        $fileName = $boletoUuid . '_' . time() . '.' . $extension;
        $filePath = $uploadDir . $fileName;
        
        // Mover arquivo para diretório de uploads
        if (!move_uploaded_file($_FILES['boletoFile']['tmp_name'], $filePath)) {
            throw new Exception('Erro ao salvar arquivo no servidor');
        }
        
        $fileInfo = [
            'original_name' => $originalName,
            'file_name' => $fileName,
            'file_path' => $filePath,
            'file_size' => $_POST['boletoFileSize'] ?? filesize($filePath)
        ];
        
    } else {
        // Dados vindos via JSON (sem arquivo) - compatibilidade com sistema antigo
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            throw new Exception('Dados de entrada JSON inválidos.');
        }
        
        $boletoUuid = $input['id'] ?? uniqid('boleto_');
        $vendor = $input['vendor'] ?? '';
        $generationDate = $input['generationDate'] ?? date('Y-m-d');
        $totalValue = floatval($input['totalValue'] ?? 0);
        $firstDueDate = $input['firstDueDate'] ?? null;
        $process = $input['process'] ?? '';
        $direction = $input['direction'] ?? '';
        $company = $input['company'] ?? ''; // ✅ NOVA LINHA: Capturar empresa do JSON também
        $observation = $input['observation'] ?? '';
        $parcels = $input['parcels'] ?? [];
        
        // ✅ VALIDAÇÃO: Empresa é obrigatória
        if (empty($company)) {
            throw new Exception('O campo Empresa é obrigatório');
        }
        
        $fileInfo = null; // Sem arquivo
    }

    $pdo->beginTransaction();

    // ✅ ATUALIZADO: Inserir boleto principal com coluna 'company'
    if ($fileInfo) {
        // Com arquivo
        $stmt = $pdo->prepare("
            INSERT INTO boletos (
                uuid, vendor, generation_date, total_value, first_due_date, 
                process, direction, company, observation, is_fully_paid,
                file_original_name, file_name, file_path, file_size
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $boletoUuid,
            $vendor,
            $generationDate,
            $totalValue,
            $firstDueDate,
            $process,
            $direction,
            $company, // ✅ ADICIONADO: Incluir empresa
            $observation,
            $fileInfo['original_name'],
            $fileInfo['file_name'],
            $fileInfo['file_path'],
            $fileInfo['file_size']
        ]);
    } else {
        // Sem arquivo (compatibilidade)
        $stmt = $pdo->prepare("
            INSERT INTO boletos (
                uuid, vendor, generation_date, total_value, first_due_date, 
                process, direction, company, observation, is_fully_paid
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        ");
        
        $stmt->execute([
            $boletoUuid,
            $vendor,
            $generationDate,
            $totalValue,
            $firstDueDate,
            $process,
            $direction,
            $company, // ✅ ADICIONADO: Incluir empresa
            $observation
        ]);
    }

    // CAPTURAR O ID INTEIRO do boleto recém-inserido
    $internalBoletoId = $pdo->lastInsertId();

    // Inserir parcelas
    foreach ($parcels as $parcel) {
        $parcelUuid = $parcel['id'] ?? uniqid('parcel_');
        $parcelNumber = $parcel['parcelNumber'] ?? 1;
        $parcelValue = floatval($parcel['value'] ?? 0);
        $dueDate = $parcel['dueDate'] ?? null;
        
        $stmt = $pdo->prepare("
            INSERT INTO boleto_parcels (
                uuid, boleto_id, boleto_uuid, parcel_number, value, due_date, is_paid
            ) VALUES (?, ?, ?, ?, ?, ?, 0)
        ");
        
        $stmt->execute([
            $parcelUuid,
            $internalBoletoId,
            $boletoUuid,
            $parcelNumber,
            $parcelValue,
            $dueDate
        ]);
    }

    $pdo->commit();
    
    $response = [
        'success' => true, 
        'message' => 'Boleto cadastrado com sucesso!', 
        'id' => $boletoUuid,
        'company' => $company // ✅ NOVO: Retornar empresa na resposta
    ];
    
    if ($fileInfo) {
        $response['file_uploaded'] = true;
        $response['file_name'] = $fileInfo['original_name'];
    }
    
    echo json_encode($response);

} catch (Exception $e) {

    $pdo->rollBack();
    
    // Se houve erro e arquivo foi movido, remover arquivo
    if (isset($filePath) && file_exists($filePath)) {
        unlink($filePath);
    }
    
    error_log("Erro ao adicionar boleto: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);

}

?>