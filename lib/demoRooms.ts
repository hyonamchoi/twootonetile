export type DemoRoom = { id: string; label: string; kind: string; src: string };

/** 데모룸 사진 (Unsplash, 출처는 public/tiles/CREDITS.md) */
export const DEMO_ROOMS: DemoRoom[] = [
  { id: 'bathroom', label: '욕실', kind: 'bathroom', src: '/demo-rooms/bathroom.jpg' },
  { id: 'kitchen', label: '주방', kind: 'kitchen', src: '/demo-rooms/kitchen.jpg' },
  { id: 'entrance', label: '현관', kind: 'entrance', src: '/demo-rooms/entrance.jpg' },
  { id: 'living', label: '거실', kind: 'living', src: '/living_room_before.png' },
];
