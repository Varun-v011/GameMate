// src/contexts/PlayerContext.js
import React, { createContext, useContext, useState, useEffect } from "react";

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
  const [players, setPlayers] = useState(() => {
    try {
      const saved = localStorage.getItem("rummy_players");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // whenever players change, save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("rummy_players", JSON.stringify(players));
    } catch {
      // ignore storage errors
    }
  }, [players]);

  const value = { players, setPlayers };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayers() {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayers must be used inside PlayerProvider");
  }
  return ctx;
}
