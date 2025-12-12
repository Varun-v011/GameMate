// src/components/Poker.jsx
import React, { useState } from "react";
import { usePlayers } from "../Context/Player-context";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleLeft, faCircleInfo } from "@fortawesome/free-solid-svg-icons";
import "./styles.css";
import pokerimage from '../assests/poker-hand-rankings-chart-cheat-sheet.webp';

export default function Poker({ onBack }) {
  const { players } = usePlayers();

  const [whiteTotal, setWhiteTotal] = useState("");
  const [redTotal, setRedTotal] = useState("");
  const [blackTotal, setBlackTotal] = useState("");
  const [perPlayer, setPerPlayer] = useState(null);
  const [showInfo, setShowInfo] = useState(false);   // NEW

  const handleDivide = (e) => {
    e.preventDefault();
    if (!players.length) return;

    const w = Number(whiteTotal) || 0;
    const r = Number(redTotal) || 0;
    const b = Number(blackTotal) || 0;
    const n = players.length;

    setPerPlayer({
      white: { each: Math.floor(w / n), leftover: w % n },
      red:   { each: Math.floor(r / n), leftover: r % n },
      black: { each: Math.floor(b / n), leftover: b % n },
    });
  };

  return (
    <div className="score-container">
      <div className="score-header">
        <button className="back-chip" onClick={onBack}>
          <FontAwesomeIcon icon={faAngleLeft} />
        </button>
        <h2>Poker Chips</h2>
        <button className="info-btn" onClick={() => setShowInfo(true)}>
          <FontAwesomeIcon icon={faCircleInfo} />
        </button>
      </div>

      <form className="setup-form" onSubmit={handleDivide}>
        <label>
          Total White Chips:
          <input
            type="number"
            value={whiteTotal}
            onChange={(e) => setWhiteTotal(e.target.value)}
          />
        </label>
        <label>
          Total Red Chips:
          <input
            type="number"
            value={redTotal}
            onChange={(e) => setRedTotal(e.target.value)}
          />
        </label>
        <label>
          Total Black Chips:
          <input
            type="number"
            value={blackTotal}
            onChange={(e) => setBlackTotal(e.target.value)}
          />
        </label>

        <button type="submit" className="submit-btn" disabled={!players.length}>
          Divide Chips
        </button>
      </form>

      {perPlayer && (
        <div className="poker-results">
          <h3>Per Player</h3>
          <table className="score-table compact">
            <thead>
              <tr>
                <th>Player</th>
                <th>White</th>
                <th>Red</th>
                <th>Black</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id}>
                  <td>{p.name || "Player"}</td>
                  <td>{perPlayer.white.each}</td>
                  <td>{perPlayer.red.each}</td>
                  <td>{perPlayer.black.each}</td>
                </tr>
              ))}
              <tr>
                <td>Leftover</td>
                <td>{perPlayer.white.leftover}</td>
                <td>{perPlayer.red.leftover}</td>
                <td>{perPlayer.black.leftover}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {showInfo && (
        <div
          className="image-modal-backdrop"
          onClick={() => setShowInfo(false)}
        >
          <div className="image-modal" onClick={(e) => e.stopPropagation()}>
            <img
              src={pokerimage}
              alt="Chip values"
              className="image-modal-img"
            />
          </div>
        </div>
      )}
    </div>
  );
}
