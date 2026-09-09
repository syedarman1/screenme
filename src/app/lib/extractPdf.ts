export async function extractPdf(data: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (typeof window !== "undefined") pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({ data });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 100) throw new Error("Please upload a resume with 100 pages or fewer.");
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      let pageText = "";
      let previousY: number | undefined;
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const y = item.transform[5];
        // Preserve PDF reading order and line endings. A coordinate change also
        // catches generators that omit hasEOL; it is not a layout/column detector.
        if (previousY !== undefined && Math.abs(y - previousY) > 3 && !pageText.endsWith("\n")) pageText += "\n";
        if (pageText && !/\s$/.test(pageText) && item.str && !/^\s/.test(item.str)) pageText += " ";
        pageText += item.str;
        if (item.hasEOL && !pageText.endsWith("\n")) pageText += "\n";
        previousY = y;
      }
      text += pageText.trim() + "\n\n";
      page.cleanup();
      if (text.length > 100_000) throw new Error("The extracted resume is too long. Please use a shorter file.");
    }
    if (!text.trim()) throw new Error("This PDF has no readable text. Paste your resume text or upload a text-based PDF.");
    return text.trim();
  } finally {
    await task.destroy();
  }
}
