from app.schemas.language import DEFAULT_LANGUAGE, SupportedLanguage


MESSAGES = {
    'pt-BR': {
        'auth_required': 'Autenticação necessária para acessar seus materiais.',
        'invalid_session': 'Sessão inválida. Entre novamente para continuar.',
        'expired_session': 'Sessão inválida ou expirada. Entre novamente para continuar.',
        'unsupported_pdf': 'Tipo de arquivo não suportado: {content_type}. Apenas PDF (application/pdf) é aceito.',
        'pdf_too_large': 'Arquivo excede o limite de {limit}MB.',
        'pdf_processing': 'Erro ao processar o PDF: {error}',
        'pdf_no_text': 'O PDF não contém texto extraível. Verifique se não é um PDF escaneado (imagem).',
        'pdf_storage': 'Erro ao salvar o PDF no Storage: {error}',
        'pdf_database': 'Erro ao salvar metadata no banco: {error}',
        'upload_intent_not_found': 'O envio expirou ou não pertence à sua conta. Selecione o PDF novamente.',
        'upload_intent_expired': 'O envio expirou. Selecione o PDF novamente.',
        'document_not_found': 'Documento não encontrado: {document_id}',
        'document_no_chunks': 'O documento não possui trechos de texto. O PDF pode estar vazio ou corrompido.',
        'document_delete_failed': 'Erro ao remover o documento do banco: {error}',
        'document_storage_delete_failed': 'Erro ao remover o PDF do Storage: {error}',
        'chunk_out_of_range': 'chunk_index {index} fora do intervalo [0, {maximum}].',
        'question_generation': 'Erro ao gerar pergunta com o Gemini: {error}',
        'topic_analysis': 'Erro ao identificar os assuntos do PDF: {error}',
        'topic_analysis_in_progress': 'Análise em andamento. Tente novamente em instantes.',
        'no_eligible_chunks': 'Nenhum trecho válido foi selecionado para gerar a pergunta.',
        'chunk_not_selected': 'O trecho solicitado não pertence aos assuntos selecionados.',
        'unsupported_audio': 'Formato de áudio não suportado: {content_type}. Formatos aceitos: {allowed_types}',
        'empty_audio': 'O arquivo de áudio está vazio.',
        'audio_too_large': 'Áudio excede o limite de {limit}MB.',
        'answer_evaluation': 'Erro ao avaliar resposta com o Gemini: {error}',
        'answer_save_failed': 'Não foi possível salvar a resposta. Tente novamente.',
        'study_session_not_found': 'Sessão de estudo não encontrada.',
        'study_session_create_failed': 'Não foi possível iniciar sua sessão de estudo.',
        'study_history_load_failed': 'Não foi possível carregar seu histórico de estudos.',
        'materials_load_failed': 'Não foi possível carregar seus materiais recentes.',
        'invalid_question_position': 'A posição da pergunta deve começar em 1.',
        'retry_attempt_not_found': 'A tentativa que você quer refazer não foi encontrada.',
        'retry_attempt_session_mismatch': 'A tentativa não pertence à sessão de estudo informada.',
        'retry_attempt_question_mismatch': 'A tentativa não corresponde à questão informada.',
        'gemini_invalid_json': 'Não foi possível extrair JSON da resposta do Gemini: {preview}',
        'invalid_content_classification': 'Classificação de conteúdo inválida',
        'invalid_topic_map': 'Mapa de assuntos inválido',
        'no_valid_topics': 'Nenhum assunto válido na resposta do Gemini',
        'invalid_topic_translation': 'Tradução de assuntos inválida',
        'incomplete_topic_translation': 'Tradução incompleta; a análise original foi preservada',
        'invalid_evaluation_score': 'A avaliação retornou uma nota inválida ou ausente',
        'invalid_multiple_choice_question': 'Não foi possível gerar 4 alternativas válidas para a questão de múltipla escolha.',
        'invalid_multiple_choice_options': 'As alternativas da questão de múltipla escolha são inválidas.',
        'invalid_multiple_choice_selection': 'Selecione uma alternativa válida para enviar sua resposta.',
        'mc_feedback_correct': 'Resposta correta! Você selecionou a alternativa {option_id} ({option_text}).',
        'mc_feedback_incorrect': 'Resposta incorreta. Você selecionou a alternativa {option_id} ({option_text}).',
    },
    'es-CL': {
        'auth_required': 'Se requiere autenticación para acceder a tus materiales.',
        'invalid_session': 'Sesión inválida. Inicia sesión nuevamente para continuar.',
        'expired_session': 'Sesión inválida o expirada. Inicia sesión nuevamente para continuar.',
        'unsupported_pdf': 'Tipo de archivo no compatible: {content_type}. Solo se acepta PDF (application/pdf).',
        'pdf_too_large': 'El archivo supera el límite de {limit}MB.',
        'pdf_processing': 'Error al procesar el PDF: {error}',
        'pdf_no_text': 'El PDF no contiene texto extraíble. Comprueba que no sea un PDF escaneado como imagen.',
        'pdf_storage': 'Error al guardar el PDF en Storage: {error}',
        'pdf_database': 'Error al guardar los metadatos en la base de datos: {error}',
        'upload_intent_not_found': 'El envío expiró o no pertenece a tu cuenta. Selecciona el PDF nuevamente.',
        'upload_intent_expired': 'El envío expiró. Selecciona el PDF nuevamente.',
        'document_not_found': 'Documento no encontrado: {document_id}',
        'document_no_chunks': 'El documento no contiene fragmentos de texto. El PDF puede estar vacío o dañado.',
        'document_delete_failed': 'Error al eliminar el documento de la base de datos: {error}',
        'document_storage_delete_failed': 'Error al eliminar el PDF del Storage: {error}',
        'chunk_out_of_range': 'chunk_index {index} fuera del intervalo [0, {maximum}].',
        'question_generation': 'Error al generar la pregunta con Gemini: {error}',
        'topic_analysis': 'Error al identificar los temas del PDF: {error}',
        'topic_analysis_in_progress': 'Análisis en curso. Inténtalo de nuevo en unos instantes.',
        'no_eligible_chunks': 'No se seleccionó ningún fragmento válido para generar la pregunta.',
        'chunk_not_selected': 'El fragmento solicitado no pertenece a los temas seleccionados.',
        'unsupported_audio': 'Formato de audio no compatible: {content_type}. Formatos aceptados: {allowed_types}',
        'empty_audio': 'El archivo de audio está vacío.',
        'audio_too_large': 'El audio supera el límite de {limit}MB.',
        'answer_evaluation': 'Error al evaluar la respuesta con Gemini: {error}',
        'answer_save_failed': 'No fue posible guardar la respuesta. Inténtalo de nuevo.',
        'study_session_not_found': 'Sesión de estudio no encontrada.',
        'study_session_create_failed': 'No fue posible iniciar tu sesión de estudio.',
        'study_history_load_failed': 'No fue posible cargar tu historial de estudio.',
        'materials_load_failed': 'No fue posible cargar tus materiales recientes.',
        'invalid_question_position': 'La posición de la pregunta debe comenzar en 1.',
        'retry_attempt_not_found': 'No se encontró el intento que deseas repetir.',
        'retry_attempt_session_mismatch': 'El intento no pertenece a la sesión de estudio indicada.',
        'retry_attempt_question_mismatch': 'El intento no corresponde a la pregunta indicada.',
        'gemini_invalid_json': 'No fue posible extraer JSON de la respuesta de Gemini: {preview}',
        'invalid_content_classification': 'Clasificación de contenido inválida',
        'invalid_topic_map': 'Mapa de temas inválido',
        'no_valid_topics': 'Ningún tema válido en la respuesta de Gemini',
        'invalid_topic_translation': 'Traducción de temas inválida',
        'incomplete_topic_translation': 'Traducción incompleta; se conservó el análisis original',
        'invalid_evaluation_score': 'La evaluación devolvió una calificación inválida o ausente',
        'invalid_multiple_choice_question': 'No fue posible generar 4 alternativas válidas para la pregunta de opción múltiple.',
        'invalid_multiple_choice_options': 'Las alternativas de la pregunta de opción múltiple no son válidas.',
        'invalid_multiple_choice_selection': 'Selecciona una alternativa válida para enviar tu respuesta.',
        'mc_feedback_correct': '¡Respuesta correcta! Seleccionaste la alternativa {option_id} ({option_text}).',
        'mc_feedback_incorrect': 'Respuesta incorrecta. Seleccionaste la alternativa {option_id} ({option_text}).',
    },
}


def resolve_language(
    language: str | None = None,
    accept_language: str | None = None,
) -> SupportedLanguage:
    for candidate in (language, accept_language):
        if not candidate:
            continue
        normalized = candidate.split(',', 1)[0].split(';', 1)[0].strip()
        if normalized == 'es-CL' or normalized.lower().startswith('es'):
            return 'es-CL'
        if normalized == 'pt-BR' or normalized.lower().startswith('pt'):
            return 'pt-BR'
    return DEFAULT_LANGUAGE


def api_message(language: SupportedLanguage | str | None, key: str, **values: object) -> str:
    resolved = resolve_language(language)
    language_messages = MESSAGES.get(resolved, MESSAGES[DEFAULT_LANGUAGE])
    return language_messages[key].format(**values)
