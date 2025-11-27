// src/Login.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "./socket";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!username.trim() || !password.trim()) {
      setErrorMsg("Username and password cannot be empty.");
      return;
    }

    socket.emit("loginAdmin", { username, password }, (response) => {
      if (response && response.success) {
        localStorage.setItem("token", response.token);
        navigate("/", { replace: true });
      } else {
        setErrorMsg(response?.message || "Invalid credentials");
      }
    });
  };

  return (
    <div
      className="container"
      style={{ maxWidth: "400px", marginTop: "100px" }}
    >
      <h3 className="mb-4 text-center">Admin Login</h3>
      <form onSubmit={handleSubmit}>
        {errorMsg && (
          <div className="alert alert-danger" role="alert">
            {errorMsg}
          </div>
        )}
        <div className="form-group mb-3">
          <label>Username</label>
          <input
            type="text"
            className="form-control"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group mb-4">
          <label>Password</label>
          <input
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary w-100">
          Sign In
        </button>
      </form>
    </div>
  );
}
