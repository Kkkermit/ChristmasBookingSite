import { useEffect, useState } from 'react';
import { deviceRatio, isSmallScreen, onFontsReady } from '../canvas';

/**
 * Screen size for the ASCII art. Ignores the phone URL bar sliding in and out
 * (height-only changes under 160px), so the art is never rebuilt mid-scroll;
 * bumps `font` once the web font has loaded so glyphs get redrawn with it.
 */
export function useViewport() {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight, dpr: deviceRatio(), font: 0 }));
  useEffect(() => {
    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setSize((s) => {
          const w = window.innerWidth;
          const h = window.innerHeight;
          const dpr = deviceRatio();
          const urlBarOnly = w === s.w && dpr === s.dpr && Math.abs(h - s.h) < 160 && isSmallScreen();
          return urlBarOnly || (w === s.w && h === s.h && dpr === s.dpr) ? s : { ...s, w, h, dpr };
        });
      }, 150);
    };
    window.addEventListener('resize', onResize);
    const stopFonts = onFontsReady(() => setSize((s) => ({ ...s, font: s.font + 1 })));
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', onResize);
      stopFonts();
    };
  }, []);
  return size;
}
