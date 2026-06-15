import fs from "fs";

type PDFParseFn = (buffer: Buffer) => Promise<{ text: string }>;

export async function parseResume(
  filePath: string,
  mimeType: string,
): Promise<string> {
  try {
    const buffer = fs.readFileSync(filePath);

    if (mimeType === "application/pdf") {
      try {
        const pdfModule = await import("pdf-parse");
        const pdfParse = (pdfModule.default ||
          pdfModule) as unknown as PDFParseFn;
        const data = await pdfParse(buffer);
        return data.text;
      } catch (pdfErr) {
        console.warn("[Parser] PDF parsing failed, trying as text:", pdfErr);
        return buffer.toString("utf-8");
      }
    }

    if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    ) {
      try {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      } catch (docxErr) {
        console.warn("[Parser] DOCX parsing failed, trying as text:", docxErr);
        return buffer.toString("utf-8");
      }
    }

    return buffer.toString("utf-8");
  } catch (error) {
    console.error("Failed to parse file:", error);
    throw new Error("Failed to parse resume file");
  }
}
