import { useState, useRef, useEffect } from "react";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { SERVICES } from "./services";
import { generateToken } from "./token";
import { useNavigate } from "react-router-dom";
import { auth, db } from "./firebase";
import { toast } from "react-toastify";
import Loader from "./Loader";
import "./AddOrder.css";

const URGENT_CHARGE = 125;

export default function AddOrder() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState("");
  const [clothType, setClothType] = useState("");
  const [service, setService] = useState(null);
  const [qty, setQty] = useState(1);
  const [urgent, setUrgent] = useState(false);
  const [loading, setLoading] = useState(false);

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [clothTypeOpen, setClothTypeOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);

  const categoryRef = useRef(null);
  const clothTypeRef = useRef(null);
  const serviceRef = useRef(null);

  const categories = Object.keys(SERVICES);

  const getClothTypes = () => {
    if (!category || !SERVICES[category]) return [];

    if (category === "Shoes" || category === "Bags") {
      return SERVICES[category].map(
        item => item.name.split(" - ")[1] || item.name
      );
    }

    if (category === "Household") {
      const result = [];
      Object.keys(SERVICES.Household).forEach(main => {
        Object.keys(SERVICES.Household[main]).forEach(sub => {
          result.push(`${main} - ${sub}`);
        });
      });
      return result;
    }

    return Object.keys(SERVICES[category]);
  };

  const getServices = () => {
    if (!category || !clothType) return [];

    if (category === "Shoes" || category === "Bags") {
      return SERVICES[category]
        .filter(item => item.name.includes(clothType))
        .map(item => ({ name: item.name, price: item.price }));
    }

    if (category === "Household") {
      const parts = clothType.split(" - ");
      let data = SERVICES.Household;
      for (let p of parts) {
        data = data?.[p];
      }
      return Array.isArray(data) ? data : [];
    }

    return SERVICES[category][clothType] || [];
  };

  const clothTypes = getClothTypes();
  const services = getServices();

  const addItem = () => {
    if (!category || !clothType || !service || qty < 1) {
      toast.error("Fill all item fields correctly");
      return;
    }

    setItems(prev => [
      ...prev,
      {
        category,
        clothType,
        service: service.name,
        qty,
        price: service.price,
      },
    ]);

    setClothType("");
    setService(null);
    setQty(1);
  };

  const deleteItem = index => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const totalClothes = items.reduce((s, i) => s + i.qty, 0);
  const itemsTotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const totalAmount = urgent ? itemsTotal + URGENT_CHARGE : itemsTotal;

  const submitOrder = async () => {
    if (!name.trim()) {
      toast.error("Customer name required");
      return;
    }

    if (!/^[0-9]{10}$/.test(mobile)) {
      toast.error("Enter valid 10-digit mobile number");
      return;
    }

    if (items.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    setLoading(true);
    try {
      const tokenNo = await generateToken();

      await addDoc(collection(db, "orders"), {
        tokenNo,
        name: name.trim(),
        mobile,
        urgent,
        urgentCharge: urgent ? URGENT_CHARGE : 0,
        order_date: Timestamp.now(),
        delivery_date: null,
        items,
        totalClothes,
        totalAmount,
        status: "inprogress",
        customerEmail: auth.currentUser.email,
        createdAt: Timestamp.now(),
      });

      toast.success("Order Added Successfully");
      navigate("/orders");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const close = e => {
      if (!categoryRef.current?.contains(e.target)) setCategoryOpen(false);
      if (!clothTypeRef.current?.contains(e.target)) setClothTypeOpen(false);
      if (!serviceRef.current?.contains(e.target)) setServiceOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
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

      <h3>Add Cloth</h3>

      {/* Category */}
      <div className="dropdown-container" ref={categoryRef}>
        <div
          className="dropdown-header"
          onClick={() => setCategoryOpen(!categoryOpen)}
        >
          {category || "Select Category"}
        </div>
        {categoryOpen && (
          <div className="dropdown-list">
            {categories.map(cat => (
              <div
                key={cat}
                className="dropdown-item"
                onClick={() => {
                  setCategory(cat);
                  setCategoryOpen(false); // Close dropdown
                  setClothType(""); // Reset
                  setService(null);
                }}
              >
                {cat}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cloth Type */}
      {category && (
        <div className="dropdown-container" ref={clothTypeRef}>
          <div
            className="dropdown-header"
            onClick={() => setClothTypeOpen(!clothTypeOpen)}
          >
            {clothType || "Select Cloth Type"}
          </div>
          {clothTypeOpen && (
            <div className="dropdown-list">
              {clothTypes.map(type => (
                <div
                  key={type}
                  className="dropdown-item"
                  onClick={() => {
                    setClothType(type);
                    setClothTypeOpen(false); // Close dropdown
                    setService(null);
                  }}
                >
                  {type}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Service */}
      {clothType && (
        <div className="dropdown-container" ref={serviceRef}>
          <div
            className="dropdown-header"
            onClick={() => setServiceOpen(!serviceOpen)}
          >
            {service?.name || "Select Service"}
          </div>
          {serviceOpen && (
            <div className="dropdown-list">
              {services.map(s => (
                <div
                  key={s.name}
                  className="dropdown-item"
                  onClick={() => {
                    setService(s);
                    setServiceOpen(false); // Close dropdown
                  }}
                >
                  {s.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {service && (
        <>
          <input
            type="number"
            min="1"
            value={qty}
            onChange={e => setQty(Number(e.target.value))}
          />
          <button className="add-item-btn" onClick={addItem}>
            Add Item
          </button>
        </>
      )}

      <h3>Order Summary</h3>

      <ul className="order-items-list">
        {items.map((i, idx) => (
          <li key={idx} className="order-item">
            <div className="item-details">
              <span className="item-type">{i.clothType}</span>
              <span className="item-service">{i.service}</span>
              <span className="item-qty">× {i.qty}</span>
              <span className="item-total">₹{i.qty * i.price}</span>
            </div>
            <button className="delete-btn" onClick={() => deleteItem(idx)}>❌</button>
          </li>
        ))}
      </ul>

      {items.length > 0 && (
        <div className="order-totals">
          <div className="urgent-container">
            <label>
              <input
                type="checkbox"
                checked={urgent}
                onChange={e => setUrgent(e.target.checked)}
              />
              Urgent Service (+ ₹{URGENT_CHARGE})
            </label>
          </div>

          <h4>Total Clothes: <span>{totalClothes}</span></h4>
          <h4>Items Total: <span>₹{itemsTotal}</span></h4>
          {urgent && <h4>Urgent Charge: <span>₹{URGENT_CHARGE}</span></h4>}
          <h3>Grand Total: <span>₹{totalAmount}</span></h3>
        </div>
      )}

      <button className="submit-order-btn" onClick={submitOrder}>
        Submit Order
      </button>
    </div>
  );
}
