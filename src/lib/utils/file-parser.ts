// src/lib/utils/file-parser.ts
// 文件解析工具：PDF、DOCX、Excel

export async function parsePDF(buffer: Buffer): Promise<string> {
  // pdf-parse 在服务端使用
  const pdfParse = (await import('pdf-parse')).default
  const data = await pdfParse(buffer)
  return data.text
}

export async function parseDOCX(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

export async function parseExcel(buffer: Buffer): Promise<string> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buffer, { type: 'buffer' })

  let text = ''
  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName]
    const csv = XLSX.utils.sheet_to_csv(sheet)
    text += `\n=== Sheet: ${sheetName} ===\n${csv}\n`
  })

  return text
}

export async function parseFile(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const lowerMime = mimeType.toLowerCase()

  if (lowerMime.includes('pdf')) {
    return parsePDF(buffer)
  } else if (
    lowerMime.includes('wordprocessingml') ||
    lowerMime.includes('docx') ||
    lowerMime.includes('word')
  ) {
    return parseDOCX(buffer)
  } else if (
    lowerMime.includes('spreadsheetml') ||
    lowerMime.includes('xlsx') ||
    lowerMime.includes('excel')
  ) {
    return parseExcel(buffer)
  } else if (lowerMime.includes('text')) {
    return buffer.toString('utf-8')
  }

  throw new Error(`不支持的文件类型: ${mimeType}`)
}
