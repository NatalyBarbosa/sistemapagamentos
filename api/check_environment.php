<?php
// api/check_environment.php
// Script para verificar se o ambiente suporta extração de boletos

header('Content-Type: text/html; charset=UTF-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Verificação do Ambiente - Extração de Boletos</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .success { color: green; font-weight: bold; }
        .error { color: red; font-weight: bold; }
        .warning { color: orange; font-weight: bold; }
        .info { color: blue; }
        .test-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
    </style>
</head>
<body>
    <h1>🔍 Verificação do Ambiente para Extração de Boletos</h1>
    
    <?php
    echo "<div class='test-section'>";
    echo "<h2>📋 Informações do Sistema</h2>";
    echo "<strong>PHP Version:</strong> " . phpversion() . "<br>";
    echo "<strong>Sistema Operacional:</strong> " . php_uname() . "<br>";
    echo "<strong>Servidor:</strong> " . $_SERVER['SERVER_SOFTWARE'] ?? 'Não identificado' . "<br>";
    echo "</div>";

    // Teste 1: Verificar se exec() está habilitado
    echo "<div class='test-section'>";
    echo "<h2>🔧 Teste 1: Função exec() do PHP</h2>";
    if (function_exists('exec')) {
        echo "<span class='success'>✅ Função exec() está disponível</span><br>";
        
        // Testar se exec realmente funciona
        $testOutput = [];
        $testReturn = 0;
        exec('echo "teste"', $testOutput, $testReturn);
        
        if ($testReturn === 0 && !empty($testOutput)) {
            echo "<span class='success'>✅ Função exec() está funcionando corretamente</span><br>";
        } else {
            echo "<span class='error'>❌ Função exec() está bloqueada ou não funcional</span><br>";
        }
    } else {
        echo "<span class='error'>❌ Função exec() não está disponível (necessária para OCR)</span><br>";
    }
    echo "</div>";

    // Teste 2: Verificar Tesseract
    echo "<div class='test-section'>";
    echo "<h2>👁️ Teste 2: Tesseract OCR</h2>";
    $tesseractOutput = [];
    $tesseractReturn = 0;
    exec('tesseract --version 2>&1', $tesseractOutput, $tesseractReturn);
    
    if ($tesseractReturn === 0) {
        echo "<span class='success'>✅ Tesseract está instalado</span><br>";
        echo "<strong>Versão:</strong> " . implode(' ', $tesseractOutput) . "<br>";
        
        // Verificar idiomas disponíveis
        $langOutput = [];
        exec('tesseract --list-langs 2>&1', $langOutput, $langReturn);
        if ($langReturn === 0) {
            echo "<strong>Idiomas disponíveis:</strong> " . implode(', ', array_slice($langOutput, 1)) . "<br>";
            
            if (in_array('por', array_slice($langOutput, 1))) {
                echo "<span class='success'>✅ Português (por) está disponível</span><br>";
            } else {
                echo "<span class='warning'>⚠️ Português (por) não está disponível - usaremos inglês</span><br>";
            }
        }
    } else {
        echo "<span class='error'>❌ Tesseract não está instalado ou não está no PATH</span><br>";
        echo "<span class='info'>Saída do comando: " . implode(' ', $tesseractOutput) . "</span><br>";
    }
    echo "</div>";

    // Teste 3: Verificar ImageMagick
    echo "<div class='test-section'>";
    echo "<h2>🖼️ Teste 3: ImageMagick</h2>";
    $convertOutput = [];
    $convertReturn = 0;
    exec('convert -version 2>&1', $convertOutput, $convertReturn);
    
    if ($convertReturn === 0) {
        echo "<span class='success'>✅ ImageMagick está instalado</span><br>";
        echo "<strong>Versão:</strong> " . $convertOutput[0] ?? 'Não identificada' . "<br>";
    } else {
        echo "<span class='error'>❌ ImageMagick não está instalado ou não está no PATH</span><br>";
        echo "<span class='info'>Saída do comando: " . implode(' ', $convertOutput) . "</span><br>";
    }
    echo "</div>";

    // Teste 4: Verificar extensões PHP necessárias
    echo "<div class='test-section'>";
    echo "<h2>🔌 Teste 4: Extensões PHP</h2>";
    
    $requiredExtensions = ['gd', 'fileinfo', 'mbstring'];
    foreach ($requiredExtensions as $ext) {
        if (extension_loaded($ext)) {
            echo "<span class='success'>✅ Extensão {$ext} está carregada</span><br>";
        } else {
            echo "<span class='error'>❌ Extensão {$ext} não está carregada</span><br>";
        }
    }
    echo "</div>";

    // Teste 5: Verificar permissões de diretório
    echo "<div class='test-section'>";
    echo "<h2>📁 Teste 5: Permissões de Diretório</h2>";
    
    $tempDir = __DIR__ . '/temp_boletos/';
    if (!is_dir($tempDir)) {
        if (mkdir($tempDir, 0755, true)) {
            echo "<span class='success'>✅ Diretório temporário criado com sucesso</span><br>";
        } else {
            echo "<span class='error'>❌ Não foi possível criar diretório temporário</span><br>";
        }
    } else {
        echo "<span class='info'>ℹ️ Diretório temporário já existe</span><br>";
    }
    
    if (is_writable($tempDir)) {
        echo "<span class='success'>✅ Diretório temporário tem permissão de escrita</span><br>";
    } else {
        echo "<span class='error'>❌ Diretório temporário não tem permissão de escrita</span><br>";
    }
    echo "</div>";

    // Resumo final
    echo "<div class='test-section'>";
    echo "<h2>📊 Resumo da Verificação</h2>";
    
    $canProceed = function_exists('exec') && 
                  ($tesseractReturn === 0) && 
                  ($convertReturn === 0) && 
                  extension_loaded('gd') && 
                  is_writable($tempDir);
    
    if ($canProceed) {
        echo "<span class='success'>🎉 AMBIENTE COMPATÍVEL! Você pode prosseguir com a implementação da extração de boletos.</span><br>";
    } else {
        echo "<span class='error'>❌ AMBIENTE INCOMPATÍVEL. Alguns requisitos não foram atendidos.</span><br>";
        echo "<span class='info'>Entre em contato com o suporte do Hostinger para instalar as dependências necessárias.</span><br>";
    }
    echo "</div>";
    ?>
    
    <div class='test-section'>
        <h2>📞 Próximos Passos</h2>
        <p><strong>Se o ambiente for compatível:</strong> Podemos prosseguir com a implementação.</p>
        <p><strong>Se houver problemas:</strong> Entre em contato com o suporte do Hostinger solicitando:</p>
        <ul>
            <li>Instalação do Tesseract OCR</li>
            <li>Instalação do ImageMagick</li>
            <li>Habilitação da função exec() do PHP</li>
        </ul>
    </div>
</body>
</html>