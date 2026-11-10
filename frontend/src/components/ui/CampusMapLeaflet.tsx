import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppStore } from '../../stores/appStore';

export function CampusMapLeaflet({
  latitude,
  longitude,
  hospitalName,
  address,
}: {
  latitude: number;
  longitude: number;
  hospitalName: string;
  address: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const isDark = useAppStore((s) => s.theme === 'dark');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(el, {
      center: [latitude, longitude],
      zoom: 17,
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: false,
    });

    const tileBg = isDark ? '#0B161B' : '#F3F0E9';
    const gridStroke = isDark ? '#1A343D' : '#E1DDD3';
    const blockStroke = isDark ? '#274B56' : '#D2CBC0';
    const pavilionStroke = isDark ? '#C6B292' : '#13262B';
    const pavilionFill = isDark ? '#142A32' : '#FFFFFF';
    const popupTextColor = isDark ? '#EDF2F1' : '#13262B';

    const ArchitecturalCampusGrid = L.GridLayer.extend({
      createTile: function (coords: L.Coords) {
        const tile = document.createElement('canvas');
        const size = this.getTileSize();
        tile.width = size.x;
        tile.height = size.y;
        const ctx = tile.getContext('2d');
        if (ctx) {
          ctx.fillStyle = tileBg;
          ctx.fillRect(0, 0, size.x, size.y);

          ctx.strokeStyle = gridStroke;
          ctx.lineWidth = 1;
          for (let i = 0; i <= size.x; i += 32) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, size.y);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(size.x, i);
            ctx.stroke();
          }

          if ((coords.x + coords.y) % 2 === 0) {
            ctx.strokeStyle = blockStroke;
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, size.x, size.y);
          }
        }
        return tile;
      },
    });

    new (ArchitecturalCampusGrid as unknown as { new (): L.GridLayer })().addTo(map);

    const latOffset = 0.00035;
    const lngOffset = 0.00055;
    L.rectangle(
      [
        [latitude - latOffset, longitude - lngOffset],
        [latitude + latOffset, longitude + lngOffset],
      ],
      {
        color: pavilionStroke,
        weight: 2,
        fillColor: pavilionFill,
        fillOpacity: 0.94,
      },
    )
      .addTo(map)
      .bindPopup(
        `<div style="font-family:Manrope,sans-serif;min-width:190px;color:${popupTextColor}">
          <strong>${hospitalName}</strong><br/>
          <span style="font-size:12px">Pavilion A · 4 Clinical Levels (L0–L3)</span><br/>
          <span style="font-size:11px">${address}</span>
        </div>`,
      );

    L.circleMarker([latitude - latOffset - 0.00006, longitude], {
      radius: 8,
      color: '#1F6C70',
      fillColor: '#1F6C70',
      fillOpacity: 1,
    })
      .addTo(map)
      .bindTooltip('Main South Drop-Off Canopy', { permanent: false, direction: 'bottom' });

    L.circleMarker([latitude - 0.00018, longitude - lngOffset - 0.00008], {
      radius: 8,
      color: '#DC4C40',
      fillColor: '#DC4C40',
      fillOpacity: 1,
    })
      .addTo(map)
      .bindTooltip('Emergency Ambulance Ramp · West Gate A (24/7)', {
        permanent: false,
        direction: 'left',
      });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude, hospitalName, address, isDark]);

  return (
    <div className="relative overflow-hidden rounded-architectural border border-champagne-border bg-surface">
      <div
        ref={containerRef}
        className="h-[290px] w-full"
        role="region"
        aria-label={`Campus exterior arrival map for ${hospitalName}`}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-champagne-border bg-ivory/70 px-4 py-2.5 text-xs text-ink">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-teal-forest" aria-hidden="true" />
            Main South Canopy
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emergency" aria-hidden="true" />
            24/7 Emergency Gate A
          </span>
        </div>
        <span className="tabular-nums">
          {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E (Sample Campus)
        </span>
      </div>
    </div>
  );
}
