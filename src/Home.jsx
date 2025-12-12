// src/Home.jsx
import React from "react";
import "./App.css";

function Home({ onGoRummy, onGoPoker, onGoMonopoly, onGoKemp, onGoTournament, onGoToSetup }) {
  return (
    <div className="home">
      <h1 className="home-title">Game Notes</h1>
      <div className="home-buttons">
        <button className="home-btn rummy" onClick={onGoRummy}>
          Rummy
        </button>
        <button className="home-btn poker" onClick={onGoPoker}>
          Poker
        </button>
        <button className="home-btn monopoly" onClick={onGoMonopoly}>
          Monopoly
        </button>
        <button className="home-btn kemp" onClick={onGoKemp}>
          Kemp
        </button>
        <button className="home-btn tournament">
          Tournament
        </button>
        <br></br>
        <br></br>
        <button className="home-btn players" onClick={onGoToSetup}>
          Players
        </button>
      </div>
    </div>
  );
}

export default Home;
