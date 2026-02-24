// Shared application constants

export const APP_VERSION = "Ver 2.2.2";

// Color themes for sibling cards (used in parent home + reserve pages)
export const SIBLING_COLORS = [
    { name: "blue", bg: "bg-blue-600", light: "bg-blue-50", text: "text-blue-600", border: "border-blue-200", badge: "bg-blue-100 text-blue-700" },
    { name: "green", bg: "bg-green-600", light: "bg-green-50", text: "text-green-600", border: "border-green-200", badge: "bg-green-100 text-green-700" },
    { name: "orange", bg: "bg-orange-600", light: "bg-orange-50", text: "text-orange-600", border: "border-orange-200", badge: "bg-orange-100 text-orange-700" },
    { name: "purple", bg: "bg-purple-600", light: "bg-purple-50", text: "text-purple-600", border: "border-purple-200", badge: "bg-purple-100 text-purple-700" },
] as const;

export type SiblingColorTheme = typeof SIBLING_COLORS[number];
