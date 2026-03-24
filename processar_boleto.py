# processar_boleto.py

import pdfplumber
import re
import json
import sys

def extrair_informacoes(caminho_arquivo):
    # Implemente aqui a lógica de extração usando pdfplumber e regex
    # Exemplo:
    texto_extraido = ""
    linhas_do_texto = []

    with pdfplumber.open(caminho_arquivo) as pdf:
        for page in pdf.pages:
            texto_pagina = page.extract_text()
            if texto_pagina:
                texto_extraido += texto_pagina + "\n"
                linhas_do_texto.extend(texto_pagina.split('\n'))

    # ... (restante da lógica de extração)

    # Retorne as informações relevantes
    dados_boleto = {
        'fornecedor': fornecedor,
        'data_vencimento': data_vencimento,
        'observacao': observacao,
        'valor_total': valor_total,
        'total_parcelas': total_parcelas
    }
    return dados_boleto

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({'error': 'Caminho do arquivo não fornecido'}))
        sys.exit(1)

    caminho_arquivo = sys.argv[1]
    try:
        dados_boleto = extrair_informacoes(caminho_arquivo)
        print(json.dumps(dados_boleto))
    except Exception as e:
        print(json.dumps({'error': str(e)}))