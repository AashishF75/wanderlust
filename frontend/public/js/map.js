mapboxgl.accessToken = mapToken;

if (typeof coordinates !== "undefined" && Array.isArray(coordinates) && coordinates.length === 2) {
    const map = new mapboxgl.Map({
        container: "map",
        style: "mapbox://styles/mapbox/streets-v12",
        center: coordinates,
        zoom: 9
    });

    // Add navigation control (zoom and rotation controls)
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Create custom marker with brand pin styling
    const marker = new mapboxgl.Marker({ color: "#253D35" })
        .setLngLat(coordinates)
        .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
                `<div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 4px;">
                    <h6 style="font-weight: 700; margin-bottom: 2px; color: #253D35;">Exact Location</h6>
                    <p style="font-size: 12px; margin: 0; color: #6e6e6e;">Detailed address and directions provided upon reservation.</p>
                 </div>`
            )
        )
        .addTo(map);
}
