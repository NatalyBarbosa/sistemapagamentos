<?php
// Ativar exibição de erros para debug. REMOVER EM PRODUÇÃO.
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/db_connect.php'; // Certifique-se que o caminho esteja correto

echo "DEBUG: Script download_payment_proof.php iniciado.<br>"; // DEBUG 1

echo "<h1>TESTE INICIAL DE SAÍDA</h1>";
echo "Se você está lendo isso, o PHP está executando o script.<br>";
echo "Versão PHP: " . phpversion() . "<br>";
exit; // Garante que a execução para aqui

// Obter order_id e payment_index dos parâmetros GET
$orderId = $_GET['order_id'] ?? null;
$paymentIndex = $_GET['payment_index'] ?? null;

echo "DEBUG: order_id recebido: " . htmlspecialchars($orderId ?? 'NULO') . "<br>"; // DEBUG 2
echo "DEBUG: payment_index recebido: " . htmlspecialchars($paymentIndex ?? 'NULO') . "<br>"; // DEBUG 3

if (!$orderId || !isset($paymentIndex)) {
    echo "DEBUG: Erro: order_id ou payment_index ausente. Encerrando.<br>"; // DEBUG 4
    header("HTTP/1.1 400 Bad Request");
    die("Parâmetros inválidos.");
}

try {
    echo "DEBUG: Tentando buscar ordem no banco de dados. ID: " . htmlspecialchars($orderId) . "<br>"; // DEBUG 5
    $stmt = $pdo->prepare("SELECT payments FROM orders WHERE id = :orderId");
    $stmt->bindParam(':orderId', $orderId);
    $stmt->execute();
    $order = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        echo "DEBUG: Erro: Ordem com ID '" . htmlspecialchars($orderId) . "' não encontrada.<br>"; // DEBUG 6
        header("HTTP/1.1 404 Not Found");
        die("Comprovante não encontrado. Ordem inexistente.");
    }

    echo "DEBUG: Ordem encontrada. Decodificando payments.<br>"; // DEBUG 7
    // Decodificar o JSON da coluna 'payments'
    $payments = json_decode($order['payments'], true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        echo "DEBUG: Erro ao decodificar JSON de payments para ordem '" . htmlspecialchars($orderId) . "': " . htmlspecialchars(json_last_error_msg()) . "<br>"; // DEBUG 8
        header("HTTP/1.1 500 Internal Server Error");
        die("Erro interno do servidor: falha ao processar dados de pagamento.");
    }
    echo "DEBUG: Payments decodificado. Conteúdo payments: " . htmlspecialchars(substr(print_r($order['payments'], true), 0, 200)) . "...<br>"; // DEBUG 8b (Primeiros 200 chars do JSON)


    // Verificar se o paymentIndex é válido
    if (!isset($payments[$paymentIndex])) {
        echo "DEBUG: Erro: paymentIndex '" . htmlspecialchars($paymentIndex) . "' inválido para ordem '" . htmlspecialchars($orderId) . "'. Quantidade de pagamentos: " . count($payments) . "<br>"; // DEBUG 9
        header("HTTP/1.1 404 Not Found");
        die("Comprovante não encontrado. Índice de pagamento inválido.");
    }

    $payment = $payments[$paymentIndex];

    if (!isset($payment['proofData']) || empty($payment['proofData'])) {
        echo "DEBUG: Erro: 'proofData' ausente ou vazio para pagamento '" . htmlspecialchars($paymentIndex) . "' da ordem '" . htmlspecialchars($orderId) . "'.<br>"; // DEBUG 10
        header("HTTP/1.1 404 Not Found");
        die("Comprovante não disponível. Dados ausentes.");
    }

    $base64Data = $payment['proofData'];
    $fileName = $payment['proofFileName'] ?? "comprovante_{$orderId}_{$paymentIndex}.pdf"; // Fallback para nome
    
    // Extrair o MIME type do Base64, se presente (ex: data:application/pdf;base64,...)
    $mimeType = '';
    $dataPrefix = 'data:';
    echo "DEBUG: Base64Data recebido (primeiros 100 caracteres): " . htmlspecialchars(substr($base64Data, 0, 100)) . "...<br>"; // DEBUG 11
    
    if (str_starts_with($base64Data, $dataPrefix)) {
        $parts = explode(';', $base64Data);
        $mimeType = substr($parts[0], strlen($dataPrefix)); // Extrai 'application/pdf'
        
        // Verifica se a parte final contém "base64," e ajusta $base64Data
        $lastPart = end($parts);
        if (str_starts_with($lastPart, 'base64,')) {
            $base64Data = substr($lastPart, 7); // Remove o 'base64,'
        } else {
            $base64Data = $lastPart; // Se não tem "base64,", é o Base64 puro
        }
        echo "DEBUG: Base64Data ajustado após remover prefixo (primeiros 100 caracteres): " . htmlspecialchars(substr($base64Data, 0, 100)) . "...<br>"; // DEBUG 11b
    }
    
    // Se não extraímos o MIME type do Base64, tentamos inferir do nome do arquivo ou usar um padrão
    if (empty($mimeType)) {
        $extension = pathinfo($fileName, PATHINFO_EXTENSION);
        switch (strtolower($extension)) {
            case 'pdf': $mimeType = 'application/pdf'; break;
            case 'jpg':
            case 'jpeg': $mimeType = 'image/jpeg'; break;
            case 'png': $mimeType = 'image/png'; break;
            default: $mimeType = 'application/octet-stream'; // Tipo genérico para forçar download
        }
        echo "DEBUG: MIME Type inferido: " . htmlspecialchars($mimeType) . "<br>"; // DEBUG 12
    } else {
        echo "DEBUG: MIME Type extraído do prefixo Base64: " . htmlspecialchars($mimeType) . "<br>"; // DEBUG 12b
    }

    echo "DEBUG: Tentando decodificar Base64...<br>"; // DEBUG 13
    $fileContent = base64_decode($base64Data);

    if ($fileContent === false) {
        echo "DEBUG: Erro: Falha ao decodificar Base64 para ordem '" . htmlspecialchars($orderId) . "', pagamento '" . htmlspecialchars($paymentIndex) . "'. Base64Data length: " . strlen($base64Data) . "<br>"; // DEBUG 14
        echo "DEBUG: Último erro de Base64: " . htmlspecialchars(base64_last_error()) . "<br>"; // NOVO DEBUG: erro específico do base64
        header("HTTP/1.1 500 Internal Server Error");
        die("Erro interno do servidor: falha ao decodificar o arquivo.");
    }

    echo "DEBUG: Comprovante encontrado. Tamanho do conteúdo: " . strlen($fileContent) . " bytes. MIME Type final: " . htmlspecialchars($mimeType) . ". Nome do arquivo: " . htmlspecialchars($fileName) . "<br>"; // DEBUG 15
    echo "DEBUG: Enviando cabeçalhos HTTP e conteúdo do arquivo.<br>"; // DEBUG 16
    
    // Limpa qualquer saída anterior (os DEBUGs que fizemos) antes de enviar cabeçalhos e conteúdo binário
    ob_clean(); 
    
    // Definir os cabeçalhos HTTP para o navegador
    header("Content-Type: {$mimeType}");
    header("Content-Disposition: inline; filename="" . rawurlencode($fileName) . """); // 'inline' para exibir, 'attachment' para forçar download. rawurlencode para nomes com caracteres especiais.
    header("Content-Length: " . strlen($fileContent));
    header("Cache-Control: private, max-age=0, must-revalidate");
    header("Pragma: public");
    header("Expires: 0"); // Para evitar cache excessivo

    echo $fileContent; // Envia o conteúdo do arquivo para o navegador
    exit; // Garante que nenhum código adicional seja executado ou quebra de linha seja enviada

} catch (PDOException $e) {
    echo "DEBUG: Erro de PDO: " . htmlspecialchars($e->getMessage()) . "<br>"; // DEBUG 17
    header("HTTP/1.1 500 Internal Server Error");
    die("Erro de banco de dados: " . htmlspecialchars($e->getMessage()));
} catch (Exception $e) {
    echo "DEBUG: Erro geral: " . htmlspecialchars($e->getMessage()) . "<br>"; // DEBUG 18
    header("HTTP/1.1 500 Internal Server Error");
    die("Ocorreu um erro inesperado: " . htmlspecialchars($e->getMessage()));
}
echo "DEBUG: Script download_payment_proof.php finalizado (esta linha NÃO DEVERIA aparecer se o arquivo foi enviado corretamente).<br>"; // DEBUG 19
?>