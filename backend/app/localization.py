from app.schemas.language import DEFAULT_LANGUAGE, SupportedLanguage


MESSAGES = {
    'pt-BR': {
        'unsupported_pdf': 'Tipo de arquivo não suportado: {content_type}. Apenas PDF (application/pdf) é aceito.',
        'pdf_too_large': 'Arquivo excede o limite de {limit}MB.',
        'pdf_processing': 'Erro ao processar o PDF: {error}',
        'pdf_no_text': 'O PDF não contém texto extraível. Verifique se não é um PDF escaneado (imagem).',
        'pdf_storage': 'Erro ao salvar o PDF no Storage: {error}',
        'pdf_database': 'Erro ao salvar metadata no banco: {error}',
        'document_not_found': 'Documento não encontrado: {document_id}',
        'document_no_chunks': 'O documento não possui trechos de texto. O PDF pode estar vazio ou corrompido.',
        'chunk_out_of_range': 'chunk_index {index} fora do intervalo [0, {maximum}].',
        'question_generation': 'Erro ao gerar pergunta com o Gemini: {error}',
        'unsupported_audio': 'Formato de áudio não suportado: {content_type}. Formatos aceitos: {allowed_types}',
        'empty_audio': 'O arquivo de áudio está vazio.',
        'audio_too_large': 'Áudio excede o limite de {limit}MB.',
        'answer_evaluation': 'Erro ao avaliar resposta com o Gemini: {error}',
    },
    'es-CL': {
        'unsupported_pdf': 'Tipo de archivo no compatible: {content_type}. Solo se acepta PDF (application/pdf).',
        'pdf_too_large': 'El archivo supera el límite de {limit}MB.',
        'pdf_processing': 'Error al procesar el PDF: {error}',
        'pdf_no_text': 'El PDF no contiene texto extraíble. Comprueba que no sea un PDF escaneado como imagen.',
        'pdf_storage': 'Error al guardar el PDF en Storage: {error}',
        'pdf_database': 'Error al guardar los metadatos en la base de datos: {error}',
        'document_not_found': 'Documento no encontrado: {document_id}',
        'document_no_chunks': 'El documento no contiene fragmentos de texto. El PDF puede estar vacío o dañado.',
        'chunk_out_of_range': 'chunk_index {index} fuera del intervalo [0, {maximum}].',
        'question_generation': 'Error al generar la pregunta con Gemini: {error}',
        'unsupported_audio': 'Formato de audio no compatible: {content_type}. Formatos aceptados: {allowed_types}',
        'empty_audio': 'El archivo de audio está vacío.',
        'audio_too_large': 'El audio supera el límite de {limit}MB.',
        'answer_evaluation': 'Error al evaluar la respuesta con Gemini: {error}',
    },
}


def api_message(language: SupportedLanguage, key: str, **values: object) -> str:
    language_messages = MESSAGES.get(language, MESSAGES[DEFAULT_LANGUAGE])
    return language_messages[key].format(**values)
