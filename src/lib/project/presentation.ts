export function presentationLead(text: string): string {
  const firstLine = text.trim().split(/\r?\n/).find((line) => line.trim()) ?? "";
  return firstLine.replace(/^\s*(?:\d+[.)]|[-•])\s+/, "").split(/(?<=[.!?])\s+/)[0] || "To be completed";
}
