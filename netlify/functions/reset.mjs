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
        const { name } = body;

        // Validate input
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

        const store = getStore("unavailability");

        // Get user's current dates to remove from aggregated
        let userDatesToRemove = [];
        try {
            const userData = await store.get(name, { type: 'json' });
            if (userData && userData.submissions) {
                // Collect all dates from all submissions
                userData.submissions.forEach(sub => {
                    if (sub.dates) {
                        userDatesToRemove.push(...sub.dates);
                    }
                });
            }
        } catch (e) {
            // No existing data
        }

        // Clear user data
        await store.setJSON(name, { submissions: [] });

        // Update aggregated data - remove this user from all their dates
        if (userDatesToRemove.length > 0) {
            let aggregated = {};
            try {
                const existing = await store.get('_aggregated', { type: 'json' });
                if (existing) {
                    aggregated = existing;
                }
            } catch (e) {
                // No existing aggregated data
            }

            // Remove user from each date
            userDatesToRemove.forEach(date => {
                if (aggregated[date]) {
                    aggregated[date] = aggregated[date].filter(p => p !== name);
                    // Clean up empty arrays
                    if (aggregated[date].length === 0) {
                        delete aggregated[date];
                    }
                }
            });

            await store.setJSON('_aggregated', aggregated);
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'User dates reset successfully'
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

