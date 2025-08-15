"use client";

import * as React from "react";
import { CheckCircle, AlertCircle, Loader2, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface RealTimeNotificationProps {
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastUpdate?: string;
  className?: string;
}

export function RealTimeNotification({ 
  status, 
  lastUpdate, 
  className 
}: RealTimeNotificationProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          text: 'Real-time connected',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'connecting':
        return {
          icon: Loader2,
          text: 'Connecting...',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          text: 'Internet disconnected',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Connection error',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium",
      config.bgColor,
      config.borderColor,
      className
    )}>
      <Icon className={cn("h-3 w-3", config.color, status === 'connecting' && "animate-spin")} />
      <span className={config.color}>{config.text}</span>
      {lastUpdate && (
        <span className="text-gray-500 text-xs">
          • {new Date(lastUpdate).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}

// Hook for managing real-time connection status
export function useRealTimeStatus() {
  const [status, setStatus] = React.useState<'connected' | 'disconnected' | 'connecting' | 'error'>('connecting');
  const [lastUpdate, setLastUpdate] = React.useState<string>('');

  React.useEffect(() => {
    // Check initial internet connectivity
    const checkOnlineStatus = () => {
      if (navigator.onLine) {
        setStatus('connected');
        setLastUpdate(new Date().toISOString());
      } else {
        setStatus('disconnected');
        setLastUpdate(new Date().toISOString());
      }
    };

    // Initial check
    checkOnlineStatus();

    // Listen for online/offline events
    const handleOnline = () => {
      setStatus('connected');
      setLastUpdate(new Date().toISOString());
    };

    const handleOffline = () => {
      setStatus('disconnected');
      setLastUpdate(new Date().toISOString());
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateLastUpdate = React.useCallback(() => {
    setLastUpdate(new Date().toISOString());
  }, []);

  return {
    status,
    lastUpdate,
    updateLastUpdate
  };
}
