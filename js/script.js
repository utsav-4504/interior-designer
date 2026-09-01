const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

// GSAP powers the smooth transitions (in-page scroll, the hero coverflow, the
// lightbox). It is loaded from a CDN; if that fails, every feature below falls
// back to its plain CSS / rAF behaviour so nothing breaks offline.
const gsap = window.gsap || null;
const hasGsap = !!gsap && !prefersReducedMotion;

if (gsap && window.ScrollToPlugin) {
  gsap.registerPlugin(window.ScrollToPlugin);
}
if (hasGsap) {
  document.documentElement.classList.add("gsap");
}

const revealNodes = [...document.querySelectorAll("[data-reveal]")];
const navLinks = [...document.querySelectorAll("[data-nav-link]")];
const sectionNodes = [...document.querySelectorAll("section[id]")];

const siteHeader = document.querySelector(".site-header");
const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const navAnchors = siteNav ? [...siteNav.querySelectorAll("a")] : [];
const heroSection = document.querySelector(".hero");

const testimonialSlides = [...document.querySelectorAll(".testimonial-slide")];
const testimonialSlider = document.querySelector(".testimonial-slider");
const testimonialDots = document.querySelector(".js-testimonial-dots");
const testimonialPrev = document.querySelector(".js-testimonial-prev");
const testimonialNext = document.querySelector(".js-testimonial-next");

const faqButtons = [...document.querySelectorAll(".faq-item__button")];
const statValues = [...document.querySelectorAll(".stat-card__value")];

const contactForm = document.querySelector(".contact-form");
const formStatus = document.querySelector(".contact-form__status");

const CONTACT_EMAIL = "hello@maninterior.studio";

let motionFrame = 0;
let testimonialIndex = 0;
let testimonialTimer = 0;

// Anything the IntersectionObserver has not revealed yet. A fast flick-scroll
// or a smooth-scrolling anchor jump can carry an element past the viewport
// between two observer samples, and because the observer unobserves on first
// hit that section stays invisible forever. The scroll frame sweeps this set as
// a safety net and empties itself once everything is revealed.
const pendingReveals = new Set(revealNodes);
const pendingCounts = new Set(statValues);

function markRevealed(node) {
  node.classList.add("is-visible");
  pendingReveals.delete(node);
}

function sweepPendingReveals() {
  if (!pendingReveals.size && !pendingCounts.size) {
    return;
  }

  const limit = window.innerHeight * 0.92;

  pendingReveals.forEach((node) => {
    if (node.getBoundingClientRect().top < limit) {
      markRevealed(node);
    }
  });

  pendingCounts.forEach((node) => {
    if (node.getBoundingClientRect().top < limit) {
      startCount(node);
    }
  });
}

function updateHeaderSolidState() {
  if (!siteHeader) {
    return;
  }

  const threshold = heroSection
    ? heroSection.getBoundingClientRect().height - 80
    : 80;

  siteHeader.classList.toggle("is-solid", window.scrollY > threshold);
}

const galleryBg = document.querySelector(".gallery__bg");

function updateGalleryParallax() {
  if (!galleryBg || prefersReducedMotion) {
    return;
  }

  const section = galleryBg.closest(".gallery");
  if (!section) {
    return;
  }

  const rect = section.getBoundingClientRect();
  if (rect.bottom < 0 || rect.top > window.innerHeight) {
    return;
  }

  const progress =
    (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
  galleryBg.style.setProperty("--gallery-parallax", `${(progress - 0.5) * 80}px`);
}

function requestMotionFrame() {
  if (motionFrame) {
    return;
  }

  motionFrame = window.requestAnimationFrame(() => {
    sweepPendingReveals();
    updateHeaderSolidState();
    updateGalleryParallax();
    motionFrame = 0;
  });
}

function setActiveNav(sectionId) {
  const targetHash = `#${sectionId}`;
  const hasMatch = navLinks.some(
    (link) => link.getAttribute("href") === targetHash,
  );
  if (!hasMatch) {
    return;
  }

  navLinks.forEach((link) => {
    const isCurrent = link.getAttribute("href") === targetHash;
    link.classList.toggle("is-current", isCurrent);
    if (isCurrent) {
      link.setAttribute("aria-current", "true");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function setNavOpen(isOpen) {
  if (!siteHeader || !navToggle || !siteNav) {
    return;
  }

  siteHeader.classList.toggle("is-nav-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
  document.body.classList.toggle("is-locked", isOpen);
}

function buildTestimonialDots() {
  if (!testimonialDots || !testimonialSlides.length) {
    return [];
  }

  testimonialDots.innerHTML = "";

  return testimonialSlides.map((_, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `Show testimonial ${index + 1}`);
    button.addEventListener("click", () => {
      setActiveTestimonial(index);
      queueTestimonials();
    });
    testimonialDots.append(button);
    return button;
  });
}

const testimonialDotButtons = buildTestimonialDots();

function setActiveTestimonial(nextIndex) {
  if (!testimonialSlides.length) {
    return;
  }

  testimonialIndex =
    (nextIndex + testimonialSlides.length) % testimonialSlides.length;

  testimonialSlides.forEach((slide, index) => {
    const isActive = index === testimonialIndex;
    slide.classList.toggle("is-active", isActive);
    slide.setAttribute("aria-hidden", String(!isActive));
  });

  testimonialDotButtons.forEach((dot, index) => {
    const isActive = index === testimonialIndex;
    dot.classList.toggle("is-active", isActive);
    dot.setAttribute("aria-current", String(isActive));
  });
}

function clearTestimonialTimer() {
  if (!testimonialTimer) {
    return;
  }

  window.clearInterval(testimonialTimer);
  testimonialTimer = 0;
}

function queueTestimonials() {
  clearTestimonialTimer();

  if (prefersReducedMotion || testimonialSlides.length < 2) {
    return;
  }

  testimonialTimer = window.setInterval(() => {
    setActiveTestimonial(testimonialIndex + 1);
  }, 6000);
}

function setFaqState(button, isOpen) {
  const panel = button.nextElementSibling;
  if (!(panel instanceof HTMLElement)) {
    return;
  }

  button.setAttribute("aria-expanded", String(isOpen));
  panel.classList.toggle("is-open", isOpen);
  panel.hidden = !isOpen;
}

function startCount(node) {
  if (node.dataset.counted === "true") {
    return;
  }

  node.dataset.counted = "true";
  pendingCounts.delete(node);
  animateCount(node);
}

function animateCount(node) {
  const target = Number(node.dataset.count) || 0;
  const suffix = node.dataset.suffix || "";

  if (prefersReducedMotion) {
    node.textContent = `${target}${suffix}`;
    return;
  }

  const duration = 1400;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.round(target * eased);
    node.textContent = `${currentValue}${suffix}`;

    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  }

  window.requestAnimationFrame(step);
}

function buildMailtoLink(formData) {
  const name = formData.get("name")?.toString().trim() || "Website visitor";
  const phone = formData.get("phone")?.toString().trim() || "-";
  const email = formData.get("email")?.toString().trim() || "-";
  const projectType = formData.get("project-type")?.toString().trim() || "-";
  const brief = formData.get("brief")?.toString().trim() || "-";

  const subject = `New design brief from ${name}`;
  const body = [
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Email: ${email}`,
    `Project type: ${projectType}`,
    "",
    "Project brief:",
    brief,
  ].join("\r\n");

  // URLSearchParams encodes spaces as "+", which mail clients render literally.
  // mailto needs percent-encoding, so build the query by hand.
  const query = [
    `subject=${encodeURIComponent(subject)}`,
    `body=${encodeURIComponent(body)}`,
  ].join("&");

  return `mailto:${CONTACT_EMAIL}?${query}`;
}

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        markRevealed(entry.target);
        revealObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -8% 0px",
    },
  );

  revealNodes.forEach((node) => revealObserver.observe(node));

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveNav(entry.target.id);
        }
      });
    },
    {
      rootMargin: "-45% 0px -45% 0px",
      threshold: 0,
    },
  );

  sectionNodes.forEach((node) => sectionObserver.observe(node));

  if (statValues.length) {
    const statObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          startCount(entry.target);
          statObserver.unobserve(entry.target);
        });
      },
      {
        threshold: 0.45,
      },
    );

    statValues.forEach((node) => statObserver.observe(node));
  }
} else {
  revealNodes.forEach(markRevealed);
  statValues.forEach(startCount);
}

if (navToggle) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteHeader?.classList.contains("is-nav-open");
    setNavOpen(!isOpen);
  });
}

navAnchors.forEach((anchor) => {
  anchor.addEventListener("click", () => {
    setNavOpen(false);
  });
});

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Node)) {
    return;
  }

  if (
    siteHeader?.classList.contains("is-nav-open") &&
    !siteHeader.contains(event.target)
  ) {
    setNavOpen(false);
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 920) {
    setNavOpen(false);
  }

  requestMotionFrame();
});

if (testimonialSlides.length) {
  setActiveTestimonial(0);
  queueTestimonials();
}

if (testimonialPrev) {
  testimonialPrev.addEventListener("click", () => {
    setActiveTestimonial(testimonialIndex - 1);
    queueTestimonials();
  });
}

if (testimonialNext) {
  testimonialNext.addEventListener("click", () => {
    setActiveTestimonial(testimonialIndex + 1);
    queueTestimonials();
  });
}

if (testimonialSlider) {
  testimonialSlider.addEventListener("mouseenter", clearTestimonialTimer);
  testimonialSlider.addEventListener("mouseleave", queueTestimonials);
  // Keyboard users need the same pause the pointer already got.
  testimonialSlider.addEventListener("focusin", clearTestimonialTimer);
  testimonialSlider.addEventListener("focusout", (event) => {
    if (!testimonialSlider.contains(event.relatedTarget)) {
      queueTestimonials();
    }
  });
}

// Autoplay is wasted work (and drains battery) while the tab is hidden.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearTestimonialTimer();
  } else {
    queueTestimonials();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setNavOpen(false);
  }
});

faqButtons.forEach((button, index) => {
  const panel = button.nextElementSibling;
  if (!(panel instanceof HTMLElement)) {
    return;
  }

  const panelId = panel.id || `faq-panel-${index + 1}`;
  panel.id = panelId;
  button.setAttribute("aria-controls", panelId);

  const isOpen = button.getAttribute("aria-expanded") === "true";
  setFaqState(button, isOpen);

  button.addEventListener("click", () => {
    const nextOpenState = button.getAttribute("aria-expanded") !== "true";

    faqButtons.forEach((otherButton) => setFaqState(otherButton, false));
    setFaqState(button, nextOpenState);
  });
});

if (contactForm && formStatus) {
  const clearStatus = () => {
    formStatus.textContent = "";
    formStatus.classList.remove("is-success", "is-error");
  };

  contactForm.addEventListener("input", clearStatus);

  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    clearStatus();

    if (!contactForm.reportValidity()) {
      formStatus.textContent =
        "Please complete the required fields before sending.";
      formStatus.classList.add("is-error");
      return;
    }

    const formData = new FormData(contactForm);
    formStatus.textContent = "Opening your email app with the project brief.";
    formStatus.classList.add("is-success");

    window.location.href = buildMailtoLink(formData);
    contactForm.reset();
  });
}

/* ---------- Smooth in-page scrolling ----------
   Driven here with a rAF easing loop rather than CSS `scroll-behavior` or
   `scrollTo({behavior})`, so it still animates when the browser or OS
   suppresses native smooth scroll. Handles nav links, the hero chevron,
   the back-to-top button and any in-page anchor. */

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

let scrollAnimationFrame = 0;

function stopScrollAnimation() {
  if (scrollAnimationFrame) {
    window.cancelAnimationFrame(scrollAnimationFrame);
    scrollAnimationFrame = 0;
  }
}

function animateScrollTo(targetY, duration = 720) {
  stopScrollAnimation();

  const maxY = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight,
  );
  const endY = Math.min(Math.max(targetY, 0), maxY);

  if (prefersReducedMotion) {
    window.scrollTo(0, endY);
    return;
  }

  if (hasGsap && window.ScrollToPlugin) {
    gsap.to(window, {
      duration: 0.9,
      scrollTo: { y: endY, autoKill: true },
      ease: "power3.inOut",
      overwrite: true,
    });
    return;
  }

  const startY = window.scrollY;
  const distance = endY - startY;
  if (Math.abs(distance) < 2) {
    return;
  }

  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    window.scrollTo(0, startY + distance * easeInOutCubic(progress));

    if (progress < 1) {
      scrollAnimationFrame = window.requestAnimationFrame(step);
    } else {
      scrollAnimationFrame = 0;
    }
  }

  scrollAnimationFrame = window.requestAnimationFrame(step);
}

function scrollToHash(hash) {
  if (!hash || hash.length < 2) {
    return false;
  }

  if (hash === "#top" || hash === "#home") {
    animateScrollTo(0);
    return true;
  }

  const target = document.getElementById(hash.slice(1));
  if (!target) {
    return false;
  }

  const headerOffset = siteHeader ? siteHeader.offsetHeight + 14 : 0;
  const y = target.getBoundingClientRect().top + window.scrollY - headerOffset;

  animateScrollTo(y);
  return true;
}

document.addEventListener("click", (event) => {
  const link = event.target.closest('a[href*="#"]');
  if (!link) {
    return;
  }

  const url = new URL(link.href, window.location.href);
  const samePage =
    url.pathname === window.location.pathname &&
    url.search === window.location.search;
  if (!samePage) {
    return;
  }

  if (!scrollToHash(url.hash)) {
    return;
  }

  event.preventDefault();
  setNavOpen(false);
  history.replaceState(null, "", url.hash);
});

// Let the user wrest back control of an in-progress scroll.
["wheel", "touchstart"].forEach((type) => {
  window.addEventListener(type, stopScrollAnimation, { passive: true });
});

/* ---------- Portfolio gallery: filtering, lightbox, pointer tilt ---------- */

const gallery = document.querySelector(".gallery");

if (gallery) {
  const filterButtons = [...gallery.querySelectorAll(".filter-btn")];
  const galleryItems = [...gallery.querySelectorAll(".gallery-item")];
  const emptyNote = gallery.querySelector(".gallery__empty");
  const supportsHover = window.matchMedia("(hover: hover)").matches;

  function applyFilter(filter) {
    let shown = 0;

    galleryItems.forEach((item) => {
      const match = filter === "all" || item.dataset.category === filter;
      item.classList.toggle("is-hidden", !match);

      if (match) {
        shown += 1;
        item.classList.remove("is-repop");
        // Force a reflow so the re-entrance animation restarts.
        void item.offsetWidth;
        item.classList.add("is-repop");
      }
    });

    if (emptyNote) {
      emptyNote.hidden = shown > 0;
    }
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((other) =>
        other.classList.toggle("is-active", other === button),
      );
      applyFilter(button.dataset.filter || "all");
    });
  });

  // --- Lightbox ---
  const lightbox = document.getElementById("lightbox");
  const lightboxFigure =
    lightbox && lightbox.querySelector(".lightbox__figure");
  const lightboxImg = lightbox && lightbox.querySelector(".lightbox__img");
  const lightboxCaption =
    lightbox && lightbox.querySelector(".lightbox__caption");
  const lightboxClose = lightbox && lightbox.querySelector(".lightbox__close");
  const lightboxPrev =
    lightbox && lightbox.querySelector(".lightbox__nav--prev");
  const lightboxNext =
    lightbox && lightbox.querySelector(".lightbox__nav--next");

  let activeItems = [];
  let activeIndex = 0;
  let lastFocused = null;

  function fillLightbox() {
    const item = activeItems[activeIndex];
    if (!item || !lightboxImg) {
      return;
    }

    const image = item.querySelector("img");
    lightboxImg.src = image ? image.src : "";
    lightboxImg.alt = image ? image.alt : "";

    if (lightboxCaption) {
      const tag = (item.dataset.tag || "").replace(/&middot;/g, "·");
      lightboxCaption.textContent = [tag, item.dataset.title]
        .filter(Boolean)
        .join("  —  ");
    }
  }

  function renderLightbox(animate) {
    if (animate && hasGsap && lightboxImg) {
      gsap.to(lightboxImg, {
        opacity: 0,
        duration: 0.14,
        onComplete: () => {
          fillLightbox();
          gsap.to(lightboxImg, { opacity: 1, duration: 0.28, ease: "power2.out" });
        },
      });
    } else {
      fillLightbox();
    }
  }

  function openLightbox(item) {
    if (!lightbox) {
      return;
    }

    activeItems = galleryItems.filter(
      (candidate) => !candidate.classList.contains("is-hidden"),
    );
    activeIndex = Math.max(0, activeItems.indexOf(item));
    lastFocused = document.activeElement;

    renderLightbox(false);
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");

    if (hasGsap && lightboxFigure) {
      gsap.killTweensOf([lightbox, lightboxFigure]);
      gsap.fromTo(
        lightbox,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" },
      );
      gsap.fromTo(
        lightboxFigure,
        { opacity: 0, scale: 0.9, yPercent: 4 },
        {
          opacity: 1,
          scale: 1,
          yPercent: 0,
          duration: 0.5,
          ease: "power3.out",
        },
      );
    }

    if (lightboxClose) {
      lightboxClose.focus();
    }
  }

  function closeLightbox() {
    if (!lightbox) {
      return;
    }

    const finish = () => {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("is-locked");
      if (lastFocused instanceof HTMLElement) {
        lastFocused.focus();
      }
    };

    if (hasGsap && lightboxFigure) {
      gsap.killTweensOf([lightbox, lightboxFigure]);
      gsap.to(lightboxFigure, {
        opacity: 0,
        scale: 0.94,
        yPercent: 3,
        duration: 0.22,
        ease: "power2.in",
      });
      gsap.to(lightbox, {
        opacity: 0,
        duration: 0.28,
        ease: "power2.in",
        onComplete: () => {
          finish();
          gsap.set(lightbox, { clearProps: "opacity" });
          gsap.set(lightboxFigure, { clearProps: "opacity,scale,transform" });
        },
      });
    } else {
      finish();
    }
  }

  function stepLightbox(delta) {
    if (!activeItems.length) {
      return;
    }

    activeIndex =
      (activeIndex + delta + activeItems.length) % activeItems.length;
    renderLightbox(true);
  }

  galleryItems.forEach((item) => {
    item.addEventListener("click", () => openLightbox(item));
  });

  if (lightbox) {
    if (lightboxClose) {
      lightboxClose.addEventListener("click", closeLightbox);
    }
    if (lightboxPrev) {
      lightboxPrev.addEventListener("click", () => stepLightbox(-1));
    }
    if (lightboxNext) {
      lightboxNext.addEventListener("click", () => stepLightbox(1));
    }

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (!lightbox.classList.contains("is-open")) {
        return;
      }

      if (event.key === "Escape") {
        closeLightbox();
      } else if (event.key === "ArrowLeft") {
        stepLightbox(-1);
      } else if (event.key === "ArrowRight") {
        stepLightbox(1);
      }
    });
  }

  // --- Pointer tilt (hover-capable pointers only) ---
  if (supportsHover && !prefersReducedMotion) {
    galleryItems.forEach((item) => {
      item.addEventListener("pointermove", (event) => {
        const rect = item.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        item.style.setProperty("--ry", `${px * 6}deg`);
        item.style.setProperty("--rx", `${py * -6}deg`);
      });

      item.addEventListener("pointerleave", () => {
        item.style.setProperty("--rx", "0deg");
        item.style.setProperty("--ry", "0deg");
      });
    });
  }
}

/* ---------- Hero coverflow slider ---------- */

const heroSlider = document.querySelector("[data-hero-slider]");

if (heroSlider) {
  const heroSlides = [...heroSlider.querySelectorAll(".hero__slide")];
  const heroAmbient = [...document.querySelectorAll(".hero__ambient-img")];
  const heroDots = heroSlider.querySelector(".hero__dots");
  const heroPrev = heroSlider.querySelector(".hero__arrow--prev");
  const heroNext = heroSlider.querySelector(".hero__arrow--next");
  const heroCount = heroSlides.length;
  const HERO_POSITIONS = [
    "pos-center",
    "pos-left",
    "pos-right",
    "pos-hidden-left",
    "pos-hidden-right",
  ];

  // GSAP target for each coverflow position. xPercent/yPercent are relative to
  // the slide's own box; the slide is anchored at the stage centre (left/top 50%).
  const HERO_STATES = {
    center: {
      xPercent: -50,
      yPercent: -50,
      rotationY: 0,
      scale: 1,
      autoAlpha: 1,
      filter: "brightness(1)",
      zIndex: 3,
    },
    left: {
      xPercent: -95,
      yPercent: -50,
      rotationY: 30,
      scale: 0.78,
      autoAlpha: 0.5,
      filter: "brightness(0.6)",
      zIndex: 2,
    },
    right: {
      xPercent: -5,
      yPercent: -50,
      rotationY: -30,
      scale: 0.78,
      autoAlpha: 0.5,
      filter: "brightness(0.6)",
      zIndex: 2,
    },
    hiddenLeft: {
      xPercent: -120,
      yPercent: -50,
      rotationY: 36,
      scale: 0.6,
      autoAlpha: 0,
      filter: "brightness(0.5)",
      zIndex: 1,
    },
    hiddenRight: {
      xPercent: 20,
      yPercent: -50,
      rotationY: -36,
      scale: 0.6,
      autoAlpha: 0,
      filter: "brightness(0.5)",
      zIndex: 1,
    },
  };

  // Below 640px the 3D tilt on the neighbour slides reads as a rendering
  // glitch rather than a coverflow effect, so they are hidden outright and
  // only the active slide is shown, centred and full width.
  const heroCompactQuery = window.matchMedia("(max-width: 640px)");

  function heroStateForOffset(offset) {
    if (offset === 0) return HERO_STATES.center;
    if (heroCompactQuery.matches) {
      return offset < 0 ? HERO_STATES.hiddenLeft : HERO_STATES.hiddenRight;
    }
    if (offset === -1) return HERO_STATES.left;
    if (offset === 1) return HERO_STATES.right;
    return offset < 0 ? HERO_STATES.hiddenLeft : HERO_STATES.hiddenRight;
  }

  function heroClassForOffset(offset) {
    if (offset === 0) return "pos-center";
    if (heroCompactQuery.matches) {
      return offset < 0 ? "pos-hidden-left" : "pos-hidden-right";
    }
    if (offset === -1) return "pos-left";
    if (offset === 1) return "pos-right";
    return offset < 0 ? "pos-hidden-left" : "pos-hidden-right";
  }

  let heroIndex = 0;
  let heroTimer = 0;

  const heroDotButtons = heroSlides.map((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", `Show image ${index + 1}`);
    dot.addEventListener("click", () => {
      goToHeroSlide(index);
      restartHeroTimer();
    });
    if (heroDots) {
      heroDots.append(dot);
    }
    return dot;
  });

  function layoutHero(instant) {
    heroSlides.forEach((slide, index) => {
      let offset = index - heroIndex;
      if (offset > heroCount / 2) {
        offset -= heroCount;
      } else if (offset < -heroCount / 2) {
        offset += heroCount;
      }

      // A slide that jumps more than one step (the one wrapping around the
      // edge, or a multi-step dot jump) is repositioned instantly so it snaps
      // instead of sliding across everything.
      const teleport =
        instant ||
        (slide.dataset.offset !== undefined &&
          Math.abs(offset - Number(slide.dataset.offset)) > 1);

      if (hasGsap) {
        const state = heroStateForOffset(offset);
        if (teleport) {
          gsap.set(slide, state);
        } else {
          gsap.to(slide, {
            ...state,
            duration: 0.8,
            ease: "power3.inOut",
            overwrite: "auto",
          });
        }
      } else {
        const position = heroClassForOffset(offset);
        if (teleport) {
          slide.classList.add("no-anim");
        }
        slide.classList.remove(...HERO_POSITIONS);
        slide.classList.add(position);
        if (teleport) {
          void slide.offsetWidth;
          slide.classList.remove("no-anim");
        }
      }

      slide.setAttribute("aria-hidden", String(offset !== 0));
      slide.dataset.offset = String(offset);
    });

    heroDotButtons.forEach((dot, index) => {
      const isActive = index === heroIndex;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-current", String(isActive));
    });

    heroAmbient.forEach((img, index) => {
      img.classList.toggle("is-active", index === heroIndex);
    });
  }

  function goToHeroSlide(next) {
    heroIndex = ((next % heroCount) + heroCount) % heroCount;
    layoutHero();
  }

  function restartHeroTimer() {
    window.clearInterval(heroTimer);
    if (prefersReducedMotion || heroCount < 2) {
      return;
    }
    heroTimer = window.setInterval(
      () => goToHeroSlide(heroIndex + 1),
      3000,
    );
  }

  function stopHeroTimer() {
    window.clearInterval(heroTimer);
    heroTimer = 0;
  }

  heroSlides.forEach((slide, index) => {
    slide.addEventListener("click", () => {
      if (index !== heroIndex) {
        goToHeroSlide(index);
        restartHeroTimer();
      }
    });
  });

  if (heroPrev) {
    heroPrev.addEventListener("click", () => {
      goToHeroSlide(heroIndex - 1);
      restartHeroTimer();
    });
  }
  if (heroNext) {
    heroNext.addEventListener("click", () => {
      goToHeroSlide(heroIndex + 1);
      restartHeroTimer();
    });
  }

  heroSlider.addEventListener("pointerenter", stopHeroTimer);
  heroSlider.addEventListener("pointerleave", restartHeroTimer);

  heroCompactQuery.addEventListener("change", () => layoutHero(true));

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopHeroTimer();
    } else {
      restartHeroTimer();
    }
  });

  layoutHero(true);
  restartHeroTimer();
}

setActiveNav("home");
updateHeaderSolidState();
requestMotionFrame();

window.addEventListener("scroll", requestMotionFrame, { passive: true });
