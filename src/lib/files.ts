const UNITS = ["o", "Ko", "Mo", "Go"];

export function formatFileSize(bytes: number): string {
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < UNITS.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  const precision = unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision).replace(".", ",")} ${UNITS[unitIndex]}`;
}
