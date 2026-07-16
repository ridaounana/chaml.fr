import React from "react";

export function FranceFlag({ size = 20, style = {} }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      style={{ 
        display: "inline-block", 
        verticalAlign: "middle", 
        borderRadius: "50%", 
        border: "1px solid rgba(148, 163, 184, 0.2)", 
        overflow: "hidden",
        boxShadow: "var(--shadow-sm)",
        ...style 
      }}
    >
      <rect width="8" height="24" fill="#002395"/>
      <rect x="8" width="8" height="24" fill="#FFFFFF"/>
      <rect x="16" width="8" height="24" fill="#ED2939"/>
    </svg>
  );
}

export function MoroccoFlag({ size = 20, style = {} }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      style={{ 
        display: "inline-block", 
        verticalAlign: "middle", 
        borderRadius: "50%", 
        border: "1px solid rgba(148, 163, 184, 0.2)", 
        overflow: "hidden",
        boxShadow: "var(--shadow-sm)",
        ...style 
      }}
    >
      <rect width="24" height="24" fill="#c1272d"/>
      <path 
        d="M 12,4.5 L 16.4,18 L 4.9,9.6 L 19.1,9.6 L 7.6,18 Z" 
        fill="none" 
        stroke="#006233" 
        strokeWidth="2" 
        strokeLinejoin="round"
      />
    </svg>
  );
}
