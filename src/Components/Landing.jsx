// src/components/Landing.jsx
import React from "react";


function Landing({ onGoToSetup}) {
  return (
    <div className="landing">
      <h1>Game Notes</h1>
      <p>Track Rummy and other game scores with your friends.</p>

      <div className="landing-buttons">
        <button onClick={onGoToSetup}>
          Add / Edit Players
        </button>
      </div>
    </div>
  );
}

export default Landing;
