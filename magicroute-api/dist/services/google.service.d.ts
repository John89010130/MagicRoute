export declare function getDirectionsETA(origin: {
    lat: number;
    lng: number;
}, destination: {
    lat: number;
    lng: number;
}, waypoints: {
    lat: number;
    lng: number;
}[], optimize?: boolean): Promise<{
    legs: any;
    waypoint_order: any;
} | null>;
//# sourceMappingURL=google.service.d.ts.map