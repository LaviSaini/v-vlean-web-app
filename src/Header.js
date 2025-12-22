import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import "./Header.css";

export default function Header({ user }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="header">
      {/* Logo */}
      <div className="logo" onClick={() => navigate("/orders")}>{window.innerWidth <= 600 ? "Laundry App" : "Laundry App"}</div>

      {/* Hamburger Icon */}
      <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
        <div></div>
        <div></div>
        <div></div>
      </div>

      {/* Desktop Nav */}
      <nav className="nav">
        <NavLink to="/orders" className="nav-link">Orders</NavLink>
        <NavLink to="/add-order" className="nav-link">Add Order</NavLink>
        {user && <button className="logout-btn" onClick={handleLogout}>Logout</button>}
      </nav>

      {/* Mobile Nav */}
      <div className={`mobile-nav ${menuOpen ? "active" : ""}`}>
        <NavLink to="/orders" className="nav-link" onClick={() => setMenuOpen(false)}>Orders</NavLink>
        <NavLink to="/add-order" className="nav-link" onClick={() => setMenuOpen(false)}>Add Order</NavLink>
        {user && <button className="logout-btn" onClick={handleLogout}>Logout</button>}
      </div>
    </header>
  );
}
