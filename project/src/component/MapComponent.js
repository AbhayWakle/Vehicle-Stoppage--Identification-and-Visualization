import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import { FaCar } from 'react-icons/fa';
import Title from './Title';


// Fix for default icon issues
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Function to create a custom icon with the car icon
const createCustomIcon = () => {
  const iconMarkup = renderToStaticMarkup(<FaCar style={{ color: 'blue', fontSize: '24px' }} />);
  return L.divIcon({
    html: iconMarkup,
    className: 'custom-div-icon'
  });
};

const fetchAndProcessData = async () => {
  try {
    const response = await fetch('/dataset.json');
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    
    // Convert the fetched data to the required format
    const latLngs = data.map(item => [item.latitude, item.longitude]);
    
    // Filter for stoppages where speed is 0 and calculate the stoppage duration
    const stoppages = data
      .filter(item => item.speed === 0)
      .map((item, index, arr) => {
        const reachTime = new Date(item.eventGeneratedTime);
        const endTime = index < arr.length - 1
          ? new Date(arr[index + 1].eventGeneratedTime)
          : new Date(item.eventGeneratedTime);
        const duration = (endTime - reachTime) / (1000 * 60); // duration in minutes
        return {
          position: [item.latitude, item.longitude],
          reachTime: reachTime.toLocaleString(),
          endTime: endTime.toLocaleString(),
          duration: duration.toFixed(2),
          speed: item.speed,
          eventDate: new Date(item.eventDate).toLocaleDateString(),
          eventGeneratedTime: new Date(item.eventGeneratedTime).toLocaleTimeString(),
        };
      });
    
    return { latLngs, stoppages };
  } catch (error) {
    console.error('Error fetching and processing the data:', error);
    return { latLngs: [], stoppages: [] };
  }
};

const MapComponent = () => {
  const [coordinates, setCoordinates] = useState([]);
  const [stoppages, setStoppages] = useState([]);

  useEffect(() => {
    fetchAndProcessData()
      .then(({ latLngs, stoppages }) => {
        console.log('Fetched coordinates:', latLngs);
        console.log('Fetched stoppages:', stoppages);
        setCoordinates(latLngs);
        setStoppages(stoppages);
      })
      .catch(error => console.error('Error in useEffect:', error));
  }, []);

  return (
    <div className="app-container">
      <Title />
      <div className="map-container">
        <MapContainer center={[12.9294916, 74.9173533]} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {coordinates.length > 0 && <Polyline positions={coordinates} color="blue" />}
          {stoppages.map((stoppage, index) => (
            <Marker 
              key={index} 
              position={stoppage.position} 
              icon={createCustomIcon()}
            >
              <Popup>
                <div>
                  <strong>Speed:</strong> {stoppage.speed} km/h<br />
                  <strong>Event Date:</strong> {stoppage.eventDate}<br />
                  <strong>Event Generated Time:</strong> {stoppage.eventGeneratedTime}<br />
                  <strong>Reach Time:</strong> {stoppage.reachTime}<br />
                  <strong>End Time:</strong> {stoppage.endTime}<br />
                  <strong>Duration:</strong> {stoppage.duration} minutes
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapComponent;
