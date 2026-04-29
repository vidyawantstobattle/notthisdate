import { getStore } from "@netlify/blobs";

export default async (request, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (request.method !== 'GET') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers }
        );
    }

    try {
        const store = getStore("unavailability");

        let aggregated = {};
        try {
            const existing = await store.get('_aggregated', { type: 'json' });
            if (existing) {
                aggregated = existing;
            }
        } catch (e) {
            // No data yet
        }

        return new Response(
            JSON.stringify({ unavailability: aggregated }),
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

