// PizzaDeliveryGame.jsx
import React, { useState, useEffect, useRef  } from "react";
import "./PizzaDeliveryGame.css";
import { useParams, useSearchParams } from "react-router-dom";
import { useLocation } from "react-router-dom";

const BOARD_SIZE = 7;
const TEAMS = ["red", "blue", "green", "yellow"];
const AVAILABLE_COLORS = [
  "#DC143C",
  "#FFD700",
  "purple",
  "orange",
  "pink",
  "#6A5ACD",
  "#ADFF2F",
  "#48D1CC",
];

const getCenter = () => Math.floor(BOARD_SIZE / 2);

const initialTeamPositions = TEAMS.reduce((acc, team) => {
  acc[team] = { row: getCenter(), col: getCenter() };
  return acc;
}, {});

const initialScores = TEAMS.reduce((acc, team) => {
  acc[team] = 0;
  return acc;
}, {});

const generateDeliveries = (count, existing = [], teamPositions = {}) => {
  const deliveries = [...existing];
  while (deliveries.length < count) {
    const row = Math.floor(Math.random() * BOARD_SIZE);
    const col = Math.floor(Math.random() * BOARD_SIZE);
    const occupied = deliveries.some((d) => d.row === row && d.col === col);
    const isCenter = row === getCenter() && col === getCenter();
    const occupiedByTeam = Object.values(teamPositions).some(
      (pos) => pos.row === row && pos.col === col
    );
    if (!occupied && !isCenter && !occupiedByTeam) {
      deliveries.push({ row, col });
    }
  }
  return deliveries;
};

const generateRandomObstaclePosition = (deliveries, obstacles, teamPositions) => {
  let row, col;
  do {
    row = Math.floor(Math.random() * BOARD_SIZE);
    col = Math.floor(Math.random() * BOARD_SIZE);
  } while (
    (row === getCenter() && col === getCenter()) ||
    deliveries.some((d) => d.row === row && d.col === col) ||
    obstacles.some((o) => o.row === row && o.col === col) ||
    Object.values(teamPositions).some((pos) => pos.row === row && pos.col === col)
  );
  return { row, col };
};

const PizzaDeliveryGame = () => {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [revealedAnswers, setRevealedAnswers] = useState({});
  const [showConfig, setShowConfig] = useState(false);
  //const { id } = useParams();
  //const modoLibre = !id;
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [obstacles, setObstacles] = useState([]);
  const [deliveriesCompleted, setDeliveriesCompleted] = useState(0);

  const handleShowAnswer = (index) => {
    setRevealedAnswers((prev) => ({ ...prev, [index]: true }));
  };

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const id = queryParams.get("themes"); // reemplaza "id" por este
  const modoLibre = !id;

  const didFetchRef = useRef(false);
  useEffect(() => {
    const themeParams = queryParams.getAll("themes"); // array con todos los temas
    const modoLibre = themeParams.length === 0;
    if (modoLibre || didFetchRef.current) return;
  
    const fetchQuestions = async () => {
      try {
        const query = themeParams.map(t => `themes=${t}`).join("&");
        const url = `http://148.206.168.178/vaep/api/v1/question/theme?${query}`;
  
        const response = await fetch(url);
        const data = await response.json();
  
        const themeData = Array.isArray(data.data) ? data.data : [data.data];
  
        const openQs = themeData.flatMap((item) =>
          item.openQuestions.map((q) => ({
            type: "open",
            question: q.question,
            answer: q.answer,
          }))
        );
  
        const mcQs = themeData.flatMap((item) =>
          item.multipleChoiceQuestions.map((q) => ({
            type: "mc",
            question: q.question,
            options: q.answers,
            correctAnswer: q.correctAnswer,
          }))
        );
  
        setQuestions([...openQs, ...mcQs]);
        console.log("Preguntas cargadas:", [...openQs, ...mcQs]);
      } catch (error) {
        console.error("Error al cargar preguntas:", error);
      }
    };
  
    fetchQuestions();
    didFetchRef.current = true;
  }, []);
  
  useEffect(() => {
    if (deliveriesCompleted > 0 && deliveriesCompleted % 2 === 0) {
      const newObstacle = generateRandomObstaclePosition(deliveries, obstacles, teamPositions);
      setObstacles((prev) => [...prev, newObstacle]);
    }
  }, [deliveriesCompleted]);

  const [teamPositions, setTeamPositions] = useState(initialTeamPositions);
  const [deliveries, setDeliveries] = useState(() => {
    return generateDeliveries(5, [], initialTeamPositions);
  });
  const [teamScores, setTeamScores] = useState(initialScores);

  const [teamNames, setTeamNames] = useState({
    red: "Equipo 1",
    blue: "Equipo 2",
    green: "Equipo 3",
    yellow: "Equipo 4",
  });

  const [teamColors, setTeamColors] = useState({
    red: "red",
    blue: "blue",
    green: "green",
    yellow: "yellow",
  });

  const [colorPickerOpen, setColorPickerOpen] = useState(null); // equipo que está eligiendo color

  /* const currentTurnIndexState = useState(0);
  const currentTurnIndex = currentTurnIndexState[0];
  const setCurrentTurnIndex = currentTurnIndexState[1]; */

  const [canMove, setCanMove] = useState(false);

  /* const currentTeam = TEAMS[currentTurnIndex]; */
  const currentTeam = selectedTeam;

  const handleCellClick = (row, col) => {
    if (!canMove) return;
    if (!currentTeam) return; // no seleccionado aún

    const position = teamPositions[currentTeam];
    if (!position) return;

    const { row: currentRow, col: currentCol } = teamPositions[currentTeam];
    const isValidMove =
      Math.abs(currentRow - row) <= 1 && Math.abs(currentCol - col) <= 1;

    if (!isValidMove || (currentRow === row && currentCol === col)) return;

    const delivered = deliveries.find((d) => d.row === row && d.col === col);
    const blocked = obstacles.some((o) => o.row === row && o.col === col);
    if (blocked) return;

    const newPosition = { row, col };

    setTeamPositions((prev) => ({
      ...prev,
      [currentTeam]: newPosition,
    }));

    if (delivered) {
      setTeamScores((prev) => ({
        ...prev,
        [currentTeam]: prev[currentTeam] + 1,
      }));

      setDeliveriesCompleted((prev) => prev + 1);

      setDeliveries((prev) => {
        const updated = prev.filter((d) => !(d.row === row && d.col === col));
        return generateDeliveries(5, updated, {
          ...teamPositions,
          [currentTeam]: newPosition,
        });
      });
    }

    setCanMove(false);
    /*     setCurrentTurnIndex((prev) => (prev + 1) % TEAMS.length);*/
    setSelectedTeam(null);
    setCurrentQuestionIndex((prev) => prev + 1);
  };

  const handleMultipleChoice = (selected) => {
    const current = questions[currentQuestionIndex];
    const isCorrect = selected === current.correctAnswer;
    confirmAnswer(isCorrect);
  };

  const handleTeamNameClick = (team) => {
    if (!canMove) {
      setSelectedTeam(team);
    }
  };

  const confirmAnswer = (isCorrect) => {
    if (isCorrect) {
      if (!selectedTeam) {
        alert("Por favor, selecciona un equipo antes de mover.");
        return;
      }
      setCanMove(true);
    } else {
      /* setCurrentTurnIndex((prev) => (prev + 1) % TEAMS.length);
      setCurrentQuestionIndex((prev) => prev + 1); */
      setSelectedTeam(null);
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const getValidMoves = () => {
    if (!canMove || !currentTeam) return [];
    const position = teamPositions[currentTeam];
    if (!position) return [];

    const { row, col } = teamPositions[currentTeam];
    const moves = [];

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;

        const newRow = row + dr;
        const newCol = col + dc;

        const withinBounds =
          newRow >= 0 &&
          newRow < BOARD_SIZE &&
          newCol >= 0 &&
          newCol < BOARD_SIZE;
        const isOccupied = TEAMS.some(
          (team) =>
            teamPositions[team].row === newRow &&
            teamPositions[team].col === newCol
        );

        const isObstacle = obstacles.some((o) => o.row === newRow && o.col === newCol);

        if (withinBounds && !isOccupied && !isObstacle) {
          moves.push({ row: newRow, col: newCol });
        }
      }
    }

    return moves;
  };

  const renderCell = (row, col) => {
    const deliveryHere = deliveries.some((d) => d.row === row && d.col === col);
    const obstacleHere = obstacles.some((o) => o.row === row && o.col === col);
    const teamHere = TEAMS.find(
      (team) =>
        teamPositions[team].row === row && teamPositions[team].col === col
    );
    const validMoves = getValidMoves();
    const isValidMoveCell = validMoves.some(
      (pos) => pos.row === row && pos.col === col
    );

    const classNames = ["cell"];
    if (deliveryHere) classNames.push("delivery");
    if (obstacleHere) classNames.push("obstacle");
    if (teamHere) classNames.push(teamColors[teamHere]);
    if (isValidMoveCell) classNames.push("highlight");

    return (
      <div
        key={`${row}-${col}`}
        className={classNames.join(" ")}
        onClick={() => handleCellClick(row, col)}
        style={teamHere ? { backgroundColor: teamColors[teamHere] } : {}}
        title={
          deliveryHere
            ? "Entrega aquí 🍕"
            : obstacleHere
            ? "Obstáculo 🧱"
            : ""
        }
      >
        {deliveryHere ? "🍕" : obstacleHere ? "🧱" : teamHere ? "🚗" : ""}
      </div>
    );
  };

  // Cambiar color de equipo si no está ocupado o si es el color actual
  const handleColorSelect = (team, color) => {
    const usedColors = Object.values(teamColors);
    if (usedColors.includes(color) && teamColors[team] !== color) return; // color ocupado
    setTeamColors((prev) => ({
      ...prev,
      [team]: color,
    }));
    setColorPickerOpen(null);
  };

  // Abrir/cerrar paleta de colores para un equipo
  const handleColorClick = (team) => {
    if (colorPickerOpen === team) {
      setColorPickerOpen(null);
    } else {
      setColorPickerOpen(team);
    }
  };

  const getWinners = () => {
    const maxScore = Math.max(...Object.values(teamScores));
    return TEAMS.filter((team) => teamScores[team] === maxScore);
  };

  const reiniciarJuego = () => {
    setTeamPositions(initialTeamPositions);
    setTeamScores(initialScores);
    setDeliveries(generateDeliveries(5, [], initialTeamPositions));
    /* setCurrentTurnIndex(0); */
    setSelectedTeam(null);
    setCurrentQuestionIndex(0);
    setCanMove(false);
    setRevealedAnswers({});
  };

  return (
    <div className="game-container">
      <h2>
        {selectedTeam ? (
          <>
            Turno del equipo:{" "}
            <span
              style={{ color: teamColors[selectedTeam], fontWeight: "bold" }}
            >
              {teamNames[selectedTeam]}
            </span>
          </>
        ) : (
          "Elige el equipo que realizará el movimiento"
        )}
      </h2>

      <div className="main-game">
        <div className="scoreboard">
          <h3>Puntuación</h3>
          <ul className="team-list">
            {TEAMS.map((team) => (
              <li
                key={team}
                className={`team-card ${
                  selectedTeam === team ? "selected" : ""
                }`}
                style={{ backgroundColor: teamColors[team] }}
                onClick={() => !canMove && handleTeamNameClick(team)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    handleTeamNameClick(team);
                }}
                aria-pressed={selectedTeam === team}
                aria-label={`Seleccionar equipo ${teamNames[team]}, tiene ${teamScores[team]} puntos`}
              >
                <span className="team-name">{teamNames[team]}</span>
                <span className="team-score">{teamScores[team]} pts</span>
                {/* <span
                  className="team-color-box"
                  style={{
                    backgroundColor: teamColors[team],
                    display: "inline-block",
                    width: 18,
                    height: 18,
                    marginRight: 8,
                    borderRadius: 4,
                    border: "1px solid black",
                    verticalAlign: "middle",
                  }}
                /> */}
              </li>
            ))}
          </ul>
        </div>

        <div className="board-and-config">
          <div className="board-container">
            {/* Letras superiores */}
            <div className="column-labels">
              <div className="spacer" />{" "}
              {/* Esquina vacía superior izquierda */}
              {Array.from({ length: BOARD_SIZE }).map((_, col) => (
                <div key={`col-${col}`} className="col-label">
                  {String.fromCharCode(65 + col)} {/* A, B, C... */}
                </div>
              ))}
            </div>

            {/* Tablero con números al lado izquierdo */}
            <div className="board">
              {Array.from({ length: BOARD_SIZE }).map((_, row) => (
                <div className="board-row" key={row}>
                  <div className="row-label">{row + 1}</div>
                  {Array.from({ length: BOARD_SIZE }).map((_, col) =>
                    renderCell(row, col)
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* Botón icono engranaje */}
          <button
                className="config-button"
                onClick={() => setShowConfig(true)}
                aria-label="Abrir configuración"
              >
                ⚙️
              </button>
        </div>
      </div>

      {/* Modal configuración */}
      {showConfig && (
        <>
          <div
            className="modal-backdrop"
            onClick={() => setShowConfig(false)}
          />
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()} // evitar cerrar modal al click interno
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <h3 id="modal-title">Configuración de Equipos</h3>
            {TEAMS.map((team) => {
              const isPickerOpen = colorPickerOpen === team;
              const usedColors = Object.values(teamColors);
              return (
                <div
                  key={team}
                  className="team-config-row"
                  style={{ position: "relative", marginBottom: 12 }}
                >
                  <label style={{ marginRight: 8 }}>
                    Nombre:
                    <input
                      type="text"
                      value={teamNames[team]}
                      onChange={(e) =>
                        setTeamNames((prev) => ({
                          ...prev,
                          [team]: e.target.value,
                        }))
                      }
                      style={{ marginLeft: 8 }}
                    />
                  </label>

                  <span
                    className="team-color-box"
                    style={{
                      backgroundColor: teamColors[team],
                      display: "inline-block",
                      width: 24,
                      height: 24,
                      cursor: "pointer",
                      border: "2px solid black",
                      borderRadius: 4,
                    }}
                    title="Cambiar color"
                    onClick={() => handleColorClick(team)}
                  />

                  {isPickerOpen && (
                    <div
                      className="color-picker"
                      style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        left: 0,
                        background: "#fff",
                        border: "1px solid #ccc",
                        padding: 8,
                        borderRadius: 4,
                        display: "flex",
                        flexWrap: "wrap",
                        zIndex: 1000,
                      }}
                    >
                      {AVAILABLE_COLORS.map((color) => {
                        const isUsed = usedColors.includes(color);
                        const isCurrent = teamColors[team] === color;
                        return (
                          <div
                            key={color}
                            onClick={() =>
                              !isUsed || isCurrent
                                ? handleColorSelect(team, color)
                                : null
                            }
                            style={{
                              backgroundColor: color,
                              width: 24,
                              height: 24,
                              margin: 4,
                              border: isCurrent
                                ? "3px solid black"
                                : "1px solid gray",
                              opacity: isUsed && !isCurrent ? 0.4 : 1,
                              cursor:
                                isUsed && !isCurrent
                                  ? "not-allowed"
                                  : "pointer",
                              borderRadius: 4,
                            }}
                            title={color}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            <button
              className="close-modal"
              onClick={() => setShowConfig(false)}
              style={{ marginTop: 12 }}
            >
              Cerrar
            </button>
          </div>
        </>
      )}

      {/* Modal preguntas */}
      {(modoLibre ||
        (questions.length > 0 && currentQuestionIndex < questions.length)) && (
        <div className="modal-float">
          {modoLibre ? (
            <>
              <h3>Modo Libre (Tutorial)</h3>
              <p>Puedes mover tu equipo libremente usando los botones.</p>
              <div className="controls">
                <button onClick={() => confirmAnswer(true)}>✔ Sí</button>
                <button onClick={() => confirmAnswer(false)}>✘ No</button>
              </div>
            </>
          ) : (
            <>
              <h3>Pregunta {currentQuestionIndex + 1}</h3>
              <p>{questions[currentQuestionIndex]?.question}</p>

              {questions[currentQuestionIndex]?.type === "mc" ? (
                <div className="options">
                  {questions[currentQuestionIndex]?.options.map((opt, idx) => (
                    <button key={idx} onClick={() => handleMultipleChoice(opt)}>
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  {!revealedAnswers[currentQuestionIndex] ? (
                    <button
                      onClick={() => handleShowAnswer(currentQuestionIndex)}
                    >
                      👁 Mostrar Respuesta
                    </button>
                  ) : (
                    <>
                      <p>
                        <strong>Respuesta:</strong>{" "}
                        {questions[currentQuestionIndex]?.answer}
                      </p>
                      <div className="controls">
                        <button onClick={() => confirmAnswer(true)}>
                          ✔ Sí
                        </button>
                        <button onClick={() => confirmAnswer(false)}>
                          ✘ No
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {!modoLibre &&
        questions.length > 0 &&
        currentQuestionIndex >= questions.length && (
          <div className="modal-float">
            <h3>Juego terminado</h3>
            {(() => {
              const winners = getWinners();
              if (winners.length === 1) {
                return (
                  <>
                    <p>
                      🎉 El equipo{" "}
                      <strong style={{ color: teamColors[winners[0]] }}>
                        {teamNames[winners[0]]}
                      </strong>{" "}
                      ha ganado con {teamScores[winners[0]]} puntos.
                    </p>
                    <button
                      className="close-modal"
                      onClick={reiniciarJuego}
                      style={{ marginTop: 12 }}
                    >
                      🔁 Reiniciar juego
                    </button>
                  </>
                );
              } else {
                return (
                  <>
                    <p>🤝 ¡Empate entre los equipos!</p>
                    <ul>
                      {winners.map((team) => (
                        <li key={team}>
                          <span
                            style={{
                              color: teamColors[team],
                              fontWeight: "bold",
                            }}
                          >
                            {teamNames[team]}
                          </span>{" "}
                          con {teamScores[team]} puntos
                        </li>
                      ))}
                    </ul>
                    <button
                      className="close-modal"
                      onClick={reiniciarJuego}
                      style={{ marginTop: 12 }}
                    >
                      🔁 Reiniciar juego
                    </button>
                  </>
                );
              }
            })()}
          </div>
        )}
    </div>
  );
};

export default PizzaDeliveryGame;
