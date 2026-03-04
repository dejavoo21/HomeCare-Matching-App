import { useEffect, useState } from 'react';

interface OfferCountdownProps {
  expiresAt: string | number; // ISO string or timestamp in milliseconds
  onExpired?: () => void;
}

export function OfferCountdown({ expiresAt, onExpired }: OfferCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      // Handle both ISO string and millisecond timestamps
      const expiryTime = typeof expiresAt === 'string' 
        ? new Date(expiresAt).getTime() 
        : expiresAt;
      
      const now = Date.now();
      const remaining = expiryTime - now;

      if (remaining <= 0) {
        setTimeRemaining('Expired');
        setIsExpired(true);
        onExpired?.();
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);

      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      setIsExpired(false);
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  const getColor = (): string => {
    if (isExpired) return '#d32f2f'; // red
    const expiryTime = typeof expiresAt === 'string' 
      ? new Date(expiresAt).getTime() 
      : expiresAt;
    const now = Date.now();
    const remaining = expiryTime - now;
    const minutes = Math.floor(remaining / 60000);
    if (minutes < 1) return '#ff9800'; // amber
    return '#4caf50'; // green
  };

  return (
    <span
      style={{
        fontWeight: 'bold',
        color: getColor(),
      }}
    >
      {timeRemaining || 'Loading...'}
    </span>
  );
}
