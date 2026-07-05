import('pdf-parse').then(async (m) => {
  console.log('PDFParse class type:', typeof m.PDFParse);
  const parser = new m.PDFParse({ data: new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10]) });
  console.log('Successfully created parser instance:', parser);
  try {
    await parser.getText();
    console.log('getText completed');
  } catch (err) {
    console.log('Caught expected error from invalid PDF data, showing class works:', err.message);
  }
}).catch(console.error);
