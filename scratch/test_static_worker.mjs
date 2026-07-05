import { PDFParse } from 'pdf-parse';
import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs';
import fs from 'fs';

// Inject worker statically to globalThis
globalThis.pdfjsWorker = pdfjsWorker;
console.log('Statically assigned globalThis.pdfjsWorker');

const pdfPath = '/Users/sayakbag/Desktop/Studay Planner/public/uploads/9e8dd5a9-87f9-4e86-a13c-833813cf1d17.pdf';

try {
  const buffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  parser.getText().then(result => {
    console.log('Successfully parsed PDF text!');
    console.log('Length:', result.text.length);
  }).catch(err => {
    console.error('Failed parsing:', err);
  });
} catch (err) {
  console.error('Error:', err);
}
