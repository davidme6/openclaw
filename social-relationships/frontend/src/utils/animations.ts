/** Lightweight CSS-animation helpers used for entrance effects. */

export function fadeIn(el: Element, duration = 0.4, delay = 0) {
  const e = el as HTMLElement
  e.style.opacity = '0'
  e.style.transform = 'translateY(8px)'
  e.style.transition = `opacity ${duration}s ease ${delay}s, transform ${duration}s ease ${delay}s`
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      e.style.opacity = '1'
      e.style.transform = 'translateY(0)'
    })
  })
}

export function staggerFadeIn(els: NodeListOf<Element> | Element[], duration = 0.3, stagger = 0.04) {
  Array.from(els).forEach((el, i) => fadeIn(el, duration, i * stagger))
}
