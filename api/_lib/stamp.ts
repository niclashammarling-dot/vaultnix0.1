// Single definition of the capture timestamp. capture.ts and vault.ts each
// used to format `now` independently and disagreed: the note path stripped
// colons, the image path kept them (2026-09-13-17:13:27-capture.jpg —
// NTFS-illegal, shipped to master 2026-09-13).
export interface CaptureStamp {
  date: string   // 2026-09-13
  time: string   // 171327
  month: string  // 2026-09
  stamp: string  // 2026-09-13-171327
}

export function captureStamp(now: Date = new Date()): CaptureStamp {
  const iso = now.toISOString()          // 2026-09-13T17:13:27.123Z
  const date = iso.slice(0, 10)
  const time = iso.slice(11, 19).replace(/:/g, '')
  return { date, time, month: date.slice(0, 7), stamp: `${date}-${time}` }
}
