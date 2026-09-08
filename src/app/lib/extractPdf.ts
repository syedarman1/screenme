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
      text += content.items.map(item => "str" in item ? item.str : "").join(" ") + "\n\n";
      page.cleanup();
      if (text.length > 100_000) throw new Error("The extracted resume is too long. Please use a shorter file.");
    }
    return text;
  } finally {
    await task.destroy();
  }
}
