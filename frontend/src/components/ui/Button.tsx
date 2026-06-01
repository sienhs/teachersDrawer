import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-[#FF9F66] text-white hover:bg-[#f08c52] hover:-translate-y-0.5 shadow-sm',
  ghost: 'bg-gray-50 text-gray-600 hover:bg-orange-50 hover:text-[#FF9F66]',
};

export default function Button({ variant = 'primary', className = '', ...props }: Props) {
  return <button className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}
