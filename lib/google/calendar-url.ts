export function generateGoogleCalendarUrl({
  title,
  description,
  start,
  end,
}: {
  title: string;
  description?: string;
  start: Date;
  end: Date;
}) {
  const format = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";

  const params = new URLSearchParams({
    text: title,
    details: description || "",
    dates: `${format(start)}/${format(end)}`,
  });

  return `${base}&${params.toString()}`;
}
