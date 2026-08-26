from typing import Literal


SupportedLanguage = Literal['pt-BR', 'es-CL']
DEFAULT_LANGUAGE: SupportedLanguage = 'pt-BR'


LANGUAGE_NAMES: dict[SupportedLanguage, str] = {
    'pt-BR': 'português do Brasil',
    'es-CL': 'español de Chile',
}
