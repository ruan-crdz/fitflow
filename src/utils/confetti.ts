/** Lightweight confetti burst without dependencies */
export default function confetti() {
  const style = getComputedStyle(document.documentElement);
  const primary = `rgb(${style.getPropertyValue('--color-primary-rgb')})`;
  const light = `rgb(${style.getPropertyValue('--color-primary-light-rgb')})`;
  const colors = [primary, light, '#10b981', '#f59e0b', '#ec4899'];
  const container = document.createElement('div');
  container.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden';
  document.body.appendChild(container);

  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 300;
    const size = Math.random() * 8 + 4;
    const rotation = Math.random() * 360;

    piece.style.cssText = `
      position:absolute;
      top:-10px;
      left:${left}%;
      width:${size}px;
      height:${size * 1.5}px;
      background:${color};
      border-radius:2px;
      transform:rotate(${rotation}deg);
      animation:confetti-fall ${1.5 + Math.random()}s ease-out ${delay}ms forwards;
    `;
    container.appendChild(piece);
  }

  if (!document.getElementById('confetti-style')) {
    const style = document.createElement('style');
    style.id = 'confetti-style';
    style.textContent = `
      @keyframes confetti-fall {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  setTimeout(() => container.remove(), 3000);
}
