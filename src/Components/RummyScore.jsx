import React, { useState, useEffect } from "react";
import "./styles.css";
import { usePlayers } from "../Context/Player-context";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleLeft } from "@fortawesome/free-solid-svg-icons";
import { collection, addDoc, onSnapshot, query, orderBy, limit, where } from "firebase/firestore";
import { db } from "../firebase"; 

const STORAGE_KEY = "rummy-rows-final";

// 🔥 NEW: Generate 4-character room code (2 letters + 2 numbers)
const generateRoomCode = () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  
  const letter1 = letters[Math.floor(Math.random() * letters.length)];
  const letter2 = letters[Math.floor(Math.random() * letters.length)];
  const num1 = numbers[Math.floor(Math.random() * numbers.length)];
  const num2 = numbers[Math.floor(Math.random() * numbers.length)];
  
  return `${letter1}${letter2}${num1}${num2}`;
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
  const [liveSync, setLiveSync] = useState(false);
  const [gameRoom, setGameRoom] = useState(null);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomInput, setRoomInput] = useState("");
  const [justJoinedRoom, setJustJoinedRoom] = useState(false);
  const [isViewer, setIsViewer] = useState(false);
  const [viewerPlayers, setViewerPlayers] = useState([]);

  // Initialize or load game room
  useEffect(() => {
    const storedRoom = localStorage.getItem('rummyGameRoom');
    const joined = localStorage.getItem('justJoinedRoom');
    const viewerMode = localStorage.getItem('viewerMode');
    
    if (viewerMode === 'true') {
      setIsViewer(true);
      console.log('👁️ Viewer mode active');
    }
    
    if (joined === 'true') {
      setJustJoinedRoom(true);
      localStorage.removeItem('justJoinedRoom');
      console.log('🔄 Just joined room - skipping localStorage');
    }
    
    if (storedRoom) {
      setGameRoom(storedRoom);
      console.log('🎮 Room:', storedRoom, viewerMode === 'true' ? '(viewer)' : '(host)');
    } else {
      const newRoom = generateRoomCode(); // 🔥 CHANGED
      localStorage.setItem('rummyGameRoom', newRoom);
      setGameRoom(newRoom);
      console.log('🎮 Created room:', newRoom);
    }
  }, []);

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

  // LIVE SYNC for both host and viewer
  useEffect(() => {
    if (!gameRoom) return;
    
    if (!isViewer && players.length === 0) {
      console.log('⏸️ Host waiting for players...');
      return;
    }
    
    console.log('🔴 LIVE SYNC:', isViewer ? 'Viewer mode' : 'Host mode', gameRoom);
    
    const q = query(
      collection(db, 'rummyGames'),
      where('gameId', '==', gameRoom),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        console.log('📭 No games in this room yet');
        return;
      }
      
      const latestGame = snapshot.docs[0].data();
      console.log('🔴 LIVE UPDATE:', latestGame.totalRounds, 'rounds', latestGame.players);
      
      if (isViewer) {
        const cloudRows = [];
        for (let r = 0; r < latestGame.totalRounds; r++) {
          const row = [];
          for (let p = 0; p < latestGame.players.length; p++) {
            row.push(latestGame.scores[`round${r}_player${p}`] || "");
          }
          cloudRows.push(row);
        }
        
        console.log('👁️ VIEWER LOADED:', cloudRows.length, 'rounds');
        setRows(cloudRows);
        setMaxScore(latestGame.maxScore || null);
        setViewerPlayers(latestGame.players);
        setLiveSync(true);
        
        setTimeout(() => setLiveSync(false), 2000);
      } else {
        const playersMatch = latestGame.players.length === players.length &&
          latestGame.players.every((name, i) => name === players[i].name);
        
        if (playersMatch) {
          const cloudRows = [];
          for (let r = 0; r < latestGame.totalRounds; r++) {
            const row = [];
            for (let p = 0; p < players.length; p++) {
              row.push(latestGame.scores[`round${r}_player${p}`] || "");
            }
            cloudRows.push(row);
          }
          
          console.log('🎮 HOST LOADED:', cloudRows.length, 'rounds');
          setRows(cloudRows);
          setMaxScore(latestGame.maxScore || null);
          setLiveSync(true);
          
          setTimeout(() => setLiveSync(false), 2000);
        } else {
          console.log('⚠️ Player mismatch - not syncing');
        }
      }
    });
    
    return () => unsubscribe();
  }, [gameRoom, players, isViewer]);

  // Load from localStorage (only for host, not viewer)
  useEffect(() => {
    if (isViewer || players.length === 0 || justJoinedRoom) {
      console.log("⏭️ Skipping localStorage");
      return;
    }
    
    console.log("🔥 Rummy: Players loaded:", players.map(p => p.name));
    
    const timer = setTimeout(() => {
      if (rows.length === 0) {
        const savedRows = localStorage.getItem(`${STORAGE_KEY}-rows`);
        if (savedRows) {
          try {
            const parsedRows = JSON.parse(savedRows);
            const fixedRows = parsedRows.map(row => 
              Array(players.length).fill("").map((_, i) => row[i] || "")
            );
            setRows(fixedRows);
            console.log("✅ LOADED FROM LOCALSTORAGE (fallback):", fixedRows.length);
          } catch (e) {
            console.log("❌ Rows parse error:", e);
          }
        }

        const savedMax = localStorage.getItem(`${STORAGE_KEY}-max`);
        if (savedMax) {
          setMaxScore(parseInt(savedMax) || null);
        }
      } else {
        console.log("✅ Cloud data loaded, skipping localStorage");
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [players, justJoinedRoom, rows.length, isViewer]);

  useEffect(() => {
    if (!isViewer && players.length > 0 && rows.length > 0) {
      localStorage.setItem(`${STORAGE_KEY}-rows`, JSON.stringify(rows));
      console.log("💾 SAVED ROWS:", rows.length);
    }
  }, [rows, players.length, isViewer]);

  useEffect(() => {
    if (!isViewer && players.length > 0 && maxScore !== null) {
      localStorage.setItem(`${STORAGE_KEY}-max`, maxScore.toString());
    }
  }, [maxScore, players.length, isViewer]);

  const handleCellClick = (rIndex, cIndex) => {
    if (!isEditing || isViewer) return;
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

  const joinRoom = () => {
    if (!roomInput.trim()) {
      alert('Please enter a room code');
      return;
    }
    const roomCode = roomInput.trim().toUpperCase();
    
    localStorage.removeItem(`${STORAGE_KEY}-rows`);
    localStorage.removeItem(`${STORAGE_KEY}-max`);
    
    localStorage.setItem('rummyGameRoom', roomCode);
    localStorage.setItem('viewerMode', 'true');
    localStorage.setItem('justJoinedRoom', 'true');
    
    setGameRoom(roomCode);
    setIsViewer(true);
    setShowRoomModal(false);
    setRoomInput("");
    
    console.log('👁️ Joining as VIEWER:', roomCode);
    alert(`Viewing room: ${roomCode}\n\nYou're in VIEWER mode (read-only)\nScores will update automatically!`);
    
    window.location.reload();
  };

  const createNewRoom = () => {
    localStorage.removeItem(`${STORAGE_KEY}-rows`);
    localStorage.removeItem(`${STORAGE_KEY}-max`);
    localStorage.removeItem('viewerMode');
    
    const newRoom = generateRoomCode(); // 🔥 CHANGED
    localStorage.setItem('rummyGameRoom', newRoom);
    localStorage.setItem('justJoinedRoom', 'true');
    
    setGameRoom(newRoom);
    setIsViewer(false);
    setShowRoomModal(false);
    
    console.log('🎮 Created new room:', newRoom);
    window.location.reload();
  };

  const exitViewerMode = () => {
    localStorage.removeItem('viewerMode');
    localStorage.removeItem('rummyGameRoom');
    setIsViewer(false);
    alert('Exited viewer mode!\nCreate your own game or join as host.');
    window.location.reload();
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
      gameId: gameRoom
    };
    
    try {
      await addDoc(collection(db, 'rummyGames'), gameData);
      console.log('✅ SAVED TO ROOM:', gameRoom);
    } catch (error) {
      console.error('❌ FIRESTORE ERROR:', error.message);
    }

    setSaving(false);
    setShowRoundModal(false);
  };

  const displayPlayers = isViewer ? viewerPlayers.map((name, i) => ({ name, id: i })) : players;

  return (
    <div className="score-container">
      <div className="score-header">
        <button className="back-chip" onClick={onBack}>
          <FontAwesomeIcon icon={faAngleLeft} />
        </button>
        <h2>Rummy {isViewer && '👁️'}</h2>
        
        {liveSync && (
          <span className="live-indicator">🔴 LIVE</span>
        )}
        
        <button
          className="room-btn"
          onClick={() => setShowRoomModal(true)}
          title="Multiplayer Room"
        >
          🎮
        </button>
        
        {!isViewer && (
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
        )}
      </div>

      <div className="date-bar">
        <span>{new Date().toLocaleDateString()}</span>
        {isViewer && (
          <span style={{color: '#4CAF50', fontSize: '12px', fontWeight: 'bold', marginLeft: '8px'}}>
            VIEWER MODE
          </span>
        )}
        <span 
          className="room-code"
          onClick={() => {
            navigator.clipboard?.writeText(gameRoom);
            alert(`Room code copied: ${gameRoom}\nShare with other players!`);
          }}
          style={{cursor: 'pointer', fontSize: '13px', color: '#666', fontWeight: 'bold'}}
        >
          Room: {gameRoom} 📋  {/* 🔥 REMOVED .slice(-6) */}
        </span>
      </div>

      {isViewer && rows.length === 0 && (
        <div style={{textAlign: 'center', padding: '40px', color: '#999'}}>
          <p>🔴 Waiting for host to start game...</p>
          <p style={{fontSize: '12px', marginTop: '8px'}}>Room: {gameRoom}</p>
        </div>
      )}

      <div className="score-table-container tall">
        <table className="score-table compact">
          <thead>
            <tr>
              {displayPlayers.map((p, i) => (
                <th
                  key={p.id || i}
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
            {displayPlayers.length > 0 && (
              <tr className="remaining-row">
                {displayPlayers.map((_, index) => (
                  <td
                    key={index}
                    className={`remaining-cell ${isPlayerOut(index) ? "out" : ""}`}
                  >
                    {remainingForPlayer(index)}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!isViewer && (
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
      )}

      {showRoundModal && !isViewer && (
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

      {showRoomModal && (
        <div className="round-modal-backdrop">
          <div className="round-modal room-modal">
            <div className="round-modal-header">
              <button className="back-btn" onClick={() => setShowRoomModal(false)}>
                ←
              </button>
              <h3>Multiplayer Room</h3>
            </div>
            
            <div className="room-modal-body">
              <div className="current-room">
                <p style={{fontSize: '14px', color: '#666', marginBottom: '10px'}}>
                  Current Room:
                </p>
                <div 
                  className="room-code-display"
                  onClick={() => {
                    navigator.clipboard?.writeText(gameRoom);
                    alert(`Copied: ${gameRoom}\nShare with other players!`);
                  }}
                >
                  {gameRoom}
                  <span style={{marginLeft: '8px'}}>📋</span>
                </div>
                <p style={{fontSize: '12px', color: '#999', marginTop: '8px'}}>
                  Tap to copy & share with players
                </p>
              </div>

              <div className="room-divider">OR</div>

              <div className="join-room">
                <input
                  className="room-input"
                  placeholder="Enter room code to VIEW"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
                />
                <button 
                  className="submit-btn-modal"
                  onClick={joinRoom}
                >
                  JOIN AS VIEWER
                </button>
              </div>

              <div className="room-divider">OR</div>

              <button 
                className="submit-btn-modal secondary-btn"
                onClick={createNewRoom}
              >
                CREATE NEW ROOM
              </button>

              {isViewer && (
                <>
                  <div className="room-divider">Current Mode</div>
                  <button 
                    className="submit-btn-modal"
                    onClick={exitViewerMode}
                    style={{background: '#ff5252'}}
                  >
                    EXIT VIEWER MODE
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
