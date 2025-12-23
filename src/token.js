import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "./firebase";

export const generateToken = async () => {
  const today = new Date();

  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();

  const dateKey = `${dd}${mm}${yyyy}`;
  const counterRef = doc(db, "counters", dateKey);

  const snap = await getDoc(counterRef);

  let nextNumber = 1;

  if (!snap.exists()) {
    // First order of the day
    await setDoc(counterRef, { lastNumber: 1 });
  } else {
    // Increment atomically
    await updateDoc(counterRef, {
      lastNumber: increment(1)
    });
    nextNumber = snap.data().lastNumber + 1;
  }

  const paddedNumber = String(nextNumber).padStart(3, "0");

  return `TKN-${dateKey}-${paddedNumber}`;
};

