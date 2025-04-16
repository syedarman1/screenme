// types/pdfjs-dist.d.ts

// “Core” PDF.js API
declare module "pdfjs-dist/legacy/build/pdf" {
  const pdfjsLib: any;
  export = pdfjsLib;
}

// Bundled worker entry
declare module "pdfjs-dist/legacy/build/pdf.worker.entry" {
  const workerSrc: any;
  export default workerSrc;
}
