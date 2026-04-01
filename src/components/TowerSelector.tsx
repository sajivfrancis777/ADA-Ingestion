/**
 * TowerSelector — Tower, Capability, Release, and State dropdown selectors.
 */
import { TOWERS, CAPABILITIES, type TowerInfo, type CapabilityInfo } from '../data/towerRegistry';

export const RELEASES = ['All', 'R1', 'R2', 'R3', 'R4'] as const;
export const STATES = ['Current', 'Future'] as const;
export type Release = typeof RELEASES[number];
export type FlowState = typeof STATES[number];

interface TowerSelectorProps {
  selectedTower: string;
  selectedCap: string;
  selectedRelease: Release;
  selectedState: FlowState;
  onTowerChange: (towerId: string) => void;
  onCapChange: (capId: string) => void;
  onReleaseChange: (release: Release) => void;
  onStateChange: (state: FlowState) => void;
}

export default function TowerSelector({
  selectedTower,
  selectedCap,
  selectedRelease,
  selectedState,
  onTowerChange,
  onCapChange,
  onReleaseChange,
  onStateChange,
}: TowerSelectorProps) {
  const caps: CapabilityInfo[] = CAPABILITIES[selectedTower] ?? [];

  return (
    <div className="tower-selector">
      <div className="selector-group">
        <label htmlFor="tower-select">Tower</label>
        <select
          id="tower-select"
          value={selectedTower}
          onChange={e => {
            onTowerChange(e.target.value);
            const newCaps = CAPABILITIES[e.target.value] ?? [];
            if (newCaps.length > 0) onCapChange(newCaps[0].id);
          }}
        >
          {TOWERS.map((t: TowerInfo) => (
            <option key={t.id} value={t.id}>{t.id} — {t.display}</option>
          ))}
        </select>
      </div>
      <div className="selector-group">
        <label htmlFor="cap-select">Capability</label>
        <select
          id="cap-select"
          value={selectedCap}
          onChange={e => onCapChange(e.target.value)}
        >
          {caps.map((c: CapabilityInfo) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="selector-group">
        <label htmlFor="release-select">Release</label>
        <select
          id="release-select"
          value={selectedRelease}
          onChange={e => onReleaseChange(e.target.value as Release)}
        >
          {RELEASES.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
      <div className="selector-group">
        <label htmlFor="state-select">State</label>
        <select
          id="state-select"
          value={selectedState}
          onChange={e => onStateChange(e.target.value as FlowState)}
        >
          {STATES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
