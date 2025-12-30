import { useState, useRef, useEffect } from "react";
import {
  addDoc,
  collection,
  Timestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { generateToken } from "./token";
import { useNavigate } from "react-router-dom";
import { auth, db } from "./firebase";
import { toast } from "react-toastify";
import Loader from "./Loader";
import "./AddOrder.css";

const URGENT_CHARGE = 125;

export default function AddOrder() {
  const navigate = useNavigate();

  // CUSTOMER
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");

  // ORDER ITEMS
  const [items, setItems] = useState([]);

  // SERVICES FROM FIRESTORE
  const [servicesData, setServicesData] = useState(null);

  // SELECTION STATES
  const [category, setCategory] = useState("");
  const [clothType, setClothType] = useState("");
  const [service, setService] = useState(null);
  const [qty, setQty] = useState(1);
  const [urgent, setUrgent] = useState(false);

  // UI STATES
  const [loading, setLoading] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [clothTypeOpen, setClothTypeOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);

  // REFS
  const categoryRef = useRef(null);
  const clothTypeRef = useRef(null);
  const serviceRef = useRef(null);

  // FETCH SERVICES FROM FIRESTORE
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const snap = await getDoc(doc(db, "pricing", "services"));
        if (snap.exists()) {
          setServicesData(snap.data());
        } else {
          toast.error("Services not found in database");
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load services");
      }
    };

    fetchServices();
  }, []);

  // CLOSE DROPDOWNS ON OUTSIDE CLICK
  useEffect(() => {
    const close = e => {
      if (!categoryRef.current?.contains(e.target)) setCategoryOpen(false);
      if (!clothTypeRef.current?.contains(e.target)) setClothTypeOpen(false);
      if (!serviceRef.current?.contains(e.target)) setServiceOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // LOADING GUARD
  if (!servicesData) {
    return <Loader />;
  }

  const categories = Object.keys(servicesData);

  // GET CLOTH TYPES
  const getClothTypes = () => {
    if (!category || !servicesData[category]) return [];

    if (category === "Shoes" || category === "Bags") {
      return servicesData[category].map(
        item => item.name.split(" - ")[1] || item.name
      );
    }

    if (category === "Household") {
      const result = [];
      Object.keys(servicesData.Household).forEach(main => {
        Object.keys(servicesData.Household[main]).forEach(sub => {
          result.push(`${main} - ${sub}`);
        });
      });
      return result;
    }

    return Object.keys(servicesData[category]);
  };

  // GET SERVICES
  const getServices = () => {
    if (!category || !clothType) return [];

    if (category === "Shoes" || category === "Bags") {
      return servicesData[category].filter(item =>
        item.name.includes(clothType)
      );
    }

    if (category === "Household") {
      let data = servicesData.Household;
      clothType.split(" - ").forEach(p => {
        data = data?.[p];
      });
      return Array.isArray(data) ? data : [];
    }

    return servicesData[category][clothType] || [];
  };

  const clothTypes = getClothTypes();
  const services = getServices();

  // ADD ITEM
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

  // DELETE ITEM
  const deleteItem = index => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // TOTALS
  const totalClothes = items.reduce((s, i) => s + i.qty, 0);
  const itemsTotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const totalAmount = urgent ? itemsTotal + URGENT_CHARGE : itemsTotal;

  // SUBMIT ORDER
  const submitOrder = async () => {
    if (!name.trim()) return toast.error("Customer name required");
    if (!/^[0-9]{10}$/.test(mobile))
      return toast.error("Enter valid mobile number");
    if (items.length === 0)
      return toast.error("Add at least one item");

    setLoading(true);
    try {
      const tokenNo = await generateToken();

      await addDoc(collection(db, "orders"), {
        tokenNo,
        name: name.trim(),
        mobile,
        urgent,
        urgentCharge: urgent ? URGENT_CHARGE : 0,
        items,
        totalClothes,
        totalAmount,
        status: "inprogress",
        order_date: Timestamp.now(),
        delivery_date: null,
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

      {/* CATEGORY */}
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
                  setCategoryOpen(false);
                  setClothType("");
                  setService(null);
                }}
              >
                {cat}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CLOTH TYPE */}
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
                    setClothTypeOpen(false);
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

      {/* SERVICE */}
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
                    setServiceOpen(false);
                  }}
                >
                  {s.name}
                   {/* — ₹{s.price} */}
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
            <span>
              {i.clothType} — {i.service} × {i.qty}
            </span>
            <span>₹{i.qty * i.price}</span>
            <button onClick={() => deleteItem(idx)}>❌</button>
          </li>
        ))}
      </ul>

      {items.length > 0 && (
        <div className="order-totals">
          <label>
            <input
              type="checkbox"
              checked={urgent}
              onChange={e => setUrgent(e.target.checked)}
            />
            Urgent Service (+₹{URGENT_CHARGE})
          </label>

          <h4>Total Clothes: {totalClothes}</h4>
          <h4>Items Total: ₹{itemsTotal}</h4>
          <h3>Grand Total: ₹{totalAmount}</h3>
        </div>
      )}

      <button className="submit-order-btn" onClick={submitOrder}>
        Submit Order
      </button>
    </div>
  );
}
