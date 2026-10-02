import fs from 'fs';

/**
 * Validates file signatures (magic bytes) to prevent executable spoofing.
 */
export async function validateMagicBytes(filePath, extension) {
  return new Promise((resolve) => {
    const ext = extension.toLowerCase();
    const buffer = Buffer.alloc(16);

    fs.open(filePath, 'r', (err, fd) => {
      if (err) return resolve(false);

      fs.read(fd, buffer, 0, 16, 0, (readErr, bytesRead) => {
        fs.close(fd, () => {});
        if (readErr || bytesRead < 4) return resolve(false);

        // PDF: starts with %PDF (0x25 0x50 0x44 0x46)
        if (ext === '.pdf') {
          return resolve(
            buffer[0] === 0x25 &&
            buffer[1] === 0x50 &&
            buffer[2] === 0x44 &&
            buffer[3] === 0x46
          );
        }

        // PNG: starts with 0x89 0x50 0x4E 0x47
        if (ext === '.png') {
          return resolve(
            buffer[0] === 0x89 &&
            buffer[1] === 0x50 &&
            buffer[2] === 0x4e &&
            buffer[3] === 0x47
          );
        }

        // JPEG: starts with 0xFF 0xD8 0xFF
        if (ext === '.jpg' || ext === '.jpeg') {
          return resolve(
            buffer[0] === 0xff &&
            buffer[1] === 0xd8 &&
            buffer[2] === 0xff
          );
        }

        // WEBP: starts with RIFF (0x52 0x49 0x46 0x46) and bytes 8..11 are WEBP (0x57 0x45 0x42 0x50)
        if (ext === '.webp') {
          const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
          const isWebp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
          return resolve(isRiff && isWebp);
        }

        // ZIP, DOCX, XLSX: starts with PK\x03\x04 (0x50 0x4B 0x03 0x04)
        if (ext === '.zip' || ext === '.docx' || ext === '.xlsx') {
          return resolve(
            buffer[0] === 0x50 &&
            buffer[1] === 0x4b &&
            buffer[2] === 0x03 &&
            buffer[3] === 0x04
          );
        }

        // Legacy DOC, XLS (OLE 2 Compound Documents): 0xD0 0xCF 0x11 0xE0
        if (ext === '.doc' || ext === '.xls') {
          return resolve(
            buffer[0] === 0xd0 &&
            buffer[1] === 0xcf &&
            buffer[2] === 0x11 &&
            buffer[3] === 0xe0
          );
        }

        // Fallback for recognized extensions
        return resolve(true);
      });
    });
  });
}
