// src/components/Setup.jsx
import React, { useState } from "react";
import { usePlayers } from "../Context/Player-context";

function Setup({ onDone}) {
  const [numPlayers, setNumPlayers] = useState("");
  const { players, setPlayers } = usePlayers();

  const handleNumChange = (e) => {
    const value = e.target.value;
    setNumPlayers(value);
    const n = Number(value) || 0;

    setPlayers((prev) => {
      const copy = [...prev];
      while (copy.length < n) {
        copy.push({
          id: crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now() + Math.random(),
          name: "",
        });
      }
      return copy.slice(0, n);
    });
  };

  const handleNameChange = (index, value) => {
    setPlayers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], name: value };
      return copy;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const allNamesFilled = players.every((p) => p.name.trim());
    if (allNamesFilled) {
      onDone();
    } else {
      alert("Please fill all player names!");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="setup-form">
      <label>
        Number of Players:
        <input
          type="number"
          min="2"
          max="6"
          value={numPlayers}
          onChange={handleNumChange}
          className="num-players-input"
        />
      </label>

      <div className="players-list">
        {players.map((player, index) => (
          <label key={player.id} className="player-input">
            Player {index + 1}:
            <input
              type="text"
              placeholder={`Player ${index + 1} name`}
              value={player.name}
              onChange={(e) => handleNameChange(index, e.target.value)}
            />
          </label>
        ))}
      </div>

      <button
        className="submit-btn"
        onClick={onDone}
        disabled={!players.every((p) => p.name.trim())}
      >
        Start Game
      </button>
    </form>
  );
}

export default Setup;
