export function emphasize(str, colorCode = 36) {
  return `\n\x1b[1;${colorCode}m${str}\x1b[0m\n`
}
