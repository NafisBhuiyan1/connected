// Web stand-in for react-native-maps (iOS/Android only): a real 3D MapLibre map, the same engine,
// style and 3D buildings as the Connected desktop site. MapLibre loads from that site's /vendor copy.
// Markers show as purple dots (tap works); custom marker views, circles and shapes stay phone-only.
import React from 'react';
import { View } from 'react-native';

const MapCtx = React.createContext(null);
const FALLBACK = { latitude: 35.3071, longitude: -80.7352, latitudeDelta: 0.02, longitudeDelta: 0.02 };
let mlPromise = null;

function loadMapLibre() {
  if (!mlPromise) {
    if (!document.querySelector('link[data-maplibre]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/vendor/maplibre-gl.css';
      link.setAttribute('data-maplibre', '');
      document.head.appendChild(link);
    }
    // new Function keeps Metro from trying to bundle this runtime import.
    mlPromise = new Function('u', 'return import(u)')('/vendor/maplibre-gl.mjs').then((ml) => {
      try {
        ml.setWorkerUrl('/maplibre-gl-worker.mjs');
      } catch (e) {
        /* older builds pick their worker automatically */
      }
      return ml;
    });
  }
  return mlPromise;
}

const zoomOf = (r) => Math.min(17.5, Math.max(3, Math.log2(360 / ((r && (r.longitudeDelta || r.latitudeDelta)) || 0.02))));

function regionOf(map) {
  const c = map.getCenter();
  const b = map.getBounds();
  return { latitude: c.lat, longitude: c.lng, latitudeDelta: Math.abs(b.getNorth() - b.getSouth()), longitudeDelta: Math.abs(b.getEast() - b.getWest()) };
}

function add3D(map) {
  const style = map.getStyle();
  if (!style) return;
  for (const layer of style.layers || []) {
    if (layer.type === 'fill-extrusion') {
      try {
        map.setLayoutProperty(layer.id, 'visibility', 'none');
      } catch (e) {
        /* skip */
      }
    }
  }
  const sources = Object.keys(style.sources || {});
  const sourceId = sources.find((k) => k === 'openmaptiles') || sources[0];
  if (sourceId && !map.getLayer('cx-3d')) {
    map.addLayer({
      id: 'cx-3d',
      type: 'fill-extrusion',
      source: sourceId,
      'source-layer': 'building',
      minzoom: 13.5,
      paint: {
        'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 8], 0, '#ebe5fd', 25, '#d8cbfb', 80, '#b9a2f6'],
        'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 0.9,
      },
    });
  }
}

const MapView = React.forwardRef(function MapView(props, ref) {
  const box = React.useRef(null);
  const [map, setMap] = React.useState(null);
  const propsRef = React.useRef(props);
  propsRef.current = props;

  React.useEffect(() => {
    let cancelled = false;
    let m = null;
    loadMapLibre()
      .then((ml) => {
        if (cancelled || !box.current) return;
        const r = propsRef.current.region || propsRef.current.initialRegion || FALLBACK;
        m = new ml.Map({
          container: box.current,
          style: 'https://tiles.openfreemap.org/styles/liberty',
          center: [r.longitude, r.latitude],
          zoom: Math.max(15.5, zoomOf(r)),
          pitch: 55,
          bearing: -20,
          attributionControl: { compact: true },
        });
        m.__ml = ml;
        m.on('style.load', () => add3D(m));
        m.on('moveend', () => {
          const cb = propsRef.current.onRegionChangeComplete;
          if (cb) cb(regionOf(m));
        });
        m.on('click', (e) => {
          const cb = propsRef.current.onPress;
          if (cb) cb({ nativeEvent: { coordinate: { latitude: e.lngLat.lat, longitude: e.lngLat.lng } } });
        });
        setMap(m);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (m) m.remove();
    };
  }, []);

  // mapType "satellite"/"hybrid": satellite imagery under the labels, with the 3D buildings softened on top.
  const satellite = ['satellite', 'hybrid', 'satelliteFlyover', 'hybridFlyover'].includes(props.mapType);
  React.useEffect(() => {
    if (!map) return undefined;
    const apply = () => {
      const has = !!map.getLayer('cx-sat');
      if (satellite && !has) {
        if (!map.getSource('cx-sat')) {
          map.addSource('cx-sat', {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            maxzoom: 19,
            attribution: 'Imagery © Esri',
          });
        }
        const firstSymbol = (map.getStyle().layers || []).find((l) => l.type === 'symbol');
        map.addLayer({ id: 'cx-sat', type: 'raster', source: 'cx-sat' }, firstSymbol ? firstSymbol.id : undefined);
        if (map.getLayer('cx-3d')) map.setPaintProperty('cx-3d', 'fill-extrusion-opacity', 0.55);
      } else if (!satellite && has) {
        map.removeLayer('cx-sat');
        if (map.getLayer('cx-3d')) map.setPaintProperty('cx-3d', 'fill-extrusion-opacity', 0.9);
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once('style.load', apply);
    return undefined;
  }, [map, satellite]);

  const reg = props.region;
  React.useEffect(() => {
    if (map && reg) map.easeTo({ center: [reg.longitude, reg.latitude], duration: 600 });
  }, [map, reg && reg.latitude, reg && reg.longitude]);

  React.useImperativeHandle(
    ref,
    () => ({
      animateToRegion(r, duration) {
        if (map && r) map.flyTo({ center: [r.longitude, r.latitude], zoom: Math.max(15, zoomOf(r)), duration: duration || 800 });
      },
      animateCamera(cam, opts) {
        if (!map || !cam) return;
        map.easeTo({
          center: cam.center ? [cam.center.longitude, cam.center.latitude] : undefined,
          zoom: cam.zoom,
          pitch: cam.pitch,
          bearing: cam.heading,
          duration: (opts && opts.duration) || 600,
        });
      },
      fitToCoordinates(coords, opts) {
        if (!map || !map.__ml || !coords || !coords.length) return;
        const b = new map.__ml.LngLatBounds();
        coords.forEach((c) => b.extend([c.longitude, c.latitude]));
        map.fitBounds(b, { padding: 60, maxZoom: 17, duration: opts && opts.animated === false ? 0 : 600 });
      },
      fitToSuppliedMarkers() {},
      setCamera(cam) {
        if (map && cam) map.jumpTo({ center: cam.center ? [cam.center.longitude, cam.center.latitude] : undefined, zoom: cam.zoom, pitch: cam.pitch, bearing: cam.heading });
      },
      getCamera: async () => {
        if (!map) return { center: { latitude: FALLBACK.latitude, longitude: FALLBACK.longitude }, zoom: 15, heading: 0, pitch: 0 };
        const c = map.getCenter();
        return { center: { latitude: c.lat, longitude: c.lng }, zoom: map.getZoom(), heading: map.getBearing(), pitch: map.getPitch() };
      },
    }),
    [map],
  );

  return React.createElement(
    View,
    { style: [props.style, { overflow: 'hidden', backgroundColor: '#EFEBFB' }] },
    React.createElement('div', { ref: box, style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } }),
    React.createElement(MapCtx.Provider, { value: map }, props.children),
  );
});

export function Marker(props) {
  const map = React.useContext(MapCtx);
  const c = props.coordinate;
  const lat = c && c.latitude;
  const lng = c && c.longitude;
  const pressRef = React.useRef(props.onPress);
  pressRef.current = props.onPress;
  React.useEffect(() => {
    if (!map || !map.__ml || typeof lat !== 'number' || typeof lng !== 'number') return undefined;
    const el = document.createElement('div');
    el.style.cssText = 'width:18px;height:18px;border-radius:50%;background:#5B35C9;border:3px solid #fff;box-shadow:0 2px 8px rgba(27,23,38,.35);cursor:pointer';
    if (props.title) el.title = props.title;
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (pressRef.current) pressRef.current({ nativeEvent: { coordinate: { latitude: lat, longitude: lng } } });
    });
    const mk = new map.__ml.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
    return () => mk.remove();
  }, [map, lat, lng, props.title]);
  return null;
}

const Noop = () => null;

export default MapView;
export const Circle = Noop;
export const Polygon = Noop;
export const Polyline = Noop;
export const Callout = Noop;
export const Overlay = Noop;
export const Heatmap = Noop;
export const Geojson = Noop;
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = null;
