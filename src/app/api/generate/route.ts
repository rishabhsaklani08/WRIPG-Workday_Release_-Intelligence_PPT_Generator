import { NextResponse } from 'next/server';
import { getWhatsNew } from '@/lib/workday';
import { generateSlideContent } from '@/lib/groq';
import { buildPresentation } from '@/lib/pptx-builder';
import { AudienceMode, PresentationOptions } from '@/types';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { featureIds, audienceMode, releaseVersion, clientName } = body;

    if (!featureIds || !Array.isArray(featureIds) || featureIds.length === 0 || featureIds.length > 50) {
      return NextResponse.json({ error: 'Invalid or too many feature IDs provided' }, { status: 400 });
    }
    if (!audienceMode || typeof audienceMode !== 'string' || !['consultant', 'client', 'technical'].includes(audienceMode)) {
      return NextResponse.json({ error: 'Invalid audience mode' }, { status: 400 });
    }
    if (!releaseVersion || typeof releaseVersion !== 'string' || releaseVersion.length > 50) {
      return NextResponse.json({ error: 'Invalid release version' }, { status: 400 });
    }
    if (!clientName || typeof clientName !== 'string' || clientName.length > 100) {
      return NextResponse.json({ error: 'Invalid client name' }, { status: 400 });
    }

    // Sanitize client name to prevent XML injection or directory traversal in presentation output
    const sanitizedClientName = clientName.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();

    // 1. Load and filter features from the Workday JSON
    const allFeatures = await getWhatsNew({ releaseVersion });
    const selectedFeatures = allFeatures.filter(f => featureIds.includes(f.id));

    if (selectedFeatures.length === 0) {
      return NextResponse.json(
        { error: 'None of the requested feature IDs were found for this release' },
        { status: 404 }
      );
    }

    // 2. Groq / Llama: generate rich, structured slide content
    const slideContents = await generateSlideContent(selectedFeatures, audienceMode as AudienceMode);

    // 3. Build the branded PPTX — pass feature metadata so slides show domain/complexity badges
    const presentationOptions: PresentationOptions = { releaseVersion, audienceMode: audienceMode as AudienceMode, clientName: sanitizedClientName };

    const featuresMeta = selectedFeatures.map(f => ({
      domain:         f.domain,
      complexity:     f.complexity,
      optIn:          f.optIn,
      productionDate: f.productionDate,
    }));

    const pptxArrayBuffer = await buildPresentation(slideContents, presentationOptions, featuresMeta);

    // 4. Return slides (for UI preview) + base64 PPTX (for download)
    return NextResponse.json({
      slides:     slideContents,
      pptxBase64: Buffer.from(pptxArrayBuffer).toString('base64'),
    });

  } catch (error) {
    console.error('[/api/generate] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown generation error' },
      { status: 500 }
    );
  }
}
