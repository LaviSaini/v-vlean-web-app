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

  // ✅ UNDO FUNCTION (NEW)
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
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  let y = 40;

  // Outer Border
  doc.setDrawColor(255, 107, 74);
  doc.setLineWidth(2);
  doc.rect(30, 30, 535, 780);

  // ===== HEADER =====
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 150, 136);
  doc.text("V-CLEAN LAUNDARY & Drycleaning", 40, 50);

  y += 30;
  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.text(
    "H.I.G 36, Mukharjee Vihar, 38 Indra Nagar Kalyanpur, Kanpur - 208026",
    40,
    y
  );
  y += 10;
  doc.text(
    "Plot No:70, New I.I.T Society Madhavpuram Gooba Garden, kanpur - 208016",
    40,
    y
  );

  doc.text("Mobile No.", 420, 45);
  doc.text("+91-9455623957", 420, 60);

  y += 20;

  // ===== TITLE =====
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Laundary Booking Voucher", 40, y);

  y += 25;

  doc.setFontSize(10);
  doc.text(`Dear ${order.name},`, 40, y);
  y += 16;
  doc.text(
    "Your booking request has been processed successfully.",
    40,
    y
  );

  y += 25;

  // ===== CUSTOMER DETAILS =====
  drawSectionHeader(doc, "Customer Details", y);
  y += 35;

  drawKeyValueRow(doc, "Name", order.name, 40, y);
  y += 18;
  drawKeyValueRow(doc, "Mobile", order.mobile, 40, y);
  y += 18;
  drawKeyValueRow(doc, "Payment Mode", order.paymentMethod, 40, y);

  y += 25;

  // ===== CLOTH DETAILS =====
  drawSectionHeader(doc, "Cloth Details", y);
  y += 30;

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
    startY: y,
    startX: margin,
    tableWidth: pageWidth - margin * 2,
    head: [["Cloth Type", "Service", "Qty", "Price", "Total"]],
    body: itemRows,
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: {
      fillColor: [255, 107, 74],
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 180 },
      2: { cellWidth: 50, halign: "right" },
      3: { cellWidth: 80, halign: "right" },
      4: { cellWidth: 80, halign: "right" },
    },
    theme: "grid",
  });

  y = doc.lastAutoTable.finalY + 25;

  // ===== GRAND TOTAL =====
  drawSectionHeader(doc, "Grand Total", y);
  y += 30;

  autoTable(doc, {
    startY: y,
    margin: { left: 40, right: 40 },
    tableWidth: 475,
    body: [["Total Amount", `Rs. ${order.totalAmount}`]],
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: {
      0: { fontStyle: "bold" },
      1: { halign: "right" },
    },
    theme: "grid",
  });

  // ===== FOOTER : TERMS & CONDITIONS =====
  let footerY = pageHeight - 140;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Terms & Conditions", 40, footerY);

  footerY += 15;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const terms = [
    "• Laundry deliveries will be made in 72 Hours.",
    "• The Dry Cleaning garments will be delivered in 120 Hours.",
    "• Urgent delivery of garments will be charged @ 50 % Extra.",
    "• All disputes are subject to the jurisdiction of Courts in Kanpur only.",
    "• For any queries, contact our customer care at 9455623957.",
  ];

  terms.forEach((line) => {
    doc.text(line, 40, footerY);
    footerY += 14;
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
                <th onClick={() => sortBy("delivery_date")}>Delivery Date ⬍</th>
                <th onClick={() => sortBy("urgent")}>Urgent ⬍</th>
                <th onClick={() => sortBy("status")}>Status ⬍</th>
                {isAdmin && <th>Payment Method</th>}
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map(o => (
                <tr key={o.id}>
                  <td>{o.tokenNo}</td>
                  <td>{o.name}</td>
                  <td>{o.mobile}</td>
                  <td>{o.items?.map((i, idx) => <div key={idx}>{i.clothType} – {i.service} × {i.qty}</div>)}</td>
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
                  <td>{o.urgent ? "YES" : "NO"}</td>
                  <td>{o.status}</td>

                  {isAdmin && (
                    <td>
                      <select
                        value={o.paymentMethod || ""}
                        onChange={(e) => updatePaymentMethod(o.id, e.target.value)}
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
