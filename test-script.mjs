import fs from 'fs';

async function testGenerate() {
  try {
    console.log('Sending request to /api/generate...');
    const response = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        featureIds: ['PLNEVAL-10267', 'EIB-9064'],
        audienceMode: 'consultant',
        releaseVersion: 'Workday 2026 Release 1',
        clientName: 'Test Client Inc'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    const buffer = await response.arrayBuffer();
    fs.writeFileSync('test-output.pptx', Buffer.from(buffer));
    console.log('Successfully generated test-output.pptx!');
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testGenerate();
