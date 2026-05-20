import { useEffect, useRef } from 'react';
import './BottomSheet.css';

const HEIGHT_MAP = { short: '40vh', tall: '85vh', full: '95vh' };

export default function BottomSheet({ isOpen, onClose, height = 'tall', title, children }) {
  const sheetRef = useRef(null);
  const dragRef = useRef({ startY: 0, currentY: 0, dragging: false });

  useEffect(() => {
    if (!isOpen) return;
    const sheet = sheetRef.current;
    if (!sheet) return;
    const focusable = sheet.querySelectorAll(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    setTimeout(() => first?.focus(), 50);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const onTouchStart = (e) => {
    dragRef.current = { startY: e.touches[0].clientY, currentY: 0, dragging: true };
  };
  const onTouchMove = (e) => {
    if (!dragRef.current.dragging) return;
    const delta = e.touches[0].clientY - dragRef.current.startY;
    dragRef.current.currentY = delta;
    if (delta > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  };
  const onTouchEnd = () => {
    if (dragRef.current.currentY > 120) {
      if (sheetRef.current) sheetRef.current.style.transform = '';
      onClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }
    dragRef.current.dragging = false;
  };

  if (!isOpen) return null;

  return (
    <div className="bsheet-backdrop" onClick={onClose}>
      <div
        ref={sheetRef}
        className="bsheet"
        style={{ '--sheet-height': HEIGHT_MAP[height] }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="bsheet-handle-area"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="bsheet-handle" />
          {title && <div className="bsheet-title">{title}</div>}
        </div>
        <div className="bsheet-body">
          {children}
        </div>
      </div>
    </div>
  );
}
