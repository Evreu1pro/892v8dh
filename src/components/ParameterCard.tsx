'use client';

import { cn } from '@/lib/utils';
import { StatusIndicator } from './StatusIndicator';
import type { ParameterScore } from '@/lib/types/fingerprint';
import type { StatusType } from '@/lib/types/fingerprint';

interface ParameterCardProps {
  parameter: ParameterScore;
  compact?: boolean;
  className?: string;
}

export function ParameterCard({ parameter, compact = false, className }: ParameterCardProps) {
  const status: StatusType = parameter.status;
  
  // Get border color based on status
  const getBorderColor = () => {
    switch (status) {
      case 'pass': return 'border-l-green-500';
      case 'warning': return 'border-l-yellow-500';
      case 'fail': return 'border-l-red-500';
      default: return 'border-l-gray-500';
    }
  };
  
  // Get background color based on status
  const getBgColor = () => {
    switch (status) {
      case 'pass': return 'bg-green-50/50';
      case 'warning': return 'bg-yellow-50/50';
      case 'fail': return 'bg-red-50/50';
      default: return 'bg-gray-50/50';
    }
  };
  
  if (compact) {
    return (
      <div 
        className={cn(
          'flex items-center justify-between p-3 rounded-lg border-l-4',
          getBorderColor(),
          getBgColor(),
          'border border-gray-100',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <StatusIndicator status={status} size="sm" />
          <div>
            <div className="font-medium text-gray-900 text-sm">{parameter.name}</div>
            <div className="text-xs text-gray-500 truncate max-w-[200px]">
              {String(parameter.value)}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-gray-700">
            {parameter.score}/{parameter.maxScore}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className={cn(
        'p-4 rounded-lg border-l-4',
        getBorderColor(),
        getBgColor(),
        'border border-gray-100',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusIndicator status={status} size="md" showLabel />
            <h4 className="font-medium text-gray-900">{parameter.name}</h4>
          </div>
          
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-20">Detected:</span>
              <span className="text-sm text-gray-700 truncate" title={String(parameter.value)}>
                {String(parameter.value)}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-20">Expected:</span>
              <span className="text-sm text-gray-600">{parameter.expected}</span>
            </div>
            
            {parameter.details && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-20">Details:</span>
                <span className="text-sm text-gray-600">{parameter.details}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold text-gray-800">
            {parameter.score}
          </div>
          <div className="text-xs text-gray-500">
            of {parameter.maxScore} pts
          </div>
          
          {/* Score bar */}
          <div className="mt-2 w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full rounded-full transition-all duration-500',
                status === 'pass' && 'bg-green-500',
                status === 'warning' && 'bg-yellow-500',
                status === 'fail' && 'bg-red-500'
              )}
              style={{ width: `${(parameter.score / parameter.maxScore) * 100}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Criticality badge */}
      <div className="mt-3 flex items-center gap-2">
        <span className={cn(
          'text-xs px-2 py-0.5 rounded',
          parameter.criticality === 'critical' && 'bg-red-100 text-red-700',
          parameter.criticality === 'high' && 'bg-orange-100 text-orange-700',
          parameter.criticality === 'medium' && 'bg-blue-100 text-blue-700',
          parameter.criticality === 'low' && 'bg-gray-100 text-gray-700'
        )}>
          {parameter.criticality.charAt(0).toUpperCase() + parameter.criticality.slice(1)} Priority
        </span>
        <span className="text-xs text-gray-400">
          Weight: {parameter.weight}
        </span>
      </div>
    </div>
  );
}

// Group component for related parameters
interface ParameterGroupProps {
  title: string;
  icon: React.ReactNode;
  parameters: ParameterScore[];
  className?: string;
}

export function ParameterGroup({ title, icon, parameters, className }: ParameterGroupProps) {
  // Calculate group score
  const groupScore = parameters.reduce((sum, p) => sum + p.score, 0);
  const groupMaxScore = parameters.reduce((sum, p) => sum + p.maxScore, 0);
  const groupPercentage = Math.round((groupScore / groupMaxScore) * 100);
  
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gray-600">{icon}</span>
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <span className="text-sm text-gray-500">
            ({parameters.length} parameters)
          </span>
        </div>
        <div className="text-sm font-medium text-gray-600">
          {groupScore}/{groupMaxScore} pts ({groupPercentage}%)
        </div>
      </div>
      
      <div className="grid gap-3">
        {parameters.map((param, index) => (
          <ParameterCard 
            key={index} 
            parameter={param} 
            compact 
          />
        ))}
      </div>
    </div>
  );
}
