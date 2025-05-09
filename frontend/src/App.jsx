import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import HomePage from "./components/HomePage";
import Demo from "./components/Demo.jsx";
import Login from "./components/Login.jsx";
import Profile from "./components/Profile.jsx";
import { useState } from "react";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");

  return (
    <Router>
      <NavBar loggedIn={isLoggedIn} username={username} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/demo" element={<Demo username={username} isLoggedIn={isLoggedIn}/>} />
        <Route path="/login" element={<Login setUsername={setUsername} setIsLoggedIn={setIsLoggedIn} />} />
        <Route path="/profile" element={<Profile loggedIn={isLoggedIn} username={username} />} />
      </Routes>
    </Router>
  );
}

export default App;
