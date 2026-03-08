export type BrowserLocationResult = {
  latitude?: number;
  longitude?: number;
  error?: string;
};

export function getBrowserLocation(): Promise<BrowserLocationResult> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve({ error: 'Geolocation is not supported on this device.' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        let message = 'Unable to get your location.';

        if (error.code === error.PERMISSION_DENIED) {
          message = 'Location permission was denied.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = 'Location information is unavailable.';
        } else if (error.code === error.TIMEOUT) {
          message = 'Location request timed out.';
        }

        resolve({ error: message });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  });
}
