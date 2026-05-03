/**
 * Generates a diagram image from Mermaid syntax.
 * Uses the external mermaid.ink service to render the diagram without requiring 
 * a headless browser (Puppeteer) in the Vercel serverless environment.
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

    // 2. Base64 encode the diagram definition
    const buffer = Buffer.from(cleanDef, 'utf-8');
    const base64Str = buffer.toString('base64');

    // 3. Construct the mermaid.ink URL
    // We use /img/ to get a PNG image which works perfectly with pptxgenjs
    const url = `https://mermaid.ink/img/${base64Str}?bgColor=ffffff`;
    
    // 4. Verify the image is valid by fetching it
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Mermaid Ink failed to render diagram. Status: ${response.status}`);
      return null;
    }

    // 5. Download the image and convert to base64 data URI for pptxgenjs
    const arrayBuffer = await response.arrayBuffer();
    const imageBase64 = Buffer.from(arrayBuffer).toString('base64');
    return `data:${response.headers.get('content-type') || 'image/png'};base64,${imageBase64}`;

  } catch (error) {
    console.error('Error generating diagram:', error);
    return null;
  }
}
