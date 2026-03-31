/**
 * TowerSelector — Tower and Capability dropdown selectors.
 */
import { TOWERS, CAPABILITIES, type TowerInfo, type CapabilityInfo } from '../data/towerRegistry';

interface TowerSelectorProps {
  selectedTower: string;
  selectedCap: string;
  onTowerChange: (towerId: string) => void;
  onCapChange: (capId: string) => void;
}

export default function TowerSelector({
  selectedTower,
  selectedCap,
  onTowerChange,
  onCapChange,
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
            // Auto-select first capability
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
    </div>
  );
}
