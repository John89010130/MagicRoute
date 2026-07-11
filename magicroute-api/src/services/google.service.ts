export async function getDirectionsETA(origin: {lat: number, lng: number}, destination: {lat: number, lng: number}, waypoints: {lat: number, lng: number}[]) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_MAPS_API_KEY is not defined in backend');
    }

    const originStr = `${origin.lat},${origin.lng}`;
    const destStr = `${destination.lat},${destination.lng}`;
    const waypointsStr = waypoints.map(w => `${w.lat},${w.lng}`).join('|');

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destStr}${waypointsStr ? `&waypoints=${waypointsStr}` : ''}&key=${apiKey}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK') {
      console.error('Google Directions API Error:', data.status, data.error_message);
      return null;
    }

    // A rota retorna legs. Número de legs = waypoints + 1.
    // data.routes[0].legs é um array onde cada leg tem distance.value (metros) e duration.value (segundos).
    return data.routes[0].legs;
  } catch (error) {
    console.error('Error fetching Google Directions:', error);
    return null;
  }
}
