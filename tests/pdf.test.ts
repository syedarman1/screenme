import { test } from "node:test";
import assert from "node:assert/strict";
import { extractPdf } from "../src/app/lib/extractPdf";

// Synthetic document; no real candidate data or external services.
function fixture(stream = "BT /F1 12 Tf 72 720 Td (ScreenMe Test Resume) Tj ET") {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => String(n).padStart(10, "0") + " 00000 n \n").join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf).buffer;
}

test("extracts a real PDF using the upgraded parser", async () => {
  assert.match(await extractPdf(fixture()), /ScreenMe Test Resume/);
});

test("rejects a malformed PDF instead of submitting empty resume text", async () => {
  await assert.rejects(extractPdf(new TextEncoder().encode("not a PDF").buffer));
});


test("preserves section and bullet line breaks from a real PDF", async () => {
  const text = await extractPdf(fixture("BT /F1 12 Tf 72 720 Td (EXPERIENCE) Tj 0 -20 Td (Engineer at Example) Tj 0 -20 Td (Built APIs serving 40000 users) Tj ET"));
  assert.match(text, /EXPERIENCE\nEngineer at Example\nBuilt APIs/);
});

test("rejects a valid PDF with no text rather than sending an empty scan", async () => {
  await assert.rejects(extractPdf(fixture("")), /no readable text/);
});
