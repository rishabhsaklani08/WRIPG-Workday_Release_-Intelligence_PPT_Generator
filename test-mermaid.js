const fs = require('fs');

async function test() {
  const def = `%%{init: {
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#A100FF",
    "primaryTextColor": "#FFFFFF",
    "primaryBorderColor": "#7B00C4",
    "lineColor": "#9999AA",
    "fontSize": "24px",
    "fontFamily": "Arial"
  }
}}%%
flowchart TD
  A[Customer Payment] --> B[Workday]
  B --> C{Overapplied Invoice}
  C --> D[Generate On-Account Document]
  D --> E[Apply to Outstanding Invoices]`;

  const base64 = Buffer.from(def, 'utf-8').toString('base64');
  
  // Test variations
  const urls = [
    { name: "test-width.png", url: `https://mermaid.ink/img/${base64}?bgColor=FFFFFF&width=2000` },
    { name: "test-scale.png", url: `https://mermaid.ink/img/${base64}?bgColor=FFFFFF&scale=3&width=800` }
  ];
  
  for (const u of urls) {
    console.log('Fetching:', u.url);
    const res = await fetch(u.url);
    console.log(u.name, res.status);
    if (res.ok) {
      const buf = await res.arrayBuffer();
      fs.writeFileSync(u.name, Buffer.from(buf));
      console.log('Saved', u.name);
    } else {
      console.log('Error:', await res.text());
    }
  }
}

test();
