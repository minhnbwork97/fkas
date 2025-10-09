"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const PIN_KEY = "fkas_admin_pin";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    // Only run on client side
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    try {
      const pin = localStorage.getItem(PIN_KEY);
      console.log("Checking auth, PIN found:", !!pin);
      if (pin) {
        setIsAuthenticated(true);
        setIsLoading(false);
      } else {
        console.log("No PIN found, redirecting to login");
        // Redirect to login if not authenticated
        router.replace("/organizer/login");
        // Don't set isAuthenticated to false here to prevent blank page
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error checking authentication:", error);
      router.replace("/organizer/login");
      setIsLoading(false);
    }
  };

  const login = (pin: string) => {
    try {
      localStorage.setItem(PIN_KEY, pin);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error("Error saving PIN:", error);
      return false;
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem(PIN_KEY);
      setIsAuthenticated(false);
      router.replace("/organizer/login");
    } catch (error) {
      console.error("Error removing PIN:", error);
    }
  };

  const getPin = useCallback(() => {
    try {
      return localStorage.getItem(PIN_KEY);
    } catch (error) {
      console.error("Error getting PIN:", error);
      return null;
    }
  }, []);

  return {
    isAuthenticated,
    isLoading,
    login,
    logout,
    getPin,
    checkAuth,
  };
}
