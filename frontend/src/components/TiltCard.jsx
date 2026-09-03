import React, { useRef, useState } from 'react';

export const TiltCard = ({ children, className = '', style = {}, onClick }) => {
  const cardRef = useRef(null);
  const [transformStyle, setTransformStyle] = useState('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  const [lightPos, setLightPos] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;

    const percentX = (x / rect.width) * 100;
    const percentY = (y / rect.height) * 100;

    setTransformStyle(`perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`);
    setLightPos({ x: percentX, y: percentY, opacity: 1 });
  };

  const handleMouseLeave = () => {
    setTransformStyle('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setLightPos((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`relative transition-transform duration-200 ease-out overflow-hidden ${className}`}
      style={{
        transform: transformStyle,
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        ...style
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300 z-10"
        style={{
          opacity: lightPos.opacity,
          background: `radial-gradient(350px circle at ${lightPos.x}% ${lightPos.y}%, rgba(46, 99, 246, 0.18), transparent 80%)`
        }}
      />
      {children}
    </div>
  );
};
