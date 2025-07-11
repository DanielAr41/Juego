import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PizzaDeliveryGame from './PizzaDeliveryGame';

function App() {
  return (
    <Router>
    <Routes>
      <Route path="/:id" element={<PizzaDeliveryGame />} />
    </Routes>
  </Router>
  );
}

export default App;
