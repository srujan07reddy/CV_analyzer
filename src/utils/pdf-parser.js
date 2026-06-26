// Heuristic PDF layout extractor: groups text items by y coordinate
export function extractTextFromPdfItems(items) {
  if (!Array.isArray(items)) return '';

  // Map items to coordinates
  const mapped = items.map(it => {
    const transform = it.transform || [];
    const x = (transform[4] !== undefined) ? transform[4] : (it.x || 0);
    const y = (transform[5] !== undefined) ? transform[5] : (it.y || 0);
    return { str: it.str || '', x: Number(x), y: Number(y) };
  }).filter(m => m.str && m.str.trim().length > 0);

  // Bucket by Y coordinate with tolerance
  const buckets = [];
  const TOLERANCE = 5; // points

  mapped.forEach(item => {
    let placed = false;
    for (const b of buckets) {
      if (Math.abs(b.y - item.y) <= TOLERANCE) {
        b.items.push(item);
        b.y = (b.y * (b.items.length - 1) + item.y) / b.items.length; // update avg
        placed = true;
        break;
      }
    }
    if (!placed) {
      buckets.push({ y: item.y, items: [item] });
    }
  });

  // Sort buckets top-to-bottom (larger y first for PDF coordinate system)
  buckets.sort((a, b) => b.y - a.y);

  const lines = buckets.map(b => {
    // Sort items in a bucket left-to-right
    const row = b.items.sort((p, q) => p.x - q.x).map(p => p.str.trim());
    // Join while collapsing repeated spaces
    return row.join(' ').replace(/\s+/g, ' ').trim();
  }).filter(l => l.length > 0);

  return lines.join('\n');
}

export default extractTextFromPdfItems;
