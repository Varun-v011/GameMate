// src/components/KempTeams.jsx
import React, { useState } from "react";
import { usePlayers } from "../Context/Player-context";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRedoAlt, faAngleLeft } from "@fortawesome/free-solid-svg-icons";


function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function KempTeams({onBack}) {
  const { players } = usePlayers();
  const [teams, setTeams] = useState([]);

  const makeTeams = () => {
    const shuffled = shuffleArray(players);
    const result = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      const p1 = shuffled[i];
      const p2 = shuffled[i + 1];
      if (p2) {
        result.push([p1, p2]);
      } else {
        // odd player out
        result.push([p1]);
      }
    }
    setTeams(result);
  };

  return (
    <div className="score-container">
      <div className="score-header">
      <button className="back-chip" onClick={onBack}>
      <FontAwesomeIcon icon={faAngleLeft} />
  </button>
        <h2>Kemp Teams</h2>
      </div>

      <div className="kemp-body">
        <button className="bottom-btn primary" onClick={makeTeams}>
            <FontAwesomeIcon icon={faRedoAlt} className="retry-icon" />
            <span>Reshuffle Teams</span>
        </button>


        <div className="teams-list">
          {teams.map((team, idx) => (
            <div key={idx} className="team-card">
              <h3>Team {idx + 1}</h3>
              <p>{team.map(p => p.name || "Unnamed").join(" & ")}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
