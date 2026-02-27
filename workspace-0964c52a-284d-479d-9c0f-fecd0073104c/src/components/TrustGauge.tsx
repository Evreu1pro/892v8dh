'use client';

import { useEffect, useState, useRef, useMemo } from 'react';

interface TrustGaugeProps {
  score: number;
  riskLevel: 'trusted' | 'suspicious' | 'high_risk';
  animated?: boolean;
}

export function TrustGauge({ score, riskLevel, animated = true }: TrustGaugeProps) {
  const [displayScore, setDisplayScore] = useState(() => animated ? 0 : score);
  const animationRef = useRef<number | null>(null);
  const frameIdRef = useRef<number>(0);
  
  useEffect(() => {
    if (!animated) {
      return;
    }

    const duration = 1500;
    const startScore = displayScore;
    const startTimestamp = performance.now();
    frameIdRef.current += 1;
    const currentFrameId = frameIdRef.current;
    
    const animate = (timestamp: number) => {
      // Check if this animation is still the current one
      if (frameIdRef.current !== currentFrameId) {
        return;
      }
      
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentScore = startScore + (score - startScore) * easeOutCubic;
      
      setDisplayScore(Math.round(currentScore));
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [score, animated]);
  
  // Calculate colors based on score
  const colors = useMemo(() => {
    if (score >= 80) return { main: '#22c55e', light: '#86efac', dark: '#16a34a' };
    if (score >= 50) return { main: '#eab308', light: '#fde047', dark: '#ca8a04' };
    return { main: '#ef4444', light: '#fca5a5', dark: '#dc2626' };
  }, [score]);
  
  // Calculate the arc path
  const size = 200;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const startAngle = -135;
  const endAngle = 135;
  
  // Current angle based on score
  const currentAngle = startAngle + (displayScore / 100) * (endAngle - startAngle);
  
  // Convert angle to radians
  const angleToRad = (angle: number) => (angle * Math.PI) / 180;
  
  // Calculate arc paths
  const { backgroundArc, scoreArc } = useMemo(() => {
    const describeArc = (startAng: number, endAng: number) => {
      const polarToCartesian = (centerX: number, centerY: number, r: number, angle: number) => {
        const rad = angleToRad(angle);
        return {
          x: centerX + r * Math.cos(rad),
          y: centerY + r * Math.sin(rad)
        };
      };
      
      const start = polarToCartesian(center, center, radius, endAng);
      const end = polarToCartesian(center, center, radius, startAng);
      const largeArcFlag = endAng - startAng <= 180 ? 0 : 1;
      
      return [
        'M', start.x, start.y,
        'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
      ].join(' ');
    };
    
    return {
      backgroundArc: describeArc(startAngle, endAngle),
      scoreArc: describeArc(startAngle, currentAngle)
    };
  }, [currentAngle, center, radius]);
  
  // Get risk level text and icon
  const riskInfo = useMemo(() => {
    switch (riskLevel) {
      case 'trusted':
        return { text: 'Trusted', icon: '✓', color: 'text-green-500' };
      case 'suspicious':
        return { text: 'Suspicious', icon: '⚠', color: 'text-yellow-500' };
      case 'high_risk':
        return { text: 'High Risk', icon: '✗', color: 'text-red-500' };
    }
  }, [riskLevel]);
  
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-0">
          {/* Background arc */}
          <path
            d={backgroundArc}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Score arc */}
          <path
            d={scoreArc}
            fill="none"
            stroke={colors.main}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{
              transition: 'stroke 0.3s ease'
            }}
          />
          
          {/* Glow effect */}
          <path
            d={scoreArc}
            fill="none"
            stroke={colors.main}
            strokeWidth={strokeWidth - 8}
            strokeLinecap="round"
            opacity={0.3}
            filter="blur(4px)"
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span 
            className="text-5xl font-bold tabular-nums"
            style={{ color: colors.main }}
          >
            {displayScore}%
          </span>
          <span className="text-sm text-gray-500 mt-1">Trust Score</span>
        </div>
      </div>
      
      {/* Risk level badge */}
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
        riskLevel === 'trusted' ? 'bg-green-100' :
        riskLevel === 'suspicious' ? 'bg-yellow-100' :
        'bg-red-100'
      }`}>
        <span className={`text-lg ${riskInfo.color}`}>{riskInfo.icon}</span>
        <span className={`font-medium ${riskInfo.color}`}>{riskInfo.text}</span>
      </div>
    </div>
  );
}
