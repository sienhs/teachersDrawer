interface Props {
  className?: string;
}

// 주황 톤 로딩 스피너
export default function Spinner({ className = '' }: Props) {
  return (
    <span
      className={`inline-block h-6 w-6 animate-spin rounded-full border-2 border-orange-200 border-t-[#FF9F66] ${className}`}
      role="status"
      aria-label="불러오는 중"
    />
  );
}
