import { useEffect, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
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

  // 🔥 NEW STATES (DISCOUNT / EDIT TOTAL)
  const [editingTotalId, setEditingTotalId] = useState(null);
  const [editedTotal, setEditedTotal] = useState("");

  const isAdmin = user.email === "lavisaini1996@gmail.com";

  const formatDate = (ts) => {
    if (!ts) return "-";
    const d = ts.toDate();
    return `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${d.getFullYear()}`;
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "orders"));
      const allOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const visible = isAdmin
        ? allOrders
        : allOrders.filter((o) => o.customerEmail === user.email);

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
      orders.filter((o) =>
        o.tokenNo?.toLowerCase().includes(searchToken.toLowerCase())
      )
    );
  }, [searchToken, orders]);

  const sortBy = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc")
      direction = "desc";

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

  const updateDeliveryDate = async (id, value) => {
    try {
      await updateDoc(doc(db, "orders", id), {
        delivery_date: Timestamp.fromDate(new Date(value)),
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

  // 🔥 NEW: UPDATE TOTAL AMOUNT (DISCOUNT)
  const updateTotalAmount = async (id) => {
    if (!editedTotal || isNaN(editedTotal)) {
      toast.error("Enter valid amount");
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, "orders", id), {
        totalAmount: Number(editedTotal),
        discountedAt: Timestamp.now(),
      });
      toast.success("Total amount updated");
      setEditingTotalId(null);
      setEditedTotal("");
      loadOrders();
    } catch {
      toast.error("Failed to update total");
    } finally {
      setLoading(false);
    }
  };

  /* ================= PDF FUNCTIONS (UNCHANGED) ================= */

  const drawSectionHeader = (doc, text, y) => {
    doc.setFillColor(255, 107, 74);
    doc.rect(40, y, 515, 24, "F");
    doc.setTextColor(255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(text, 50, y + 16);
    doc.setTextColor(0);
  };

  const drawKeyValueRow = (doc, key, value, x, y) => {
    doc.setFont("helvetica", "bold");
    doc.text(key, x, y);
    doc.setFont("helvetica", "normal");
    doc.text(value || "-", x + 150, y);
  };

  const downloadPDF = (order) => {
    const doc = new jsPDF("p", "pt", "a4");
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 40;

    doc.setDrawColor(255, 107, 74);
    doc.setLineWidth(2);
    doc.rect(30, 30, 535, 780);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("V-CLEAN LAUNDARY & Drycleaning", 40, 50);

    y += 30;
    doc.setFontSize(10);
    doc.text(`Name: ${order.name}`, 40, y);
    y += 20;

    drawSectionHeader(doc, "Cloth Details", y);
    y += 30;

    autoTable(doc, {
      startY: y,
      head: [["Cloth Type", "Service", "Qty", "Price", "Total"]],
      body: order.items.map((i) => [
        i.clothType,
        i.service,
        i.qty,
        i.price,
        i.qty * i.price,
      ]),
    });

    y = doc.lastAutoTable.finalY + 20;

    drawSectionHeader(doc, "Grand Total", y);
    y += 30;

    autoTable(doc, {
      startY: y,
      body: [["Total Amount", `Rs. ${order.totalAmount}`]],
    });

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
                <th onClick={() => sortBy("delivery_date")}>
                  Delivery Date ⬍
                </th>
                <th onClick={() => sortBy("urgent")}>Urgent ⬍</th>
                <th onClick={() => sortBy("status")}>Status ⬍</th>
                {isAdmin && <th>Payment Method</th>}
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((o) => (
                <tr key={o.id}>
                  <td>{o.tokenNo}</td>
                  <td>{o.name}</td>
                  <td>{o.mobile}</td>
                  <td>
                    {o.items?.map((i, idx) => (
                      <div key={idx}>
                        {i.clothType} – {i.service} × {i.qty}
                      </div>
                    ))}
                  </td>

                  {/* 🔥 EDITABLE TOTAL */}
                  <td>
                    {isAdmin && editingTotalId === o.id ? (
                      <div style={{ display: "flex", gap: "6px" }}>
                        <input
                          type="number"
                          value={editedTotal}
                          style={{ width: "80px" }}
                          onChange={(e) => setEditedTotal(e.target.value)}
                        />
                        <button
                          className="collect-btn"
                          onClick={() => updateTotalAmount(o.id)}
                        >
                          ✔
                        </button>
                        <button
                          className="collect-btn"
                          onClick={() => {
                            setEditingTotalId(null);
                            setEditedTotal("");
                          }}
                        >
                          ✖
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          alignItems: "center",
                        }}
                      >
                        ₹{o.totalAmount}
                        {isAdmin && (
                          <button
                            className="collect-btn"
                            onClick={() => {
                              setEditingTotalId(o.id);
                              setEditedTotal(o.totalAmount);
                            }}
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  <td>{formatDate(o.order_date)}</td>
                  <td>
                    {isAdmin ? (
                      <input
                        type="date"
                        value={
                          o.delivery_date
                            ? o.delivery_date
                                .toDate()
                                .toISOString()
                                .split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          updateDeliveryDate(o.id, e.target.value)
                        }
                      />
                    ) : (
                      formatDate(o.delivery_date)
                    )}
                  </td>
                  <td>{o.urgent ? "YES" : "NO"}</td>
                  <td>{o.status}</td>

                  {isAdmin && (
                    <td>
                      <select
                        value={o.paymentMethod || ""}
                        onChange={(e) =>
                          updatePaymentMethod(o.id, e.target.value)
                        }
                      >
                        <option value="">Select</option>
                        <option value="cash">Cash</option>
                        <option value="online">Online</option>
                        <option value="cash + online">Cash + Online</option>
                      </select>
                    </td>
                  )}

                  <td>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="collect-btn"
                        disabled={o.status === "completed"}
                        onClick={() => collectOrder(o.id, o.status)}
                      >
                        {o.status === "completed"
                          ? "Completed"
                          : "Collect"}
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
