import React, { useState } from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  role?: string;
  gender?: 'Male' | 'Female' | 'Other' | 'Unknown' | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  status?: 'online' | 'busy' | 'waiting' | 'in-consult' | 'offline';
  className?: string;
  ring?: boolean;
}

const SIZE_MAP = {
  xs: { box: 'w-6 h-6', text: 'text-[10px]', status: 'w-1.5 h-1.5 ring-1' },
  sm: { box: 'w-8 h-8', text: 'text-xs', status: 'w-2 h-2 ring-1.5' },
  md: { box: 'w-10 h-10', text: 'text-xs', status: 'w-2.5 h-2.5 ring-2' },
  lg: { box: 'w-12 h-12', text: 'text-sm font-bold', status: 'w-3 h-3 ring-2' },
  xl: { box: 'w-16 h-16', text: 'text-lg font-bold', status: 'w-3.5 h-3.5 ring-2' },
  '2xl': { box: 'w-20 h-20', text: 'text-2xl font-bold', status: 'w-4 h-4 ring-2' },
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  gender = 'Male',
  size = 'md',
  status,
  className = '',
  ring = true,
}) => {
  const [hasError, setHasError] = useState(false);
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;

  const initials = name
    ? name
        .replace(/^Dr\.\s+/i, '')
        .split(' ')
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '??';

  const isFemale = gender?.toLowerCase() === 'female';
  const fallbackBg = isFemale
    ? 'bg-rose-50 text-rose-700 border-rose-200'
    : 'bg-teal-50 text-teal-800 border-teal-200';

  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'bg-emerald-500';
      case 'in-consult':
        return 'bg-teal-500 animate-pulse';
      case 'waiting':
        return 'bg-amber-500';
      case 'busy':
        return 'bg-rose-500';
      default:
        return 'bg-slate-400';
    }
  };

  const ringClass = ring
    ? 'border border-slate-200/90 shadow-xs'
    : '';

  return (
    <div className={`relative inline-block shrink-0 ${sizeConfig.box} ${className}`}>
      {src && !hasError ? (
        <img
          src={src}
          alt={name}
          onError={() => setHasError(true)}
          referrerPolicy="no-referrer"
          className={`${sizeConfig.box} rounded-full object-cover ${ringClass} bg-slate-100`}
        />
      ) : (
        <div
          className={`${sizeConfig.box} rounded-full flex items-center justify-center font-bold tracking-tight border ${fallbackBg} ${ringClass} select-none`}
        >
          <span className={sizeConfig.text}>{initials}</span>
        </div>
      )}

      {status && (
        <span
          className={`absolute bottom-0 right-0 ${sizeConfig.status} rounded-full ${getStatusColor()} ring-white shadow-xs`}
          aria-hidden="true"
        />
      )}
    </div>
  );
};
