export type DemoRoom = { id: string; label: string; kind: string; src: string };

/**
 * 데모룸. 현재 욕실·주방·현관은 일러스트 placeholder다.
 * 실제 사진(JPG)을 public/demo-rooms/ 에 넣고 src만 바꾸면 그대로 쓸 수 있다.
 */
export const DEMO_ROOMS: DemoRoom[] = [
  { id: 'bathroom', label: '욕실', kind: 'bathroom', src: '/demo-rooms/bathroom.svg' },
  { id: 'kitchen', label: '주방', kind: 'kitchen', src: '/demo-rooms/kitchen.svg' },
  { id: 'entrance', label: '현관', kind: 'entrance', src: '/demo-rooms/entrance.svg' },
  { id: 'living', label: '거실', kind: 'living', src: '/living_room_before.png' },
];
