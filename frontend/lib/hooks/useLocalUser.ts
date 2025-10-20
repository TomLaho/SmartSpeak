import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "smartspeak:userId";

export function useLocalUser() {
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setUserId(stored);
    }
  }, []);

  const updateUser = useCallback((value: string) => {
    setUserId(value);
    if (typeof window !== "undefined") {
      if (value) {
        window.localStorage.setItem(STORAGE_KEY, value);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  return { userId, setUserId: updateUser };
}
