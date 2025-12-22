import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { toast } from "react-toastify";
import Loader from "./Loader";
import "./Orders.css"; // new CSS file

export default function Orders({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "orders"));
      const allOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (user.email === "lavisaini1996@gmail.com") {
        setOrders(allOrders); // Admin sees all
      } else {
        const userOrders = allOrders.filter(
          (o) => o.customerEmail === user.email
        );
        setOrders(userOrders); // Regular user sees only their orders
      }
    } catch (err) {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const collectOrder = async (id, status) => {
    if (status === "completed") return;

    setLoading(true);
    try {
      await updateDoc(doc(db, "orders", id), { status: "completed" });
      toast.success("Order marked as completed!");
      loadOrders();
    } catch (err) {
      toast.error("Failed to update order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadOrders();
  }, [user]);

  return (
    <div className="orders-container">
      {loading && <Loader />}

      <h2>Orders Tracking</h2>
      {orders.length === 0 && !loading && <p>No orders found</p>}

      <div className="orders-list">
        {orders.map((o) => (
          <div key={o.id} className="order-card">
            <p><b>Token:</b> {o.tokenNo}</p>
            <p><b>Name:</b> {o.name}</p>
            <p><b>Status:</b> <span className={o.status}>{o.status}</span></p>
            <p><b>Delivery:</b> {o.deliveryDate}</p>
            <p><b>Total:</b> ₹{o.totalAmount}</p>

            <div className="order-items">
              {o.items?.map((i, idx) => (
                <p key={idx}>
                  {i.clothType} – {i.service} – {i.qty} × ₹{i.price}
                </p>
              ))}
            </div>

            {(user.email === "lavisaini1996@gmail.com" || o.customerEmail === user.email) && (
              <button
                className="collect-btn"
                disabled={o.status === "completed"}
                onClick={() => collectOrder(o.id, o.status)}
              >
                {o.status === "completed" ? "Completed" : "Collect Order"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
