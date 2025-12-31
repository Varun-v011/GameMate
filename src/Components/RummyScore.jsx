import React, { useState, useEffect } from "react";
import "./styles.css";
import { usePlayers } from "../Context/Player-context";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleLeft } from "@fortawesome/free-solid-svg-icons";
import { collection, addDoc, onSnapshot, query, orderBy, limit } from "firebase/firestore"; // 🔥 ADDED
import { db } from "../firebase"; 

const STORAGE_KEY = "rummy-rows-final";

export default function Rummyscore({ onBack }) {
  const { players } = usePlayers();
  const [rows, setRows] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [cellValue, setCellValue] = useState("");
  const [mode, setMode] = useState("add");
  const [maxScore, setMaxScore] = useState(null);
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [roundScores, setRoundScores] = useState([]);
  const [showOptions, setShowOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [liveSync, setLiveSync] = useState(false); // 🔥 NEW: Track live updates

  // Helper functions for score calculations
  const playerTotal = (playerIndex) => {
    return rows.reduce((sum, row) => {
      const value = parseInt(row[playerIndex]) || 0;
      return sum + value;
    }, 0);
  };

  const isPlayerOut = (playerIndex) => {
    if (!maxScore) return false;
    return playerTotal(playerIndex) >= maxScore;
  };

  const remainingForPlayer = (playerIndex) => {
    if (!maxScore) return "—";
    const total = playerTotal(playerIndex);
    const remaining = maxScore - total;
    return remaining >= 0 ? remaining : "OUT";
  };

  // 🔥 NEW: LIVE MULTIPLAYER SYNC
  useEffect(() => {
    if (players.length === 0) return;
    
    console.log('🔴 LIVE SYNC: Listening for updates...');
    
    const q = query(
      collection(db, 'rummyGames'), 
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) return;
      
      const latestGame = snapshot.docs[0].data();
      console.log('🔴 LIVE UPDATE:', latestGame.totalRounds, 'rounds');
      
      // Only sync if player names match
      const playersMatch = latestGame.players.length === players.length &&
        latestGame.players.every((name, i) => name === players[i].name);
      
      if (playersMatch) {
        // Reconstruct rows from flat scores object
        const cloudRows = [];
        for (let r = 0; r < latestGame.totalRounds; r++) {
          const row = [];
          for (let p = 0; p < players.length; p++) {
            row.push(latestGame.scores[`round${r}_player${p}`] || "");
          }
          cloudRows.push(row);
        }
        
        setRows(cloudRows);
        setMaxScore(latestGame.maxScore || null);
        setLiveSync(true);
        
        setTimeout(() => setLiveSync(false), 2000); // Flash indicator
      }
    });
    
    return () => unsubscribe();
  }, [players]);

  // Load from localStorage (fallback)
  useEffect(() => {
    if (players.length > 0) {
      console.log("🔥 Rummy: Players loaded:", players.map(p => p.name));
      
      const savedRows = localStorage.getItem(`${STORAGE_KEY}-rows`);
      if (savedRows) {
        try {
          const parsedRows = JSON.parse(savedRows);
          const fixedRows = parsedRows.map(row => 
            Array(players.length).fill("").map((_, i) => row[i] || "")
          );
          setRows(fixedRows);
          console.log("✅ LOADED ROWS:", fixedRows.length);
        } catch (e) {
          console.log("❌ Rows parse error:", e);
        }
      }

      const savedMax = localStorage.getItem(`${STORAGE_KEY}-max`);
      if (savedMax) {
        setMaxScore(parseInt(savedMax) || null);
      }
    }
  }, [players]);

  useEffect(() => {
    if (players.length > 0 && rows.length > 0) {
      localStorage.setItem(`${STORAGE_KEY}-rows`, JSON.stringify(rows));
      console.log("💾 SAVED ROWS:", rows.length);
    }
  }, [rows, players.length]);

  useEffect(() => {
    if (players.length > 0 && maxScore !== null) {
      localStorage.setItem(`${STORAGE_KEY}-max`, maxScore.toString());
    }
  }, [maxScore, players.length]);

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

  const openRoundModal = () => {
    setRoundScores(Array(players.length).fill(""));
    setShowRoundModal(true);
  };

  const handleRoundScoreChange = (index, value) => {
    const next = [...roundScores];
    next[index] = value;
    setRoundScores(next);
  };

  const submitRound = async () => {
    console.log('🔥 SUBMIT CLICKED!');
    
    setSaving(true);
    
    let newRows = rows;
    if (mode === "add") {
      newRows = [...rows, roundScores.map((v) => v || "")];
      setRows(newRows);
    } else if (mode === "edit") {
      newRows = rows.map((r, i) => 
        i === rows.length - 1 ? roundScores.map((v) => v || "") : r
      );
      setRows(newRows);
    }

    const scoresObject = {};
    newRows.forEach((row, roundIndex) => {
      row.forEach((score, playerIndex) => {
        scoresObject[`round${roundIndex}_player${playerIndex}`] = score || "0";
      });
    });

    const playerTotals = {};
    players.forEach((player, index) => {
      const total = newRows.reduce((sum, row) => {
        return sum + (parseInt(row[index]) || 0);
      }, 0);
      playerTotals[player.name] = total;
    });

    const gameData = {
      players: players.map(p => p.name),
      playerIds: players.map(p => p.id),
      scores: scoresObject,
      maxScore: maxScore || 0,
      totalRounds: newRows.length,
      playerTotals: playerTotals,
      createdAt: new Date().toISOString(),
      timestamp: Date.now(),
      gameId: `rummy_${Date.now()}`
    };
    
    try {
      await addDoc(collection(db, 'rummyGames'), gameData);
      console.log('✅ SAVED TO CLOUD → ALL DEVICES UPDATE!');
    } catch (error) {
      console.error('❌ FIRESTORE ERROR:', error.message);
    }

    setSaving(false);
    setShowRoundModal(false);
  };

  return (
    <div className="score-container">
      <div className="score-header">
        <button className="back-chip" onClick={onBack}>
          <FontAwesomeIcon icon={faAngleLeft} />
        </button>
        <h2>Rummy</h2>
        
        {/* 🔥 NEW: Live sync indicator */}
        {liveSync && (
          <span className="live-indicator">🔴 LIVE</span>
        )}
        
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

      <div className="date-bar">
        <span>{new Date().toLocaleDateString()}</span>
      </div>

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

      <div className="bottom-buttons">
        <button className="bottom-btn primary" onClick={openRoundModal}>
          ENTER SCORE
        </button>
        <button
          className="bottom-btn secondary"
          onClick={() => {
            setMode("edit");
            const lastRow = rows[rows.length - 1] || [];
            setRoundScores(
              players.map((_, i) => String(lastRow[i] ?? ""))
            );
            setShowRoundModal(true);
          }}
        >
          EDIT SCORE
        </button>
      </div>

      {showRoundModal && (
        <div className="round-modal-backdrop">
          <div className="round-modal">
            <div className="round-modal-header">
              <button className="back-btn" onClick={() => setShowRoundModal(false)}>
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
                      onChange={(e) => handleRoundScoreChange(index, e.target.value)}
                    />
                  </div>
                  {showOptions && (
                    <div className="round-options">
                      <button className="chip green" onClick={() => handleRoundScoreChange(index, "0")}>
                        Show
                      </button>
                      <button className="chip yellow" onClick={() => handleRoundScoreChange(index, "20")}>
                        Drop
                      </button>
                      <button className="chip yellow" onClick={() => handleRoundScoreChange(index, "50")}>
                        M Drop
                      </button>
                      <button className="chip purple" onClick={() => handleRoundScoreChange(index, "80")}>
                        Full
                      </button>
                      <button className="chip red" onClick={() => handleRoundScoreChange(index, "")}>
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
            <button 
              className="submit-btn-modal" 
              onClick={submitRound}
              disabled={saving}
            >
              {saving ? 'SAVING...' : 'SUBMIT'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
