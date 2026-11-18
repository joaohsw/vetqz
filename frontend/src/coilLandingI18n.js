export const COIL_TRANSLATIONS = {
  'pt-BR': {
    meta: {
      title: 'vetQz — Projeto Acadêmico Binacional COIL (UFSM × UST)',
      description:
        'Apresentação acadêmica do vetQz: sistema bilíngue de apoio ao estudo de Anatomia Veterinária com IA, desenvolvido na parceria COIL 2026 entre UFSM e UST.',
    },
    nav: {
      context: 'Contextualização',
      system: 'Sistema',
      validation: 'Validação UST',
      demo: 'Demonstração',
      about: 'Sobre & Equipes',
      accessApp: 'Acessar aplicativo',
      languageSelector: 'Selecionar idioma',
      switchTo: 'Mudar para {language}',
      themeSelector: 'Selecionar tema',
      switchToLight: 'Mudar para modo claro',
      switchToDark: 'Mudar para modo escuro',
    },
    hero: {
      eyebrow: 'Trabalho Acadêmico Binacional · COIL UFSM–UST (Ago–Dez 2026)',
      title: 'vetQz: Sistema Inteligente de Apoio ao Estudo de Anatomia Veterinária',
      subtitle:
        'Desenvolvido de forma colaborativa entre a disciplina ELC1074 — Projeto de Software II (UFSM, Brasil) e a disciplina ZOO-00171 — Anatomía de Animales de Compañía (UST, Chile).',
      abstractLabel: 'Resumo do projeto',
      abstractText:
        'O vetQz é uma aplicação web bilíngue (pt-BR e es-CL) que converte materiais didáticos em PDF em sessões de prática ativa com questões discursivas (voz ou texto) e de múltipla escolha, fornecendo retorno formativo imediato, resposta exemplar e referência direta à página original do material.',
      metadata: [
        { label: 'Público-alvo', value: 'Estudantes e docentes de Medicina Veterinária (Anatomia)' },
        { label: 'Finalidade', value: 'Prática autônoma, revisão terminológica e apoio às avaliações orais e teóricas' },
        { label: 'Cursos envolvidos', value: 'Sistemas de Informação e Ciência da Computação (UFSM) · Medicina Veterinária (UST)' },
        { label: 'Idiomas do sistema', value: 'Português (pt-BR) e Espanhol (es-CL)' },
      ],
      accessApp: 'Acessar o aplicativo',
      watchDemo: 'Ver vídeo de demonstração',
      figureCaption: 'Figura 1 — Interface do vetQz exibindo correção em questão de múltipla escolha e pontuação da sessão.',
    },
    context: {
      eyebrow: '1. Contextualização e motivação',
      title: 'O desafio pedagógico no ensino de Anatomia Veterinária',
      cards: [
        {
          title: 'Problema identificado',
          text: 'Em disciplinas como Anatomia de Animais de Companhia, os estudantes precisam assimilar grande volume de conteúdos de Anatomia Sistêmica e expressá-los com rigor e precisão na nomenclatura anatômica durante provas teóricas, práticas e orais.',
        },
        {
          title: 'Limitação do acompanhamento individual',
          text: 'Diante da extensão das turmas e da carga horária semestral, o corpo docente dispõe de tempo limitado para conduzir treinos orais individualizados com feedback formativo contínuo para cada discente.',
        },
        {
          title: 'Proposta da solução',
          text: 'Oferecer um espaço de estudo autônomo, individual e livre de pressão a partir das próprias apostilas e roteiros em PDF dos alunos, alinhado aos critérios conceituais esperados nas avaliações.',
        },
      ],
    },
    features: {
      eyebrow: '2. O sistema e suas funcionalidades',
      title: 'Principais recursos implementados no aplicativo',
      description:
        'A aplicação organiza o fluxo de estudo em etapas integradas, combinando extração de texto em PDF, organização temática por IA e avaliação formativa.',
      items: [
        {
          id: 'upload',
          title: 'Ingestão de PDFs até 50 MB',
          description:
            'Envio direto do navegador ao Storage privado (via TUS acima de 6 MB), seguido de extração e limpeza conservadora por página que preserva termos compostos anatômicos.',
        },
        {
          id: 'topics',
          title: 'Mapeamento bilíngue de assuntos',
          description:
            'Análise única que gera tópicos compartilhados em português e espanhol com verificação automática se o conteúdo pertence à área veterinária.',
        },
        {
          id: 'modes',
          title: 'Questões orais, escritas e múltipla escolha',
          description:
            'Suporte a respostas por gravação de voz (com transcrição editável no navegador), resposta digitada, múltipla escolha com 4 alternativas e sessões mistas.',
        },
        {
          id: 'calibration',
          title: 'Calibração de dificuldade e feedback',
          description:
            'Seleção de nível (Fácil, Médio ou Difícil), controle do número de questões por assunto e opção de retorno imediato ou apenas ao final da sessão.',
        },
        {
          id: 'sources',
          title: 'Rastreabilidade à fonte original',
          description:
            'Cada avaliação exibe nota de 0 a 10, pontos fortes, pontos a melhorar, resposta exemplar e citação literal com o número da página do PDF.',
        },
        {
          id: 'history',
          title: 'Navegação livre, histórico e modo convidado',
          description:
            'Alternância livre entre perguntas mantendo rascunhos, histórico persistido para retomada de estudos e entrada sem cadastro prévio como convidado.',
        },
      ],
      galleryTitle: 'Figuras do aplicativo em execução',
      gallerySubtitle: 'Selecione uma etapa para visualizar as telas reais capturadas do sistema.',
      screens: [
        {
          id: 'upload',
          label: 'Fig. 2 · Upload',
          title: 'Figura 2 — Seleção e envio de material didático em PDF',
          caption: 'Aceita documentos em PDF de até 50 MB com barra de progresso e acesso como convidado ou conta registrada.',
          image: '/images/app/03-pdf-selected.png',
        },
        {
          id: 'setup',
          label: 'Fig. 3 · Preparação',
          title: 'Figura 3 — Assuntos identificados e escolha do formato de questão',
          caption: 'O estudante seleciona os tópicos extraídos do documento, define a dificuldade e escolhe entre Múltipla escolha, Descritivas ou Mistas.',
          image: '/images/app/05-study-setup-modes.png',
        },
        {
          id: 'mc',
          label: 'Fig. 4 · Múltipla escolha',
          title: 'Figura 4 — Revisão de questão de múltipla escolha',
          caption: 'Modalidade incorporada após solicitação das estudantes da UST, exibindo gabarito e justificativa das alternativas.',
          image: '/images/app/08-multiple-choice-result.png',
        },
        {
          id: 'oral',
          label: 'Fig. 5 · Descritiva',
          title: 'Figura 5 — Avaliação de resposta descritiva com nota e justificativa',
          caption: 'A IA atribui nota de 0 a 10 e apresenta resposta exemplar acompanhada da página exata do PDF.',
          image: '/images/app/11-descriptive-result.png',
        },
        {
          id: 'bilingual',
          label: 'Fig. 6 · Resumo ES-CL',
          title: 'Figura 6 — Resumo da sessão com interface localizada para espanhol (es-CL)',
          caption: 'Consolidação da média da sessão e alternância imediata de idioma para atender estudantes do Brasil e do Chile.',
          image: '/images/app/13-bilingual-es-cl.png',
        },
      ],
    },
    validation: {
      eyebrow: '3. Avaliação prática e co-design (UST · Chile)',
      title: 'Evidências de uso e contribuição das colegas chilenas',
      description:
        'Durante a etapa de validação com materiais da disciplina Anatomía de Animales de Compañía, as estudantes da Universidad Santo Tomás atuaram como usuárias finais e validadoras da experiência de estudo.',
      cards: [
        {
          badge: 'Retorno de uso',
          title: 'Aprovação e apoio efetivo ao estudo',
          text: 'As colegas chilenas testaram o aplicativo em seu contexto real de estudo, aprovaram a proposta e relataram que a ferramenta ajudou na preparação e revisão dos conteúdos de anatomia.',
        },
        {
          badge: 'Evolução orientada pelo usuário',
          title: 'Inclusão do modo de múltipla escolha',
          text: 'A partir dos testes práticos, o grupo da UST solicitou a adição de questões objetivas de múltipla escolha. A funcionalidade foi implementada de ponta a ponta, incluindo o modo Misto.',
        },
      ],
      evolutionFromLabel: 'Escopo inicial',
      evolutionFromText: 'Prática focada exclusivamente em questões abertas com resposta oral/escrita avaliada por IA.',
      evolutionToLabel: 'Após validação com a UST',
      evolutionToText: 'Inclusão do modo Múltipla Escolha (4 alternativas com justificativa) e do modo Misto.',
    },
    demo: {
      eyebrow: '4. Vídeo de demonstração',
      title: 'Demonstração de uso no estudo de anatomia',
      description:
        'Registro em vídeo (1m52s) ilustrando uma situação concreta de uso com material de osteologia veterinária: do acesso como convidado ao resumo final bilíngue, destacando os modos adicionados após os testes no Chile.',
      chapters: [
        'Acesso como convidado e envio de apostila em PDF',
        'Seleção de tópicos, dificuldade e formato da sessão',
        'Demonstração do modo múltipla escolha (solicitado pela UST)',
        'Avaliação descritiva por voz/texto com citação de página e resumo em espanhol',
      ],
      videoSrc: '/videos/vetqz-demonstracao.mp4',
      posterSrc: '/images/app/06-multiple-choice-question.png',
      fallbackText: 'Seu navegador não suporta reprodução de vídeo HTML5.',
      pendingTitle: 'Vídeo de demonstração em preparação',
      pendingDescription: 'Após gravar a demonstração, salve o arquivo em frontend/public/videos/vetqz-demonstracao.mp4 para exibição automática aqui.',
    },
    about: {
      eyebrow: '5. Sobre o projeto e parceria COIL',
      title: 'Cooperação acadêmica internacional UFSM × UST',
      description:
        'Este projeto foi desenvolvido no âmbito da iniciativa COIL (Collaborative Online International Learning) entre agosto e dezembro de 2026, integrando equipes de Computação no Brasil e Medicina Veterinária no Chile.',
      institutionsTableTitle: 'Contexto acadêmico da parceria COIL 2026',
      institutions: [
        {
          country: 'Brasil',
          university: 'Universidade Federal de Santa Maria (UFSM)',
          city: 'Santa Maria, RS',
          courses: 'Sistemas de Informação · Ciência da Computação',
          subject: 'ELC1074 — Projeto de Software II (120h)',
          role: 'Levantamento de requisitos, arquitetura, desenvolvimento e evolução do sistema.',
        },
        {
          country: 'Chile',
          university: 'Universidad Santo Tomás (UST)',
          city: 'Santiago, Chile',
          courses: 'Medicina Veterinária',
          subject: 'ZOO-00171 — Anatomía de Animales de Compañía (108h)',
          role: 'Especialistas de domínio, fornecimento de contexto pedagógico e validação prática.',
        },
      ],
      makingOfBadge: 'Vídeo do desenvolvimento (Making of · 1m43s)',
      makingOfTitle: 'Processo de desenvolvimento e colaboração binacional',
      makingOfDescription:
        'Apresenta as equipes e orientadores de ambas as instituições, exemplos de interação com os parceiros chilenos, decisões de arquitetura e desafios enfrentados ao longo do semestre.',
      videoSrc: '/videos/vetqz-making-of.mp4',
      posterSrc: '/images/app/04-study-setup-mixed.png',
      pendingTitle: 'Vídeo de making of em preparação',
      pendingDescription: 'Após gravar a apresentação com os slides, salve o arquivo em frontend/public/videos/vetqz-making-of.mp4 para exibição automática aqui.',
      teamsTitle: 'Equipes e orientadores participantes',
      teamsSubtitle: 'Integrantes da colaboração binacional entre Brasil e Chile.',
      ust: {
        institution: 'Universidad Santo Tomás (UST)',
        country: 'Chile',
        focus: 'Medicina Veterinária · ZOO-00171 Anatomía de Animales de Compañía',
        studentsLabel: 'Estudantes',
        advisorsLabel: 'Orientação docente',
        students: [
          'Valentina Ávila Reyes',
          'Noemí Astete',
          'Fernanda Jiménez',
          'Ignacia Moreno',
        ],
        advisors: ['Flávia Montenegro'],
      },
      ufsm: {
        institution: 'Universidade Federal de Santa Maria (UFSM)',
        country: 'Brasil',
        focus: 'Sistemas de Informação & Ciência da Computação · ELC1074 Projeto de Software II',
        studentsLabel: 'Estudantes',
        advisorsLabel: 'Orientação docente',
        students: [
          'Diego Rockenbach',
          'João Henrique Scherer Wolski',
          'Lucas Aued',
          'Josias Augusto Kautzmann',
        ],
        advisors: ['Andrea Schwertner Charão', 'Celio Trois'],
      },
      stackTitle: 'Arquitetura, tecnologias e decisões técnicas',
      stack: [
        {
          name: 'Frontend · React 19 + Vite + TailwindCSS',
          detail: 'Interface web bilíngue com gravação de áudio e transcrição no navegador, além de envio direto ao Storage via protocolo TUS.',
        },
        {
          name: 'Backend · Python + FastAPI (Vercel)',
          detail: 'Chunking conservador de PDFs por página, delimitação XML contra prompt injection e correção determinística para múltipla escolha.',
        },
        {
          name: 'Persistência & IA · Supabase + Gemini 3.5 Flash-Lite',
          detail: 'Autenticação e PostgreSQL com RLS, retenção temporária de 7 dias para arquivos e cache bilíngue de assuntos indexado por SHA-256.',
        },
      ],
    },
    cta: {
      title: 'Acesso ao aplicativo desenvolvido',
      description: 'Utilize o vetQz diretamente no navegador (inclusive como convidado) para testar o envio de materiais, perguntas descritivas e o modo de múltipla escolha.',
      button: 'Acessar o aplicativo',
    },
    footer: 'vetQz · Trabalho Acadêmico COIL 2026 · UFSM (ELC1074) × UST (ZOO-00171)',
  },
  'es-CL': {
    meta: {
      title: 'vetQz — Proyecto Académico Binacional COIL (UFSM × UST)',
      description:
        'Presentación académica de vetQz: sistema bilingüe de apoyo al estudio de Anatomía Veterinaria con IA, desarrollado en la alianza COIL 2026 entre UFSM y UST.',
    },
    nav: {
      context: 'Contextualización',
      system: 'Sistema',
      validation: 'Validación UST',
      demo: 'Demostración',
      about: 'Sobre & Equipos',
      accessApp: 'Acceder a la app',
      languageSelector: 'Seleccionar idioma',
      switchTo: 'Cambiar a {language}',
      themeSelector: 'Seleccionar tema',
      switchToLight: 'Cambiar a modo claro',
      switchToDark: 'Cambiar a modo oscuro',
    },
    hero: {
      eyebrow: 'Trabajo Académico Binacional · COIL UFSM–UST (Ago–Dic 2026)',
      title: 'vetQz: Sistema Inteligente de Apoyo al Estudio de Anatomía Veterinaria',
      subtitle:
        'Desarrollado colaborativamente entre la asignatura ELC1074 — Projeto de Software II (UFSM, Brasil) y ZOO-00171 — Anatomía de Animales de Compañía (UST, Chile).',
      abstractLabel: 'Resumen del proyecto',
      abstractText:
        'vetQz es una aplicación web bilingüe (es-CL y pt-BR) que convierte materiales didácticos en PDF en sesiones de práctica activa con preguntas abiertas (voz o texto) y de opción múltiple, entregando retroalimentación formativa inmediata, respuesta modelo y cita directa a la página del material.',
      metadata: [
        { label: 'Público objetivo', value: 'Estudiantes y docentes de Medicina Veterinaria (Anatomía)' },
        { label: 'Finalidad', value: 'Práctica autónoma, repaso terminológico y apoyo a evaluaciones orales y teóricas' },
        { label: 'Carreras involucradas', value: 'Medicina Veterinaria (UST) · Sistemas de Información y Ciencia de la Computación (UFSM)' },
        { label: 'Idiomas del sistema', value: 'Español (es-CL) y Portugués (pt-BR)' },
      ],
      accessApp: 'Acceder a la aplicación',
      watchDemo: 'Ver video de demostración',
      figureCaption: 'Figura 1 — Interfaz de vetQz mostrando la revisión de una pregunta de opción múltiple y el puntaje obtenido.',
    },
    context: {
      eyebrow: '1. Contextualización y motivación',
      title: 'El desafío pedagógico en la enseñanza de Anatomía Veterinaria',
      cards: [
        {
          title: 'Problema identificado',
          text: 'En asignaturas como Anatomía de Animales de Compañía, los estudiantes deben asimilar un alto volumen de contenidos de Anatomía Sistémica y expresarlos con rigor y precisión terminológica en evaluaciones teóricas, prácticas y orales.',
        },
        {
          title: 'Limitación del seguimiento individual',
          text: 'Dado el tamaño de los cursos y la carga horaria semestral, el cuerpo docente dispone de tiempo acotado para realizar evaluaciones orales individualizadas con retroalimentación formativa continua.',
        },
        {
          title: 'Propuesta de solución',
          text: 'Ofrecer un espacio de práctica autónomo, individual y libre de presión a partir de las propias guías y apuntes en PDF de los estudiantes, alineado con los criterios conceptuales esperados en las evaluaciones.',
        },
      ],
    },
    features: {
      eyebrow: '2. El sistema y sus funcionalidades',
      title: 'Principales capacidades implementadas en la aplicación',
      description:
        'La plataforma organiza el flujo de estudio en etapas integradas, combinando extracción de texto desde PDF, organización temática con IA y evaluación formativa.',
      items: [
        {
          id: 'upload',
          title: 'Carga de PDFs hasta 50 MB',
          description:
            'Subida directa desde el navegador al Storage privado (vía TUS sobre 6 MB), seguida de extracción y limpieza conservadora por página que preserva compuestos anatómicos.',
        },
        {
          id: 'topics',
          title: 'Mapeo bilingüe de temas',
          description:
            'Análisis único que genera temas compartidos en español y portugués, verificando automáticamente si el contenido corresponde al área veterinaria.',
        },
        {
          id: 'modes',
          title: 'Preguntas orales, escritas y opción múltiple',
          description:
            'Soporte para respuestas por grabación de voz (con transcripción editable en el navegador), texto escrito, opción múltiple de 4 alternativas y sesiones mixtas.',
        },
        {
          id: 'calibration',
          title: 'Calibración de dificultad y feedback',
          description:
            'Selección de nivel (Fácil, Medio o Difícil), cantidad de preguntas por tema y modalidad de corrección inmediata o al finalizar la sesión.',
        },
        {
          id: 'sources',
          title: 'Trazabilidad hacia la fuente original',
          description:
            'Cada corrección entrega calificación de 0 a 10, aciertos, aspectos por mejorar, respuesta modelo y fragmento literal con número de página del PDF.',
        },
        {
          id: 'history',
          title: 'Navegación libre, historial y modo invitado',
          description:
            'Desplazamiento libre entre preguntas conservando borradores, historial guardado para retomar sesiones e ingreso sin registro previo como invitado.',
        },
      ],
      galleryTitle: 'Figuras de la aplicación en funcionamiento',
      gallerySubtitle: 'Selecciona una etapa para ver las pantallas reales capturadas del sistema.',
      screens: [
        {
          id: 'upload',
          label: 'Fig. 2 · Carga',
          title: 'Figura 2 — Selección y subida de material didáctico en PDF',
          caption: 'Admite documentos PDF de hasta 50 MB con barra de progreso e ingreso como invitado o con cuenta.',
          image: '/images/app/03-pdf-selected.png',
        },
        {
          id: 'setup',
          label: 'Fig. 3 · Preparación',
          title: 'Figura 3 — Temas identificados y selección del formato de preguntas',
          caption: 'El estudiante selecciona los temas extraídos del documento, ajusta la dificultad y elige entre Opción múltiple, Descriptivas o Mixtas.',
          image: '/images/app/05-study-setup-modes.png',
        },
        {
          id: 'mc',
          label: 'Fig. 4 · Opción múltiple',
          title: 'Figura 4 — Revisión de pregunta de opción múltiple',
          caption: 'Modalidad incorporada tras la solicitud de las estudiantes de la UST, mostrando la pauta y justificación de las alternativas.',
          image: '/images/app/08-multiple-choice-result.png',
        },
        {
          id: 'oral',
          label: 'Fig. 5 · Descriptiva',
          title: 'Figura 5 — Evaluación de respuesta descriptiva con calificación y fuente',
          caption: 'La IA asigna una nota de 0 a 10 y presenta la respuesta modelo junto con la página exacta del PDF.',
          image: '/images/app/11-descriptive-result.png',
        },
        {
          id: 'bilingual',
          label: 'Fig. 6 · Resumen ES-CL',
          title: 'Figura 6 — Resumen de la sesión con interfaz localizada al español (es-CL)',
          caption: 'Consolidación del promedio de la sesión y cambio inmediato de idioma para estudiantes de Chile y Brasil.',
          image: '/images/app/13-bilingual-es-cl.png',
        },
      ],
    },
    validation: {
      eyebrow: '3. Evaluación práctica y co-diseño (UST · Chile)',
      title: 'Evidencias de uso y aportes de las colegas chilenas',
      description:
        'Durante la etapa de validación con materiales de la asignatura Anatomía de Animales de Compañía, las estudiantes de la Universidad Santo Tomás participaron como usuarias finales y validadoras de la experiencia de estudio.',
      cards: [
        {
          badge: 'Retroalimentación de uso',
          title: 'Aprobación y apoyo efectivo al estudio',
          text: 'Las colegas chilenas probaron la aplicación en su contexto real de estudio, aprobaron la herramienta y señalaron que les ayudó en la preparación y repaso de los contenidos de anatomía.',
        },
        {
          badge: 'Evolución guiada por usuarios',
          title: 'Inclusión del modo de opción múltiple',
          text: 'A partir de las pruebas prácticas, el equipo de la UST solicitó incorporar preguntas objetivas de opción múltiple. La funcionalidad fue implementada de extremo a extremo, incluyendo el modo Mixto.',
        },
      ],
      evolutionFromLabel: 'Alcance inicial',
      evolutionFromText: 'Práctica enfocada exclusivamente en preguntas abiertas con respuesta oral/escrita evaluada por IA.',
      evolutionToLabel: 'Tras validación con la UST',
      evolutionToText: 'Incorporación del modo Opción Múltiple (4 alternativas con justificación) y modo Mixto.',
    },
    demo: {
      eyebrow: '4. Video de demostración',
      title: 'Demostración de uso en el estudio de anatomía',
      description:
        'Registro en video (1m52s) que ilustra una situación concreta de uso con material de osteología veterinaria: desde el ingreso como invitado hasta el resumen bilingüe, destacando los modos agregados tras las pruebas en Chile.',
      chapters: [
        'Ingreso como invitado y carga de guía en PDF',
        'Selección de temas, dificultad y formato de la sesión',
        'Demostración del modo de opción múltiple (solicitado por la UST)',
        'Evaluación descriptiva por voz/texto con cita de página y resumen en español',
      ],
      videoSrc: '/videos/vetqz-demonstracao.mp4',
      posterSrc: '/images/app/06-multiple-choice-question.png',
      fallbackText: 'Tu navegador no soporta la reproducción de video HTML5.',
      pendingTitle: 'Video de demostración en preparación',
      pendingDescription: 'Luego de grabar la demostración, guarda el archivo en frontend/public/videos/vetqz-demonstracao.mp4 para mostrarlo automáticamente aquí.',
    },
    about: {
      eyebrow: '5. Sobre el proyecto y alianza COIL',
      title: 'Cooperación académica internacional UFSM × UST',
      description:
        'Este proyecto fue desarrollado en el marco de la iniciativa COIL (Collaborative Online International Learning) entre agosto y diciembre de 2026, integrando equipos de Computación en Brasil y Medicina Veterinaria en Chile.',
      institutionsTableTitle: 'Contexto académico de la alianza COIL 2026',
      institutions: [
        {
          country: 'Brasil',
          university: 'Universidade Federal de Santa Maria (UFSM)',
          city: 'Santa Maria, RS',
          courses: 'Sistemas de Información · Ciencia de la Computación',
          subject: 'ELC1074 — Projeto de Software II (120h)',
          role: 'Levantamiento de requisitos, arquitectura, implementación y evolución del sistema.',
        },
        {
          country: 'Chile',
          university: 'Universidad Santo Tomás (UST)',
          city: 'Santiago, Chile',
          courses: 'Medicina Veterinaria',
          subject: 'ZOO-00171 — Anatomía de Animales de Compañía (108h)',
          role: 'Especialistas de dominio, contexto pedagógico y validación práctica.',
        },
      ],
      makingOfBadge: 'Video del desarrollo (Making of · 1m43s)',
      makingOfTitle: 'Proceso de desarrollo y colaboración binacional',
      makingOfDescription:
        'Presenta a los equipos y docentes guías de ambas instituciones, ejemplos de interacción con las colegas chilenas, decisiones de arquitectura y desafíos del semestre.',
      videoSrc: '/videos/vetqz-making-of.mp4',
      posterSrc: '/images/app/04-study-setup-mixed.png',
      pendingTitle: 'Video de making of en preparación',
      pendingDescription: 'Luego de grabar la presentación con las diapositivas, guarda el archivo en frontend/public/videos/vetqz-making-of.mp4 para mostrarlo automáticamente aquí.',
      teamsTitle: 'Equipos y orientación docente',
      teamsSubtitle: 'Integrantes de la colaboración binacional entre Chile y Brasil.',
      ust: {
        institution: 'Universidad Santo Tomás (UST)',
        country: 'Chile',
        focus: 'Medicina Veterinaria · ZOO-00171 Anatomía de Animales de Compañía',
        studentsLabel: 'Estudiantes',
        advisorsLabel: 'Orientación docente',
        students: [
          'Valentina Ávila Reyes',
          'Noemí Astete',
          'Fernanda Jiménez',
          'Ignacia Moreno',
        ],
        advisors: ['Flávia Montenegro'],
      },
      ufsm: {
        institution: 'Universidade Federal de Santa Maria (UFSM)',
        country: 'Brasil',
        focus: 'Sistemas de Información y Ciencia de la Computación · ELC1074 Projeto de Software II',
        studentsLabel: 'Estudiantes',
        advisorsLabel: 'Orientación docente',
        students: [
          'Diego Rockenbach',
          'João Henrique Scherer Wolski',
          'Lucas Aued',
          'Josias Augusto Kautzmann',
        ],
        advisors: ['Andrea Schwertner Charão', 'Celio Trois'],
      },
      stackTitle: 'Arquitectura, tecnologías y decisiones técnicas',
      stack: [
        {
          name: 'Frontend · React 19 + Vite + TailwindCSS',
          detail: 'Interfaz web bilingüe con grabación de voz y transcripción en el navegador, además de subida directa al Storage mediante protocolo TUS.',
        },
        {
          name: 'Backend · Python + FastAPI (Vercel)',
          detail: 'Chunking conservador de PDFs por página, delimitadores XML frente a prompt injection y evaluación determinística en opción múltiple.',
        },
        {
          name: 'Persistencia e IA · Supabase + Gemini 3.5 Flash-Lite',
          detail: 'Autenticación y PostgreSQL con RLS, retención temporal de 7 días para archivos y caché bilingüe de temas indexado por SHA-256.',
        },
      ],
    },
    cta: {
      title: 'Acceso a la aplicación desarrollada',
      description: 'Utiliza vetQz directamente en el navegador (incluso como invitado) para probar la carga de materiales, preguntas descriptivas y el modo de opción múltiple.',
      button: 'Acceder a la aplicación',
    },
    footer: 'vetQz · Trabajo Académico COIL 2026 · UFSM (ELC1074) × UST (ZOO-00171)',
  },
};
