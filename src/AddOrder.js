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
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState(""); // e.g., "Men's Wear"
  const [clothType, setClothType] = useState(""); // e.g., "Shirt"
  const [service, setService] = useState(null); // e.g., {name: "Wash", price: 49}
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  // Dropdown states
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [clothTypeOpen, setClothTypeOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const categoryRef = useRef(null);
  const clothTypeRef = useRef(null);
  const serviceRef = useRef(null);

  // Get all categories
  const categories = Object.keys(SERVICES);

  // Get cloth types based on selected category
  const getClothTypes = () => {
    if (!category || !SERVICES[category]) return [];
    
    if (category === "Shoes" || category === "Bags") {
      return SERVICES[category].map(item => item.name.split(" - ")[1] || item.name);
    }
    
    if (category === "Household") {
      // For household, flatten the nested structure
      const householdItems = [];
      Object.keys(SERVICES.Household).forEach(mainCategory => {
        Object.keys(SERVICES.Household[mainCategory]).forEach(subCategory => {
          if (Array.isArray(SERVICES.Household[mainCategory][subCategory])) {
            householdItems.push(`${mainCategory} - ${subCategory}`);
          } else {
            // Handle further nesting if needed
            Object.keys(SERVICES.Household[mainCategory][subCategory]).forEach(item => {
              householdItems.push(`${mainCategory} - ${subCategory} - ${item}`);
            });
          }
        });
      });
      return householdItems;
    }
    
    return Object.keys(SERVICES[category]);
  };

  // Get services based on selected category and cloth type
  const getServices = () => {
    if (!category || !clothType) return [];
    
    if (category === "Shoes" || category === "Bags") {
      // Find the exact item in Shoes or Bags array
      return SERVICES[category]
        .filter(item => {
          const itemName = item.name.split(" - ")[1] || item.name;
          return itemName === clothType;
        })
        .map(item => ({
          name: item.name,
          price: item.price
        }));
    }
    
    if (category === "Household") {
      const parts = clothType.split(" - ");
      if (parts.length >= 2) {
        let servicesArray = SERVICES.Household;
        
        // Navigate through the nested structure
        for (let i = 0; i < parts.length; i++) {
          if (servicesArray[parts[i]]) {
            servicesArray = servicesArray[parts[i]];
          } else {
            break;
          }
        }
        
        // If we reached an array of services
        if (Array.isArray(servicesArray)) {
          return servicesArray;
        }
      }
      return [];
    }
    
    // For Men's Wear and Women's Wear
    return SERVICES[category][clothType] || [];
  };

  const clothTypes = getClothTypes();
  const services = getServices();

  // Add cloth item
  const addItem = () => {
    if (!category || !clothType.trim() || !service || qty < 1) {
      toast.error("Fill all item fields correctly");
      return;
    }

    setItems(prev => [
      ...prev,
      {
        category,
        clothType: clothType.trim(),
        service: service.name,
        qty,
        price: service.price
      }
    ]);

    setCategory("");
    setClothType("");
    setService(null);
    setQty(1);
    setCategoryOpen(false);
    setClothTypeOpen(false);
    setServiceOpen(false);
  };

  // Delete cloth item
  const deleteItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const totalClothes = items.reduce((sum, i) => sum + i.qty, 0);
  const totalAmount = items.reduce((sum, i) => sum + i.qty * i.price, 0);

  // Submit order
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

    if (items.length === 0) {
      toast.error("Add at least one item to the order");
      return;
    }

    setLoading(true);
    try {
      const tokenNo = await generateToken();

      await addDoc(collection(db, "orders"), {
        tokenNo,
        name: name.trim(),
        mobile,
        order_date: Timestamp.now(),
        delivery_date: null,
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
      console.error(err);
      toast.error("Failed to add order");
    } finally {
      setLoading(false);
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setCategoryOpen(false);
      }
      if (clothTypeRef.current && !clothTypeRef.current.contains(e.target)) {
        setClothTypeOpen(false);
      }
      if (serviceRef.current && !serviceRef.current.contains(e.target)) {
        setServiceOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset cloth type and service when category changes
  useEffect(() => {
    setClothType("");
    setService(null);
  }, [category]);

  // Reset service when cloth type changes
  useEffect(() => {
    setService(null);
  }, [clothType]);

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

      {/* Category Dropdown */}
      <div className="dropdown-container" ref={categoryRef}>
        <div
          className="dropdown-header"
          onClick={() => setCategoryOpen(prev => !prev)}
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
                }}
              >
                {cat}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cloth Type Dropdown - Only show if category selected */}
      {category && (
        <div className="dropdown-container" ref={clothTypeRef}>
          <div
            className="dropdown-header"
            onClick={() => setClothTypeOpen(prev => !prev)}
          >
            {clothType || "Select Cloth Type"}
          </div>

          {clothTypeOpen && (
            <div className="dropdown-list">
              {clothTypes.length === 0 ? (
                <p className="no-item">No cloth types found</p>
              ) : (
                clothTypes.map(type => (
                  <div
                    key={type}
                    className="dropdown-item"
                    onClick={() => {
                      setClothType(type);
                      setClothTypeOpen(false);
                    }}
                  >
                    {type}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Service Dropdown - Only show if cloth type selected */}
      {clothType && (
        <div className="dropdown-container" ref={serviceRef}>
          <div
            className="dropdown-header"
            onClick={() => setServiceOpen(prev => !prev)}
          >
            {service ? service.name : "Select Service"}
          </div>

          {serviceOpen && (
            <div className="dropdown-list">
              {services.length === 0 ? (
                <p className="no-item">No services found for this item</p>
              ) : (
                services.map(s => (
                  <div
                    key={s.name}
                    className="dropdown-item"
                    onClick={() => {
                      setService(s);
                      setServiceOpen(false);
                    }}
                  >
                    {s.name} 
                    {/* - ₹{s.price} */}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Quantity Input - Only show if service selected */}
      {service && (
        <div className="quantity-container">
          <label>Quantity:</label>
          <input
            type="number"
            min="1"
            value={qty}
            onChange={e => setQty(Number(e.target.value))}
            className="quantity-input"
          />
        </div>
      )}

      {service && (
        <button className="add-item-btn" onClick={addItem}>
          Add Item
        </button>
      )}

      <h3>Order Summary</h3>

      {items.length === 0 && <p className="no-item">No items added</p>}

      <ul className="order-items-list">
        {items.map((i, idx) => (
          <li key={idx} className="order-item">
            <div className="item-details">
              <span className="item-type">{i.clothType}</span>
              <span className="item-service">{i.service}</span>
              <span className="item-qty">{i.qty} × ₹{i.price}</span>
              <span className="item-total">₹{i.qty * i.price}</span>
            </div>
            <button
              className="delete-btn"
              onClick={() => deleteItem(idx)}
            >
              ❌
            </button>
          </li>
        ))}
      </ul>

      {items.length > 0 && (
        <div className="order-totals">
          <h4>Total Clothes: {totalClothes}</h4>
          <h4>Total Amount: ₹{totalAmount}</h4>
        </div>
      )}

      <button 
        className="submit-order-btn" 
        onClick={submitOrder}
        disabled={items.length === 0}
      >
        Submit Order
      </button>
    </div>
  );
}