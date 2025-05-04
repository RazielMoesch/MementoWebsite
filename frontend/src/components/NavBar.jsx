import React from "react";
import { NavLink } from "react-router-dom";
import "./Navbar.css"; // optional, for styles

const NavBar = ({ loggedIn, username }) => {
  return (
    <nav className="navbar">
      <div className="navbar-brand">Memento-Vision</div>
      <ul className="navbar-links">
        <li>
          <NavLink to="/" end className="nav-link">
            Home
          </NavLink>
        </li>
        <li>
          <NavLink to="/demo" className="nav-link">
            Try Now - Demo
          </NavLink>
        </li>

        {loggedIn ? (
          <>
            <li>
              <NavLink to="/profile" className="nav-link">
                {username}
              </NavLink>
            </li>
          </>
        ) : (
          <>
            <li>
              <NavLink to="/login" className="nav-link">
                Login
              </NavLink>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default NavBar;
