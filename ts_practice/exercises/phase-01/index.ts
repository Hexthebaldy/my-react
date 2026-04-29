export function repeat(s:string, n:number) {
  return Array(n).fill(s).join('')
}