import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
      "title": "Título optimizado para SEO",
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
          content: { type: Type.STRING }
        },
        required: ["title", "content"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function generateImagePrompt(title: string) {
  const prompt = `Create a detailed image generation prompt for DALL-E 3 based on this article title: "${title}". The image should be futuristic, high-tech, and professional. Return only the prompt string.`;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt
  });
  return response.text;
}
