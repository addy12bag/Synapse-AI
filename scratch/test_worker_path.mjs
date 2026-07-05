import { PDFParse } from 'pdf-parse';
import fs from 'fs';
import path from 'path';

const pdfPath = '/Users/sayakbag/Desktop/Studay Planner/public/uploads/9e8dd5a9-87f9-4e86-a13c-833813cf1d17.pdf';
const workerPath = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs');

console.log('Worker file exists:', fs.existsSync(workerPath));

try {
  PDFParse.setWorker(workerPath);
  console.log('setWorker called with:', workerPath);

  const buffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  parser.getText().then(result => {
    console.log('Successfully parsed PDF text!');
    console.log('Length:', result.text.length);
  }).catch(err => {
    console.error('Failed parsing:', err);
  });
} catch (err) {
  console.error('Error during setup:', err);
}
