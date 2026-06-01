import type { HTMLAttributes } from 'react';

// 토스풍 카드: 흰 배경 + 둥근 모서리 + 부드러운 그림자
export default function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl bg-white p-5 shadow-sm shadow-orange-50 ${className}`}
      {...props}
    />
  );
}
