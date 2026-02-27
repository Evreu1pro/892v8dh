'use client';

import { cn } from '@/lib/utils';
import type { StatusType } from '@/lib/types/fingerprint';

interface StatusIndicatorProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<StatusType, { color: string; bgColor: string; label: string; icon: string }> = {
  pass: {
    color: 'text-green-600',
    bgColor: 'bg-green-500',
    label: 'Pass',
    icon: '✓'
  },
  warning: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500',
    label: 'Warning',
    icon: '⚠'
  },
  fail: {
    color: 'text-red-600',
    bgColor: 'bg-red-500',
    label: 'Fail',
    icon: '✗'
  },
  loading: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-500',
    label: 'Loading',
    icon: '⋯'
  },
  unknown: {
    color: 'text-gray-600',
    bgColor: 'bg-gray-500',
    label: 'Unknown',
    icon: '?'
  }
};

const SIZE_CONFIG = {
  sm: { dot: 'w-2 h-2', text: 'text-xs', icon: 'text-sm' },
  md: { dot: 'w-3 h-3', text: 'text-sm', icon: 'text-base' },
  lg: { dot: 'w-4 h-4', text: 'text-base', icon: 'text-lg' }
};

export function StatusIndicator({ 
  status, 
  size = 'md', 
  showLabel = false,
  className 
}: StatusIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const sizeConfig = SIZE_CONFIG[size];
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Status dot */}
      <div className="relative flex items-center justify-center">
        <div 
          className={cn(
            sizeConfig.dot,
            config.bgColor,
            'rounded-full',
            status !== 'loading' && 'animate-pulse'
          )}
        />
        {status !== 'loading' && (
          <div 
            className={cn(
              sizeConfig.dot,
              config.bgColor,
              'rounded-full absolute opacity-50 animate-ping'
            )}
          />
        )}
      </div>
      
      {/* Icon (optional) */}
      <span className={cn(sizeConfig.icon, config.color)}>
        {config.icon}
      </span>
      
      {/* Label (optional) */}
      {showLabel && (
        <span className={cn(sizeConfig.text, 'font-medium', config.color)}>
          {config.label}
        </span>
      )}
    </div>
  );
}

// Inline status badge component
interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  
  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        status === 'pass' && 'bg-green-100 text-green-700',
        status === 'warning' && 'bg-yellow-100 text-yellow-700',
        status === 'fail' && 'bg-red-100 text-red-700',
        status === 'loading' && 'bg-blue-100 text-blue-700',
        status === 'unknown' && 'bg-gray-100 text-gray-700',
        className
      )}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
