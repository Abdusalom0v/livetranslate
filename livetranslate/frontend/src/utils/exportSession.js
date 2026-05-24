export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function sessionToText(session) {
  const { date, duration, langs, chunks } = session;
  const header = [
    `LiveTranslate — Session`,
    `Date: ${new Date(date).toLocaleString('en-US')}`,
    `Duration: ${formatDuration(duration)}`,
    `Languages: ${langs.source.toUpperCase()} → ${langs.target.toUpperCase()}`,
    '─'.repeat(50),
    '',
  ].join('\n');

  const body = chunks.map(c =>
    `[${c.time}]\n  Original:    ${c.source}\n  Translation: ${c.translation}`
  ).join('\n\n');

  return header + body + '\n';
}

export function sessionToJSON(session) {
  return JSON.stringify(session, null, 2);
}

export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
