/**
 * VendorLink Website — Main JavaScript
 * Handles animations, interactions, and UI behavior
 */

document.addEventListener('DOMContentLoaded', () => {
    // ===== PRELOADER =====
    const preloader = document.getElementById('preloader');
    window.addEventListener('load', () => {
        setTimeout(() => {
            preloader.classList.add('loaded');
            setTimeout(() => {
                preloader.style.display = 'none';
                document.body.classList.add('page-loaded');
            }, 600);
        }, 800);
    });

    // ===== NAVBAR SCROLL BEHAVIOR =====
    const navbar = document.getElementById('navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        // Add scrolled class for background change
        if (currentScroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Hide/show navbar on scroll direction
        if (currentScroll > lastScroll && currentScroll > 200) {
            navbar.classList.add('nav-hidden');
        } else {
            navbar.classList.remove('nav-hidden');
        }

        lastScroll = currentScroll;
    });

    // ===== MOBILE MENU TOGGLE =====
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
        document.body.classList.toggle('menu-open');
    });

    // Close menu on link click
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.classList.remove('menu-open');
        });
    });

    // ===== SMOOTH SCROLLING =====
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            if (href === '#') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            const target = document.querySelector(href);
            if (target) {
                const offset = navbar.offsetHeight + 20;
                const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });

    // ===== SCROLL REVEAL ANIMATIONS =====
    const revealElements = document.querySelectorAll('[data-reveal]');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.getAttribute('data-delay') || 0;
                setTimeout(() => {
                    entry.target.classList.add('revealed');
                }, parseInt(delay));
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -60px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // ===== COUNTER ANIMATION =====
    const counters = document.querySelectorAll('.counter');

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseInt(counter.getAttribute('data-target'));
                const duration = 2000;
                const startTime = performance.now();

                function updateCounter(currentTime) {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const easeOut = 1 - Math.pow(1 - progress, 3);
                    const current = Math.round(easeOut * target);
                    counter.textContent = current;

                    if (progress < 1) {
                        requestAnimationFrame(updateCounter);
                    }
                }

                requestAnimationFrame(updateCounter);
                counterObserver.unobserve(counter);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => counterObserver.observe(counter));

    // ===== STAT BAR ANIMATIONS =====
    const statBars = document.querySelectorAll('.stat-bar-fill');

    const barObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                barObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    statBars.forEach(bar => barObserver.observe(bar));

    // ===== VIDEO PLAYER =====
    const videoOverlay = document.getElementById('videoOverlay');
    const videoPlayBtn = document.getElementById('videoPlayBtn');
    const promoVideo = document.getElementById('promoVideo');

    if (videoPlayBtn && promoVideo) {
        videoPlayBtn.addEventListener('click', () => {
            videoOverlay.classList.add('hidden');
            promoVideo.play();
        });

        promoVideo.addEventListener('pause', () => {
            if (promoVideo.currentTime > 0 && !promoVideo.ended) {
                videoOverlay.classList.remove('hidden');
            }
        });

        promoVideo.addEventListener('ended', () => {
            videoOverlay.classList.remove('hidden');
        });
    }

    // ===== HERO PARTICLE EFFECT =====
    const particleContainer = document.getElementById('heroParticles');
    if (particleContainer) {
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.cssText = `
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                width: ${Math.random() * 4 + 1}px;
                height: ${Math.random() * 4 + 1}px;
                animation-delay: ${Math.random() * 6}s;
                animation-duration: ${Math.random() * 10 + 8}s;
            `;
            particleContainer.appendChild(particle);
        }
    }

    // ===== ACTIVE NAV LINK HIGHLIGHT =====
    const sections = document.querySelectorAll('section[id]');

    window.addEventListener('scroll', () => {
        const scrollY = window.pageYOffset + 200;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === '#' + sectionId) {
                        link.classList.add('active');
                    }
                });
            }
        });
    });

    // ===== FORM HANDLING (B2B Contact / Partner With Us) =====
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData);
            const interestSelect = contactForm.querySelector('#interest');
            const interestText = interestSelect.value ? interestSelect.selectedOptions[0].text : 'Not specified';
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalHTML = submitBtn.innerHTML;

            submitBtn.innerHTML = '<span>Sending Inquiry...</span>';
            submitBtn.disabled = true;

            try {
                const { method } = await VendorLink.submit({
                    apiPath: '/api/contact',
                    formData,
                    asJson: true,
                    subject: `[VendorLink Partner Inquiry] ${data.companyName} - ${data.fullName}`,
                    emailLines: [
                        `Company: ${data.companyName}`,
                        `Name: ${data.fullName}`,
                        `Job title: ${data.jobTitle || 'N/A'}`,
                        `Email: ${data.email}`,
                        `Area of interest: ${interestText}`,
                        '',
                        data.message || ''
                    ]
                });

                submitBtn.innerHTML = method === 'email'
                    ? '<span>✓ Opening your email app...</span>'
                    : '<span>✓ Inquiry Received!</span>';
                submitBtn.classList.add('success');

                setTimeout(() => {
                    submitBtn.innerHTML = originalHTML;
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('success');
                    contactForm.reset();
                }, 4000);
            } catch (err) {
                console.error('Contact submission error:', err);
                submitBtn.innerHTML = '<span>✕ Submission Failed</span>';
                submitBtn.style.background = '#ef4444';
                setTimeout(() => {
                    submitBtn.innerHTML = originalHTML;
                    submitBtn.disabled = false;
                    submitBtn.style.background = '';
                }, 3500);
                alert(err.message || `Error sending inquiry. Please try again or email ${VendorLink.config.contactEmail} directly.`);
            }
        });
    }

    // ===== PARALLAX ON HERO =====
    const heroVisual = document.querySelector('.hero-visual');
    if (heroVisual) {
        window.addEventListener('scroll', () => {
            const scroll = window.pageYOffset;
            if (scroll < window.innerHeight) {
                heroVisual.style.transform = `translateY(${scroll * 0.15}px)`;
            }
        });
    }

    // ===== FLOATING CARD MOUSE TRACK =====
    const deviceShowcase = document.querySelector('.device-showcase');
    if (deviceShowcase) {
        document.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 20;
            const y = (e.clientY / window.innerHeight - 0.5) * 20;

            const cards = document.querySelectorAll('.floating-card');
            cards.forEach((card, i) => {
                const factor = (i + 1) * 0.5;
                card.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
            });
        });
    }

    // ===== PROCESS TIMELINE LINE ANIMATION =====
    const processLine = document.querySelector('.process-line');
    if (processLine) {
        const timelineObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    processLine.classList.add('animate');
                    timelineObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });

        timelineObserver.observe(processLine.parentElement);
    }
});
