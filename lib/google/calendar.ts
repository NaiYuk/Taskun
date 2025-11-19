// イベント作成を行うGoogle Calendarクライアント
import { google } from 'googleapis';
import { getValidAccessToken } from './oauth';

export async function createCalendarEvent(
    userId: string,
    eventData: {
        summary: string;
        description?: string;
        start: string;
        end: string;
    }
) {
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) throw new Error('Unable to obtain valid access token');

    const calendar = google.calendar({ version: "v3" });
    const res = await calendar.events.insert(
        {
            calendarId: "primary",
            requestBody: {
                summary: eventData.summary,
                description: eventData.description || "",
                start: { dateTime: eventData.start, timeZone: "Asia/Tokyo" },
                end: { dateTime: eventData.end, timeZone: "Asia/Tokyo" },
            },
        },
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    return res.data;
}
