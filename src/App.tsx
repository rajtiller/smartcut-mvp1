import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import SessionPage from "./pages/SessionPage";
import "./App.css"; // Ensure generic styles are loaded if any, but index.css covers most

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/session/new" element={<SessionPage />} />
      </Routes>
    </Router>
  );
}

export default App;
