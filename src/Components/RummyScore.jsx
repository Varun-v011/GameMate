import React, { useState, useEffect } from "react";
import "./styles.css";
import { usePlayers } from "../Context/Player-context";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleLeft } from "@fortawesome/free-solid-svg-icons";

        

export default function Rummyscore({ onBack }) {
  const { players } = usePlayers();

  // main grid
  const [rows, setRows] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // {row, col}
  const [cellValue, setCellValue] = useState("");
  const [mode, setMode] = useState("add"); // "add" | "edit"
  const [maxScore, setMaxScore] = useState(null);   // user‑set



  // round modal
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [roundScores, setRoundScores] = useState([]);
  const [showOptions, setShowOptions] = useState(true);

  // re-init when players change
  useEffect(() => {
    if (players.length > 0) {
      setRows([]);
      setRoundScores(Array(players.length).fill("")); // init modal scores
    }
  }, [players]);

  const handleCellClick = (rIndex, cIndex) => {
    if (!isEditing) return;
    setEditingCell({ row: rIndex, col: cIndex });
    setCellValue(rows[rIndex][cIndex] ?? "");
  };

  const handleCellChange = (e) => setCellValue(e.target.value);

  const saveCell = () => {
    if (!editingCell) return;
    const next = rows.map((row) => [...row]);
    next[editingCell.row][editingCell.col] = cellValue;
    setRows(next);
    setEditingCell(null);
    setCellValue("");
  };

  const addRow = () => {
    setRows((prev) => [...prev, [...Array(players.length)].map(() => "")]);
  };

  // ---- popup logic ----
  const openRoundModal = () => {
    setRoundScores(Array(players.length).fill(""));
    setShowRoundModal(true);
  };

  const handleRoundScoreChange = (index, value) => {
    const next = [...roundScores];
    next[index] = value;
    setRoundScores(next);
  };

  const submitRound = () => {
    if (mode === "add") {
      // append new row
      setRows((prev) => [...prev, roundScores.map((v) => v || "")]);
    } else if (mode === "edit") {
      // overwrite LAST row only
      setRows((prev) => {
        if (!prev.length) return prev;
        const copy = prev.map((r) => [...r]);
        copy[copy.length - 1] = roundScores.map((v) => v || "");
        return copy;
      });
    }
    setShowRoundModal(false);
  };

  const playerTotal = (index) =>
    rows.reduce((sum, row) => {
      const v = Number(row[index] || 0);
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
  
  const remainingForPlayer = (index) => {
    if (!maxScore) return "";           // no max score set yet
    const left = maxScore - playerTotal(index);
    return left > 0 ? left : 0;         // 0 or more
  };
  
  const isPlayerOut = (index) => {
    if (!maxScore) return false;
    return playerTotal(index) >= maxScore;
  };
      

  return (
    <div className="score-container">
      {/* header */}
      <div className="score-header">
      <button className="back-chip" onClick={onBack}>
      <FontAwesomeIcon icon={faAngleLeft} />
  </button>
        <h2>Rummy</h2>
        <button
    className="set-max-btn"
    onClick={() => {
      const value = window.prompt("Set total / max score for this game:");
      if (!value) return;
      const n = Number(value);
      if (!isNaN(n) && n > 0) {
        setMaxScore(n);
      } else {
        alert("Please enter a valid positive number");
      }
    }}
  >
    {maxScore ? `Max: ${maxScore}` : "Set Max"}
  </button>
      </div>

      {/* date bar */}
      <div className="date-bar">
        <span>{new Date().toLocaleDateString()}</span>
      </div>

      {/* table */}
      <div className="score-table-container tall">
        <table className="score-table compact">
          <thead>
            <tr>
    {players.map((p, i) => (
      <th
        key={p.id}
        className={`player-header ${isPlayerOut(i) ? "out-player" : ""}`}
      >
        {p.name || `Player ${i + 1}`}
      </th>
    ))}
  </tr>
          </thead>
          <tbody>
  {rows.map((row, rIndex) => (
    <tr key={rIndex}>
      {row.map((value, cIndex) => (
        <td
          key={cIndex}
          className="score-cell touch"
          onClick={() => handleCellClick(rIndex, cIndex)}
        >
          {editingCell &&
          editingCell.row === rIndex &&
          editingCell.col === cIndex ? (
            <input
              className="score-input center"
              autoFocus
              value={cellValue}
              onChange={handleCellChange}
              onBlur={saveCell}
              onKeyDown={(e) => e.key === "Enter" && saveCell()}
            />
          ) : (
            value || ""
          )}
        </td>
      ))}
    </tr>
  ))}

  {/* Remaining / difference row */}
  <tr className="remaining-row">
    {players.map((_, index) => (
      <td
        key={index}
        className={`remaining-cell ${isPlayerOut(index) ? "out" : ""}`}
      >
        {remainingForPlayer(index)}
      </td>
    ))}
  </tr>
</tbody>

        </table>
      </div>

      {/* bottom buttons */}
      <div className="bottom-buttons">
        <button
          className="bottom-btn primary"
          onClick={openRoundModal} // open popup
        >
          ENTER SCORE
        </button>
        <button
    className="bottom-btn secondary"
    onClick={() => {
      setMode("edit");
      // preload last row into modal
      const lastRow = rows[rows.length - 1] || [];
      setRoundScores(
        players.map((_, i) => String(lastRow[i] ?? ""))
      );
      setShowRoundModal(true);
    }}>
          EDIT SCORE
        </button>
      </div>

      {/* ---- Add Round Scores popup ---- */}
      {showRoundModal && (
        <div className="round-modal-backdrop">
          <div className="round-modal">
            <div className="round-modal-header">
              <button
                className="back-btn"
                onClick={() => setShowRoundModal(false)}
              >
                ←
              </button>
              <h3>Add Round Scores</h3>
            </div>

            <div className="round-modal-body">
              {players.map((player, index) => (
                <div key={player.id} className="round-card">
                  <div className="round-card-top">
                    <div>
                      <div className="round-player-name">
                        {player.name || `Player ${index + 1}`}
                      </div>
                      <div className="round-player-score">
                        Score: {playerTotal(index)}
                      </div>
                    </div>
                    <input
                      className="round-score-input"
                      placeholder="Score"
                      value={roundScores[index]}
                      onChange={(e) =>
                        handleRoundScoreChange(index, e.target.value)
                      }
                    />
                  </div>

                  {showOptions && (
                    <div className="round-options">
                      <button
                        className="chip green"
                        onClick={() => handleRoundScoreChange(index, "0")}
                      >
                        Show
                      </button>
                      <button
                        className="chip yellow"
                        onClick={() => handleRoundScoreChange(index, "20")}
                      >
                        Drop
                      </button>
                      <button
                        className="chip yellow"
                        onClick={() => handleRoundScoreChange(index, "50")}
                      >
                        M Drop
                      </button>
                      <button
                        className="chip purple"
                        onClick={() => handleRoundScoreChange(index, "80")}
                      >
                        Full
                      </button>
                      <button
                        className="chip red"
                        onClick={() => handleRoundScoreChange(index, "")}
                      >
                        Out
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <label className="options-toggle">
              <input
                type="checkbox"
                checked={showOptions}
                onChange={(e) => setShowOptions(e.target.checked)}
              />
              Show Score Options?
            </label>

            <button className="submit-btn-modal" onClick={submitRound}>
              SUBMIT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
