import { PDFParse } from 'pdf-parse';
import fs from 'fs';
import path from 'path';

const pdfPath = '/Users/sayakbag/Desktop/Studay Planner/public/uploads/9e8dd5a9-87f9-4e86-a13c-833813cf1d17.pdf';

try {
  const buffer = fs.readFileSync(pdfPath);
  console.log('PDF file read successfully. Size:', buffer.length, 'bytes');
  
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  console.log('Instantiated PDFParse successfully.');
  
  parser.getText().then(result => {
    console.log('Successfully parsed PDF text!');
    console.log('Parsed text length:', result.text.length, 'characters');
    console.log('Preview of parsed text (first 300 chars):');
    console.log('------------------------------------');
    console.log(result.text.substring(0, 300));
    console.log('------------------------------------');
  }).catch(err => {
    console.error('Failed to get text from PDF:', err);
  });
} catch (err) {
  console.error('Failed to execute test:', err);
}
