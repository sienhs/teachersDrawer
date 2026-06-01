import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import koLocale from '@fullcalendar/core/locales/ko';
import type { DatesSetArg, EventClickArg, EventInput } from '@fullcalendar/core';

interface Props {
  events: EventInput[];
  onEventClick: (planId: number) => void;
  onRangeChange: (start: Date, end: Date) => void;
}

// FullCalendar 월 뷰 래퍼. 활동계획안을 날짜별 이벤트로 표시.
export default function DashboardCalendar({ events, onEventClick, onRangeChange }: Props) {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      locale={koLocale}
      height="auto"
      events={events}
      eventClick={(arg: EventClickArg) => {
        const planId = arg.event.extendedProps.planId as number | undefined;
        if (planId != null) onEventClick(planId);
      }}
      datesSet={(arg: DatesSetArg) => onRangeChange(arg.start, arg.end)}
      eventColor="#FF9F66"
      eventDisplay="block"
      dayMaxEvents={3}
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: '',
      }}
      buttonText={{ today: '오늘' }}
    />
  );
}
