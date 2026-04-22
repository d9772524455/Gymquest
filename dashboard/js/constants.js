export function dRiskColor(r) { return r === 'high' ? '#ef4444' : r === 'medium' ? '#f59e0b' : r === 'low' ? '#00e5ff' : '#22c55e'; }
export function dRiskBg(r) { return r === 'high' ? 'rgba(239,68,68,.15)' : r === 'medium' ? 'rgba(245,158,11,.15)' : r === 'low' ? 'rgba(0,229,255,.1)' : 'rgba(34,197,94,.1)'; }
export function dRiskLabel(r) { return r === 'high' ? 'ВЫСОКИЙ' : r === 'medium' ? 'СРЕДНИЙ' : r === 'low' ? 'НИЗКИЙ' : 'OK'; }
