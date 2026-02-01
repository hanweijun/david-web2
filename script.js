// ========================================
// DAVID'S ARCADE - JavaScript
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  // Mobile Menu Toggle
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('nav');
  
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      nav.classList.toggle('active');
      menuToggle.classList.toggle('active');
    });
  }
  
  // Close mobile menu when clicking a link
  document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('active');
      menuToggle.classList.remove('active');
    });
  });
  
  // Game Card Click Handlers
  const gameCards = document.querySelectorAll('.game-card');
  
  gameCards.forEach(card => {
    card.addEventListener('click', () => {
      const gameName = card.dataset.game;
      const gameTitle = card.querySelector('h3').textContent;
      
      // Check if game is available
      const availableGames = {
        'shooter': 'games/shooter/index.html'
      };
      
      if (availableGames[gameName]) {
        // Navigate to the game
        window.location.href = availableGames[gameName];
      } else {
        // Show coming soon message for games not yet available
        showGameModal(gameTitle);
      }
    });
  });
  
  // Smooth Scroll for Navigation Links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
  
  // Header Background on Scroll
  const header = document.querySelector('header');
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
      header.style.background = 'rgba(10, 10, 15, 0.95)';
      header.style.backdropFilter = 'blur(10px)';
    } else {
      header.style.background = 'linear-gradient(180deg, rgba(10, 10, 15, 0.95) 0%, transparent 100%)';
      header.style.backdropFilter = 'none';
    }
  });
  
  // Typing Effect for Hero Tagline
  const tagline = document.querySelector('.tagline');
  if (tagline) {
    const text = tagline.textContent;
    tagline.textContent = '';
    tagline.style.borderRight = '2px solid var(--neon-cyan)';
    
    let i = 0;
    const typeWriter = () => {
      if (i < text.length) {
        tagline.textContent += text.charAt(i);
        i++;
        setTimeout(typeWriter, 50);
      } else {
        // Remove cursor after typing is done
        setTimeout(() => {
          tagline.style.borderRight = 'none';
        }, 1000);
      }
    };
    
    // Start typing after a short delay
    setTimeout(typeWriter, 500);
  }
  
  // Add hover sound effect (visual feedback)
  gameCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    });
  });
  
  // Intersection Observer for Fade-in Animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);
  
  // Observe sections for animation
  document.querySelectorAll('section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(30px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(section);
  });
  
  // Make hero visible immediately
  const hero = document.querySelector('.hero');
  if (hero) {
    hero.style.opacity = '1';
    hero.style.transform = 'translateY(0)';
  }
});

// Game Modal Function
function showGameModal(gameTitle) {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'game-modal-overlay';
  overlay.innerHTML = `
    <div class="game-modal">
      <div class="modal-content">
        <h2>🎮 ${gameTitle}</h2>
        <p>Coming Soon!</p>
        <p class="modal-subtitle">This game is under development.</p>
        <button class="modal-close">GOT IT!</button>
      </div>
    </div>
  `;
  
  // Add styles
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
    animation: fadeIn 0.3s ease;
  `;
  
  const modal = overlay.querySelector('.game-modal');
  modal.style.cssText = `
    background: linear-gradient(135deg, #12121a 0%, #1a1a25 100%);
    border: 2px solid #00ffff;
    border-radius: 20px;
    padding: 40px;
    text-align: center;
    box-shadow: 0 0 50px rgba(0, 255, 255, 0.3);
    animation: scaleIn 0.3s ease;
    max-width: 400px;
  `;
  
  const modalH2 = modal.querySelector('h2');
  modalH2.style.cssText = `
    font-family: 'Orbitron', sans-serif;
    font-size: 1.8rem;
    color: #00ffff;
    text-shadow: 0 0 10px #00ffff;
    margin-bottom: 15px;
  `;
  
  const modalP = modal.querySelectorAll('p');
  modalP[0].style.cssText = `
    font-family: 'Orbitron', sans-serif;
    font-size: 1.5rem;
    color: #ff00ff;
    text-shadow: 0 0 10px #ff00ff;
    margin-bottom: 10px;
  `;
  modalP[1].style.cssText = `
    color: #b0b0b0;
    margin-bottom: 25px;
  `;
  
  const closeBtn = modal.querySelector('.modal-close');
  closeBtn.style.cssText = `
    font-family: 'Orbitron', sans-serif;
    font-size: 1rem;
    padding: 12px 30px;
    background: transparent;
    border: 2px solid #39ff14;
    color: #39ff14;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 2px;
    transition: all 0.3s ease;
  `;
  
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = '#39ff14';
    closeBtn.style.color = '#0a0a0f';
    closeBtn.style.boxShadow = '0 0 20px #39ff14';
  });
  
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = 'transparent';
    closeBtn.style.color = '#39ff14';
    closeBtn.style.boxShadow = 'none';
  });
  
  // Close modal handlers
  closeBtn.addEventListener('click', () => {
    overlay.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => overlay.remove(), 300);
  });
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => overlay.remove(), 300);
    }
  });
  
  document.body.appendChild(overlay);
  
  // Add keyframe animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    @keyframes scaleIn {
      from { transform: scale(0.8); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}
