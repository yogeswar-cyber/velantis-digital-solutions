/**
 * Generates an authoritative project reference number formatted as:
 * VL-YYYY-XXXX (e.g. VL-2026-0001)
 */
export async function generateReferenceNumber(tx) {
  const currentYear = new Date().getFullYear();
  const prefix = `VL-${currentYear}-`;

  // Find the most recent project created this year with the matching prefix
  const lastProject = await tx.project.findFirst({
    where: {
      referenceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      referenceNumber: 'desc',
    },
    select: {
      referenceNumber: true,
    },
  });

  let nextSequence = 1;
  if (lastProject && lastProject.referenceNumber) {
    const parts = lastProject.referenceNumber.split('-');
    if (parts.length === 3) {
      const parsedSeq = parseInt(parts[2], 10);
      if (!isNaN(parsedSeq)) {
        nextSequence = parsedSeq + 1;
      }
    }
  }

  const paddedSequence = String(nextSequence).padStart(4, '0');
  return `${prefix}${paddedSequence}`;
}
