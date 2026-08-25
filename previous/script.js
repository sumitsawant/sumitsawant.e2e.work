const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector("[data-nav-links]");
const year = document.querySelector("[data-year]");
const pageContent = [document.querySelector("main"), document.querySelector(".site-footer")].filter(Boolean);

if (year) {
  year.textContent = new Date().getFullYear();
}

const updateHeader = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 24);
};

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const isMenuOpen = () => menuToggle?.getAttribute("aria-expanded") === "true";

const setPageInert = (isInert) => {
  pageContent.forEach((element) => {
    element.inert = isInert;
  });
};

const closeMenu = ({ restoreFocus = false } = {}) => {
  if (!menuToggle || !navLinks) return;
  const wasOpen = isMenuOpen();
  menuToggle.setAttribute("aria-expanded", "false");
  navLinks.classList.remove("is-open");
  document.body.classList.remove("menu-open");
  setPageInert(false);

  if (wasOpen && restoreFocus) {
    menuToggle.focus();
  }
};

menuToggle?.addEventListener("click", () => {
  if (isMenuOpen()) {
    closeMenu();
    return;
  }

  menuToggle.setAttribute("aria-expanded", "true");
  navLinks?.classList.add("is-open");
  document.body.classList.add("menu-open");
  setPageInert(true);
  setTimeout(() => navLinks?.querySelector("a")?.focus(), 0);
});

navLinks?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeMenu);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isMenuOpen()) {
    closeMenu({ restoreFocus: true });
    return;
  }

  if (event.key === "Tab" && isMenuOpen() && menuToggle && navLinks) {
    const focusable = [menuToggle, ...navLinks.querySelectorAll("a")];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (!focusable.includes(document.activeElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 900) closeMenu();
});

const revealItems = [...document.querySelectorAll(".reveal")];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (reduceMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  document.documentElement.classList.add("reveal-ready");
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8%", threshold: 0.08 },
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}
