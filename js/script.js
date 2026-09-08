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

const contactForm = document.querySelector(".contact-form");
const formStatus = document.querySelector(".contact-form__status");

const CONTACT_WHATSAPP = "917016891346";

let motionFrame = 0;

// Anything the IntersectionObserver has not revealed yet. A fast flick-scroll
// or a smooth-scrolling anchor jump can carry an element past the viewport
// between two observer samples, and because the observer unobserves on first
// hit that section stays invisible forever. The scroll frame sweeps this set as
// a safety net and empties itself once everything is revealed.
const pendingReveals = new Set(revealNodes);

function markRevealed(node) {
  node.classList.add("is-visible");
  pendingReveals.delete(node);
}

function sweepPendingReveals() {
  if (!pendingReveals.size) {
    return;
  }

  const limit = window.innerHeight * 0.92;

  pendingReveals.forEach((node) => {
    if (node.getBoundingClientRect().top < limit) {
      markRevealed(node);
    }
  });
}

function updateHeaderSolidState() {
  if (!siteHeader) {
    return;
  }

  // Pages with no hero (e.g. the portfolio page) have no full-bleed image
  // for the header to sit transparently over, so keep it solid throughout.
  if (!heroSection) {
    siteHeader.classList.add("is-solid");
    return;
  }

  const threshold = heroSection.getBoundingClientRect().height - 80;
  siteHeader.classList.toggle("is-solid", window.scrollY > threshold);
}

function requestMotionFrame() {
  if (motionFrame) {
    return;
  }

  motionFrame = window.requestAnimationFrame(() => {
    sweepPendingReveals();
    updateHeaderSolidState();
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

function buildWhatsAppLink(formData) {
  const name = formData.get("name")?.toString().trim() || "Website visitor";
  const phone = formData.get("phone")?.toString().trim() || "-";
  const email = formData.get("email")?.toString().trim() || "-";
  const location = formData.get("location")?.toString().trim() || "-";
  const projectType = formData.get("project-type")?.toString().trim() || "-";
  const brief = formData.get("brief")?.toString().trim() || "-";

  const message = [
    `Hi, I'm ${name}.`,
    `Phone: ${phone}`,
    `Email: ${email}`,
    `City / Location: ${location}`,
    `Project type: ${projectType}`,
    "",
    "Project brief:",
    brief,
  ].join("\n");

  return `https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent(message)}`;
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
} else {
  revealNodes.forEach(markRevealed);
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

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setNavOpen(false);
  }
});

if (contactForm && formStatus) {
  const clearStatus = () => {
    formStatus.textContent = "";
    formStatus.classList.remove("is-success", "is-error");
  };

  contactForm.addEventListener("input", clearStatus);

  contactForm.addEventListener("submit", (event) => {
    // No submit button remains in the form (WhatsApp is the only send
    // action), but this guard stops a stray Enter keypress from reloading
    // the page via the browser's default form submission.
    event.preventDefault();
  });

  const whatsappButton = contactForm.querySelector("[data-whatsapp-submit]");

  if (whatsappButton) {
    whatsappButton.addEventListener("click", () => {
      clearStatus();

      if (!contactForm.reportValidity()) {
        formStatus.textContent =
          "Please complete the required fields before sending.";
        formStatus.classList.add("is-error");
        return;
      }

      const formData = new FormData(contactForm);
      formStatus.textContent = "Opening WhatsApp with the project brief.";
      formStatus.classList.add("is-success");

      window.open(buildWhatsAppLink(formData), "_blank", "noopener");
      contactForm.reset();
    });
  }
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

/* ---------- Portfolio gallery: filtering, lightbox ---------- */

const gallery = document.querySelector(".gallery");

if (gallery) {
  const mainFilterRow = gallery.querySelector(".gallery__filters");
  const filterButtons = mainFilterRow
    ? [...mainFilterRow.querySelectorAll(".filter-btn")]
    : [];
  const galleryItems = [...gallery.querySelectorAll(".gallery-item")];
  const emptyNote = gallery.querySelector(".gallery__empty");
  // One group of sub-filter buttons per main category (e.g. each
  // exhibition stall, each residential project) -- only the group for
  // the currently selected category is shown.
  const subfilterGroups = [...gallery.querySelectorAll("[data-subfilter-group]")];

  let currentCategory = "all";
  let currentSubcategory = "all";

  function applyFilter() {
    let shown = 0;

    galleryItems.forEach((item) => {
      const categoryMatch =
        currentCategory === "all" || item.dataset.category === currentCategory;
      const subMatch =
        currentSubcategory === "all" ||
        item.dataset.subcategory === currentSubcategory;
      const match = categoryMatch && subMatch;
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

  function showSubfilterGroup(category) {
    subfilterGroups.forEach((group) => {
      const isMatch = group.dataset.subfilterGroup === category;
      group.hidden = !isMatch;

      if (isMatch) {
        // Reset this group back to "All" every time it becomes visible,
        // so switching categories never leaves a stale sub-selection.
        const buttons = [...group.querySelectorAll(".filter-btn--sub")];
        buttons.forEach((btn) => {
          const isAll = btn.dataset.subfilter === "all";
          btn.classList.toggle("is-active", isAll);
          btn.setAttribute("aria-selected", String(isAll));
        });
      }
    });
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((other) => {
        other.classList.toggle("is-active", other === button);
        other.setAttribute("aria-selected", String(other === button));
      });

      currentCategory = button.dataset.filter || "all";
      currentSubcategory = "all";
      showSubfilterGroup(currentCategory);
      applyFilter();
    });
  });

  subfilterGroups.forEach((group) => {
    const buttons = [...group.querySelectorAll(".filter-btn--sub")];
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        buttons.forEach((other) => {
          other.classList.toggle("is-active", other === button);
          other.setAttribute("aria-selected", String(other === button));
        });
        currentSubcategory = button.dataset.subfilter || "all";
        applyFilter();
      });
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

}

/* ---------- Hero split-slide showcase ----------
   Each slide is a full two-column "scene" (copy + image). Advancing crossfades
   the whole slide, restarts its text layers' staggered entrance, and tweens
   the section's tinted background to that slide's own colour. */

const heroSlider = document.querySelector("[data-hero-slider]");

if (heroSlider) {
  const heroSlides = [...heroSlider.querySelectorAll(".hero__slide")];
  const heroBars = heroSlider.querySelector(".hero__bars");
  const heroCount = heroSlides.length;

  let heroIndex = 0;
  let heroTimer = 0;

  const heroBarButtons = heroSlides.map((_, index) => {
    const bar = document.createElement("button");
    bar.type = "button";
    bar.setAttribute("aria-label", `Show slide ${index + 1}`);
    bar.addEventListener("click", () => {
      goToHeroSlide(index);
      restartHeroTimer();
    });
    if (heroBars) {
      heroBars.append(bar);
    }
    return bar;
  });

  function layoutHero() {
    heroSlides.forEach((slide, index) => {
      const isActive = index === heroIndex;
      // Force a reflow between removing and re-adding the class so the
      // text layers' entrance transition restarts instead of no-opping
      // (they're already at their "in" state from last time this slide
      // was shown).
      slide.classList.remove("is-active");
      if (isActive) {
        void slide.offsetWidth;
        slide.classList.add("is-active");
      }
      slide.setAttribute("aria-hidden", String(!isActive));
    });

    heroBarButtons.forEach((bar, index) => {
      const isActive = index === heroIndex;
      bar.classList.toggle("is-active", isActive);
      bar.setAttribute("aria-current", String(isActive));
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
    heroTimer = window.setInterval(() => goToHeroSlide(heroIndex + 1), 5000);
  }

  function stopHeroTimer() {
    window.clearInterval(heroTimer);
    heroTimer = 0;
  }

  heroSlider.addEventListener("pointerenter", stopHeroTimer);
  heroSlider.addEventListener("pointerleave", restartHeroTimer);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopHeroTimer();
    } else {
      restartHeroTimer();
    }
  });

  layoutHero();
  restartHeroTimer();
}

setActiveNav("home");
updateHeaderSolidState();
requestMotionFrame();

window.addEventListener("scroll", requestMotionFrame, { passive: true });
