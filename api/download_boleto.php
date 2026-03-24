<?php
// Remover qualquer output antes dos headers
ob_start();

// Log de debug
error_log("=== DOWNLOAD BOLETO DEBUG ===");
error_log("GET: " . print_r($_GET, true));

if (!isset($_GET['file']) || !isset($_GET['boleto_id'])) {
    ob_clean();
    http_response_code(400);
    echo 'Parâmetros inválidos';
    exit;
}

$fileName = $_GET['file'];
$boletoId = $_GET['boleto_id'];

error_log("Arquivo: $fileName, Boleto: $boletoId");

try {
    // Usar a mesma conexão dos outros arquivos
    include 'db_connect.php';
    
    // Buscar arquivo no banco
    $stmt = $pdo->prepare("SELECT file_path, file_original_name FROM boletos WHERE uuid = ? AND file_name = ?");
    $stmt->execute([$boletoId, $fileName]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    error_log("Resultado query: " . print_r($result, true));
    
    if (!$result) {
        ob_clean();
        http_response_code(404);
        echo 'Arquivo não encontrado no banco';
        exit;
    }
    
    $filePath = $result['file_path'];
    $originalName = $result['file_original_name'] ?: $fileName;
    
    error_log("Caminho: $filePath");
    
    if (!file_exists($filePath)) {
        ob_clean();
        http_response_code(404);
        echo 'Arquivo não existe: ' . $filePath;
        exit;
    }
    
    // Limpar buffer antes de enviar arquivo
    ob_clean();
    
    // Headers para PDF
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . basename($originalName) . '"');
    header('Content-Length: ' . filesize($filePath));
    header('Cache-Control: no-cache, must-revalidate');
    header('Pragma: no-cache');
    
    // Enviar arquivo
    readfile($filePath);
    
    error_log("Arquivo enviado com sucesso");
    
} catch (Exception $e) {
    error_log("Erro: " . $e->getMessage());
    ob_clean();
    http_response_code(500);
    echo 'Erro: ' . $e->getMessage();
}

exit;
?>