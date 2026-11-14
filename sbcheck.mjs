import pw from 'file:///C:/Users/Hardikk/AppData/Local/npm-cache/_npx/13ab0715f9f30c2e/node_modules/playwright/index.js';
const { chromium } = pw;
const b = await chromium.launch({ executablePath: "C:/Users/Hardikk/AppData/Local/ms-playwright/chromium-1254/chrome-win64/chrome.exe" });
for (const w of [1280, 1440, 1024]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  for (const r of ['dashboard','leads','calendar','sync']) {
    await p.goto('http://localhost:5182/#/' + r, { waitUntil: 'networkidle' });
    await p.waitForTimeout(250);
    const m = await p.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Main menu"]');
      const n = nav.getBoundingClientRect();
      return {
        navLeft: Math.round(n.left), navTop: Math.round(n.top),
        navW: Math.round(n.width), navH: Math.round(n.height),
        vh: Math.round(n.height / window.innerHeight * 1000) / 10,
        docOverflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    });
    console.log(w, r.padEnd(10), JSON.stringify(m));
  }
  await p.close();
}
await b.close();
