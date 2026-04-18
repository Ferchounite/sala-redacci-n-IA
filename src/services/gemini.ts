import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ContentHubParams {
  context: string;
  suggestedTitle?: string;
  primaryKeyword: string;
  secondaryKeywords: string;
  intent: 'Informacional' | 'Comercial' | 'Transaccional';
  type: 'Pillar Page' | 'Supporting Article';
  format: 'Artículo largo' | 'Guía + secuencias' | 'Tutorial visual' | 'Comparativa' | 'Landing categoría' | 'Landing comercial' | 'Rutina paso a paso';
  destinationUrl?: string;
}

export async function generateContentHubArticle(params: ContentHubParams) {
  const { context, suggestedTitle, primaryKeyword, secondaryKeywords, intent, type, format, destinationUrl } = params;

  const systemPrompt = `Actúa como un Copywriter Senior experto en SEO con más de 11 años de experiencia en la creación de plataformas de contenido. Tu estilo es premium, directo y persuasivo. Tienes estrictamente prohibido usar introducciones genéricas, lenguaje robótico o texto de relleno. Tu objetivo es retener al usuario, maximizar el tiempo de permanencia y forzar la conversión, adaptando el tono a la intención de búsqueda definida. Aplica siempre buenas prácticas de legibilidad web.`;

  let typeSpecificLogic = "";
  if (type === 'Pillar Page') {
    typeSpecificLogic = `Generar un contenido pilar extenso (2,000+ palabras). Debe estructurar un índice profundo con múltiples H2 y H3, cubriendo todas las aristas del tema para establecer autoridad temática absoluta. Incluir sección de FAQs.`;
  } else {
    typeSpecificLogic = `Generar un contenido enfocado (1,000 - 1,500 palabras) para resolver una duda específica. Comando obligatorio: Debe redactar un párrafo de transición natural que incluya un enlace contextual hacia la ${destinationUrl || 'URL de destino'}, utilizando la Keyword Principal "${primaryKeyword}" especificada como texto ancla (anchor text exacto o con variaciones lógicas).`;
  }

  let formatSpecificLogic = "";
  if (format === 'Guía + secuencias' || format === 'Rutina paso a paso') {
    formatSpecificLogic = `Estructurar con listas numeradas claras y dejar marcadores (ej. [Insertar Imagen del Paso]) para facilitar la subida de contenido multimedia.`;
  } else if (format === 'Comparativa') {
    formatSpecificLogic = `Incluir obligatoriamente secciones de 'Pros y Contras' usando viñetas.`;
  } else if (format === 'Landing comercial' || format === 'Landing categoría') {
    formatSpecificLogic = `Reducir los párrafos largos, ir directo al beneficio del usuario y enfatizar los llamados a la acción (CTAs).`;
  }

  const prompt = `
    ${systemPrompt}

    PARÁMETROS DEL CONTENIDO:
    - Contexto de la web: ${context}
    - Título Sugerido/Tema: ${suggestedTitle || 'No especificado'}
    - Keyword Principal: ${primaryKeyword}
    - Keywords Secundarias: ${secondaryKeywords || 'No proporcionadas. IMPORTANTE: Usa tu experiencia SEO para identificar e incluir los términos LSI y entidades semánticas más relevantes para este nicho.'}
    - Intención de Búsqueda: ${intent}
    - Tipo de Artículo: ${type}
    - Formato: ${format}
    
    LÓGICA DE ARQUITECTURA:
    ${typeSpecificLogic}

    LÓGICA DE FORMATO (Estructura Interna):
    ${formatSpecificLogic}

    REGLAS DE SEO ON-PAGE:
    - La Keyword Principal debe aparecer en el H1, de forma natural en las primeras 100 palabras del texto, y en al menos dos encabezados H2. 
    - Utilizar negritas estratégicamente para escanear el texto.

    FORMATO OBLIGATORIO (Gutenberg Blocks):
    El campo 'content' debe comenzar con el cuerpo del artículo estructurado con sus etiquetas de encabezado, párrafos y listas usando bloques de WordPress:
    - <!-- wp:paragraph --><p>...</p><!-- /wp:paragraph -->
    - <!-- wp:heading {"level":2} --><h2>...</h2><!-- /wp:heading -->
    - <!-- wp:heading {"level":3} --><h3>...</h3><!-- /wp:heading -->
    - <!-- wp:list --><ul><li>...</li></ul><!-- /wp:list -->
    
    Devuelve un JSON estrictamente con el siguiente esquema:
    {
      "title": "Título del post (H1)",
      "seo_title": "Título SEO para Yoast (máx 60 caracteres, debe incluir la keyword principal)",
      "content": "Cuerpo del artículo en bloques Gutenberg",
      "meta_description": "Descripción para Google (máx 155 caracteres) con un CTA claro",
      "primary_keyword": "${primaryKeyword}",
      "image_prompt": "Prompt detallado en inglés para generar la imagen destacada"
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          seo_title: { type: Type.STRING },
          content: { type: Type.STRING },
          meta_description: { type: Type.STRING },
          primary_keyword: { type: Type.STRING },
          image_prompt: { type: Type.STRING }
        },
        required: ["title", "seo_title", "content", "meta_description", "primary_keyword", "image_prompt"]
      }
    }
  });

  try {
    const text = response.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse Content Hub response:", response.text);
    throw new Error("Error en la generación de contenido. Por favor intenta de nuevo.");
  }
}

export async function generateDraft(articleTitle: string, articleSummary: string, sourceUrl: string) {
  const prompt = `
    Actúa como un Consultor SEO Senior con más de 15 años de experiencia en nichos tecnológicos. Tu objetivo es transformar la siguiente noticia en un artículo de blog "infalible" para posicionar en los primeros resultados de Google.
    
    Noticia Original:
    - Título: ${articleTitle}
    - Resumen: ${articleSummary}
    - Fuente: ${sourceUrl}
    
    CRITERIOS DE OPTIMIZACIÓN SEO (Senior Level):
    1. Extensión y Profundidad: El artículo debe ser EXTENSO (mínimo 1000-1200 palabras). No te limites a resumir; analiza las implicaciones, el contexto histórico y el impacto futuro.
    2. Análisis de Intención de Búsqueda: Identifica la intención (informativa/transaccional) y optimiza el contenido para satisfacerla al 100%.
    3. Keyword Research & Clustering:
       - Define una Keyword Principal de alto volumen y baja competencia basada en el tema.
       - Incluye Keywords Secundarias y de Long-tail de forma natural.
    4. Entidades LSI (Latent Semantic Indexing): Incorpora semánticamente términos relacionados, conceptos técnicos y entidades que Google asocia con este tema para aumentar la relevancia temática.
    5. Optimización GEO: Adapta el lenguaje para un público hispanohablante global (España y LATAM), usando un español neutro pero profesional.
    6. Estructura de Contenido:
       - H1: Título magnético con la keyword principal al principio.
       - Introducción: Gancho (Hook) con la keyword en las primeras 100 palabras.
       - Múltiples H2 y H3: Desarrolla al menos 5-6 secciones detalladas.
       - Conclusión: Un cierre potente con una llamada a la reflexión.
       - FAQ: Incluye al menos 5 preguntas frecuentes con respuestas detalladas.
    7. Legibilidad: Párrafos cortos, listas de viñetas y negritas en términos clave.
    
    FORMATO OBLIGATORIO (Gutenberg Blocks):
    El campo 'content' debe usar exclusivamente bloques de WordPress:
    - <!-- wp:paragraph --><p>...</p><!-- /wp:paragraph -->
    - <!-- wp:heading {"level":2} --><h2>...</h2><!-- /wp:heading -->
    - <!-- wp:heading {"level":3} --><h3>...</h3><!-- /wp:heading -->
    - <!-- wp:list --><ul><li>...</li></ul><!-- /wp:list -->
    - <!-- wp:quote --><blockquote class="wp-block-quote"><p>...</p></blockquote><!-- /wp:quote -->
    
    Devuelve un JSON con:
    {
      "title": "Título del post (H1)",
      "seo_title": "Título SEO para Yoast (máx 60 caracteres, debe incluir la keyword principal)",
      "content": "Contenido completo y extenso en bloques Gutenberg",
      "meta_description": "Descripción para Google (máx 155 caracteres)",
      "primary_keyword": "La palabra clave principal elegida",
      "image_prompt": "Un prompt detallado y profesional en inglés para generar una imagen fotorrealista de alta calidad con Imagen 3 que ilustre el tema del artículo (ej: 'A high-tech futuristic laboratory with holographic displays, cinematic lighting, 8k resolution')"
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          seo_title: { type: Type.STRING },
          content: { type: Type.STRING },
          meta_description: { type: Type.STRING },
          primary_keyword: { type: Type.STRING },
          image_prompt: { type: Type.STRING }
        },
        required: ["title", "seo_title", "content", "meta_description", "primary_keyword", "image_prompt"]
      }
    }
  });

  try {
    const text = response.text;
    // Extract JSON if there's surrounding text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse Gemini response as JSON:", response.text);
    throw new Error("La IA devolvió un formato inválido. Por favor, intenta de nuevo.");
  }
}

export async function generateImagePrompt(title: string) {
  const prompt = `Create a detailed image generation prompt for DALL-E 3 based on this article title: "${title}". The image should be futuristic, high-tech, and professional. Return only the prompt string.`;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt
  });
  return response.text;
}
