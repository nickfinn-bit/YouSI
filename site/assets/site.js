// Replays the fade/rise-in entrance transitions the live site plays on these
// same elements (each was captured with a Wix `data-motion-enter` marker).
(function () {
  var targets = document.querySelectorAll('[data-motion-enter]');
  if (!('IntersectionObserver' in window) || !targets.length) {
    targets.forEach(function (el) { el.classList.add('revealed'); });
    return;
  }
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0 }
  );
  targets.forEach(function (el) { observer.observe(el); });
})();
