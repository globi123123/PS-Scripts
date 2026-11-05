/**
 * Downloads a PowerShell script as a .ps1 file.
 *
 * The file is written with Windows line endings (CRLF) and a UTF-8 byte
 * order mark. Windows PowerShell 5.1 reads UTF-8 files without BOM as ANSI,
 * which breaks non-ASCII characters such as umlauts in comments or strings.
 */
export function downloadScript(fileName: string, source: string): void {
  const content = '﻿' + source.replace(/\r?\n/g, '\r\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
