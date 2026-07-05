import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
// @ts-expect-error - pdf.worker.mjs has no typings
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    const allowedExtensions = [".pdf", ".txt", ".md", ".docx"];

    if (!allowedExtensions.includes(ext)) {
      return Response.json(
        { error: `Unsupported file type: ${ext}. Allowed: PDF, TXT, MD, DOCX` },
        { status: 400 }
      );
    }

    // Save file to public/uploads/
    const uniqueName = `${randomUUID()}${ext}`;
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, uniqueName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Extract text based on file type
    let parsedText = "";

    if (ext === ".txt" || ext === ".md") {
      parsedText = buffer.toString("utf-8");
    } else if (ext === ".pdf") {
      const { PDFParse } = await import("pdf-parse");
      (globalThis as Record<string, unknown>).pdfjsWorker = pdfjsWorker;
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      parsedText = result.text;
    } else if (ext === ".docx") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      parsedText = result.value;
    }

    return Response.json({
      fileName: file.name,
      fileUrl: `/uploads/${uniqueName}`,
      parsedText,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json(
      { error: "Failed to process file upload" },
      { status: 500 }
    );
  }
}
