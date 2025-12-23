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

const downloadPDF = (order) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let startY = 40;

  doc.setFontSize(16);
  doc.text(`Laundry Bill - Token: ${order.tokenNo}`, margin, startY);

  doc.setFontSize(12);
  startY += 24;
  doc.text(`Name: ${order.name}`, margin, startY);
  startY += 16;
  doc.text(`Mobile: ${order.mobile}`, margin, startY);
  startY += 16;
  doc.text(`Order Date: ${formatDate(order.order_date)}`, margin, startY);
  startY += 16;
  doc.text(
    `Delivery Date: ${
      order.delivery_date ? formatDate(order.delivery_date) : "-"
    }`,
    margin,
    startY
  );
  startY += 16;
  doc.text(`Urgent: ${order.urgent ? "YES" : "NO"}`, margin, startY);
  startY += 16;
  doc.text(
    `Total Amount: Rs. ${order.totalAmount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
    margin,
    startY
  );
  startY += 16;
  doc.text(`Payment Method: ${order.paymentMethod || "-"}`, margin, startY);

  startY += 30;

  const itemRows = order.items.map((i) => [
    i.clothType,
    i.service,
    i.qty.toString(),
    `Rs. ${i.price.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
    `Rs. ${(i.qty * i.price).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
  ]);

  autoTable(doc, {
    startY,
    startX: margin,
    tableWidth: pageWidth - margin * 2, // 🔥 FULL WIDTH
    head: [["Cloth Type", "Service", "Qty", "Price", "Total"]],
    body: itemRows,

    styles: {
      fontSize: 11,
      cellPadding: 6,
      valign: "middle",
    },

    headStyles: {
      fillColor: [47, 128, 237],
      textColor: 255,
      fontStyle: "bold",
    },

    columnStyles: {
      0: { cellWidth: 90 },   // Cloth Type
      1: { cellWidth: 200 },  // Service
      2: { cellWidth: 50, halign: "right" }, // Qty
      3: { cellWidth: 80, halign: "right" }, // Price
      4: { cellWidth: 80, halign: "right" }, // Total
    },

    theme: "striped",
  });

  doc.save(`Bill_${order.tokenNo}.pdf`);
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
                      <div key={idx}>{i.clothType} – {i.service} × {i.qty}</div>
                    ))}
                  </td>
                  <td>₹{o.totalAmount}</td>
                  <td>{formatDate(o.order_date)}</td>
                  <td>
                    {isAdmin ? (
                      <input
                        type="date"
                        value={o.delivery_date ? o.delivery_date.toDate().toISOString().split("T")[0] : ""}
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
                  <td><span className={`status ${o.status}`}>{o.status}</span></td>

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
