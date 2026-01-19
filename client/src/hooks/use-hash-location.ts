import { useState, useEffect, useCallback } from "react";

// returns the current hash location (excluding the '#')
const currentLocation = () => {
  return window.location.hash.replace(/^#/, "") || "/";
};

export const useHashLocation = () => {
  const [loc, setLoc] = useState(currentLocation());

  useEffect(() => {
    const handler = () => setLoc(currentLocation());

    // subscribe on hash changes
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to;
  }, []);

  return [loc, navigate] as [string, (to: string) => void];
};
