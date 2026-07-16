import React, { useState, useEffect } from "react";
import { getTranslation } from "../utils/i18n";

export default function Simulators({ lang, config }) {
  const [activeTab, setActiveTab] = useState("housing");

  // Housing Simulator State
  const [zone, setZone] = useState("A");
  const [familySize, setFamilySize] = useState(2);
  const [livingSurface, setLivingSurface] = useState(24);
  const [requiredSurface, setRequiredSurface] = useState(22);

  const smicValue = config?.smicValue || 1823;
  const surfaceZoneA = config?.surfaceZoneA || 22;
  const surfaceZoneB = config?.surfaceZoneB || 24;
  const surfaceZoneC = config?.surfaceZoneC || 28;
  const majorations = config?.majorations || {
    basePeople: 2,
    largeFamilyThreshold: 8,
    extraPerson: 10,
    largeFamilyExtra: 5
  };

  // Resources Simulator State
  const [salaries, setSalaries] = useState([]);
  const [resAverage, setResAverage] = useState(smicValue);
  const [resThreshold, setResThreshold] = useState(smicValue);

  // Initialize salaries when smicValue changes
  useEffect(() => {
    if (salaries.length === 0) {
      setSalaries(
        Array(12).fill("").map((_, i) => ({
          month: i + 1,
          val: smicValue + Math.floor(Math.random() * 400) - 200
        }))
      );
    }
  }, [smicValue, salaries.length]);

  // Recalculate Housing requirements
  useEffect(() => {
    let base = surfaceZoneC; // Zone C default
    if (zone === "A") base = surfaceZoneA;
    else if (zone === "B") base = surfaceZoneB;

    let totalRequired = base;
    const extraPeople = familySize - majorations.basePeople;
    
    if (extraPeople > 0) {
      if (familySize <= majorations.largeFamilyThreshold) {
        totalRequired += extraPeople * majorations.extraPerson;
      } else {
        // First elements up to threshold
        const standardExtra = (majorations.largeFamilyThreshold - majorations.basePeople) * majorations.extraPerson;
        const extraLarge = (familySize - majorations.largeFamilyThreshold) * majorations.largeFamilyExtra;
        totalRequired += (standardExtra + extraLarge);
      }
    }
    setRequiredSurface(totalRequired);
  }, [zone, familySize, surfaceZoneA, surfaceZoneB, surfaceZoneC, majorations]);

  // Recalculate Resources requirements
  useEffect(() => {
    // Basic rules: 2-3 people: 100% SMIC, 4-5 people: 1.1x SMIC (110%), 6+ people: 1.2x SMIC (120%)
    let multiplier = 1.0;
    if (familySize >= 4 && familySize <= 5) {
      multiplier = 1.1;
    } else if (familySize >= 6) {
      multiplier = 1.2;
    }

    setResThreshold(Math.round(smicValue * multiplier));

    if (salaries.length > 0) {
      const total = salaries.reduce((acc, curr) => acc + (parseFloat(curr.val) || 0), 0);
      setResAverage(Math.round(total / 12));
    }
  }, [salaries, familySize, smicValue]);

  const handleSalaryChange = (index, value) => {
    const updated = [...salaries];
    updated[index].val = value;
    setSalaries(updated);
  };

  const isHousingCompliant = livingSurface >= requiredSurface;
  const isResourcesCompliant = resAverage >= resThreshold;

  return (
    <div className="glass-card fade-in" style={{ marginTop: "2rem" }}>
      <h2 style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>
        📊 {getTranslation(lang, "sim_title")}
      </h2>
      <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "2rem" }}>
        {getTranslation(lang, "sim_desc")}
      </p>

      {/* Tabs Switcher */}
      <div className="tabs-header">
        <button
          className={`tab-btn ${activeTab === "housing" ? "active" : ""}`}
          onClick={() => setActiveTab("housing")}
        >
          🏠 {getTranslation(lang, "sim_tab_housing")}
        </button>
        <button
          className={`tab-btn ${activeTab === "resources" ? "active" : ""}`}
          onClick={() => setActiveTab("resources")}
        >
          💰 {getTranslation(lang, "sim_tab_resources")}
        </button>
      </div>

      {activeTab === "housing" ? (
        <div className="simulator-form fade-in">
          <h3 style={{ fontSize: "1.2rem", marginTop: "1rem" }}>
            {getTranslation(lang, "sim_house_title")}
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            {getTranslation(lang, "sim_house_desc")}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1rem" }}>
            <div className="form-group">
              <label className="form-label">{getTranslation(lang, "sim_lbl_zone")}</label>
              <select
                className="select-dropdown"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                style={{ width: "100%", padding: "0.75rem" }}
              >
                <option value="A">Zone A / A bis (Paris, Île-de-France, PACA)</option>
                <option value="B">Zone B1 / B2 (Grandes métropoles, Lyon, Marseille, Lille)</option>
                <option value="C">Zone C (Autres communes, Communes rurales)</option>
              </select>
              <span className="form-help">{getTranslation(lang, "sim_zone_help")}</span>
            </div>

            <div className="form-group">
              <label className="form-label">{getTranslation(lang, "sim_lbl_family")}</label>
              <input
                className="input-field"
                type="number"
                min="2"
                max="15"
                value={familySize}
                onChange={(e) => setFamilySize(Math.max(2, parseInt(e.target.value) || 2))}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: "1rem" }}>
            <label className="form-label">{getTranslation(lang, "sim_lbl_surface")}</label>
            <input
              className="input-field"
              type="number"
              min="5"
              max="250"
              value={livingSurface}
              onChange={(e) => setLivingSurface(Math.max(0, parseFloat(e.target.value) || 0))}
            />
          </div>

          {/* Results Block */}
          <div className={`simulator-result-box ${isHousingCompliant ? "result-success" : "result-failed"}`}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
              <span>{getTranslation(lang, "sim_res_required")}</span>
              <span style={{ fontSize: "1.1rem" }}>{requiredSurface} m²</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
              <span>{getTranslation(lang, "sim_res_current")}</span>
              <span style={{ fontSize: "1.1rem" }}>{livingSurface} m²</span>
            </div>
            <div style={{ borderTop: "1px solid var(--border-card)", paddingTop: "0.75rem", fontWeight: 800, textAlign: "center" }}>
              {isHousingCompliant ? (
                <span style={{ color: "var(--success)" }}>✓ {getTranslation(lang, "sim_status_success")}</span>
              ) : (
                <span style={{ color: "var(--danger)" }}>✗ {getTranslation(lang, "sim_status_failed")}</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="simulator-form fade-in">
          <h3 style={{ fontSize: "1.2rem", marginTop: "1rem" }}>
            {getTranslation(lang, "sim_res_title")}
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            {getTranslation(lang, "sim_res_desc")}
          </p>

          {/* Grid inputs for 12 months */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "1rem",
            marginTop: "1.5rem"
          }}>
            {salaries.map((s, idx) => (
              <div key={s.month} className="form-group" style={{ background: "rgba(255,255,255,0.02)", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid var(--border-card)" }}>
                <label className="form-label" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {getTranslation(lang, "sim_lbl_salary")} M-{12 - idx} (€)
                </label>
                <input
                  className="input-field"
                  type="number"
                  style={{ padding: "0.5rem" }}
                  value={s.val}
                  onChange={(e) => handleSalaryChange(idx, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1.5rem" }}>
            <div className="form-group">
              <label className="form-label">{getTranslation(lang, "sim_lbl_family")}</label>
              <input
                className="input-field"
                type="number"
                min="2"
                max="15"
                value={familySize}
                onChange={(e) => setFamilySize(Math.max(2, parseInt(e.target.value) || 2))}
              />
            </div>
          </div>

          {/* Results Block */}
          <div className={`simulator-result-box ${isResourcesCompliant ? "result-success" : "result-failed"}`}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
              <span>{getTranslation(lang, "sim_res_average")}</span>
              <span style={{ fontSize: "1.1rem" }}>{resAverage} € / mois</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
              <span>{getTranslation(lang, "sim_res_threshold")}</span>
              <span style={{ fontSize: "1.1rem" }}>{resThreshold} € / mois</span>
            </div>
            <div style={{ borderTop: "1px solid var(--border-card)", paddingTop: "0.75rem", fontWeight: 800, textAlign: "center" }}>
              {isResourcesCompliant ? (
                <span style={{ color: "var(--success)" }}>✓ {getTranslation(lang, "sim_res_status_success")}</span>
              ) : (
                <span style={{ color: "var(--danger)" }}>✗ {getTranslation(lang, "sim_res_status_failed")}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
