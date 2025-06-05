gsap.registerPlugin(ScrollTrigger);

let sections = gsap.utils.toArray(".slide");

gsap.to(sections, {
    xPercent: -100 * (sections.length - 1),
    ease: "none",
    scrollTrigger: {
        trigger: ".slideshow-wrapper",
        pin: true,
        scrub: 1,
        snap: 1 / (sections.length - 1),
        end: () => "+=" + document.querySelector(".slideshow-wrapper").offsetWidth
    }
})

// Select all slides and dots
const slides = document.querySelectorAll(".slide");
const dots = document.querySelectorAll(".dot");

// Intersection Observer config
const observerOptions = {
  root: document.querySelector(".slideshow"),
  rootMargin: "0px",
  threshold: 0.6 // Slide is "active" when 60% in view
};

// Create observer
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const index = Array.from(slides).indexOf(entry.target);
      dots.forEach(dot => dot.classList.remove("active"));
      if (dots[index]) {
        dots[index].classList.add("active");
      }
    }
  });
}, observerOptions);

// Observe each slide
slides.forEach(slide => observer.observe(slide));