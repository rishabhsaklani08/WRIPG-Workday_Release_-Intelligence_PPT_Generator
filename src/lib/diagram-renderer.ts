/**
 * Generates a high-quality diagram image from Mermaid syntax.
 * Uses the external mermaid.ink service with high-DPI scaling for premium output.
 */
export async function generateDiagramUrl(diagramDefinition: string): Promise<string | null> {
  if (!diagramDefinition || diagramDefinition.trim() === '') {
    return null;
  }

  try {
    // 1. Clean the definition (remove markdown wrappers if the LLM included them)
    let cleanDef = diagramDefinition.trim();
    if (cleanDef.startsWith('```mermaid')) {
      cleanDef = cleanDef.replace(/^```mermaid\n/, '').replace(/\n```$/, '');
    } else if (cleanDef.startsWith('```')) {
      cleanDef = cleanDef.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    // 2. Inject a premium theme config at the top of the mermaid definition
    //    This uses Mermaid's built-in "base" theme with custom variables for a
    //    clean, professional look matching our brand palette.
    const themedDef = `%%{init: {
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#A100FF",
    "primaryTextColor": "#FFFFFF",
    "primaryBorderColor": "#7B00C4",
    "lineColor": "#9999AA",
    "secondaryColor": "#1A1A2E",
    "tertiaryColor": "#2D2D44",
    "background": "#F5F5F8",
    "mainBkg": "#F5F5F8",
    "nodeBorder": "#A100FF",
    "clusterBkg": "#F0D9FF",
    "titleColor": "#1A1A2E",
    "edgeLabelBackground": "#FFFFFF",
    "fontSize": "18px",
    "fontFamily": "Arial, sans-serif"
  }
}}%%
${cleanDef}`;

    // 3. Base64 encode the themed diagram definition
    const buffer = Buffer.from(themedDef, 'utf-8');
    const base64Str = buffer.toString('base64');

    // 4. Use mermaid.ink with scale=3 for high-DPI / retina-quality PNG
    //    bgColor=white ensures the background is clean white for embedding in PPTX.
    const url = `https://mermaid.ink/img/${base64Str}?bgColor=F5F5F8&scale=3`;

    // 5. Verify the image is valid by fetching it (with a timeout)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[diagram-renderer] mermaid.ink failed. Status: ${response.status}. Trying fallback…`);
      // Fallback: try the simpler URL without theme injection
      const fallbackBase64 = Buffer.from(cleanDef, 'utf-8').toString('base64');
      const fallbackUrl = `https://mermaid.ink/img/${fallbackBase64}?bgColor=F5F5F8&scale=2`;
      const fallbackRes = await fetch(fallbackUrl);
      if (!fallbackRes.ok) return null;
      const fallbackBuffer = await fallbackRes.arrayBuffer();
      const fallbackImg = Buffer.from(fallbackBuffer).toString('base64');
      return `data:image/png;base64,${fallbackImg}`;
    }

    // 6. Download the image and convert to base64 data URI for pptxgenjs
    const arrayBuffer = await response.arrayBuffer();
    const imageBase64 = Buffer.from(arrayBuffer).toString('base64');
    return `data:image/png;base64,${imageBase64}`;

  } catch (error) {
    console.error('[diagram-renderer] Error generating diagram:', error);
    return null;
  }
}
