import { useState } from "react";
import { toast } from "react-toastify";
import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import Loader from "./Loader";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Simple email regex validation
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Password validation: at least 6 chars
  const isValidPassword = (password) => {
    return password.length >= 6;
  };

  const register = async () => {
    if (!email || !password) {
      toast.error("Please fill all fields");
      return;
    }
    if (!isValidEmail(email)) {
      toast.error("Invalid email address");
      return;
    }
    if (!isValidPassword(password)) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast.success("Registered Successfully!");
      navigate("/orders");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    if (!email || !password) {
      toast.error("Please fill all fields");
      return;
    }
    if (!isValidEmail(email)) {
      toast.error("Invalid email address");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Login Successful!");
      navigate("/orders");
    } catch (err) {
      toast.error("Invalid Credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {loading && <Loader />}
      <div className="login-box">
        <h2>Laundry App</h2>
        <p>Login or Register to continue</p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="buttons">
          <button className="login-btn" onClick={login}>Login</button>
          <button className="register-btn" onClick={register}>Register</button>
        </div>
      </div>
    </div>
  );
}
