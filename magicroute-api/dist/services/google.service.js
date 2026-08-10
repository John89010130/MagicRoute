"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDirectionsETA = getDirectionsETA;
async function getDirectionsETA(origin, destination, waypoints, optimize = false) {
    try {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            throw new Error('GOOGLE_MAPS_API_KEY is not defined in backend');
        }
        const originStr = `${origin.lat},${origin.lng}`;
        const destStr = `${destination.lat},${destination.lng}`;
        const waypointsFormatted = waypoints.map(w => `${w.lat},${w.lng}`).join('|');
        const waypointsParam = waypointsFormatted ? `${optimize ? 'optimize:true|' : ''}${waypointsFormatted}` : '';
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destStr}${waypointsParam ? `&waypoints=${waypointsParam}` : ''}&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status !== 'OK') {
            console.error('Google Directions API Error:', data.status, data.error_message);
            return null;
        }
        return {
            legs: data.routes[0]?.legs || [],
            waypoint_order: data.routes[0]?.waypoint_order || []
        };
    }
    catch (error) {
        console.error('Error fetching Google Directions:', error);
        return null;
    }
}
//# sourceMappingURL=google.service.js.map