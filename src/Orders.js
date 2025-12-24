import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, updateDoc, doc, Timestamp } from "firebase/firestore";
import { toast } from "react-toastify";
import Loader from "./Loader";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./Orders.css";

export default function Orders({ user }) {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchToken, setSearchToken] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "" });

  const isAdmin = user.email === "lavisaini1996@gmail.com";

  const formatDate = (ts) => {
    if (!ts) return "-";
    const d = ts.toDate();
    return `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1)
      .toString().padStart(2, "0")}-${d.getFullYear()}`;
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "orders"));
      const allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      const visible = isAdmin
        ? allOrders
        : allOrders.filter(o => o.customerEmail === user.email);

      setOrders(visible);
      setFilteredOrders(visible);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadOrders();
  }, [user]);

  useEffect(() => {
    setFilteredOrders(
      orders.filter(o =>
        o.tokenNo?.toLowerCase().includes(searchToken.toLowerCase())
      )
    );
  }, [searchToken, orders]);

  const sortBy = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";

    const sorted = [...filteredOrders].sort((a, b) => {
      let valA = a[key];
      let valB = b[key];
      if (valA instanceof Timestamp) valA = valA.seconds;
      if (valB instanceof Timestamp) valB = valB.seconds;
      if (typeof valA === "boolean") valA = valA ? 1 : 0;
      if (typeof valB === "boolean") valB = valB ? 1 : 0;
      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });

    setSortConfig({ key, direction });
    setFilteredOrders(sorted);
  };

  // ===== STATUS =====
  const collectOrder = async (id, status) => {
    if (status === "completed") return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "orders", id), { status: "completed" });
      toast.success("Order marked as completed");
      loadOrders();
    } catch {
      toast.error("Failed to update order");
    } finally {
      setLoading(false);
    }
  };

  const undoCollectOrder = async (id) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, "orders", id), { status: "collect" });
      toast.success("Order reverted to collect");
      loadOrders();
    } catch {
      toast.error("Failed to revert order");
    } finally {
      setLoading(false);
    }
  };

  // ===== UPDATE FIELDS =====
  const updateDeliveryDate = async (id, value) => {
    try {
      await updateDoc(doc(db, "orders", id), {
        delivery_date: Timestamp.fromDate(new Date(value))
      });
      toast.success("Delivery date updated");
      loadOrders();
    } catch {
      toast.error("Failed to update delivery date");
    }
  };

  const updatePaymentMethod = async (id, method) => {
    try {
      await updateDoc(doc(db, "orders", id), { paymentMethod: method });
      toast.success("Payment method updated");
      loadOrders();
    } catch {
      toast.error("Failed to update payment method");
    }
  };

  // ===== PDF =====
  const downloadPDF = (order) => {
    const doc = new jsPDF("p", "pt", "a4");
    doc.text(`Voucher - ${order.tokenNo}`, 40, 40);
    doc.save(`Voucher_${order.tokenNo}.pdf`);
  };

  return (
    <div className="orders-container">
      {loading && <Loader />}
      <h2>Orders Tracking</h2>

      <input
        className="search-input"
        placeholder="Search by Token Number"
        value={searchToken}
        onChange={(e) => setSearchToken(e.target.value)}
      />

      {filteredOrders.length === 0 && !loading && <p>No orders found</p>}

      {filteredOrders.length !== 0 && (
        <div className="table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th onClick={() => sortBy("tokenNo")}>Token ⬍</th>
                <th onClick={() => sortBy("name")}>Name ⬍</th>
                <th>Mobile</th>
                <th>Items</th>
                <th onClick={() => sortBy("totalAmount")}>Amount ⬍</th>
                <th onClick={() => sortBy("order_date")}>Order Date ⬍</th>
                <th onClick={() => sortBy("delivery_date")}>Delivery Date ⬍</th>
                <th onClick={() => sortBy("urgent")}>Urgent ⬍</th>
                <th onClick={() => sortBy("status")}>Status ⬍</th>
                {isAdmin && <th>Payment Method</th>}
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map(o => (
                <tr key={o.id} className={o.urgent ? "urgent-row" : ""}>
                  <td>{o.tokenNo}</td>
                  <td>{o.name}</td>
                  <td>{o.mobile}</td>

                  <td className="items-cell">
                    {o.items?.map((i, idx) => (
                      <div key={idx}>
                        {i.clothType} – {i.service} × {i.qty}
                      </div>
                    ))}
                  </td>

                  <td>₹{o.totalAmount}</td>
                  <td>{formatDate(o.order_date)}</td>

                  <td>
                    {isAdmin ? (
                      <input
                        type="date"
                        value={
                          o.delivery_date
                            ? o.delivery_date.toDate().toISOString().split("T")[0]
                            : ""
                        }
                        onChange={(e) => updateDeliveryDate(o.id, e.target.value)}
                      />
                    ) : (
                      formatDate(o.delivery_date)
                    )}
                  </td>

                  <td>
                    <span className={`urgent-badge ${o.urgent ? "yes" : "no"}`}>
                      {o.urgent ? "YES" : "NO"}
                    </span>
                  </td>

                  <td>
                    <span className={`status ${o.status}`}>{o.status}</span>
                  </td>

                  {isAdmin && (
                    <td>
                      <select
                        value={o.paymentMethod || ""}
                        onChange={(e) => updatePaymentMethod(o.id, e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="cash">Cash</option>
                        <option value="online">Online</option>
                      </select>
                    </td>
                  )}

                  <td>
                    {(isAdmin || o.customerEmail === user.email) && (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="collect-btn"
                          disabled={o.status === "completed"}
                          onClick={() => collectOrder(o.id, o.status)}
                        >
                          {o.status === "completed" ? "Completed" : "Collect"}
                        </button>

                        {isAdmin && o.status === "completed" && (
                          <button
                            className="collect-btn"
                            onClick={() => undoCollectOrder(o.id)}
                          >
                            Undo
                          </button>
                        )}

                        {isAdmin && (
                          <button
                            className="collect-btn"
                            onClick={() => downloadPDF(o)}
                          >
                            Download PDF
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      )}
    </div>
  );
}
