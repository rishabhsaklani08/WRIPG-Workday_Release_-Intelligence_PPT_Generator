import { NextResponse } from 'next/server';
import { getWhatsNew, getAvailableReleases, getAvailableDomains } from '@/lib/workday';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const release = searchParams.get('release') || undefined;
    const domain  = searchParams.get('domain')  || undefined;
    const search  = searchParams.get('search')  || undefined;
    const limit   = searchParams.get('limit')   ? Number(searchParams.get('limit')) : undefined;
    const meta    = searchParams.get('meta');

    // ?meta=releases → return list of available release versions
    if (meta === 'releases') {
      const releases = await getAvailableReleases();
      return NextResponse.json(releases);
    }

    // ?meta=domains → return list of available domains
    if (meta === 'domains') {
      const domains = await getAvailableDomains();
      return NextResponse.json(domains);
    }

    const features = await getWhatsNew({ releaseVersion: release, domain, search, limit });
    return NextResponse.json(features);
  } catch (error) {
    console.error('[/api/features] Error:', error);
    return NextResponse.json({ error: 'Failed to load features' }, { status: 500 });
  }
}
