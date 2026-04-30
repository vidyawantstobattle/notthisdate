import { getStore } from "@netlify/blobs";
import { randomUUID } from "crypto";

export default async (request, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
        return new Response('', { status: 204, headers });
    }

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
    }

    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }

    // Decode JWT to get user info (Netlify Identity)
    const token = authHeader.split(' ')[1];
    let userId, userEmail;

    try {
        // Decode JWT payload (base64)
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.sub;
        userEmail = payload.email;
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers });
    }

    try {
        const body = await request.json();
        const { name, description, dateRangeType, startDate, endDate, participantsType, participants } = body;

        if (!name || !name.trim()) {
            return new Response(JSON.stringify({ error: 'Calendar name is required' }), { status: 400, headers });
        }

        // Generate unique calendar ID
        const calendarId = randomUUID().split('-')[0] + randomUUID().split('-')[1];

        const calendar = {
            id: calendarId,
            name: name.trim(),
            description: description?.trim() || '',
            dateRangeType,
            startDate,
            endDate,
            participantsType,
            participants: participants || [],
            ownerId: userId,
            ownerEmail: userEmail,
            createdAt: new Date().toISOString(),
            unavailability: {}
        };

        // Store calendar
        const store = getStore("calendars");
        await store.setJSON(calendarId, calendar);

        // Add to user's calendar list
        const userStore = getStore("user-calendars");
        let userCalendars = [];
        try {
            const existing = await userStore.get(userId, { type: 'json' });
            if (existing) userCalendars = existing;
        } catch (e) {}

        userCalendars.push({
            id: calendarId,
            name: calendar.name,
            createdAt: calendar.createdAt
        });

        await userStore.setJSON(userId, userCalendars);

        return new Response(JSON.stringify({ success: true, calendar }), { status: 201, headers });

    } catch (error) {
        console.error('Error creating calendar:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers });
    }
};
