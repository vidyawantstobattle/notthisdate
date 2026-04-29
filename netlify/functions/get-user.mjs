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
        const url = new URL(request.url);
        const name = url.searchParams.get('name');

        if (!name) {
            return new Response(
                JSON.stringify({ error: 'Name parameter is required' }),
                { status: 400, headers }
            );
        }

        const store = getStore("unavailability");

        let userData = { submissions: [] };
        try {
            const existing = await store.get(name, { type: 'json' });
            if (existing) {
                userData = existing;
            }
        } catch (e) {
            // No data for this user
        }

        return new Response(
            JSON.stringify(userData),
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

