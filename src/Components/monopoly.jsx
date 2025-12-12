// src/components/MonopolyScore.jsx
import React, { useState } from "react";
import { usePlayers } from "../Context/Player-context";
import "./styles.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleLeft } from "@fortawesome/free-solid-svg-icons";

export default function MonopolyScore({onBack}) {
  const { players } = usePlayers();

  // Example per‑player money; can be extended later
  const [money, setMoney] = useState(
    () => players.map(() => 1500) // starting money
  );

  const adjustMoney = (index, delta) => {
    setMoney((prev) =>
      prev.map((m, i) => (i === index ? m + delta : m))
    );
  };

  return (
    <div className="score-container">
      <div className="score-header">
        <button className="back-chip" onClick={onBack}>
            <FontAwesomeIcon icon={faAngleLeft} />
        </button>
        <h2>Monopoly</h2>
      </div>

      <table className="score-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Money</th>
            <th>+ / -</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => (
            <tr key={p.id}>
              <td>{p.name || `Player ${i + 1}`}</td>
              <td>{money[i]}</td>
              <td>
                <button
                  className="chip-btn"
                  onClick={() => adjustMoney(i, 50)}
                >
                  +50
                </button>
                <button
                  className="chip-btn"
                  onClick={() => adjustMoney(i, -50)}
                >
                  -50
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
