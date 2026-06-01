import { Link } from 'react-router-dom';
import type { MontessoriRecord } from '../../types/activityPlan';

interface Props {
  records: MontessoriRecord[];
}

// 가나다 순 정렬
function sortByName(records: MontessoriRecord[]): MontessoriRecord[] {
  return [...records].sort((a, b) => a.childNameRaw.localeCompare(b.childNameRaw, 'ko'));
}

// 몬테소리 활동 표. 아이 이름이 링크인 경우 /children/:id 로 이동.
export default function MontessoriTable({ records }: Props) {
  const sorted = sortByName(records);

  if (sorted.length === 0) {
    return <p className="text-sm text-gray-400">몬테소리 기록이 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500">
          <tr>
            <th className="px-4 py-2.5 text-left font-semibold">아이</th>
            <th className="px-4 py-2.5 text-left font-semibold">영역</th>
            <th className="px-4 py-2.5 text-left font-semibold">교구</th>
            <th className="px-4 py-2.5 text-left font-semibold">확인</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.map((record) => (
            <tr key={record.id} className="bg-white hover:bg-orange-50/30 transition-colors">
              <td className="px-4 py-2.5 font-medium">
                {record.childId != null ? (
                  <Link
                    to={`/children/${record.childId}`}
                    className="text-[#FF9F66] hover:underline"
                  >
                    {record.childNameRaw}
                  </Link>
                ) : (
                  <span className="text-gray-700">
                    {record.childNameRaw}
                    <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-400">
                      매칭 안됨
                    </span>
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5 text-gray-600">{record.area || '—'}</td>
              <td className="px-4 py-2.5 text-gray-600">{record.material || '—'}</td>
              <td className="px-4 py-2.5 text-gray-400">{record.confirmed || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
