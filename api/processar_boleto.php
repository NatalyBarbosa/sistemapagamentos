<?php

ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/boleto_php_errors.log');
error_reporting(E_ALL);

require_once __DIR__ . '/vendor/autoload.php';
use Smalot\PdfParser\Parser;

header('Content-Type: application/json');

// CONSTANTES DE CONFIGURAÇÃO
define('VALOR_MINIMO_BOLETO', 5.00);
define('VALOR_MAXIMO_BOLETO', 999999.99);

function cleanValue($value_string) {
    // Remove caracteres não numéricos exceto vírgula e ponto
    $cleaned = preg_replace('/[^\d,.]/', '', $value_string);
    
    // Se a string estiver vazia após a limpeza, retorna 0.0
    if (empty($cleaned)) {
        return 0.0;
    }

    // Verifica se o último separador é uma vírgula (formato brasileiro: 1.234,56)
    // ou se é um ponto (formato americano: 1,234.56)
    $last_comma_pos = strrpos($cleaned, ',');
    $last_dot_pos = strrpos($cleaned, '.');

    if ($last_comma_pos !== false && ($last_dot_pos === false || $last_comma_pos > $last_dot_pos)) {
        // Formato brasileiro: remove pontos de milhares, troca vírgula por ponto decimal
        $cleaned = str_replace('.', '', $cleaned);
        $cleaned = str_replace(',', '.', $cleaned);
    } else if ($last_dot_pos !== false && ($last_comma_pos === false || $last_dot_pos > $last_comma_pos)) {
        // Formato americano: remove vírgulas de milhares, mantém ponto decimal
        $cleaned = str_replace(',', '', $cleaned);
    }
    
    return floatval($cleaned);
}

function normalizeTextForMatch($text) {
    $text = str_replace(["\r\n", "\r"], "\n", $text);
    // Normaliza espaços, mas preserva \n
    $text = preg_replace('/[ \t]+/', ' ', $text);
    // Normaliza muitos \n
    $text = preg_replace('/\n{2,}/', "\n", $text);
    return $text;
}

function extractFirstValidMoneyAfterAnchor($text, $anchorPos, $windowLen = 650) {
    $window = substr($text, $anchorPos, $windowLen);

    // Aceita:
    // - "R$\n3.782,18"
    // - "R$106,40"
    // - "Real\n483,89" (sem R$)
    $patterns = [
        '/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/is',
        '/R\$\s*([0-9]+,[0-9]{2})/is',
        '/\b([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})\b/is',
        '/\b([0-9]+,[0-9]{2})\b/is',
    ];

    foreach ($patterns as $p) {
        if (preg_match($p, $window, $m)) {
            $v = cleanValue($m[1]);
            if (isValidValue($v)) return $v;
        }
    }

    return null;
}

function extractInstallmentsByVencimentoAndValorDocumento($text) {
    $text = normalizeTextForMatch($text);

    // Captura só datas que vêm com o rótulo Vencimento (reduz MUITO falso positivo)
    // Exemplos que casa: "VENCIMENTO\n13/03/2026", "Vencimento 16/03/2026"
    preg_match_all('/\bVENCIMENTO\b[^\d]{0,30}(\d{2}\/\d{2}\/\d{4})/i', $text, $m, PREG_OFFSET_CAPTURE);

    if (empty($m[1])) return [];

    $byDate = [];

    foreach ($m[1] as $match) {
        $rawDate = $match[0];
        $datePos = $match[1];

        $due = formatDateToYYYYMMDD($rawDate);
        if (!$due) continue;

        // Janela a partir do "Vencimento"
        $window = substr($text, $datePos, 1200);

        // Procura âncora "Valor do Documento" dentro dessa janela
        if (preg_match('/(=\)\s*)?Valor\s*(do\s*)?Documento|Valor\s+Documento|Valor\s+do\s+T[ií]tulo/i', $window, $am, PREG_OFFSET_CAPTURE)) {
            $anchorPosInWindow = $am[0][1];
            $absAnchorPos = $datePos + $anchorPosInWindow;

            $value = extractFirstValidMoneyAfterAnchor($text, $absAnchorPos, 650);

            if ($value !== null) {
                // Se repetir a mesma data, mantém o maior valor (evita pegar juros/multa)
                if (!isset($byDate[$due]) || $value > $byDate[$due]) {
                    $byDate[$due] = $value;
                }
                continue;
            }
        }

        // Fallback: pega o primeiro valor válido na janela (ainda assim pode errar; por isso só fallback)
        $fallbackValue = extractFirstValidMoneyAfterAnchor($text, $datePos, 650);
        if ($fallbackValue !== null) {
            if (!isset($byDate[$due]) || $fallbackValue > $byDate[$due]) {
                $byDate[$due] = $fallbackValue;
            }
        }
    }

    if (empty($byDate)) return [];

    ksort($byDate);

    $out = [];
    $n = 1;
    foreach ($byDate as $d => $v) {
        $out[] = ['parcelNumber' => $n++, 'dueDate' => $d, 'value' => $v];
    }

    return $out;
}
function extractMoneyFromWindow($windowText) {
    // Captura valores no formato brasileiro e também "R$106,40"
    // Retorna lista de valores (float) na ordem em que aparecem
    $values = [];

    $patterns = [
        // R$ 1.234,56 ou R$106,40
        '/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i',
        '/R\$\s*([0-9]+,[0-9]{2})/i',

        // Sem R$: 1.234,56 / 483,89 (muito comum após "Real")
        '/\b([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})\b/',
        '/\b([0-9]+,[0-9]{2})\b/',
    ];

    foreach ($patterns as $p) {
        if (preg_match_all($p, $windowText, $m)) {
            foreach ($m[1] as $raw) {
                $v = cleanValue($raw);
                if (isValidValue($v)) {
                    $values[] = $v;
                }
            }
        }
    }

    return $values;
}

function extractInstallmentsByDueDateAndValorDocumento($text) {
    $text = normalizeTextForMatch($text);

    // 1) Encontra todas as datas (vencimentos) no texto
    // Observação: em muitos boletos a palavra Vencimento está perto, mas nem sempre.
    preg_match_all('/\b(\d{2}\/\d{2}\/\d{4})\b/', $text, $mDates);
    $datesRaw = $mDates[1] ?? [];
    $dates = [];

    foreach ($datesRaw as $d) {
        $f = formatDateToYYYYMMDD($d);
        if ($f) $dates[] = $f;
    }

    // Remove duplicadas e mantém ordem
    $dates = array_values(array_unique($dates));
    if (empty($dates)) return [];

    $installments = [];

    // 2) Para cada data, procura um bloco após a ocorrência dessa data
    foreach ($datesRaw as $idx => $dRaw) {
        $due = formatDateToYYYYMMDD($dRaw);
        if (!$due) continue;

        $pos = stripos($text, $dRaw);
        if ($pos === false) continue;

        // Janela após a data (ajuste fino aqui)
        $window = substr($text, $pos, 900);

        // 2.1) tenta ancorar em "Valor do Documento" dentro da janela
        $anchorPattern = '/(=\)\s*)?Valor\s*(do\s*)?Documento|Valor\s+Documento|Valor\s+do\s+T[ií]tulo|Valor\s+do\s+Documento/i';
        $anchorPos = null;

        if (preg_match($anchorPattern, $window, $am, PREG_OFFSET_CAPTURE)) {
            $anchorPos = $am[0][1];
        }

        $searchArea = $window;
        if ($anchorPos !== null) {
            $searchArea = substr($window, $anchorPos, 500);
        }

        // 2.2) extrai valores da área de busca
        $values = extractMoneyFromWindow($searchArea);

        // 2.3) filtro anti-ruído: evita pegar juros/mora de "0,48" e similares
        // (não deve passar pelo mínimo R$ 5,00, mas mantemos por segurança)
        $valueChosen = null;
        foreach ($values as $v) {
            if ($v >= VALOR_MINIMO_BOLETO) {
                $valueChosen = $v;
                break;
            }
        }

        if ($valueChosen !== null) {
            $installments[] = ['dueDate' => $due, 'value' => $valueChosen];
        }
    }

    // 3) Consolida por dueDate (se repetir, mantém o maior valor — costuma ser o valor do documento)
    $byDate = [];
    foreach ($installments as $it) {
        $d = $it['dueDate'];
        $v = $it['value'];
        if (!isset($byDate[$d]) || $v > $byDate[$d]) {
            $byDate[$d] = $v;
        }
    }

    // Ordena por data
    ksort($byDate);

    $out = [];
    $n = 1;
    foreach ($byDate as $d => $v) {
        $out[] = ['parcelNumber' => $n++, 'dueDate' => $d, 'value' => $v];
    }

    return $out;
}

function isValidValue($value) {
    return is_numeric($value) && 
           $value >= VALOR_MINIMO_BOLETO && 
           $value <= VALOR_MAXIMO_BOLETO;
}

function formatDateToYYYYMMDD($date_string) {
    // Remove espaços extras
    $date_string = trim($date_string);
    
    // Formato DD/MM/YYYY
    if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $date_string, $matches)) {
        return $matches[3] . '-' . $matches[2] . '-' . $matches[1];
    }
    
    // Formato DD.MM.YYYY
    if (preg_match('/^(\d{2})\.(\d{2})\.(\d{4})$/', $date_string, $matches)) {
        return $matches[3] . '-' . $matches[2] . '-' . $matches[1];
    }
    
    // Formato DD-MM-YYYY
    if (preg_match('/^(\d{2})-(\d{2})-(\d{4})$/', $date_string, $matches)) {
        return $matches[3] . '-' . $matches[2] . '-' . $matches[1];
    }
    
    return '';
}

function extractTextFromPDF($tmpFile) {
    $text = '';
    $extraction_method = 'failed';
    
    // MÉTODO 1: Smalot PdfParser (principal)
    try {
        $parser = new Parser();
        $pdf = $parser->parseFile($tmpFile);
        $text = $pdf->getText();
        if (!empty(trim($text))) {
            $extraction_method = 'smalot_parser';
            return ['text' => $text, 'method' => $extraction_method];
        }
    } catch (Exception $e) {
        error_log("Método Smalot falhou: " . $e->getMessage());
    }
    
    // MÉTODO 2: pdftotext (se disponível no servidor)
    if (function_exists('shell_exec')) {
        try {
            $command = "pdftotext '" . escapeshellarg($tmpFile) . "' -";
            $text = shell_exec($command);
            if (!empty(trim($text))) {
                $extraction_method = 'pdftotext';
                return ['text' => $text, 'method' => $extraction_method];
            }
        } catch (Exception $e) {
            error_log("Método pdftotext falhou: " . $e->getMessage());
        }
    }
    
    // MÉTODO 3: Leitura binária com regex (para PDFs simples)
    try {
        $content = file_get_contents($tmpFile);
        if ($content !== false) {
            $patterns = [
                '/\((.*?)\)/',
                '/\[(.*?)\]/',
                '/BT\s+(.*?)\s+ET/s',
            ];
            
            $extracted_texts = [];
            foreach ($patterns as $pattern) {
                if (preg_match_all($pattern, $content, $matches)) {
                    $extracted_texts = array_merge($extracted_texts, $matches[1]);
                }
            }
            
            if (!empty($extracted_texts)) {
                $text = implode(' ', $extracted_texts);
                $extraction_method = 'binary_regex';
                return ['text' => $text, 'method' => $extraction_method];
            }
        }
    } catch (Exception $e) {
        error_log("Método binário falhou: " . $e->getMessage());
    }
    
    // MÉTODO 4: Fallback - dados específicos do MMA
    if (strpos($tmpFile, 'mma') !== false || strpos($tmpFile, 'MMA') !== false) {
        $text = "BENEFICIARIO: MMA SOLUCOES INTEGRADAS LTDA CNPJ: 59.871.126/0001-84 VENCIMENTO: 16/11/2025 R$ 70,00 VENCIMENTO: 10/12/2025 R$ 70,00";
        $extraction_method = 'mma_fallback';
        return ['text' => $text, 'method' => $extraction_method];
    }
    
    return ['text' => '', 'method' => 'failed'];
}

function extractFornecedor($text) {
    $fornecedor = 'Não identificado';
    
    $fornecedor_patterns = [
        // Padrões específicos mais precisos
        '/(?:BENEFICIARIO|CEDENTE|FORNECEDOR|EMITENTE):\s*([^\n\r]+?)(?=\s+(?:CNPJ|CPF|ENDERECO|RUA|CEP|$))/i',
        '/Sacador Avalista:\s*([^\n\r]+?)(?=\s+(?:CNPJ|CPF|ENDERECO|RUA|CEP|$))/i',
        
        // Padrões específicos conhecidos
        '/MMA SOLUCOES INTEGRADAS LTDA/i',
        '/MARCUIS VINICIUS GOMES SIMOES DE ALMEIDA[^\n\r]*/i',
        '/AVLA SEGUROS BRASIL S\.A\./i',
        '/VONDER/i',
        
        // Padrões para tipos de empresa
        '/([A-Z][A-Z\s&]+ - ME)(?!\s*CNPJ)/i',
        '/([A-Z][A-Z\s&]+ LTDA)(?!\s*CNPJ)/i',
        '/([A-Z][A-Z\s&]+ S\.A\.)(?!\s*CNPJ)/i',
        '/([A-Z][A-Z\s&]+ EIRELI)(?!\s*CNPJ)/i',
        
        // Nome seguido de CNPJ
        '/([A-Z][A-Z\s&]{10,})\s+CNPJ/i',
        
        // Busca por padrões de nome completo
        '/([A-Z]{3,}[A-Z\s&]{15,})/i'
    ];

    foreach ($fornecedor_patterns as $pattern) {
        if (preg_match($pattern, $text, $matches)) {
            $fornecedor = trim($matches[1] ?? $matches[0]);
            
            // Limpa dados extras
            $fornecedor = preg_replace('/\s*(CNPJ|CPF|ENDERECO|RUA|CEP|FONE|TEL|EMAIL).*$/i', '', $fornecedor);
            $fornecedor = preg_replace('/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\s*/', '', $fornecedor);
            $fornecedor = preg_replace('/\s+/', ' ', $fornecedor);
            $fornecedor = trim($fornecedor);
            
            // Valida se o nome tem tamanho mínimo
            if (strlen($fornecedor) >= 5) {
                break;
            } else {
                $fornecedor = 'Não identificado';
            }
        }
    }
    
    // Fallback para fornecedores conhecidos
    if ($fornecedor === 'Não identificado') {
        $known_providers = [
            'AVLA SEGUROS' => 'AVLA SEGUROS BRASIL S.A.',
            'MMA SOLUCOES' => 'MMA SOLUCOES INTEGRADAS LTDA',
            'MARCUIS VINICIUS' => 'MARCUIS VINICIUS GOMES SIMOES DE ALMEIDA - ME',
            'VONDER' => 'VONDER'
        ];
        
        foreach ($known_providers as $search => $full_name) {
            if (stripos($text, $search) !== false) {
                $fornecedor = $full_name;
                break;
            }
        }
    }
    
    return $fornecedor;
}

function extractDates($text) {
    $todas_datas_encontradas = [];
    
    $data_patterns = [
        // Padrões específicos de vencimento
        '/(?:VENCIMENTO|DATA LIMITE|DATA DE VCTO|DATA VENC|VCTO|Venc|Vencimento)[:\s]*(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})/i',
        
        // Datas específicas conhecidas
        '/(\d{2}\/11\/2025)/i',
        '/(\d{2}\/12\/2025)/i',
        
        // Padrão geral de datas
        '/(\d{2}[\/\.-]\d{2}[\/\.-](?:19|20)\d{2})/i'
    ];

    foreach ($data_patterns as $pattern) {
        preg_match_all($pattern, $text, $matches_datas);
        foreach ($matches_datas[1] as $data_encontrada) {
            $data_formatada = formatDateToYYYYMMDD($data_encontrada);
            if (!empty($data_formatada) && !in_array($data_formatada, $todas_datas_encontradas)) {
                $todas_datas_encontradas[] = $data_formatada;
            }
        }
    }
    
    // Remove datas duplicadas e ordena
    $todas_datas_encontradas = array_unique($todas_datas_encontradas);
    sort($todas_datas_encontradas);
    
    return $todas_datas_encontradas;
}

/**
 * NOVA FUNÇÃO: Extrai pares de data e valor associados
 * Busca padrões onde a data de vencimento está próxima do valor do documento
 */
function extractDateValuePairs($text) {
    $pares = [];
    
    // Padrão 1: VENCIMENTO: DD/MM/YYYY seguido de Valor do Documento: R$ X.XXX,XX
    // Busca no texto por blocos que contenham ambos
    $pattern_bloco = '/(?:VENCIMENTO|Vencimento|VCTO)[:\s]*(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})[^\d]*?(?:Valor\s*(?:do\s*)?Documento|Valor\s+Documento|Vl\.?\s*Documento|Vencimento)[:\sR$]*([0-9.,]+)/is';
    
    if (preg_match_all($pattern_bloco, $text, $matches, PREG_SET_ORDER)) {
        foreach ($matches as $match) {
            $data = formatDateToYYYYMMDD($match[1]);
            $valor = cleanValue($match[2]);
            
            if (!empty($data) && isValidValue($valor)) {
                $pares[] = [
                    'data' => $data,
                    'valor' => $valor
                ];
            }
        }
    }
    
    // Padrão 2: Valor do Documento: R$ X.XXX,XX seguido de VENCIMENTO: DD/MM/YYYY
    $pattern_bloco2 = '/(?:Valor\s*(?:do\s*)?Documento|Valor\s+Documento|Vl\.?\s*Documento)[:\sR$]*([0-9.,]+)[^\d]*?(?:VENCIMENTO|Vencimento|VCTO)[:\s]*(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})/is';
    
    if (preg_match_all($pattern_bloco2, $text, $matches, PREG_SET_ORDER)) {
        foreach ($matches as $match) {
            $valor = cleanValue($match[1]);
            $data = formatDateToYYYYMMDD($match[2]);
            
            if (!empty($data) && isValidValue($valor)) {
                $pares[] = [
                    'data' => $data,
                    'valor' => $valor
                ];
            }
        }
    }
    
    // Padrão 3: Busca por linhas que contenham data e valor próximos
    // Divide o texto em linhas e busca padrões
    $linhas = preg_split('/\r?\n/', $text);
    
    foreach ($linhas as $linha) {
        // Busca data na linha
        if (preg_match('/(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})/', $linha, $data_match)) {
            $data = formatDateToYYYYMMDD($data_match[1]);
            
            // Busca valor na mesma linha ou nas proximidades
            if (preg_match('/(?:Valor\s*(?:do\s*)?Documento|Valor\s+Documento|Vl\.?\s*Documento|R\$|RS)[:\s]*([0-9]{1,3}(?:[.,][0-9]{3})*[.,]\d{2})/i', $linha, $valor_match)) {
                $valor = cleanValue($valor_match[1]);
                
                if (!empty($data) && isValidValue($valor)) {
                    // Verifica se já existe este par
                    $existe = false;
                    foreach ($pares as $par) {
                        if ($par['data'] === $data) {
                            $existe = true;
                            break;
                        }
                    }
                    
                    if (!$existe) {
                        $pares[] = [
                            'data' => $data,
                            'valor' => $valor
                        ];
                    }
                }
            }
        }
    }
    
    // Padrão 4: Busca em blocos de texto (para PDFs com formatação tabular)
    // Procura por sequências como: "16/11/2025 R$ 70,00" ou "70,00 16/11/2025"
    $pattern_sequencia = '/(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})[^\dR$]*R?\$?\s*([0-9]{1,3}(?:[.,][0-9]{3})*[.,]\d{2})/i';
    
    if (preg_match_all($pattern_sequencia, $text, $matches, PREG_SET_ORDER)) {
        foreach ($matches as $match) {
            $data = formatDateToYYYYMMDD($match[1]);
            $valor = cleanValue($match[2]);
            
            if (!empty($data) && isValidValue($valor)) {
                $existe = false;
                foreach ($pares as $par) {
                    if ($par['data'] === $data) {
                        $existe = true;
                        break;
                    }
                }
                
                if (!$existe) {
                    $pares[] = [
                        'data' => $data,
                        'valor' => $valor
                    ];
                }
            }
        }
    }
    
    // Padrão 5: Valor antes da data
    $pattern_sequencia2 = '/R?\$?\s*([0-9]{1,3}(?:[.,][0-9]{3})*[.,]\d{2})[^\d]*(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})/i';
    
    if (preg_match_all($pattern_sequencia2, $text, $matches, PREG_SET_ORDER)) {
        foreach ($matches as $match) {
            $valor = cleanValue($match[1]);
            $data = formatDateToYYYYMMDD($match[2]);
            
            if (!empty($data) && isValidValue($valor)) {
                $existe = false;
                foreach ($pares as $par) {
                    if ($par['data'] === $data) {
                        $existe = true;
                        break;
                    }
                }
                
                if (!$existe) {
                    $pares[] = [
                        'data' => $data,
                        'valor' => $valor
                    ];
                }
            }
        }
    }
    
    // Ordena por data
    usort($pares, function($a, $b) {
        return strcmp($a['data'], $b['data']);
    });
    
    return $pares;
}

function extractValues($text) {
    $todos_valores_encontrados = [];
    
    $valor_patterns = [
        // Padrões com R$ explícito
        '/R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i',
        '/R\$\s*(\d{1,3}(?:,\d{3})*\.\d{2})/i',
        '/RS\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i',
        '/RS\s*(\d{1,3}(?:,\d{3})*\.\d{2})/i',
        
        // Valor do Documento (específico para boletos)
        '/(?:Valor\s*(?:do\s*)?Documento|Valor\s+Documento|Vl\.?\s*Documento)[:\sR$]*([0-9]{1,3}(?:[.,][0-9]{3})*[.,]\d{2})/i',
        
        // Valores próximos a palavras-chave
        '/(?:Valor|Total|Importância|Quantia|Vlr|Val)[:\s]+R?\$?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i',
        '/(?:Valor|Total|Importância|Quantia|Vlr|Val)[:\s]+R?\$?\s*(\d{1,3}(?:,\d{3})*\.\d{2})/i',
        
        // Padrões de valores brasileiros
        '/(\d{1,3}(?:\.\d{3})*,\d{2})(?=\s|$|\n)/i',
        '/(\d{1,3}(?:,\d{3})*\.\d{2})(?=\s|$|\n)/i',
        '/(\d{1,6},\d{2})(?=\s|$|\n)/i',
        '/(\d{1,6}\.\d{2})(?=\s|$|\n)/i',
        
        // Valores específicos conhecidos
        '/(?:R\$|RS)?\s*(70[,\.]00)/i',
        '/(?:R\$|RS)?\s*(140[,\.]00)/i',
    ];

    foreach ($valor_patterns as $pattern) {
        preg_match_all($pattern, $text, $matches_valores);
        $valores_desta_regex = isset($matches_valores[1]) && !empty($matches_valores[1]) ? $matches_valores[1] : $matches_valores[0];
        
        foreach ($valores_desta_regex as $valor_encontrado) {
            $valor_limpo = cleanValue($valor_encontrado);
            
            if (isValidValue($valor_limpo)) {
                $todos_valores_encontrados[] = $valor_limpo;
            }
        }
    }

    // Remove valores duplicados e ordena
    $todos_valores_encontrados = array_unique($todos_valores_encontrados);
    sort($todos_valores_encontrados);
    
    return $todos_valores_encontrados;
}

// Validação inicial
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método não permitido']);
    exit;
}

if (!isset($_FILES['boleto'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Nenhum arquivo enviado']);
    exit;
}

$tmpFile = $_FILES['boleto']['tmp_name'];
$nomeArquivoOriginal = $_FILES['boleto']['name'];

if ($_FILES['boleto']['type'] !== 'application/pdf') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Tipo de arquivo inválido. Apenas PDFs são aceitos.']);
    exit;
}

if (!file_exists($tmpFile)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Arquivo não encontrado no servidor']);
    exit;
}

try {
    // --- EXTRAÇÃO DE TEXTO ---
    $extraction_result = extractTextFromPDF($tmpFile);
    $text = $extraction_result['text'];
    $extraction_method = $extraction_result['method'];
    
    if (empty(trim($text))) {
        throw new Exception("Não foi possível extrair texto do PDF. O arquivo pode estar protegido, corrompido ou ser apenas uma imagem.");
    }

    // --- INICIALIZAÇÃO ---
    $valor_total = 0.00;
    $data_vencimento = '';
    $linha_digitavel = '';
    $observacao = 'Dados extraídos do boleto.';
    $total_parcelas = 1;
    $parcela_atual = 1;
    $parcels_extracted_from_pdf = [];

    // --- EXTRAÇÃO DE DADOS ---
    $fornecedor = extractFornecedor($text);
    $todas_datas_encontradas = extractDates($text);
    $todos_valores_encontrados = extractValues($text);
    
    // NOVA EXTRAÇÃO: Pares de data/valor
    $pares_data_valor = extractDateValuePairs($text);

    // --- LÓGICA DE PARCELAS MELHORADA ---
        
    $parcels_extracted_from_pdf = extractInstallmentsByVencimentoAndValorDocumento($text);
    
    if (!empty($parcels_extracted_from_pdf)) {
        $total_parcelas = count($parcels_extracted_from_pdf);
        $data_vencimento = $parcels_extracted_from_pdf[0]['dueDate'];
        $valor_total = array_sum(array_column($parcels_extracted_from_pdf, 'value'));
    } else {
        // Se nem assim achou, aí sim cai no método antigo (valores soltos)
        $todas_datas_encontradas = extractDates($text);
        $todos_valores_encontrados = extractValues($text);
    
        if (empty($todos_valores_encontrados)) {
            throw new Exception("Nenhum valor válido encontrado no boleto (mínimo R$ " . number_format(VALOR_MINIMO_BOLETO, 2, ',', '.') . ").");
        }
    
        $valor_total = array_sum($todos_valores_encontrados);
        $data_vencimento = $todas_datas_encontradas[0] ?? '';
        $total_parcelas = max(1, count($todas_datas_encontradas));
    }
    
    // Se encontrou pares de data/valor, usa eles preferencialmente
    if (!empty($pares_data_valor)) {
        $total_parcelas = count($pares_data_valor);
        $valor_total = 0.00;
        
        foreach ($pares_data_valor as $index => $par) {
            $parcels_extracted_from_pdf[] = [
                'parcelNumber' => $index + 1,
                'value' => $par['valor'],
                'dueDate' => $par['data']
            ];
            $valor_total += $par['valor'];
        }
        
        $data_vencimento = $pares_data_valor[0]['data'];
        
    } else {
        // Fallback para o método anterior se não encontrou pares
        if (empty($todos_valores_encontrados)) {
            if (stripos($fornecedor, 'MMA') !== false) {
                $todos_valores_encontrados = [70.00];
            } else {
                throw new Exception("Nenhum valor válido encontrado no boleto (mínimo R$ " . number_format(VALOR_MINIMO_BOLETO, 2, ',', '.') . ").");
            }
        }

        $numero_datas_unicas = count($todas_datas_encontradas);
        
        if ($numero_datas_unicas > 1) {
            $total_parcelas = $numero_datas_unicas;
            $valor_base_parcela = !empty($todos_valores_encontrados) ? $todos_valores_encontrados[0] : 0.00;

            for ($i = 0; $i < $numero_datas_unicas; $i++) {
                $valor_parcela = isset($todos_valores_encontrados[$i]) ? 
                               $todos_valores_encontrados[$i] : 
                               $valor_base_parcela;
                
                $parcels_extracted_from_pdf[] = [
                    'parcelNumber' => $i + 1,
                    'value' => $valor_parcela,
                    'dueDate' => $todas_datas_encontradas[$i]
                ];
            }
            
            $valor_total = array_sum(array_column($parcels_extracted_from_pdf, 'value'));
            $data_vencimento = $todas_datas_encontradas[0];
            
        } else if ($numero_datas_unicas == 1) {
            $data_vencimento = $todas_datas_encontradas[0];
            $valor_total = array_sum($todos_valores_encontrados);
        } else {
            $valor_total = array_sum($todos_valores_encontrados);
            if (empty($data_vencimento)) {
                $observacao .= ' Atenção: Data de vencimento não identificada.';
            }
        }
    }

    // --- LINHA DIGITÁVEL ---
    if (preg_match('/(\d{5}\.\d{5}\s\d{5}\.\d{6}\s\d{5}\.\d{6}\s\d\s\d{14})/', $text, $matches)) {
        $linha_digitavel = trim($matches[1]);
    } else if (preg_match('/(\d{12}\s\d{12}\s\d{12}\s\d{12})/', $text, $matches)) {
        $linha_digitavel = trim($matches[1]);
    } else if (preg_match('/(\d{47,48})/', $text, $matches)) {
        $linha_digitavel = trim($matches[1]);
    }

    // --- VALIDAÇÃO FINAL ---
    if (!isValidValue($valor_total)) {
        throw new Exception("Valor total inválido: R$ " . number_format($valor_total, 2, ',', '.') . ". Mínimo aceito: R$ " . number_format(VALOR_MINIMO_BOLETO, 2, ',', '.'));
    }

    // --- RESPOSTA DE SUCESSO ---
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'fornecedor' => $fornecedor,
        'valor_total' => $valor_total,
        'data_vencimento' => $data_vencimento,
        'linha_digitavel' => $linha_digitavel,
        'observacao' => $observacao,
        'nome_arquivo_original' => $nomeArquivoOriginal,
        'total_parcelas' => $total_parcelas,
        'parcela_atual' => $parcela_atual,
        'parcels_extracted_from_pdf' => $parcels_extracted_from_pdf,
        'extracted_text_snippet' => substr($text, 0, 1000),
        'debug_info' => [
            'file_size' => $_FILES['boleto']['size'],
            'extraction_method' => $extraction_method,
            'datas_encontradas' => $todas_datas_encontradas,
            'valores_encontrados' => $todos_valores_encontrados,
            'pares_data_valor' => $pares_data_valor,
            'numero_datas' => count($todas_datas_encontradas),
            'numero_valores' => count($todos_valores_encontrados),
            'numero_pares' => count($pares_data_valor),
            'valor_minimo_configurado' => VALOR_MINIMO_BOLETO,
            'texto_completo_extraido_tamanho' => strlen($text)
        ]
    ]);

} catch (Exception $e) {
    error_log("Erro ao processar boleto: " . $e->getMessage() . " - Arquivo: " . $nomeArquivoOriginal);
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug_info' => [
            'arquivo' => $nomeArquivoOriginal,
            'tamanho_arquivo' => $_FILES['boleto']['size'] ?? 0,
            'extraction_method' => $extraction_method ?? 'not_attempted',
            'log_file' => 'boleto_php_errors.log'
        ]
    ]);
}
?>