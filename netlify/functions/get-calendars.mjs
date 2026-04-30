import { getStore } from "@netlify/blobs";

export default async (request, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (request.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }

    const token = authHeader.split(' ')[1];
    let userId;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.sub;
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers });
    }

    try {
        const userStore = getStore("user-calendars");
        const calendarStore = getStore("calendars");

        let userCalendarRefs = [];
        try {
            const existing = await userStore.get(userId, { type: 'json' });
            if (existing) userCalendarRefs = existing;
        } catch (e) {}

        const calendars = [];
        for (const ref of userCalendarRefs) {
            try {
                const cal = await calendarStore.get(ref.id, { type: 'json' });
                if (cal) {
                    const { unavailability, participantSubmissions, ...calendarInfo } = cal;
                    calendars.push(calendarInfo);
                }
            } catch (e) {}
        }

        return new Response(JSON.stringify({ calendars }), { status: 200, headers });

    } catch (error) {
        console.error('Error getting calendars:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers });
    }
};

