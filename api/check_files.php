<?php
header('Content-Type: text/plain; charset=utf-8');

echo "=== VERIFICAÇÃO DE ARQUIVOS E BANCO ===\n\n";

// Incluir conexão do banco
include 'db_connect.php';

// Verificar estrutura de pastas
$uploadDir = '../uploads/boletos/';
echo "=== ESTRUTURA DE PASTAS ===\n";
echo "Pasta uploads existe: " . (is_dir('../uploads/') ? 'SIM' : 'NÃO') . "\n";
echo "Pasta boletos existe: " . (is_dir($uploadDir) ? 'SIM' : 'NÃO') . "\n";
echo "Pasta é gravável: " . (is_writable($uploadDir) ? 'SIM' : 'NÃO') . "\n";
echo "Caminho absoluto: " . realpath($uploadDir) . "\n\n";

// Verificar boletos no banco com arquivos
echo "=== BOLETOS COM ARQUIVOS NO BANCO ===\n";
try {
    $stmt = $pdo->query("SELECT uuid, vendor, file_original_name, file_name, file_path, file_size FROM boletos WHERE file_name IS NOT NULL ORDER BY id DESC LIMIT 5");
    $boletos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($boletos)) {
        echo "Nenhum boleto com arquivo encontrado no banco.\n\n";
    } else {
        foreach ($boletos as $boleto) {
            echo "Boleto: {$boleto['vendor']} (UUID: {$boleto['uuid']})\n";
            echo "  Arquivo original: {$boleto['file_original_name']}\n";
            echo "  Arquivo no servidor: {$boleto['file_name']}\n";
            echo "  Caminho: {$boleto['file_path']}\n";
            echo "  Tamanho: {$boleto['file_size']}\n";
            echo "  Arquivo existe: " . (file_exists($boleto['file_path']) ? 'SIM' : 'NÃO') . "\n";
            if (file_exists($boleto['file_path'])) {
                echo "  Tamanho real: " . filesize($boleto['file_path']) . " bytes\n";
                echo "  Legível: " . (is_readable($boleto['file_path']) ? 'SIM' : 'NÃO') . "\n";
            }
            echo "\n";
        }
    }
} catch (Exception $e) {
    echo "Erro ao consultar banco: " . $e->getMessage() . "\n\n";
}

// Listar arquivos físicos na pasta
echo "=== ARQUIVOS FÍSICOS NA PASTA ===\n";
if (is_dir($uploadDir)) {
    $files = scandir($uploadDir);
    $fileCount = 0;
    foreach ($files as $file) {
        if ($file != '.' && $file != '..') {
            $fullPath = $uploadDir . $file;
            echo "Arquivo: $file\n";
            echo "  Tamanho: " . filesize($fullPath) . " bytes\n";
            echo "  Modificado: " . date('Y-m-d H:i:s', filemtime($fullPath)) . "\n";
            echo "  Caminho: $fullPath\n\n";
            $fileCount++;
        }
    }
    if ($fileCount === 0) {
        echo "Nenhum arquivo encontrado na pasta.\n\n";
    }
} else {
    echo "Pasta não existe!\n\n";
}

// Verificar arquivo específico do erro
$specificFile = $uploadDir . 'boleto_bz3b5sgd2mhdw48e4_1761856915.pdf';
echo "=== ARQUIVO ESPECÍFICO DO ERRO ===\n";
echo "Arquivo: boleto_bz3b5sgd2mhdw48e4_1761856915.pdf\n";
echo "Caminho: $specificFile\n";
echo "Existe: " . (file_exists($specificFile) ? 'SIM' : 'NÃO') . "\n";
if (file_exists($specificFile)) {
    echo "Tamanho: " . filesize($specificFile) . " bytes\n";
    echo "Legível: " . (is_readable($specificFile) ? 'SIM' : 'NÃO') . "\n";
}

echo "\n=== FIM DA VERIFICAÇÃO ===\n";
?>