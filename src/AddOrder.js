import { useState, useRef, useEffect } from "react";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { SERVICES } from "./services";
import { generateToken } from "./token";
import { useNavigate } from "react-router-dom";
import { auth, db } from "./firebase";
import { toast } from "react-toastify";
import Loader from "./Loader";
import "./AddOrder.css";

export default function AddOrder() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [items, setItems] = useState([]);
  const [clothType, setClothType] = useState("");
  const [service, setService] = useState(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  // For searchable dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const dropdownRef = useRef();

  const filteredServices = SERVICES.filter(s =>
    s.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const addItem = () => {
    if (!clothType.trim() || !service || qty < 1) {
      toast.error("Fill all item fields correctly");
      return;
    }

    setItems([
      ...items,
      { clothType: clothType.trim(), service: service.name, qty, price: service.price }
    ]);

    setClothType("");
    setService(null);
    setQty(1);
    setSearchText("");
    setDropdownOpen(false);
  };

  const deleteItem = (index) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  const totalClothes = items.reduce((s, i) => s + i.qty, 0);
  const totalAmount = items.reduce((s, i) => s + i.qty * i.price, 0);

  const submitOrder = async () => {
    if (!name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobile)) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }

    if (!deliveryDate) {
      toast.error("Delivery date is required");
      return;
    }

    const selectedDate = new Date(deliveryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      toast.error("Delivery date cannot be in the past");
      return;
    }

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

      {/* Custom searchable dropdown */}
      <div className="dropdown-container" ref={dropdownRef}>
        <div className="dropdown-header" onClick={() => setDropdownOpen(!dropdownOpen)}>
          {service ? service.name : "Select Service"}
        </div>
        {dropdownOpen && (
          <div className="dropdown-list">
            <input
              type="text"
              placeholder="Search service..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="dropdown-search"
            />
            {filteredServices.length === 0 && <p className="no-item">No services found</p>}
            {filteredServices.map(s => (
              <div
                key={s.name}
                className="dropdown-item"
                onClick={() => { setService(s); setDropdownOpen(false); setSearchText(""); }}
              >
                {s.name}
                 {/* (₹{s.price}) */}
              </div>
            ))}
          </div>
        )}
      </div>

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
