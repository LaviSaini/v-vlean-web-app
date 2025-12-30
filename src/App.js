import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Header from "./Header";
import Orders from "./Orders";
import AddOrder from "./AddOrder";
import Login from "./Login";
import ManageServices from "./ManageServices";
import PrivateRoute from "./PrivateRoute";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  return (
    <Router>
      {/* Header only visible when logged in */}
      {user && <Header user={user} />}

      <div style={{ padding: "20px" }}>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={user ? <Navigate to="/orders" /> : <Login />} />

          {/* Protected routes */}
          <Route path="/orders" element={
            <PrivateRoute user={user}>
              <Orders user={user} />
            </PrivateRoute>
          }/>
          <Route path="/add-order" element={
            <PrivateRoute user={user}>
              <AddOrder />
            </PrivateRoute>
          }/>

          <Route path="/manage-services" element={
            <PrivateRoute user={user}>
              <ManageServices />
            </PrivateRoute>
          }/>

          {/* Default */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </div>

      {/* Toast Container for notifications */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        pauseOnHover
        draggable
      />
    </Router>
  );
}

export default App;
