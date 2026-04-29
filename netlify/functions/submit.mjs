import { getStore } from "@netlify/blobs";

export default async (request, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response('', { status: 204, headers });
    }

    if (request.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers }
        );
    }

    try {
        const body = await request.json();
        const { name, dates } = body;

        // Validate input - name is required, dates can be empty array
        if (!name) {
            return new Response(
                JSON.stringify({ error: 'Name is required' }),
                { status: 400, headers }
            );
        }

        // Valid names
        const validNames = ['Vidya', 'Joey', 'Hazel', 'Mariya', 'Pim', 'Sanskar', 'Thijs', 'Andrei', 'Szymon', 'Egor', 'Sandro'];
        if (!validNames.includes(name)) {
            return new Response(
                JSON.stringify({ error: 'Invalid name' }),
                { status: 400, headers }
            );
        }

        // Dates can be empty (means available all summer)
        const inputDates = dates || [];

        // Validate dates (must be July or August 2026)
        const validDates = inputDates.filter(d => {
            const match = d.match(/^2026-(07|08)-\d{2}$/);
            if (!match) return false;
            const date = new Date(d + 'T12:00:00');
            return date.getMonth() === 6 || date.getMonth() === 7;
        });

        // Get store
        const store = getStore("unavailability");

        // Get user's existing data
        let existingUserDates = new Set();
        let userData = { submissions: [] };
        try {
            const existing = await store.get(name, { type: 'json' });
            if (existing) {
                userData = existing;
                // Collect all existing dates
                userData.submissions.forEach(sub => {
                    if (sub.dates) {
                        sub.dates.forEach(d => existingUserDates.add(d));
                    }
                });
            }
        } catch (e) {
            // No existing data
        }

        // Add new submission (append, don't replace)
        userData.submissions.push({
            dates: validDates,
            timestamp: new Date().toISOString()
        });

        // Save user data
        await store.setJSON(name, userData);

        // Update the aggregated unavailability data
        let aggregated = {};
        try {
            const existing = await store.get('_aggregated', { type: 'json' });
            if (existing) {
                aggregated = existing;
            }
        } catch (e) {
            // No existing aggregated data
        }

        // Add user to all their NEW dates (only dates not already in aggregated for this user)
        validDates.forEach(date => {
            if (!aggregated[date]) {
                aggregated[date] = [];
            }
            if (!aggregated[date].includes(name)) {
                aggregated[date].push(name);
            }
        });

        await store.setJSON('_aggregated', aggregated);

        return new Response(
            JSON.stringify({
                success: true,
                message: validDates.length === 0
                    ? 'Recorded as available all summer!'
                    : 'Unavailability recorded',
                datesRecorded: validDates.length
            }),
            { status: 200, headers }
        );

    } catch (error) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers }
        );
    }
};

