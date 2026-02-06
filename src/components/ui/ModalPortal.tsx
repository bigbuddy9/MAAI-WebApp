'use client';

import { useEffect, useState, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: ReactNode;
  isOpen: boolean;
}

/**
 * ModalPortal creates a dedicated container element directly appended to body
 * and renders modal content there with maximum z-index.
 * Each modal instance gets its own container to avoid stacking issues.
 */
export default function ModalPortal({ children, isOpen }: ModalPortalProps) {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create a dedicated container for this modal instance
    const container = document.createElement('div');
    container.setAttribute('data-modal-portal', 'true');
    container.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      z-index: 2147483647 !important;
      pointer-events: none !important;
    `;
    document.body.appendChild(container);
    containerRef.current = container;
    setMounted(true);

    return () => {
      if (containerRef.current && containerRef.current.parentNode) {
        containerRef.current.parentNode.removeChild(containerRef.current);
        containerRef.current = null;
      }
    };
  }, []);

  // Update container visibility based on isOpen
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.display = isOpen ? 'block' : 'none';
    }
  }, [isOpen]);

  if (!mounted || !containerRef.current) {
    return null;
  }

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div style={{ pointerEvents: 'auto', width: '100%', height: '100%' }}>
      {children}
    </div>,
    containerRef.current
  );
}
