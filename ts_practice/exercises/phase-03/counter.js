function createCounter(start) {
  let n = start
  return { inc: () => ++n, dec: () => --n, value: () => n }
}
module.exports = createCounter