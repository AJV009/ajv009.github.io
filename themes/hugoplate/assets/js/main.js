// main script
(function () {
  "use strict";

  // Testimonial Slider
  // ----------------------------------------
  new Swiper(".testimonial-slider", {
    spaceBetween: 24,
    loop: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },
    pagination: {
      el: ".testimonial-slider-pagination",
      type: "bullets",
      clickable: true,
    },
    breakpoints: {
      768: {
        slidesPerView: 2,
      },
      992: {
        slidesPerView: 3,
      },
    },
  });

  // Letter Avatar Generator
  // ----------------------------------------
  var avatarPalette = [
    "#e53e3e", "#dd6b20", "#d69e2e", "#38a169", "#319795",
    "#3182ce", "#5a67d8", "#805ad5", "#d53f8c", "#2b6cb0",
  ];

  function buildLetterAvatar(name, el) {
    var parts = (name || "?").trim().split(/\s+/);
    var initials = parts.length >= 2
      ? parts[0][0] + parts[parts.length - 1][0]
      : parts[0][0];
    // deterministic color from name
    var hash = 0;
    for (var i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    var color = avatarPalette[Math.abs(hash) % avatarPalette.length];
    el.textContent = initials.toUpperCase();
    el.style.backgroundColor = color;
  }

  // Initialize all letter avatars on the page
  document.querySelectorAll(".letter-avatar[data-name]").forEach(function (el) {
    buildLetterAvatar(el.getAttribute("data-name"), el);
  });

  // Testimonial Modal
  // ----------------------------------------
  const modal = document.getElementById("testimonial-modal");
  const modalContent = document.getElementById("modal-content");
  const modalName = document.getElementById("modal-name");
  const modalDesignation = document.getElementById("modal-designation");
  const modalDate = document.getElementById("modal-date");
  const modalAvatar = document.getElementById("modal-avatar");
  const modalClose = document.getElementById("modal-close");

  // Function to open modal
  function openModal(testimonialData) {
    modalContent.textContent = testimonialData.content;
    modalName.textContent = testimonialData.name;
    modalDesignation.innerHTML = testimonialData.designation;
    modalDate.textContent = testimonialData.date;
    buildLetterAvatar(testimonialData.name, modalAvatar);

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.body.style.overflow = "hidden";
  }

  // Function to close modal
  function closeModal() {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.style.overflow = "";
  }

  // Add click handlers to all testimonial cards
  document.querySelectorAll(".testimonial-card").forEach((card) => {
    card.addEventListener("click", function (e) {
      e.preventDefault();
      const testimonialData = {
        content: this.getAttribute("data-testimonial-content"),
        name: this.getAttribute("data-testimonial-name"),
        designation: this.getAttribute("data-testimonial-designation"),
        date: this.getAttribute("data-testimonial-date"),
      };
      openModal(testimonialData);
    });
  });

  // Close modal on close button click
  if (modalClose) {
    modalClose.addEventListener("click", closeModal);
  }

  // Close modal on backdrop click
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  // Close modal on ESC key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      closeModal();
    }
  });
})();
