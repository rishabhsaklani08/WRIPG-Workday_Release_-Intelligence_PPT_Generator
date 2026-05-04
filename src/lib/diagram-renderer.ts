/**
 * Generates a high-quality diagram image from Mermaid syntax.
 * Uses the mermaid.ink service to render a high-DPI PNG image.
 */
export async function generateDiagramUrl(diagramDefinition: string): Promise<string | null> {
  if (!diagramDefinition || diagramDefinition.trim() === '') {
    return null;
  }

  try {
    // 1. Strip any markdown fences
    let cleanDef = diagramDefinition.trim();
    if (cleanDef.includes('```mermaid')) {
      cleanDef = cleanDef.replace(/```mermaid\s*/gi, '').replace(/```/g, '').trim();
    } else if (cleanDef.startsWith('```')) {
      cleanDef = cleanDef.replace(/```/g, '').trim();
    }

    // Strip any existing %%{init}%% blocks so we can inject our own clean one
    cleanDef = cleanDef.replace(/%%\{[\s\S]*?\}%%\s*/g, '').trim();

    if (!cleanDef) return null;

    // 2. Inject premium WRIPG theme
    // We use a high base fontSize (32px) and the 'img' endpoint with width=2400
    // to simulate a retina/4k export since PPT's SVG parser doesn't support HTML labels.
    const themedDef = `%%{init: {
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#F0D9FF",
    "primaryTextColor": "#1A1A2E",
    "primaryBorderColor": "#A100FF",
    "lineColor": "#9999AA",
    "secondaryColor": "#1A1A2E",
    "tertiaryColor": "#F5F5F8",
    "fontSize": "32px",
    "fontFamily": "Arial, sans-serif"
  }
}}%%
${cleanDef}`;

    // 3. Base64-encode the definition
    const encoded = Buffer.from(themedDef, 'utf-8').toString('base64');
    
    // 4. Fetch High-Res PNG.
    // SVG had issues in PowerPoint because PPT doesn't support <foreignObject> tags.
    // By requesting a width of 2400px, mermaid.ink's puppeteer engine renders a crisp PNG.
    const url = `https://mermaid.ink/img/${encoded}?bgColor=F5F5F8&width=2400`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      console.warn(`[diagram-renderer] Hi-Res PNG fetch failed (${response.status}), trying fallback without theme…`);
      const fallbackEncoded = Buffer.from(cleanDef, 'utf-8').toString('base64');
      const fallbackUrl = `https://mermaid.ink/img/${fallbackEncoded}?bgColor=F5F5F8&width=1600`;
      const fallbackRes = await fetch(fallbackUrl);
      if (!fallbackRes.ok) return null;
      
      const fallbackBuffer = await fallbackRes.arrayBuffer();
      const fallbackBase64 = Buffer.from(fallbackBuffer).toString('base64');
      return `data:image/png;base64,${fallbackBase64}`;
    }

    // 5. Convert PNG buffer to base64 data URI
    const imgBuffer = await response.arrayBuffer();
    const imgBase64 = Buffer.from(imgBuffer).toString('base64');
    return `data:image/png;base64,${imgBase64}`;

  } catch (error) {
    console.error('[diagram-renderer] Error:', error);
    return null;
  }
}
