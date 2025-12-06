import React, { useState, useEffect } from "react";
import { X, RotateCcw } from "lucide-react";
import { getSettings, saveSettings, resetSettings, type AppSettings } from "../services/settingsService";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(getSettings());
      setHasChanges(false);
    }
  }, [isOpen]);

  const handleChange = (key: keyof AppSettings, value: number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveSettings(settings);
    setHasChanges(false);
    onClose();
  };

  const handleReset = () => {
    resetSettings();
    setSettings(getSettings());
    setHasChanges(true);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
        onClick={onClose}
      >
        {/* Panel */}
        <div
          className="card"
          style={{
            width: "100%",
            maxWidth: "500px",
            maxHeight: "90vh",
            overflowY: "auto",
            position: "relative",
            zIndex: 1001,
            boxShadow: "var(--shadow-lg)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "2rem",
              paddingBottom: "1rem",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700" }}>Settings</h2>
            <button
              onClick={onClose}
              className="btn btn-ghost"
              style={{ padding: "0.5rem", borderRadius: "50%", width: "36px", height: "36px" }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Settings Content */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {/* Silence Detection Settings */}
            <div>
              <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.125rem", fontWeight: "600" }}>
                Silence Detection
              </h3>
              <p style={{ margin: "0 0 1.5rem 0", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                Adjust these parameters to control how sensitive the silence detection is.
              </p>

              {/* Threshold Setting */}
              <div style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <label style={{ fontSize: "0.95rem", fontWeight: "500", color: "var(--text-main)" }}>
                    Silence Threshold
                  </label>
                  <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>
                    {settings.silenceThreshold.toFixed(2)}
                  </span>
                </div>
                <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Lower values detect more silence (more sensitive). Range: 0.1 - 1.0
                </p>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={settings.silenceThreshold}
                  onChange={(e) => handleChange("silenceThreshold", parseFloat(e.target.value))}
                  style={{
                    width: "100%",
                    outline: "none",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.25rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>0.1 (More Sensitive)</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>1.0 (Less Sensitive)</span>
                </div>
              </div>

              {/* Min Duration Setting */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <label style={{ fontSize: "0.95rem", fontWeight: "500", color: "var(--text-main)" }}>
                    Minimum Silence Duration
                  </label>
                  <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>
                    {settings.minSilenceDuration.toFixed(1)}s
                  </span>
                </div>
                <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Only silence segments longer than this duration will be detected. Range: 0.5 - 5.0 seconds
                </p>
                <input
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.1"
                  value={settings.minSilenceDuration}
                  onChange={(e) => handleChange("minSilenceDuration", parseFloat(e.target.value))}
                  style={{
                    width: "100%",
                    outline: "none",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.25rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>0.5s</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>5.0s</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "1rem",
              marginTop: "2rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid var(--border)",
            }}
          >
            <button onClick={handleReset} className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <RotateCcw size={16} />
              Reset to Defaults
            </button>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn btn-primary"
                disabled={!hasChanges}
                style={{ opacity: hasChanges ? 1 : 0.5, cursor: hasChanges ? "pointer" : "not-allowed" }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

