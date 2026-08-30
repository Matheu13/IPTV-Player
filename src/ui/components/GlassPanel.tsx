import React from 'react';
import { useDesignSystem } from '../context/DesignSystemContext';

interface GlassPanelProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  elevation?: 'flat' | 'card' | 'elevated' | 'glass' | 'opaque_list';
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'none';
  border?: boolean;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  id,
  children,
  className = '',
  elevation = 'card',
  rounded = 'lg',
  border = true,
}) => {
  const { capabilities } = useDesignSystem();
  const allowBlur = capabilities?.allowBackdropBlur ?? true;

  const elevationStyles = {
    flat: 'bg-[#111722]',
    card: 'bg-[#111722] shadow-md shadow-black/40',
    elevated: 'bg-[#161e2c] shadow-xl shadow-black/60',
    opaque_list: 'bg-[#0f1420]',
    glass: allowBlur
      ? 'bg-[#111722]/85 backdrop-blur-md shadow-2xl shadow-black/70'
      : 'bg-[#141b29] shadow-2xl shadow-black/70',
  }[elevation];

  const roundedStyles = {
    sm: 'rounded-md',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    xl: 'rounded-2xl',
    none: 'rounded-none',
  }[rounded];

  const borderStyle = border ? 'border border-white/[0.08]' : '';

  return (
    <div
      id={id}
      className={`${elevationStyles} ${roundedStyles} ${borderStyle} ${className}`}
    >
      {children}
    </div>
  );
};
