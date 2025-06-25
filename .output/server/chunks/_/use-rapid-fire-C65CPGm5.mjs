import { useState, useEffect } from 'react';

const useRapidFire = (callback, delay = 500) => {
  const [isPressed, setIsPressed] = useState(false);
  useEffect(() => {
    let timeout;
    let animationFrameId;
    if (isPressed) {
      timeout = setTimeout(() => {
        const animate = () => {
          callback();
          animationFrameId = requestAnimationFrame(animate);
        };
        animationFrameId = requestAnimationFrame(animate);
      }, delay);
    }
    return () => {
      clearTimeout(timeout);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPressed, callback, delay]);
  return {
    onMouseDown: () => {
      callback();
      setIsPressed(true);
    },
    onMouseUp: () => setIsPressed(false),
    onMouseLeave: () => setIsPressed(false),
    onTouchStart: () => {
      callback();
      setIsPressed(true);
    },
    onTouchEnd: () => setIsPressed(false)
  };
};

export { useRapidFire as u };
//# sourceMappingURL=use-rapid-fire-C65CPGm5.mjs.map
