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
        const { adminKey } = body;

        // Simple protection - require a key to reset all data
        if (adminKey !== 'reset-all-2026') {
            return new Response(
                JSON.stringify({ error: 'Invalid admin key' }),
                { status: 403, headers }
            );
        }

        const store = getStore("unavailability");

        // List of all possible keys to delete (old names + new names + aggregated)
        const keysToDelete = [
            // Old names
            'Alex', 'Ben', 'Chris', 'Dana', 'Emma', 'Felix', 'Grace', 'Henry', 'Ivy', 'Jake', 'Kate', 'Leo',
            // New names
            'Vidya', 'Joey', 'Hazel', 'Mariya', 'Pim', 'Sanskar', 'Thijs', 'Andrei', 'Szymon', 'Egor', 'Sandro',
            // Aggregated data
            '_aggregated'
        ];

        let deleted = [];
        for (const key of keysToDelete) {
            try {
                await store.delete(key);
                deleted.push(key);
            } catch (e) {
                // Key might not exist, that's fine
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'All data has been reset',
                deletedKeys: deleted
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

