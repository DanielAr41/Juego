// PizzaDeliveryGame.jsx
import React, { useState, useEffect, useRef  } from "react";
import "./PizzaDeliveryGame.css";
import { useParams, useSearchParams } from "react-router-dom";
import { useLocation } from "react-router-dom";
import logoUAM from '/src/assets/logoUAM.png';

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


const TEAM_ICONS = {
  red: "🚚",
  blue: "🚛",
  green:"🚚",
  yellow:"🚙",
}

const getCenter = () => Math.floor(BOARD_SIZE / 2);

const initialTeamPositions = TEAMS.reduce((acc, team) => {
  acc[team] = { row: getCenter(), col: getCenter() };
  return acc;
}, {});

const initialScores = TEAMS.reduce((acc, team) => {
  acc[team] = 0;
  return acc;
}, {});

const generateDeliveries = (count, existing = [], teamPositions = {}, obstacles = []) => {
  const deliveries = [...existing];
  let attempts = 0;
  while (deliveries.length < count && attempts < 100) {
    attempts++;
    const row = Math.floor(Math.random() * BOARD_SIZE);
    const col = Math.floor(Math.random() * BOARD_SIZE);
    const occupied = deliveries.some((d) => d.row === row && d.col === col);
    const isCenter = row === getCenter() && col === getCenter();
    const occupiedByTeam = Object.values(teamPositions).some(
      (pos) => pos.row === row && pos.col === col
    );
    const occupiedByObstacle = obstacles.some(
      (o) => o.row === row && o.col === col
    );

    if (!occupied && !isCenter && !occupiedByTeam && !occupiedByObstacle) {
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

  const [powerUps, setPowerUps] = useState([]); 
  const [moveCount, setMoveCount] = useState(0);
  const [boostedTeams, setBoostedTeams] = useState({});
  const [placingBanana, setPlacingBanana] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);

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
    // Si estamos en modo de colocar obstáculo tras comer banana
    if (placingBanana) {
      const bananaTeam = placingBanana.team;
  
      // Solo colocar hoyo si está pendiente
      if (placingBanana.pending) {
        const occupied =
          deliveries.some((d) => d.row === row && d.col === col) ||
          obstacles.some((o) => o.row === row && o.col === col) ||
          Object.values(teamPositions).some((pos) => pos.row === row && pos.col === col);
  
        if (!occupied) {
          setObstacles((prev) => [...prev, { row, col, type: "bananaObstacle" }]);
          // Ya no está pendiente, ahora puede moverse normalmente
          setPlacingBanana(null); 
          // activar movimiento normal del equipo que comió la banana
          setSelectedTeam(bananaTeam);
          setCanMove(false);
        }
        return; // salir para que no haga nada más
      }
    }
    
    
    
    
  
    if (!canMove || !currentTeam) return;
  
    const { row: currentRow, col: currentCol } = teamPositions[currentTeam];
    const range = boostedTeams[currentTeam] ? 2 : 1;
  
    const isValidMove =
      Math.abs(currentRow - row) <= range &&
      Math.abs(currentCol - col) <= range &&
      !(currentRow === row && currentCol === col);
  
    if (!isValidMove) return;
  
    // Entrega y obstáculos normales
    const delivered = deliveries.find((d) => d.row === row && d.col === col);
    const blocked = obstacles.some((o) => o.row === row && o.col === col && o.type !== "bananaObstacle");
    if (blocked) return;
  
    // Power-up
    const powerUpHere = powerUps.find((p) => p.row === row && p.col === col);
    if (powerUpHere) {
      if (powerUpHere.type === "boost") {
        setBoostedTeams((prev) => ({ ...prev, [currentTeam]: true }));
      } else if (powerUpHere.type === "banana") {
        setPlacingBanana({ team: currentTeam, pending: true });
        setSelectedTeam(currentTeam); // seleccionar automáticamente
        setCanMove(true);             // activar movimiento SOLO para colocar hoyo

      }
      // Remover power-up del tablero
      setPowerUps((prev) => prev.filter((p) => !(p.row === row && p.col === col)));
    }
  
    // Mover jugador
    const newPosition = { row, col };
    setTeamPositions((prev) => ({
      ...prev,
      [currentTeam]: newPosition,
    }));
  
    // Revisar si cayó en un obstáculo especial (bananaObstacle)
    const obstacle = obstacles.find((o) => o.row === row && o.col === col);
    if (obstacle && obstacle.type === "bananaObstacle") {
      setTeamScores((prev) => ({
        ...prev,
        [currentTeam]: Math.max(prev[currentTeam] - 1, 0),
      }));
      // Opcional: eliminar obstáculo
      setObstacles((prev) => prev.filter((o) => o.row !== row || o.col !== col));
    }
  
    // Recolectar entrega si aplica
    if (delivered) {
      setTeamScores((prev) => ({
        ...prev,
        [currentTeam]: prev[currentTeam] + 1,
      }));
      setDeliveriesCompleted((prev) => prev + 1);
  
      setDeliveries((prev) => {
        const updated = prev.filter((d) => !(d.row === row && d.col === col));
        return generateDeliveries(5, updated, { ...teamPositions, [currentTeam]: newPosition }, obstacles);
      });
      
    }
  
    setMoveCount((prev) => prev + 1);
  
    // Resetear turno
    setCanMove(false);
    setSelectedTeam(null);
    setCurrentQuestionIndex((prev) => prev + 1);
  
    if (boostedTeams[currentTeam]) {
      setBoostedTeams((prev) => ({ ...prev, [currentTeam]: false }));
    }
  };
  
  const [selectedOption, setSelectedOption] = useState(null);

const handleMultipleChoice = (selected) => {
  setSelectedOption(selected); // ← guardar opción para mostrar selección
  const current = questions[currentQuestionIndex];
  const isCorrect = selected === current.correctAnswer;
  confirmAnswer(isCorrect);
};


  /* const handleMultipleChoice = (selected) => {
    const current = questions[currentQuestionIndex];
    const isCorrect = selected === current.correctAnswer;
    confirmAnswer(isCorrect);
  }; */

  const handleTeamNameClick = (team) => {
    if (!canMove) {
      setSelectedTeam(team);
    }
  };

  const confirmAnswer = (isCorrect) => {
    if (isCorrect) {
      if (!selectedTeam) {
        setMessageText("⚠️ Por favor, selecciona un equipo antes de mover.");
        setShowMessageModal(true);
        return;
      }
      setCanMove(true);
    } else {
      /* setCurrentTurnIndex((prev) => (prev + 1) % TEAMS.length);
      setCurrentQuestionIndex((prev) => prev + 1); */
      setSelectedTeam(null);
      //setCurrentQuestionIndex((prev) => prev + 1);
      //setCurrentQuestionIndex(null);
    }
  };

  const getValidMoves = (team) => {
    const { row, col } = teamPositions[team];
    const range = boostedTeams[team] ? 2 : 1; // si está boosteado, se mueve 2
  
    let moves = [];
    for (let r = -range; r <= range; r++) {
      for (let c = -range; c <= range; c++) {
        // Evita la celda actual del jugador
        if (r === 0 && c === 0) continue;
    
        const newRow = row + r;
        const newCol = col + c;
    
        if (
          newRow >= 0 &&
          newRow < BOARD_SIZE &&
          newCol >= 0 &&
          newCol < BOARD_SIZE
        ) {
          // Evita obstáculos
          const blocked = obstacles.some(
            (o) => o.row === newRow && o.col === newCol && o.type !== "bananaObstacle"
          );
  
          if (!blocked) {
            moves.push({ row: newRow, col: newCol });
          }
        }
      }
    }
    
    return moves;
  };
  
  // Numero de movimientos para que aparezca el power up
  useEffect(() => {
    if (moveCount > 0 && moveCount % 5 === 0) {
      spawnPowerUp();
    }
  }, [moveCount]);
  
  const spawnPowerUp = () => {
    let newRow, newCol;
    do {
      newRow = Math.floor(Math.random() * BOARD_SIZE);
      newCol = Math.floor(Math.random() * BOARD_SIZE);
    } while (
      deliveries.some((d) => d.row === newRow && d.col === newCol) ||
      obstacles.some((o) => o.row === newRow && o.col === newCol) ||
      powerUps.some((p) => p.row === newRow && p.col === newCol) ||
      Object.values(teamPositions).some((pos) => pos.row === newRow && pos.col === newCol) // evita que esté sobre un jugador
    );
  
    // Elegir tipo de power-up
    const type = Math.random() < 0.7 ? "boost" : "banana"; // 70% boost, 30% banana
  
    setPowerUps((prev) => [...prev, { row: newRow, col: newCol, type }]);
  };
  

  const renderCell = (row, col) => {
    const powerUpHere = powerUps.find((p) => p.row === row && p.col === col);
    const deliveryHere = deliveries.some((d) => d.row === row && d.col === col);
    const obstacleHere = obstacles.find((o) => o.row === row && o.col === col);
    const teamHere = TEAMS.find(
      (team) => teamPositions[team].row === row && teamPositions[team].col === col
    );
  
    const validMoves =
  currentTeam && canMove ? getValidMoves(currentTeam) : [];
const isValidMoveCell = validMoves.some(
  (pos) => pos.row === row && pos.col === col
);

    // --- CLASES ---
    const classNames = ["cell"];
  
    if (deliveryHere) {
      classNames.push("delivery");
    } else if (obstacleHere) {
      if (obstacleHere.type !== "bananaObstacle") classNames.push("obstacle");
    }
  
    if (teamHere) classNames.push(teamColors[teamHere]);
    if (isValidMoveCell) classNames.push("highlight");
  
    // --- CONTENIDO VISUAL ---
    let content = "";
    if (deliveryHere) content = "🍕";
    else if (obstacleHere) {
      content = obstacleHere.type === "bananaObstacle" ? "🕳️" : "🧱";
    } else if (powerUpHere) {
      content = powerUpHere.type === "boost" ? "⚡" : "🚧";
    }
  
    // --- TITLE (TOOLTIP) ---
    let title = "";
    if (deliveryHere) title = "Entrega aquí 🍕";
    else if (obstacleHere) {
      title =
        obstacleHere.type === "bananaObstacle"
          ? "Hoyo 🕳️ - Quita 1 punto al pasar"
          : "Obstáculo 🧱 - Bloquea movimiento";
    } else if (powerUpHere) {
      title = powerUpHere.type === "boost" ? "Velocidad ⚡" : "Banana 🚧";
    }
  
    return (
      <div
        key={`${row}-${col}`}
        className={classNames.join(" ")}
        onClick={() => handleCellClick(row, col)}
        style={teamHere ? { backgroundColor: teamColors[teamHere] } : {}}
        title={title}
      >
        {content}
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
    setDeliveries(generateDeliveries(5, [], initialTeamPositions, []));
    setObstacles([]);      // reinicia los obstáculos
    setPowerUps([]);       // reinicia los power-ups
    setSelectedTeam(null);
    setCurrentQuestionIndex(0);
    setCanMove(false);
    setRevealedAnswers({});
    setBoostedTeams({});
    setMoveCount(0);
    setPlacingBanana(null);
  };
  
  
  // refs y estado para medir celdas / etiquetas
const boardRef = useRef(null);
const [cellMetrics, setCellMetrics] = useState({
  width: 70,      // valor por defecto (se actualizará al montar)
  height: 70,
  rowGap: 5,
  labelOffset: 48, // offset izquierdo para que la capa de jugadores comience después del row-label
});

useEffect(() => {
  const measure = () => {
    const boardEl = boardRef.current;
    if (!boardEl) return;

    const firstCell = boardEl.querySelector(".cell");
    const rowLabelEl = boardEl.querySelector(".row-label");

    const cellRect = firstCell ? firstCell.getBoundingClientRect() : null;
    const computedBoard = window.getComputedStyle(boardEl);
    const computedRowLabel = rowLabelEl ? window.getComputedStyle(rowLabelEl) : null;

    const width = cellRect ? cellRect.width : 70;
    const height = cellRect ? cellRect.height : 70;

    // obtener gap/row-gap (compatibilidad con navegadores)
    let gap = parseFloat(computedBoard.getPropertyValue("row-gap")) ||
              parseFloat(computedBoard.getPropertyValue("gap")) ||
              0;
    if (isNaN(gap)) gap = 0;

    const labelOffset = rowLabelEl
      ? (parseFloat(computedRowLabel.getPropertyValue("width")) || 40) +
        (parseFloat(computedRowLabel.getPropertyValue("margin-right")) || 8)
      : 48;

    setCellMetrics({
      width,
      height,
      rowGap: gap,
      labelOffset,
    });
  };

  measure();
  window.addEventListener("resize", measure);
  return () => window.removeEventListener("resize", measure);
}, []);


  return (
    <div id="root">
    <div className="game-container">
      <header className="header">
        <img alt="Logo UAM" className="logo" src={logoUAM} />
        <div className="header-content">
          <h3 className="header-title">Rápidos y sabios</h3>

          <div className="page-titles">
            <div style={{display: "flex", flexFlow: "row", alignItems: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",}}>
            </div>
          </div>

          <div style={{
                display: "flex",
                position: "absolute",
                right: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                gap: "10px",
              }}
            >
          </div>
        </div>
        <a href="http://148.206.168.145/vaep/" className="back-button" aria-label="Regresar">⬅️ Regresar</a>
      </header>

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
            <div className="board" ref={boardRef}>
  {Array.from({ length: BOARD_SIZE }).map((_, row) => (
    <div className="board-row" key={row}>
      <div className="row-label">{row + 1}</div>
      {Array.from({ length: BOARD_SIZE }).map((_, col) =>
        renderCell(row, col)
      )}
    </div>
  ))}

  {/* Botón para abrir instrucciones */}
  <div className="instructions-btn">
        <button
          className="button-82-pushable orange-button"
          role="button"
          onClick={() => setShowInstructions(true)}
        >
          <span className="button-82-shadow"></span>
          <span className="button-82-edge"></span>
          <span className="button-82-front text">📖 Instrucciones</span>
        </button>
      </div>

        {/* Modal de Instrucciones */}
      {showInstructions && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Reglas del Juego</h2>
            <ul>
              <li>🍕 Los equipos deben comer pizzas para no quedarse con hambre.</li>
              <li>✅ Si respondes correctamente, tu equipo puede moverse.</li>
              <li>❌ Si fallas, pierdes el turno.</li>
              <li>⚡ El rayo te permite moverte una celda extra en tu siguiente turno.</li>
              <li>🚧 La señal de obras te permite colocar inmediatamente un bache en cualquier celda vacia.</li>
              <li>🧱 Los obstáculos bloquean el paso.</li>
              <li>El equipo con la mayor puntuación una vez terminadas las preguntas ¡gana! 🏆</li>
            </ul>
            <button
              className="button-82-pushable gray-button"
              onClick={() => setShowInstructions(false)}
            >
              <span className="button-82-shadow"></span>
              <span className="button-82-edge"></span>
              <span className="button-82-front text">Cerrar</span>
            </button>
          </div>
        </div>
      )}

  {/* Capa de jugadores (posicionada dinámicamente) */}
  <div
    className="players-layer"
    style={{ left: `${cellMetrics.labelOffset}px`, top: 0 }}
  >
    {TEAMS.map((team) => {
      const { row, col } = teamPositions[team];
      const x = col * cellMetrics.width;
      const y = row * (cellMetrics.height + cellMetrics.rowGap);

      return (
        <div
          key={team}
          className="player"
          style={{
            width: `${cellMetrics.width}px`,
            height: `${cellMetrics.height}px`,
            transform: `translate3d(${x}px, ${y}px, 0)`,
            color: teamColors[team],
            zIndex: 20,
            pointerEvents: "none",
            // opcional: ajustar tamaño del emoji si quieres
            fontSize: `${Math.min(cellMetrics.width, cellMetrics.height) * 0.6}px`,
          }}
        >
          {TEAM_ICONS[team]}
        </div>
      );
    })}
  </div>
</div>

          </div>
              {/* Botón icono engranaje */}
              <button className="config-button" onClick={() => setShowConfig(true)} aria-label="Abrir configuración">
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
                <div key={team} className="team-config-row" style={{ marginBottom: 16 }}>
  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    <div className="inputGroup">
      <input
        type="text"
        id={`team-${team}`}
        value={teamNames[team]}
        onChange={(e) =>
          setTeamNames((prev) => ({
            ...prev,
            [team]: e.target.value,
          }))
        }
        required
      />
      <label htmlFor={`team-${team}`}>Nombre del equipo</label>
    </div>

    


    <div className="color-picker-wrapper" style={{ position: "relative" }}>
      <button
        className="color-picker-button"
        style={{
          backgroundColor: teamColors[team],
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "2px solid white",
          cursor: "pointer",
        }}
        onClick={() => handleColorClick(team)}
        title="Seleccionar color"
      />

      {isPickerOpen && (
        <div
          className="color-picker-popup"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            display: "flex",
            flexWrap: "wrap",
            background: "#222",
            padding: 8,
            borderRadius: 8,
            marginTop: 6,
            zIndex: 10,
            gap: 6,
          }}
        >
          {AVAILABLE_COLORS.map((color) => (
            <div
              key={color}
              style={{
                backgroundColor: color,
                width: 20,
                height: 20,
                borderRadius: "50%",
                border: "2px solid white",
                cursor: usedColors.includes(color) && teamColors[team] !== color ? "not-allowed" : "pointer",
                opacity: usedColors.includes(color) && teamColors[team] !== color ? 0.5 : 1,
              }}
              onClick={() =>
                !usedColors.includes(color) || teamColors[team] === color
                  ? handleColorSelect(team, color)
                  : null
              }
            />
          ))}
        </div>
      )}
    </div>
  </div>
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
              <button className="button-82-pushable green-button" role="button" onClick={() => confirmAnswer(true)}>
                <span className="button-82-shadow"></span>
                <span className="button-82-edge"></span>
                <span className="button-82-front text">✔ Sí</span>
              </button>
              <button className="button-82-pushable" role="button" onClick={() => confirmAnswer(false)}>
                <span className="button-82-shadow"></span>
                <span className="button-82-edge"></span>
                <span className="button-82-front text">✘ No</span>
              </button>
              </div>
            </>
          ) : (
            <>
              <h3>Pregunta {currentQuestionIndex + 1}</h3>
              <p>{questions[currentQuestionIndex]?.question}</p>

              {questions[currentQuestionIndex]?.type === "mc" ? (
                <div className="options">
                  {questions[currentQuestionIndex]?.options.map((opt, idx) => (
                    <button
                    key={idx}
                    className={`button-82-pushable ${selectedOption === opt ? "selected" : ""}`}
                    onClick={() => handleMultipleChoice(opt)}
                  >
                    <span className="button-82-shadow"></span>
                    <span className="button-82-edge"></span>
                    <span className="button-82-front text">{opt}</span>
                  </button>
                  ))}
                </div>
              ) : (
                <>
                  {/* Botón mostrar respuesta */}
    {!revealedAnswers[currentQuestionIndex] && (
      <button
        className="button-30"
        onClick={() => handleShowAnswer(currentQuestionIndex)}
      >
        👁 Mostrar Respuesta
      </button>
    )}

                   {/* Si ya se reveló, muestro la respuesta */}
    {revealedAnswers[currentQuestionIndex] && (
      <p>
        <strong>Respuesta:</strong>{" "}
        {questions[currentQuestionIndex]?.answer}
      </p>
    )}

    {/* Los botones de Sí y No SIEMPRE visibles */}
    <div className="controls">
      <button
        className="button-82-pushable green-button"
        onClick={() => confirmAnswer(true)}
        role="button"
      >
        <span className="button-82-shadow"></span>
        <span className="button-82-edge"></span>
        <span className="button-82-front text">✔ Sí</span>
      </button>

      <button
        className="button-82-pushable"
        onClick={() => confirmAnswer(false)}
        role="button"
        style={{ marginLeft: "16px" }}
      >
        <span className="button-82-shadow"></span>
        <span className="button-82-edge"></span>
        <span className="button-82-front text">✘ No</span>
      </button>
    </div>
  </>
              )}
            </>
          )}
        </div>
      )}

{placingBanana && (
  <div
    className="alert-modal floating-message"
    role="alert"
    aria-live="polite"
  >
    <h3>⚠️ Turno especial</h3>
    <p>
      {teamNames[placingBanana.team]}, elige una celda vacía para colocar un
      bache 🕳️. Esto hará que el próximo jugador que caiga ahí pierda 1 punto.
    </p>
    <p>Después de colocar el bache, el juego continuará normalmente.</p>
  </div>
)}



{showMessageModal && (
  <div className="modal-backdrop" onClick={() => setShowMessageModal(false)}>
    <div
      className="modal-content"
      onClick={(e) => e.stopPropagation()} // evita que se cierre al hacer click dentro
      role="alertdialog"
      aria-modal="true"
    >
      <p>{messageText}</p>
      <button className="close-modal" onClick={() => setShowMessageModal(false)}>
        Cerrar
      </button>
    </div>
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
              {/* Footer */}
              <footer className="footer-custom mt-10">
              <ul>
                <li>Copyright © Universidad Autonoma Metropolitana 2025</li>
                <li>
                  Responsables del sitio: Dra. María del Carmen Gómez Fuentes y Dr. Jorge
                  Cervantes Ojeda
                </li>
                <li>
                  Desarrollador del juego: Jhoan Daniel Arenas Reyes
                </li>
              </ul>
            </footer>


      </div>
    </div>
  );
};

export default PizzaDeliveryGame;
