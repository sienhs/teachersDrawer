import Calendar from 'react-calendar';
import type { TileArgs } from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

interface Props {
  highlightedDates: string[]; // yyyy-MM-dd 형식
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 아이 상세용 미니 캘린더. 몬테소리 활동이 있는 날에 주황 점 표시.
export default function MiniCalendar({ highlightedDates, selectedDate, onDateSelect }: Props) {
  const dateSet = new Set(highlightedDates);

  const handleChange = (value: Date | null | [Date | null, Date | null]) => {
    if (value instanceof Date) {
      onDateSelect(toYmd(value));
    }
  };

  return (
    <div className="mini-calendar">
      <style>{`
        .mini-calendar .react-calendar {
          border: none;
          background: transparent;
          font-family: inherit;
          width: 100%;
        }
        .mini-calendar .react-calendar__tile {
          border-radius: 0.75rem;
          font-size: 0.8125rem;
        }
        .mini-calendar .react-calendar__tile--active,
        .mini-calendar .react-calendar__tile--active:enabled:hover {
          background: #FF9F66;
          color: white;
        }
        .mini-calendar .react-calendar__tile:enabled:hover {
          background: #fff3eb;
          color: #FF9F66;
        }
        .mini-calendar .react-calendar__navigation button:enabled:hover {
          background: #fff3eb;
          border-radius: 0.5rem;
        }
        .mini-calendar .react-calendar__month-view__weekdays__weekday abbr {
          text-decoration: none;
          font-weight: 600;
          font-size: 0.75rem;
          color: #9ca3af;
        }
      `}</style>
      <Calendar
        onChange={handleChange}
        value={selectedDate ? new Date(selectedDate) : null}
        locale="ko-KR"
        tileContent={({ date }: TileArgs) => {
          const ymd = toYmd(date);
          return dateSet.has(ymd) ? (
            <div className="flex justify-center mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF9F66]" />
            </div>
          ) : null;
        }}
        tileClassName={({ date }: TileArgs) => {
          const ymd = toYmd(date);
          return dateSet.has(ymd) ? 'font-semibold' : '';
        }}
      />
    </div>
  );
}
