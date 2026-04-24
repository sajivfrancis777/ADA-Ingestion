/**
 * ChatIcon — Cloud-connection node graph icon for the Architecture Assistant.
 * Inspired by cloud-connection system icons — a cloud shape with connected nodes.
 */
export default function ChatIcon({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cloud body */}
      <path d="M10 20 C4 20 4 13 8 11 C8 6 14 4 18 7 C22 4 28 6 28 11 C32 13 32 20 26 20Z"
        fill={color} opacity="0.15" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Connection lines from cloud to nodes */}
      <line x1="10" y1="20" x2="6" y2="28" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="18" y1="20" x2="18" y2="30" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="26" y1="20" x2="30" y2="28" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      {/* Cross links between bottom nodes */}
      <line x1="6" y1="28" x2="18" y2="30" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <line x1="18" y1="30" x2="30" y2="28" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      {/* Bottom system nodes */}
      <circle cx="6" cy="28" r="3" fill={color} opacity="0.9" />
      <circle cx="18" cy="30" r="3" fill={color} opacity="0.9" />
      <circle cx="30" cy="28" r="3" fill={color} opacity="0.9" />
      {/* Cloud center dot */}
      <circle cx="18" cy="13" r="2" fill={color} opacity="0.5" />
    </svg>
  );
}
