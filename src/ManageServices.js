import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { toast } from "react-toastify";
import "./ManageServices.css";

export default function ManageServices() {
  const [servicesData, setServicesData] = useState(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [newServiceMode, setNewServiceMode] = useState(false);

  // LOAD SERVICES
  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const snap = await getDoc(doc(db, "pricing", "services"));
      if (snap.exists()) {
        setServicesData(snap.data());
      }
    } catch {
      toast.error("Failed to load services");
    }
  };

  // SAVE BACK TO FIRESTORE
  const saveServices = async updatedData => {
    try {
      await setDoc(doc(db, "pricing", "services"), updatedData);
      setServicesData(updatedData);
      toast.success("Services updated");
    } catch {
      toast.error("Update failed");
    }
  };

  // FLATTEN SERVICES FOR SEARCH
  const flattenServices = () => {
    if (!servicesData) return [];

    const list = [];

    Object.entries(servicesData).forEach(([category, catData]) => {
      if (Array.isArray(catData)) {
        catData.forEach(s =>
          list.push({ category, clothType: "", ...s })
        );
      } else {
        Object.entries(catData).forEach(([cloth, clothData]) => {
          if (Array.isArray(clothData)) {
            clothData.forEach(s =>
              list.push({ category, clothType: cloth, ...s })
            );
          } else {
            Object.entries(clothData).forEach(([sub, subData]) => {
              subData.forEach(s =>
                list.push({
                  category,
                  clothType: `${cloth} - ${sub}`,
                  ...s,
                })
              );
            });
          }
        });
      }
    });

    return list;
  };

  const services = flattenServices().filter(s =>
    `${s.category} ${s.clothType} ${s.name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // UPDATE SERVICE
  const updateService = () => {
    if (!editing) return;

    const updated = structuredClone(servicesData);
    const { category, clothType, oldName, name, price } = editing;

    if (!clothType) {
      updated[category] = updated[category].map(s =>
        s.name === oldName ? { name, price } : s
      );
    } else {
      const parts = clothType.split(" - ");
      let target = updated[category];
      parts.forEach(p => (target = target[p]));

      const idx = target.findIndex(s => s.name === oldName);
      target[idx] = { name, price };
    }

    saveServices(updated);
    setEditing(null);
    setNewServiceMode(false);
  };

  // DELETE SERVICE
  const deleteService = s => {
    const updated = structuredClone(servicesData);

    if (!s.clothType) {
      updated[s.category] = updated[s.category].filter(
        x => x.name !== s.name
      );
    } else {
      let target = updated[s.category];
      s.clothType.split(" - ").forEach(p => (target = target[p]));
      target.splice(
        target.findIndex(x => x.name === s.name),
        1
      );
    }

    saveServices(updated);
  };

  // ADD SERVICE
  const addService = () => {
    if (!editing) return;

    const updated = structuredClone(servicesData);
    const { category, clothType, name, price } = editing;

    let target = updated[category];
    if (clothType) {
      clothType.split(" - ").forEach(p => (target = target[p]));
    }

    target.push({ name, price });
    saveServices(updated);
    setEditing(null);
    setNewServiceMode(false);
  };

  if (!servicesData) return <p>Loading services...</p>;

  return (
    <div className="manage-services">
      <h2>Manage Services</h2>

      {/* SEARCH */}
      <input
        placeholder="Search service..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* ADD SERVICE BUTTON */}
      <button
        className="add-service-btn"
        onClick={() => {
          setEditing({
            category: Object.keys(servicesData)[0],
            clothType: "",
            name: "",
            price: "",
          });
          setNewServiceMode(true);
        }}
      >
        ➕ Add New Service
      </button>

      {/* SERVICES LIST */}
      <div className="services-list">
        {services.map((s, idx) => (
          <div key={idx} className="service-row">
            <div>
              <b>{s.name}</b> – ₹{s.price}
              <small>
                {s.category} {s.clothType && `> ${s.clothType}`}
              </small>
            </div>

            <div>
              <button
                onClick={() => {
                  setEditing({ ...s, oldName: s.name });
                  setNewServiceMode(false);
                }}
              >
                ✏️
              </button>
              <button onClick={() => deleteService(s)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {/* EDITOR */}
      {editing && (
        <div className="editor">
          <h3>{newServiceMode ? "Add New Service" : "Edit Service"}</h3>

          <select
            value={editing.category}
            onChange={e =>
              setEditing({ ...editing, category: e.target.value })
            }
          >
            {Object.keys(servicesData).map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <input
            placeholder="Cloth Type (optional, e.g. Men - Shirt)"
            value={editing.clothType}
            onChange={e =>
              setEditing({ ...editing, clothType: e.target.value })
            }
          />

          <input
            value={editing.name}
            onChange={e =>
              setEditing({ ...editing, name: e.target.value })
            }
            placeholder="Service Name"
          />

          <input
            type="number"
            value={editing.price}
            onChange={e =>
              setEditing({ ...editing, price: Number(e.target.value) })
            }
            placeholder="Price"
          />

          <button onClick={newServiceMode ? addService : updateService}>
            Save
          </button>

          <button
            onClick={() => {
              setEditing(null);
              setNewServiceMode(false);
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
