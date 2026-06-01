interface Props {
  title?: string;
}

// Step 3-B 이후 채워질 페이지 자리
export default function ComingSoonPage({ title = '이 기능' }: Props) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="rounded-2xl bg-white px-10 py-12 shadow-sm shadow-orange-50">
        <p className="text-4xl">🛠️</p>
        <h1 className="mt-4 text-lg font-bold text-gray-700">{title}은(는) 준비 중입니다</h1>
        <p className="mt-2 text-sm text-gray-400">다음 단계(Step 3-B)에서 만나요.</p>
      </div>
    </div>
  );
}
