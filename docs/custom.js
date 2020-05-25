document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('footer').innerHTML =
    '<hr>' + document.querySelector('.rst-footer-buttons').innerHTML
})
