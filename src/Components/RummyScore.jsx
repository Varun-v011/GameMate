import React, { useState, useEffect } from "react";
import "./styles.css";
import { usePlayers } from "../Context/Player-context";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleLeft } from "@fortawesome/free-solid-svg-icons";
import { collection, addDoc } from "firebase/firestore"; 
import { db } from "../firebase"; 

const STORAGE_KEY = "rummy-rows-final";

// Helper function with longer timeout for slow networks
const withTimeout = (promise, timeoutMs = 30000) => { // 30 seconds instead of 10
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Operation timed out after ' + timeoutMs + 'ms')), timeoutMs)
    )
  ]);
};

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
    const startTime = Date.now();
    
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

    // Convert nested arrays to flat object structure (Firestore requirement)
    const scoresObject = {};
    newRows.forEach((row, roundIndex) => {
      row.forEach((score, playerIndex) => {
        scoresObject[`round${roundIndex}_player${playerIndex}`] = score || "0";
      });
    });

    // Calculate totals for each player
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
    
    console.log('📤 SENDING TO FIRESTORE:', gameData);

    try {
      console.log('⏳ Attempting to write (30s timeout for slow networks)...');
      
      // 30 second timeout for slow networks
      const docRef = await withTimeout(
        addDoc(collection(db, 'rummyGames'), gameData),
        30000
      );
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ SUCCESS in ${elapsed}ms! Document ID:`, docRef.id);
      
      let message = `✅ Game saved successfully!\n\nDocument ID: ${docRef.id}\nTime: ${elapsed}ms`;
      if (elapsed > 5000) {
        message += '\n\n⚠️ Note: Save took longer than 5 seconds. Your network may be slow.';
      }
      alert(message);
      
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`❌ FIRESTORE ERROR after ${elapsed}ms:`, error);
      
      let userMessage = '❌ Failed to save:\n\n';
      
      if (error.message.includes('timed out')) {
        userMessage += `Request timed out after ${elapsed}ms.\n\n`;
        userMessage += 'Possible causes:\n';
        userMessage += '• Slow/unstable internet connection\n';
        userMessage += '• Firewall blocking Firebase\n';
        userMessage += '• Network throttling in DevTools\n';
        userMessage += '• Browser extension blocking request\n\n';
        userMessage += 'Try:\n';
        userMessage += '1. Check your internet connection\n';
        userMessage += '2. Try incognito/private mode\n';
        userMessage += '3. Disable browser extensions\n';
        userMessage += '4. Check Network tab in DevTools (F12)';
      } else if (error.code === 'permission-denied') {
        userMessage += 'Permission denied.\n\n';
        userMessage += 'Check your Firestore security rules in Firebase Console.';
      } else if (error.code === 'unavailable') {
        userMessage += 'Firestore service unavailable.\n\n';
        userMessage += 'Firebase servers may be down or unreachable.';
      } else {
        userMessage += error.message || 'Unknown error';
      }
      
      alert(userMessage);
      console.error('Full error:', error);
      
    } finally {
      setSaving(false);
      setShowRoundModal(false);
    }
  };

  return (
    <div className="score-container">
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
        <button 
          className="bottom-btn secondary"
          onClick={async () => {
            console.log('🧪 NETWORK DIAGNOSTIC TEST...');
            const startTime = Date.now();
            
            try {
              const testData = { 
                message: 'Network diagnostic test',
                timestamp: Date.now()
              };
              
              console.log('📤 Testing connection with 30s timeout...');
              
              const docRef = await withTimeout(
                addDoc(collection(db, 'test'), testData),
                30000
              );
              
              const elapsed = Date.now() - startTime;
              console.log(`✅ SUCCESS in ${elapsed}ms! Doc ID:`, docRef.id);
              
              let message = `✅ Firebase connection OK!\n\n`;
              message += `Response time: ${elapsed}ms\n`;
              message += `Document ID: ${docRef.id}\n\n`;
              
              if (elapsed < 500) {
                message += '🚀 Excellent connection speed!';
              } else if (elapsed < 2000) {
                message += '✅ Good connection speed.';
              } else if (elapsed < 5000) {
                message += '⚠️ Slow connection (2-5s). Network may be congested.';
              } else if (elapsed < 10000) {
                message += '⚠️ Very slow connection (5-10s). Check your internet.';
              } else {
                message += '❌ Extremely slow (>10s). Major network issues.';
              }
              
              alert(message);
              
            } catch (error) {
              const elapsed = Date.now() - startTime;
              console.error(`❌ TEST FAILED after ${elapsed}ms:`, error);
              
              let message = `❌ Connection test failed!\n\n`;
              message += `Timeout after: ${elapsed}ms\n`;
              message += `Error: ${error.message}\n\n`;
              message += 'Check:\n';
              message += '• Internet connection\n';
              message += '• Network tab in DevTools (F12)\n';
              message += '• Firewall/antivirus settings\n';
              message += '• Browser extensions';
              
              alert(message);
            }
          }}
        >
          Test Network
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