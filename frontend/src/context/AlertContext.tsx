import React, { createContext, useState, ReactNode } from "react";
import { Alert } from "../types";
import { MOCK_ALERTS } from "../mockData";

export interface AlertContextType {
  alerts: Alert[];
  addAlert: (alert: Alert) => void;
  removeAlert: (id: string) => void;
  clearGeneratedAlerts: () => void;
}

export const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);

  const addAlert = (alert: Alert) => {
    setAlerts((prev) => [alert, ...prev]);
  };

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const clearGeneratedAlerts = () => {
    // Keeps only the initial mock alerts
    const initialIds = new Set(MOCK_ALERTS.map((a) => a.id));
    setAlerts((prev) => prev.filter((a) => initialIds.has(a.id)));
  };

  return (
    <AlertContext.Provider
      value={{
        alerts,
        addAlert,
        removeAlert,
        clearGeneratedAlerts,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
}
