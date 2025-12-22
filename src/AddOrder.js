import { useState } from "react";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { SERVICES } from "./services";
import { generateToken } from "./token";
import { useNavigate } from "react-router-dom";
import { auth, db } from "./firebase";
import { toast } from "react-toastify";
import Loader from "./Loader"; // loader overlay
import "./AddOrder.css";

export default function AddOrder() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [items, setItems] = useState([]);
  const [clothType, setClothType] = useState("");
  const [service, setService] = useState("");
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  const addItem = () => {
    const selectedService = SERVICES.find(s => s.name === service);

    // Item-level validation
    if (!clothType.trim() || !service || qty < 1) {
      toast.error("Fill all item fields correctly");
      return;
    }

    setItems([
      ...items,
      { clothType: clothType.trim(), service, qty, price: selectedService.price }
    ]);

    setClothType("");
    setService("");
    setQty(1);
  };

  const deleteItem = (index) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  const totalClothes = items.reduce((s, i) => s + i.qty, 0);
  const totalAmount = items.reduce((s, i) => s + i.qty * i.price, 0);

  const submitOrder = async () => {
    // Name validation
    if (!name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    // Mobile validation: 10 digits
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobile)) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }

    // Delivery date validation: must not be in past
    if (!deliveryDate) {
      toast.error("Delivery date is required");
      return;
    }
    const selectedDate = new Date(deliveryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // remove time
    if (selectedDate < today) {
      toast.error("Delivery date cannot be in the past");
      return;
    }

    // Items validation
    if (items.length === 0) {
      toast.error("Add at least one item to the order");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "orders"), {
        tokenNo: generateToken(),
        name: name.trim(),
        mobile,
        deliveryDate,
        items,
        totalClothes,
        totalAmount,
        status: "inprogress",
        customerEmail: auth.currentUser.email,
        createdAt: Timestamp.now(),
      });
      toast.success("Order Added Successfully!");
      navigate("/orders");
    } catch (err) {
      toast.error("Failed to add order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="addorder-container">
      {loading && <Loader />}
      <h2>Add Laundry Order</h2>

      <input
        placeholder="Customer Name"
        value={name}
        onChange={e => setName(e.target.value)}
      />

      <input
        placeholder="Mobile Number"
        value={mobile}
        onChange={e => setMobile(e.target.value)}
      />

      <input
        type="date"
        value={deliveryDate}
        onChange={e => setDeliveryDate(e.target.value)}
      />

      <h3>Add Cloth</h3>

      <input
        placeholder="Cloth Type (eg: Shirt)"
        value={clothType}
        onChange={e => setClothType(e.target.value)}
      />

      <select value={service} onChange={e => setService(e.target.value)}>
        <option value="">Select Service</option>
        {SERVICES.map(s => (
          <option key={s.name} value={s.name}>
            {s.name} (₹{s.price})
          </option>
        ))}
      </select>

      <input
        type="number"
        min="1"
        value={qty}
        onChange={e => setQty(Number(e.target.value))}
      />

      <button className="add-item-btn" onClick={addItem}>Add Item</button>

      <h3>Order Summary</h3>
      {items.length === 0 && <p className="no-item">No items added</p>}

      <ul>
        {items.map((i, idx) => (
          <li key={idx}>
            {i.clothType} – {i.service} – {i.qty} × ₹{i.price}
            <button
              className="delete-btn"
              onClick={() => deleteItem(idx)}
            >
              ❌
            </button>
          </li>
        ))}
      </ul>

      <h4>Total Clothes: {totalClothes}</h4>
      <h4>Total Amount: ₹{totalAmount}</h4>

      <button className="submit-order-btn" onClick={submitOrder}>
        Submit Order
      </button>
    </div>
  );
}
